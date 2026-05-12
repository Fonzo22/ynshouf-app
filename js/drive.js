var _driveTokClient = null;

function _ensureGIS() {
  return new Promise(function(resolve) {
    if (window.google && google.accounts && google.accounts.oauth2) { resolve(); return; }
    var existing = document.querySelector('script[src*="accounts.google.com/gsi"]');
    if (existing) { existing.addEventListener('load', resolve); return; }
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

async function _getDriveToken() {
  await _ensureGIS();
  return new Promise(function(resolve, reject) {
    if (!_driveTokClient) {
      _driveTokClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: ''
      });
    }
    _driveTokClient.callback = function(resp) {
      if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
      resolve(resp.access_token);
    };
    _driveTokClient.requestAccessToken({ prompt: '' });
  });
}

async function _driveFindOrCreate(name, parentId, token) {
  var q = "name='" + name.replace(/'/g, "\\'") + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  if (parentId) q += " and '" + parentId + "' in parents";
  var r = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)', {
    headers: { Authorization: 'Bearer ' + token }
  });
  var d = await r.json();
  if (d.files && d.files.length) return d.files[0].id;
  var meta = { name: name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  var cr = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta)
  });
  return (await cr.json()).id;
}

async function saveToDrive(blob, filename, inspectorName) {
  var token = await _getDriveToken();
  var rootId = await _driveFindOrCreate('ינשוף-דוחות', null, token);
  var inspId = await _driveFindOrCreate(inspectorName || 'כללי', rootId, token);

  // check if file already exists (to replace it)
  var q = "name='" + filename.replace(/'/g, "\\'") + "' and '" + inspId + "' in parents and trashed=false";
  var found = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)', {
    headers: { Authorization: 'Bearer ' + token }
  });
  var fd = await found.json();
  var existingId = fd.files && fd.files.length ? fd.files[0].id : null;

  // multipart upload body
  var boundary = 'yns' + Date.now();
  var enc = new TextEncoder();
  var meta = existingId ? { name: filename } : { name: filename, parents: [inspId] };
  var p1 = enc.encode('--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(meta) + '\r\n');
  var p2 = enc.encode('--' + boundary + '\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n');
  var p3 = enc.encode('\r\n--' + boundary + '--');
  var ab = await blob.arrayBuffer();
  var body = new Uint8Array(p1.length + p2.length + ab.byteLength + p3.length);
  body.set(p1);
  body.set(p2, p1.length);
  body.set(new Uint8Array(ab), p1.length + p2.length);
  body.set(p3, p1.length + p2.length + ab.byteLength);

  var url = existingId
    ? 'https://www.googleapis.com/upload/drive/v3/files/' + existingId + '?uploadType=multipart'
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  var up = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary=' + boundary
    },
    body: body
  });
  if (!up.ok) throw new Error('Drive ' + up.status + ': ' + (await up.text()));
  return await up.json();
}

// סוף קובץ
