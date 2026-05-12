function _decodeJWT(token) {
  var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  var pad = base64.length % 4;
  if (pad) base64 += '===='.slice(pad);
  return JSON.parse(atob(base64));
}

function handleCredentialResponse(response) {
  var payload = _decodeJWT(response.credential);
  var email = (payload.email || '').toLowerCase();
  if (!ALLOWED_USERS.map(function(e){return e.toLowerCase();}).includes(email)) {
    var err = $('authError');
    err.textContent = 'המשתמש ' + email + ' אינו מורשה.';
    err.style.display = 'block';
    return;
  }
  sessionStorage.setItem('yns_user', JSON.stringify({
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  }));
  _showApp();
}

function _showApp() {
  var screen = $('authScreen');
  if (screen) screen.style.display = 'none';
  var btn = $('btnLogout');
  if (btn) btn.style.display = '';
}

function signOut() {
  sessionStorage.removeItem('yns_user');
  if (typeof google !== 'undefined' && google.accounts) {
    google.accounts.id.disableAutoSelect();
  }
  location.reload();
}

function _loadGoogleScript() {
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.onload = function() {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
    });
    google.accounts.id.renderButton(
      $('g_id_signin'),
      { theme: 'filled_black', size: 'large', text: 'signin_with', locale: 'he', width: 280 }
    );
  };
  document.head.appendChild(s);
}

(function initAuth() {
  var user = null;
  try { user = JSON.parse(sessionStorage.getItem('yns_user')); } catch(e) {}
  if (user && ALLOWED_USERS.map(function(e){return e.toLowerCase();}).includes((user.email||'').toLowerCase())) {
    _showApp();
    return;
  }
  var screen = $('authScreen');
  if (screen) screen.style.display = 'flex';
  _loadGoogleScript();
})();

// סוף קובץ
