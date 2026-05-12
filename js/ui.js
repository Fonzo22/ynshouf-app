function showPage(p) {
  ['form','hist'].forEach(function(x) {
    $('page' + x[0].toUpperCase() + x.slice(1)).classList.toggle('active', x === p);
    $('btnPage' + x[0].toUpperCase() + x.slice(1)).classList.toggle('active', x === p);
  });
  $('actBar').style.display = p === 'form' ? 'flex' : 'none';
  if (p === 'hist') renderHist();
}

function tog(name) {
  var bd = $('bd-' + name);
  var arr = $('arr-' + name);
  var wasCollapsed = bd.classList.contains('collapsed');
  bd.classList.toggle('collapsed');
  if (arr) arr.classList.toggle('open', wasCollapsed);
}

function upProg() {
  var ids = ['inspName','inspNum','iDate','iTime','iType','iDesc','iLoc'];
  var filled = ids.filter(function(id) {
    var el = $(id);
    return el && el.value && el.value.trim().length > 0;
  }).length;
  $('progFill').style.width = Math.round(filled / ids.length * 100) + '%';
  var n = Object.keys(photos).length;
  var b = $('badge-photos');
  if (n > 0) { b.textContent = n + ' תמונות'; b.classList.add('show'); }
  else b.classList.remove('show');
}

function genId() {
  var d = ($('iDate').value || '').replace(/-/g, '');
  reportId = d ? 'YNS-' + d + '-' + (Math.floor(Math.random() * 900) + 100) : 'YNS-???';
}

function fillViolDesc() {
  var val = $('vViol').value;
  var manual = $('violManualField');
  if (val === 'אחר') {
    manual.style.display = 'flex';
  } else {
    manual.style.display = 'none';
    $('vViolManual').value = '';
  }
}

function getViol() {
  var v = $('vViol').value;
  if (v === 'אחר') return $('vViolManual').value;
  return v;
}

function fillSub() {
  var m = {
    'השלכת פסולת בנייה': 'הטמנת ו/או השלכת פסולת בנייה ועפר חפירה שלא ברשות',
    'שריפת פסולת': 'שריפת פסולת שלא ברשות',
    'פסולת אסבסט': 'השלכת חומרים מכילי אסבסט',
    'זיהום קרקע': 'גרימת זיהום קרקע',
    'פסולת מסוכנת': 'טיפול בפסולת מסוכנת שלא כדין'
  };
  var t = $('iType').value;
  if (m[t] && !$('iSub').value) $('iSub').value = m[t];
}

function toast(msg, type) {
  var t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.remove('show'); }, 2700);
}


// סוף קובץ
