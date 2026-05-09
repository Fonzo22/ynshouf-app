// Cloudflare Worker — ynshouf-proxy
// Handles:  /govmap?x=<ITM_X>&y=<ITM_Y>   -> block/parcel JSON
//           /ai  (POST)                     -> Claude API proxy

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);

  if (url.pathname === '/govmap') {
    return handleGovmap(url);
  }

  if (url.pathname === '/ai' && req.method === 'POST') {
    return handleAI(req);
  }

  return json({ error: 'not found' }, 404);
}

// ── ITM (EPSG:2039) → WGS84 → EPSG:3857 ────────────────────────────────────
// Pure-JS inverse Transverse Mercator using Snyder series formulas.
// ITM parameters: +proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444
//   +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80
//   +towgs84=-48,55,52,0,0,0,0

function itmToCoords(itmX, itmY) {
  // GRS80 ellipsoid
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);
  const b = a * (1 - f);

  // ITM projection constants
  const k0 = 1.0000067;
  const lon0 = 35.2045169444444 * Math.PI / 180;
  const lat0 = 31.7343936111111 * Math.PI / 180;
  const FE = 219529.584;
  const FN = 626907.39;

  // Meridional arc (Helmert series — Snyder eq. 3-21)
  function mArc(lat) {
    const n = (a - b) / (a + b);
    const n2 = n * n;
    return a / (1 + n) * (
      (1 + n2 / 4 + n2 * n2 / 64) * lat
      - (3 * n / 2 - 9 * n * n2 / 16) * Math.sin(2 * lat)
      + (15 * n2 / 16 - 15 * n2 * n2 / 32) * Math.sin(4 * lat)
      - (35 * n * n2 / 48) * Math.sin(6 * lat)
      + (315 * n2 * n2 / 512) * Math.sin(8 * lat)
    );
  }

  const M0 = mArc(lat0);

  // Remove false origin
  const x = itmX - FE;
  const y = itmY - FN;

  // Rectifying latitude μ
  const M = M0 + y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  // Footprint latitude φ₁ from μ (Snyder eq. 3-26)
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const e1_2 = e1 * e1;
  const e1_3 = e1_2 * e1;
  const e1_4 = e1_3 * e1;
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1_3 / 32) * Math.sin(2 * mu)
    + (21 * e1_2 / 16 - 55 * e1_4 / 32) * Math.sin(4 * mu)
    + (151 * e1_3 / 96) * Math.sin(6 * mu)
    + (1097 * e1_4 / 512) * Math.sin(8 * mu);

  const sinP1 = Math.sin(phi1);
  const cosP1 = Math.cos(phi1);
  const tanP1 = sinP1 / cosP1;
  const T1 = tanP1 * tanP1;
  const C1 = ep2 * cosP1 * cosP1;
  const N1 = a / Math.sqrt(1 - e2 * sinP1 * sinP1);
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinP1 * sinP1, 1.5);
  const D = x / (N1 * k0);
  const D2 = D * D;

  // Geographic coordinates on GRS80 (Snyder eq. 8-17, 8-18)
  const phi = phi1 - (N1 * tanP1 / R1) * (
    D2 / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D2 * D2 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D2 * D2 * D2 / 720
  );

  const lam = lon0 + (
    D
    - (1 + 2 * T1 + C1) * D * D2 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D2 * D2 / 120
  ) / cosP1;

  // GRS80 geographic → ECEF Cartesian
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const Ne = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const Xc = Ne * cosPhi * Math.cos(lam);
  const Yc = Ne * cosPhi * Math.sin(lam);
  const Zc = Ne * (1 - e2) * sinPhi;

  // Helmert 3-parameter shift: Israeli datum → WGS84 (towgs84=-48,55,52)
  const Xw = Xc - 48;
  const Yw = Yc + 55;
  const Zw = Zc + 52;

  // WGS84 ECEF → geographic (Bowring iterative)
  const f84 = 1 / 298.257223563;
  const e2_84 = 2 * f84 - f84 * f84;
  const lonW = Math.atan2(Yw, Xw);
  const p = Math.sqrt(Xw * Xw + Yw * Yw);
  let latW = Math.atan2(Zw, p * (1 - e2_84));
  for (let i = 0; i < 10; i++) {
    const Nw = a / Math.sqrt(1 - e2_84 * Math.sin(latW) * Math.sin(latW));
    latW = Math.atan2(Zw + e2_84 * Nw * Math.sin(latW), p);
  }

  // WGS84 geographic → Web Mercator (EPSG:3857)
  const x3857 = Math.round(lonW * a);
  const y3857 = Math.round(Math.log(Math.tan(Math.PI / 4 + latW / 2)) * a);

  return {
    lat: latW * 180 / Math.PI,
    lon: lonW * 180 / Math.PI,
    x3857,
    y3857,
  };
}

// ── Govmap ──────────────────────────────────────────────────────────────────

