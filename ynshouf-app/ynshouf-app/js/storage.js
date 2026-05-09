window.onload = function() {
  // טעינת פרטי פקח
  try {
    var d = JSON.parse(localStorage.getItem('yns_insp') || '{}');
    if (d.n) $('inspName').value = d.n;
    if (d.e) $('inspNum').value = d.e;
  } catch(e) {}
  // תאריך ושעה נוכחיים
  var now = new Date();
  $('iDate').value = now.toISOString().split('T')[0];
  $('iTime').value = pad(now.getHours()) + ':' + pad(now.getMinutes());
  genId();
  upProg();
  updateSig();
  initCanvas();
};

function updateSig() {
  $('sigName').value = $('inspName').value;
  $('sigNum').value = $('inspNum').value;
  $('sigDate').value = $('iDate').value ? new Date($('iDate').value).toLocaleDateString('he-IL') : '';
}

function saveInsp() {
  localStorage.setItem('yns_insp', JSON.stringify({ n: $('inspName').value, e: $('inspNum').value }));
  updateSig();
}

function collect() {
  var ids = ['inspName','inspNum','iDate','iTime','iType','iSub','iLoc','iJuris',
    'iBlock','iParcel','cITM','cGPS','placeName','vPlate','vType','vOwner','vId','vAddr',
    'vViol','vViolManual','vWaste','iDesc'];
  var d = { id: reportId, photos: photos };
  ids.forEach(function(id) {
    var el = $(id);
    if (el) d[id] = el.value || '';
  });
  return d;
}

function getDrafts() {
  try { return JSON.parse(localStorage.getItem('yns_drafts') || '[]'); } catch(e) { return []; }
}

function saveDraft() {
  var data = collect();
  var drafts = getDrafts();
  var i = drafts.findIndex(function(d) { return d.id === reportId; });
  if (i >= 0) drafts[i] = data; else drafts.unshift(data);
  localStorage.setItem('yns_drafts', JSON.stringify(drafts.slice(0, 30)));
  toast('נשמר ✓');
}

function renderHist() {
  var drafts = getDrafts();
  var el = $('histList');
  if (!drafts.length) {
    el.innerHTML = '<div class="hist-empty"><span class="big">📋</span>אין דוחות שמורים עדיין</div>';
    return;
  }
  el.innerHTML = drafts.map(function(d, i) {
    return '<div class="hist-item" onclick="loadDraft(' + i + ')">' +
      '<div>' +
      '<div class="hist-type">' + (d.iType || 'ללא כותרת') + '</div>' +
      '<div class="hist-meta">' + (d.iDate || '') + ' ' + (d.iTime || '') + ' · ' + (d.iLoc || 'ללא מיקום') + '</div>' +
      '<div class="hist-id">' + (d.id || '') + ' · ' + (d.inspName || '') + '</div>' +
      '</div>' +
      '<button class="hist-del" onclick="delDraft(event,' + i + ')">×</button>' +
      '</div>';
  }).join('');
}

function loadDraft(i) {
  var d = getDrafts()[i];
  Object.keys(d).forEach(function(k) { if ($(k)) $(k).value = d[k] || ''; });
  reportId = d.id || reportId;
  showPage('form');
  toast('דוח נטען');
}

function delDraft(e, i) {
  e.stopPropagation();
  if (!confirm('למחוק דוח זה?')) return;
  var drafts = getDrafts();
  drafts.splice(i, 1);
  localStorage.setItem('yns_drafts', JSON.stringify(drafts));
  renderHist();
}

function clearForm() {
  if (!confirm('לנקות את כל השדות?')) return;
  ['iType','iSub','iLoc','iJuris','iBlock','iParcel','cITM','cGPS','placeName',
   'vPlate','vType','vOwner','vId','vAddr','vViol','vWaste','iDesc'].forEach(function(id) {
    if ($(id)) $(id).value = '';
  });
  photos = {};
  photoCounter = 0;
  renderPhotoGrid();
  clearSig();
  var now = new Date();
  $('iDate').value = now.toISOString().split('T')[0];
  $('iTime').value = pad(now.getHours()) + ':' + pad(now.getMinutes());
  genId(); upProg(); updateSig(); toast('הטופס נוקה');
}


// סוף קובץ
