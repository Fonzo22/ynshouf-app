// ── PHOTOS (dynamic, unlimited) ──
var photos = {};
var photoCounter = 0;

function onPhotos(e) {
  var files = Array.from(e.target.files);
  files.forEach(function(f) {
    var r = new FileReader();
    r.onload = function(ev) {
      photoCounter++;
      var id = photoCounter;
      photos[id] = { src: ev.target.result, cap: '' };
      renderPhotoGrid();
      upProg();
    };
    r.readAsDataURL(f);
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