async function handleGovmap(url) {
  const xStr = url.searchParams.get('x');
  const yStr = url.searchParams.get('y');
  const debug = url.searchParams.get('debug') === '1';

  if (!xStr || !yStr) return json({ error: 'missing x/y' }, 400);

  const itmX = parseFloat(xStr);
  const itmY = parseFloat(yStr);
  if (isNaN(itmX) || isNaN(itmY)) return json({ error: 'invalid coordinates' }, 400);

  const coords = itmToCoords(itmX, itmY);
  const debugAttempts = [];

  const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // Primary: entitiesByPoint — layer 16, WGS84 [lon, lat]
  try {
    const ep = 'https://www.govmap.gov.il/api/layers-catalog/entitiesByPoint';
    const body = JSON.stringify({
      point: [coords.lon, coords.lat],
      layers: [{ layerId: '16' }],
      tolerance: 0,
    });
    const resp = await fetch(ep, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.govmap.gov.il',
        'Referer': 'https://www.govmap.gov.il/',
        'User-Agent': BROWSER_UA,
      },
      body,
      cf: { timeout: 10000 },
    });
    const text = await resp.text();
    if (debug) debugAttempts.push({ url: ep, status: resp.status, body: text.slice(0, 500) });

    if (resp.ok && text && !text.trimStart().startsWith('<')) {
      const data = JSON.parse(text);
      const result = parseEntitiesByPoint(data);
      if (result) return debug ? json({ ...result, debug: { coords, attempts: debugAttempts } }) : json(result);
    }
  } catch (e) {
    if (debug) debugAttempts.push({ url: 'entitiesByPoint', error: String(e) });
  }

  // Fallback: legacy api.govmap.gov.il GetFeatureInfo
  try {
    const ep = `https://api.govmap.gov.il/Query/GetFeatureInfo?RequestType=json&LayerNames=PARCEL&X=${itmX}&Y=${itmY}&Buffer=50&SRID=2039`;
    const resp = await fetch(ep, {
      headers: {
        'Referer': 'https://www.govmap.gov.il/',
        'User-Agent': BROWSER_UA,
      },
      cf: { timeout: 8000 },
    });
    const text = await resp.text();
    if (debug) debugAttempts.push({ url: ep, status: resp.status, body: text.slice(0, 300) });

    if (resp.ok && text && !text.trimStart().startsWith('<')) {
      const data = JSON.parse(text);
      const result = parseGovmapResponse(data);
      if (result && result.block) {
        return debug ? json({ ...result, debug: { coords, attempts: debugAttempts } }) : json(result);
      }
    }
  } catch (e) {
    if (debug) debugAttempts.push({ url: 'legacy-api', error: String(e) });
  }

  // Return coords so frontend can show a govmap link even when block/parcel lookup fails
  const govmapUrl = `https://www.govmap.gov.il/?c=${Math.round(itmX)},${Math.round(itmY)}&zoom=7&lang=0`;
  return debug
    ? json({ govmapUrl, debug: { coords, attempts: debugAttempts } })
    : json({ govmapUrl });
}

// Parses entitiesByPoint response — layer 16 returns entities with gush/helka attributes
function parseEntitiesByPoint(data) {
  if (!data) return null;
  // Response is an array of layer results, each with entities array
  const layers = Array.isArray(data) ? data : (data.layers || data.data || []);
  for (const layer of layers) {
    const entities = layer.entities || layer.Entities || layer.features || [];
    for (const entity of entities) {
      const attrs = entity.attributes || entity.Attributes || entity.properties || entity;
      const block = attrs.GUSH_NUM ?? attrs.gush_num ?? attrs.gushnumber ?? attrs.GUSH ?? attrs.gush;
      const parcel = attrs.HELKA_NUM ?? attrs.helka_num ?? attrs.parcelnumber ?? attrs.HELKA ?? attrs.helka;
      if (block != null && String(block) !== '') {
        return { block: String(block), parcel: parcel != null ? String(parcel) : '', jurisdiction: attrs.SHEM_YISHUV || attrs.shem_yishuv || '' };
      }
    }
  }
  return null;
}

// Parses {properties: {gushnumber, parcelnumber}} format
function parseParcelSearchData(data) {
  if (!data) return null;
  const props = data.properties || data;
  const block = props.gushnumber ?? props.gush_num ?? props.GUSH_NUM ?? props.gush;
  const parcel = props.parcelnumber ?? props.helka_num ?? props.HELKA_NUM ?? props.helka;
  if (block != null && block !== '') {
    return { block: String(block), parcel: parcel != null ? String(parcel) : '', jurisdiction: '' };
  }
  return null;
}

function parseGovmapResponse(data) {
  // Format A: { data: [{ LayerName, Rows: [{ Attributes: { GUSH_NUM, HELKA_NUM, ... } }] }] }
  if (data && Array.isArray(data.data)) {
    for (const layer of data.data) {
      const rows = layer.Rows || layer.rows || [];
      if (rows.length > 0) {
        const attrs = rows[0].Attributes || rows[0].attributes || rows[0];
        const block = attrs.GUSH_NUM || attrs.gush_num || attrs.GUSH;
        const parcel = attrs.HELKA_NUM || attrs.helka_num || attrs.HELKA;
        const juris = attrs.SHEM_YISHUV || attrs.shem_yishuv || attrs.JURISDICTION;
        if (block) return { block: String(block), parcel: parcel ? String(parcel) : '', jurisdiction: juris || '' };
      }
    }
  }

  // Format B: { LayerResult: [{ Features: [{ FieldValues: [{ Name, Value }] }] }] }
  if (data && Array.isArray(data.LayerResult)) {
    for (const layer of data.LayerResult) {
      const features = layer.Features || [];
      if (features.length > 0) {
        const fields = {};
        (features[0].FieldValues || []).forEach(f => { fields[f.Name] = f.Value; });
        const block = fields.GUSH_NUM || fields.GUSH;
        const parcel = fields.HELKA_NUM || fields.HELKA;
        const juris = fields.SHEM_YISHUV;
        if (block) return { block: String(block), parcel: parcel ? String(parcel) : '', jurisdiction: juris || '' };
      }
    }
  }

  return {};
}

// ── AI (Claude) ──────────────────────────────────────────────────────────────

async function handleAI(req) {
  const body = await req.json();
  const prompt = body.prompt || '';
  if (!prompt) return json({ error: 'missing prompt' }, 400);

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  return json({ text }, resp.status);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
