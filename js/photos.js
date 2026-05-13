// ── PHOTOS (dynamic, unlimited) ──
var photos = {};
var photoCounter = 0;

var MAX_PX = 1600;
var JPEG_Q = 0.82;

function _compress(file, cb) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function() {
    URL.revokeObjectURL(url);
    var w = img.naturalWidth, h = img.naturalHeight;
    if (w > MAX_PX || h > MAX_PX) {
      var ratio = Math.min(MAX_PX / w, MAX_PX / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(cv.toDataURL('image/jpeg', JPEG_Q));
  };
  img.onerror = function() { URL.revokeObjectURL(url); cb(null); };
  img.src = url;
}

function onPhotos(e) {
  var files = Array.from(e.target.files);
  files.forEach(function(f) {
    _compress(f, function(src) {
      if (!src) return;
      photoCounter++;
      var id = photoCounter;
      photos[id] = { src: src, cap: '' };
      renderPhotoGrid();
      upProg();
    });
  });
  e.target.value = '';
}

function renderPhotoGrid() {
  var grid = $('photoGrid');
  var keys = Object.keys(photos).map(Number).sort(function(a,b){return a-b;});
  grid.innerHTML = keys.map(function(id, i) {
    return '<div class="pg-item" id="pi'+id+'">' +
      '<img class="pg-thumb" src="'+photos[id].src+'" onclick="viewPhoto('+id+')">' +
      '<span class="pg-num">'+(i+1)+'</span>' +
      '<button class="pg-del" onclick="delPg(event,'+id+')">✕</button>' +
      '<input class="pg-cap" placeholder="כיתוב..." autocomplete="off" value="'+escHtml(photos[id].cap)+'" oninput="photos['+id+'].cap=this.value">' +
      '</div>';
  }).join('');
  var b = $('badge-photos');
  var n = keys.length;
  if (n > 0) { b.textContent = n + ' תמונות'; b.classList.add('show'); }
  else b.classList.remove('show');
}

function escHtml(s) { return (s||'').replace(/"/g,'&quot;'); }

function delPg(e, id) {
  e.stopPropagation();
  delete photos[id];
  renderPhotoGrid();
  upProg();
}

function viewPhoto(id) {
  window.open(photos[id].src, '_blank');
}


// סוף קובץ
