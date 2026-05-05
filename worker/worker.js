// Cloudflare Worker — ynshouf-proxy
// Handles:  /govmap?x=<ITM_X>&y=<ITM_Y>   -> block/parcel/jurisdiction JSON
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

// ── Govmap ──────────────────────────────────────────────────────────────────

async function handleGovmap(url) {
  const x = url.searchParams.get('x');
  const y = url.searchParams.get('y');
  if (!x || !y) return json({ error: 'missing x/y' }, 400);

  // Try govmap Query API (works when called from Israeli Cloudflare edge nodes)
  const endpoint =
    `https://api.govmap.gov.il/Query/GetFeatureInfo` +
    `?RequestType=json&LayerNames=PARCEL&X=${x}&Y=${y}&Buffer=50&SRID=2039`;

  try {
    const resp = await fetch(endpoint, {
      headers: {
        'Referer': 'https://www.govmap.gov.il/',
        'User-Agent': 'Mozilla/5.0 (compatible; GovmapProxy/1.0)',
        'Accept': 'application/json, text/plain, */*',
      },
      cf: { timeout: 8000 },
    });

    const text = await resp.text();

    // Govmap sometimes returns XML error pages — don't crash on those
    if (!text || text.trimStart().startsWith('<')) {
      return json({});
    }

    const data = JSON.parse(text);
    return json(parseGovmapResponse(data));
  } catch (err) {
    // Network error or JSON parse failure — return empty result, not a 500
    return json({});
  }
}

function parseGovmapResponse(data) {
  // Format A: { data: [{ LayerName, Rows: [{ Attributes: { GUSH_NUM, HELKA_NUM, SHEM_YISHUV } }] }] }
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
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return json(data, resp.status);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
