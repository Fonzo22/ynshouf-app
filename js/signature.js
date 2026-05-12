var sigCanvas, sigCtx, sigDrawing = false, sigEmpty = true;

function initCanvas() {
  sigCanvas = $('sigCanvas');
  if (!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  // גודל canvas אמיתי לפי רוחב
  function resize() {
    var w = sigCanvas.offsetWidth;
    sigCanvas.width = w;
    sigCanvas.height = 120;
    sigCtx.strokeStyle = '#0d1f17';
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
  }
  resize();

  function getPos(ev) {
    var r = sigCanvas.getBoundingClientRect();
    var src = ev.touches ? ev.touches[0] : ev;
    return { x: (src.clientX - r.left) * (sigCanvas.width / r.width),
             y: (src.clientY - r.top) * (sigCanvas.height / r.height) };
  }
  function start(ev) { ev.preventDefault(); sigDrawing=true; sigEmpty=false; var p=getPos(ev); sigCtx.beginPath(); sigCtx.moveTo(p.x,p.y); }
  function move(ev)  { ev.preventDefault(); if(!sigDrawing) return; var p=getPos(ev); sigCtx.lineTo(p.x,p.y); sigCtx.stroke(); }
  function stop()    { sigDrawing=false; }

  sigCanvas.addEventListener('mousedown', start);
  sigCanvas.addEventListener('mousemove', move);
  sigCanvas.addEventListener('mouseup', stop);
  sigCanvas.addEventListener('mouseleave', stop);
  sigCanvas.addEventListener('touchstart', start, {passive:false});
  sigCanvas.addEventListener('touchmove', move, {passive:false});
  sigCanvas.addEventListener('touchend', stop);
}

function clearSig() {
  if (!sigCtx) return;
  sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);
  sigEmpty = true;
}

// סוף קובץ
