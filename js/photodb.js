// ── Photo persistence via IndexedDB ──
// Photos are too large for localStorage; IndexedDB has no practical size limit.
var _photoDB = null;

function _openPhotoDB() {
  return new Promise(function(resolve, reject) {
    if (_photoDB) { resolve(_photoDB); return; }
    var req = indexedDB.open('ynshouf-photos', 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore('photos', { keyPath: 'reportId' });
    };
    req.onsuccess = function(e) { _photoDB = e.target.result; resolve(_photoDB); };
    req.onerror   = function(e) { reject(e.target.error); };
  });
}

function savePhotosForDraft(rId, photosObj) {
  return _openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ reportId: rId, photos: photosObj });
      tx.oncomplete = resolve;
      tx.onerror    = function(e) { reject(e.target.error); };
    });
  });
}

function loadPhotosForDraft(rId) {
  return _openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction('photos', 'readonly');
      var req = tx.objectStore('photos').get(rId);
      req.onsuccess = function() { resolve(req.result ? req.result.photos : {}); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  });
}

function deletePhotosForDraft(rId) {
  return _openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(rId);
      tx.oncomplete = resolve;
      tx.onerror    = function(e) { reject(e.target.error); };
    });
  });
}

// סוף קובץ
