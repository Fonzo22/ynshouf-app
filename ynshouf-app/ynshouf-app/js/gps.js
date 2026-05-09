var gpsMap = null, gpsMarker = null, _gpsMapPending = null;

window._gMapsReady = function() {
  if (_gpsMapPending) {
    _doShowMap(_gpsMapPending.lat, _gpsMapPending.lng);
    _gpsMapPending = null;
  }
};

function showGpsMap(lat, lng) {
  $('gpsMap').classList.add('show');
  if (typeof google !== 'undefined' && google.maps) {
    _doShowMap(lat, lng);
  } else if (!document.getElementById('gmaps-script')) {
    _gpsMapPending = {lat: lat, lng: lng};
    var s = document.createElement('script');
    s.id = 'gmaps-script';
    s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBqllNgJtF_5DaQrXSlkdE2MxlByacf77o&callback=_gMapsReady';
    s.async = true;
    document.head.appendChild(s);
  } else {
    _gpsMapPending = {lat: lat, lng: lng};
  }
}

function _doShowMap(lat, lng) {
  var mapEl = $('gpsMap');
  var pos = {lat: lat, lng: lng};
  if (gpsMap) {
    gpsMap.setCenter(pos);
    gpsMarker.setPosition(pos);
  } else {
    gpsMap = new google.maps.Map(mapEl, {
      center: pos,
      zoom: 15,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    gpsMarker = new google.maps.Marker({
      position: pos,
      map: gpsMap,
      title: 'מיקום האירוע'
    });
  }
}

function _doReverseGeocode(lat, lng) {
  if ($('iLoc').value) return;
  var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&accept-language=he&zoom=18';
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if ($('iLoc').value || !data || !data.address) return;
      var a = data.address;
      var street = a.road || a.pedestrian || a.path || '';
      if (street && a.house_number) street = a.house_number + ' ' + street;
      var city = a.city || a.town || a.village || a.municipality || a.county || '';
      var parts = [street, city].filter(Boolean);
      var result = parts.join(', ');
      if (!result && data.display_name) {
        result = data.display_name.split(',').slice(0, 2).map(function(s) { return s.trim(); }).join(', ')
          .replace(/,?\s*ישראל$/, '').replace(/,?\s*Israel$/i, '').trim();
      }
      if (result) { $('iLoc').value = result; upProg(); }
    })
    .catch(function() {});
}

function getGPS() {
  if (!navigator.geolocation) { toast('מכשיר זה אינו תומך ב-GPS', 'err'); return; }
  toast('מאתר מיקום...', 'warn');
  var status = $('govmapStatus');
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      $('cGPS').value = lat.toFixed(6) + ', ' + lng.toFixed(6);
      showGpsMap(lat, lng);
      _doReverseGeocode(lat, lng);
      // המרה ל-ITM
      try {
        var itm = proj4('EPSG:4326', 'EPSG:2039', [lng, lat]);
        var x = Math.round(itm[0]);
        var y = Math.round(itm[1]);
        $('cITM').value = x + ', ' + y;
        toast('GPS נטען ✓ — מאתר גוש/חלקה...');
        status.textContent = 'מאתר גוש וחלקה...';
        var govmapUrl = 'https://www.govmap.gov.il/?c=' + x + ',' + y + '&zoom=7&lang=0';

        function applyGovmapResult(d) {
          if (d && d.block) {
            $('iBlock').value = d.block;
            $('iParcel').value = d.parcel || '';
            if (d.jurisdiction) $('iJuris').value = d.jurisdiction;
            status.innerHTML = 'גוש ' + d.block + ', חלקה ' + (d.parcel || '—') + ' ✓';
            toast('גוש וחלקה נטענו ✓');
            return true;
          }
          return false;
        }

        function showGovmapFallback() {
          status.innerHTML = '<a href="' + govmapUrl + '" target="_blank" rel="noopener" style="color:var(--sage);font-weight:700;">פתח ב-Govmap לאיתור גוש/חלקה ↗</a>';
        }

        function parseGetFeatureInfo(d) {
          if (!d) return null;
          if (Array.isArray(d.data)) {
            for (var li = 0; li < d.data.length; li++) {
              var rows = d.data[li].Rows || d.data[li].rows || [];
              if (rows.length) {
                var attrs = rows[0].Attributes || rows[0].attributes || rows[0];
                var bl = attrs.GUSH_NUM || attrs.gush_num || attrs.GUSH;
                var pa = attrs.HELKA_NUM || attrs.helka_num || attrs.HELKA;
                var ju = attrs.SHEM_YISHUV || attrs.shem_yishuv || '';
                if (bl) return { block: String(bl), parcel: pa ? String(pa) : '', jurisdiction: ju };
              }
            }
          }
          return null;
        }

        // ניסיון ראשון: קריאה ישירה מהדפדפן (עובד מ-IP ביתי/סלולרי)
        var directUrl = 'https://api.govmap.gov.il/Query/GetFeatureInfo?RequestType=json&LayerNames=PARCEL&X=' + x + '&Y=' + y + '&Buffer=50&SRID=2039';
        fetch(directUrl)
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(d) {
            var result = parseGetFeatureInfo(d);
            if (!applyGovmapResult(result)) {
              // ניסיון שני: דרך ה-Worker (fallback)
              return fetch(WORKER + '/govmap?x=' + x + '&y=' + y)
                .then(function(r) { return r.json(); })
                .then(function(wd) { if (!applyGovmapResult(wd)) showGovmapFallback(); })
                .catch(showGovmapFallback);
            }
          })
          .catch(function() {
            // CORS חסם — נסה דרך ה-Worker
            fetch(WORKER + '/govmap?x=' + x + '&y=' + y)
              .then(function(r) { return r.json(); })
              .then(function(wd) { if (!applyGovmapResult(wd)) showGovmapFallback(); })
              .catch(showGovmapFallback);
          });
      } catch(e) {
        $('cITM').value = 'שגיאת המרה';
        toast('GPS נטען ✓');
      }
    },
    function() { toast('שגיאה באיתור מיקום', 'err'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// סוף קובץ
