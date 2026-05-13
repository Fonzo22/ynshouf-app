async function genReport() {

  var errs = [];
  if (!$('inspName').value) errs.push('שם פקח');
  if (!$('inspNum').value)  errs.push('מספר פקח');
  if (!$('iDate').value)    errs.push('תאריך');
  if (!$('iType').value)    errs.push('סוג אירוע');
  if (!$('iDesc').value)    errs.push('מהות האירוע');
  if (errs.length) { toast('חסר: ' + errs.join(', '), 'err'); return; }

  toast('מייצר דוח...');

  try {
    var D = window.docx;
    if (!D) throw new Error('ספריית docx לא נטענה');
    if (!D.patchDocument) throw new Error('patchDocument אינו זמין בגרסה זו');

    var tplResp = await fetch('./YNSHOUF_Template.docx');
    if (!tplResp.ok) throw new Error('לא ניתן לטעון תבנית (שגיאת HTTP ' + tplResp.status + ')');
    var tplBuffer = await tplResp.arrayBuffer();

    var dateHe = $('iDate').value
      ? new Date($('iDate').value).toLocaleDateString('he-IL') : '';

    var viol = $('vViol').value === 'אחר'
      ? $('vViolManual').value
      : $('vViol').value;

    function tr(text, opts) {
      opts = opts || {};
      var cfg = { text: String(text || '—'), rightToLeft: true, font: 'Arial' };
      if (opts.bold  !== undefined) cfg.bold  = opts.bold;
      if (opts.color !== undefined) cfg.color = opts.color;
      if (opts.size  !== undefined) cfg.size  = opts.size;
      return new D.TextRun(cfg);
    }

    function rtlP(text, opts) {
      opts = opts || {};
      return new D.Paragraph({
        bidirectional: true,
        alignment: D.AlignmentType.RIGHT,
        spacing: opts.spacing || { after: 0 },
        children: [tr(text, opts)]
      });
    }

    // incident_description — multi-line, 12pt
    var descParas = ($('iDesc').value || '').split('\n').map(function(line) {
      return rtlP(line || ' ', { size: 24, color: '000000', spacing: { line: 360, lineRule: 'auto', after: 0 } });
    });

    // photos
    var photoParagraphs = [];
    var sortedIds = Object.keys(photos).map(Number).sort(function(a, b) { return a - b; });
    sortedIds.forEach(function(photoId, i) {
      var src = photos[photoId].src;
      var cap = photos[photoId].cap || '';
      var m = src.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!m) return;
      var imgType = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
      var bin = atob(m[2]);
      var bytes = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      var paddedN = String(i + 1).padStart(2, '0');
      photoParagraphs.push(new D.Paragraph({
        bidirectional: true,
        alignment: D.AlignmentType.CENTER,
        spacing: { before: 120, after: 40 },
        children: [new D.ImageRun({
          data: bytes,
          transformation: { width: 450, height: 338 },
          type: imgType
        })]
      }));
      photoParagraphs.push(new D.Paragraph({
        bidirectional: true,
        alignment: D.AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [tr('תמונה מספר ' + paddedN + (cap ? ': ' + cap : ''), { size: 20 })]
      }));
    });
    if (photoParagraphs.length === 0) {
      photoParagraphs.push(rtlP('אין תמונות מצורפות'));
    }

    // map image — Google Static Maps (satellite, zoom 15)
    var mapPatch;
    var gpsStr = $('cGPS').value;
    if (gpsStr && gpsStr.indexOf(',') > -1) {
      var gpsParts = gpsStr.split(',');
      var mlat = gpsParts[0].trim(), mlng = gpsParts[1].trim();
      var mapUrl = 'https://maps.googleapis.com/maps/api/staticmap'
        + '?center=' + mlat + ',' + mlng
        + '&zoom=15&size=450x338&maptype=satellite'
        + '&markers=color:red%7C' + mlat + ',' + mlng
        + '&key=AIzaSyBqllNgJtF_5DaQrXSlkdE2MxlByacf77o';
      try {
        var mapResp = await fetch(mapUrl);
        if (mapResp.ok) {
          var mapAb = await mapResp.arrayBuffer();
          var mapBytes = new Uint8Array(mapAb);
          mapPatch = { type: D.PatchType.PARAGRAPH, children: [new D.ImageRun({
            data: mapBytes,
            transformation: { width: 450, height: 338 },
            type: 'png'
          })] };
        }
      } catch(e) {}
    }
    if (!mapPatch) {
      mapPatch = { type: D.PatchType.PARAGRAPH, children: [new D.TextRun({ text: '', rightToLeft: true })] };
    }

    // {{signature}} in body → empty (signature goes to footer via JSZip)
    var sigPatch = { type: D.PatchType.PARAGRAPH, children: [new D.TextRun({ text: '', rightToLeft: true })] };

    // sizes in half-points: 18pt=36, 14pt=28, 12pt=24
    var TBL = { size: 24, color: '000000' };
    var patches = {
      report_id:            { type: D.PatchType.PARAGRAPH, children: [tr(reportId,                    TBL)] },
      report_date:          { type: D.PatchType.PARAGRAPH, children: [tr('תאריך כתיבת הדוח: ' + new Date().toLocaleDateString('he-IL'), { size: 20, color: '000000' })] },
      inspector_name:       { type: D.PatchType.PARAGRAPH, children: [tr($('inspName').value,         TBL)] },
      inspector_num:        { type: D.PatchType.PARAGRAPH, children: [tr($('inspNum').value,          TBL)] },
      date:                 { type: D.PatchType.PARAGRAPH, children: [tr(dateHe,                      TBL)] },
      time:                 { type: D.PatchType.PARAGRAPH, children: [tr($('iTime').value,            TBL)] },
      report_type:          { type: D.PatchType.PARAGRAPH, children: [tr($('iType').value, { size: 24, color: '000000', bold: false })] },
      report_sub:           { type: D.PatchType.PARAGRAPH, children: [tr($('iSub').value,  { bold: false, size: 28, color: '2E74B5' })] },
      location:             { type: D.PatchType.PARAGRAPH, children: [tr($('iLoc').value,             TBL)] },
      place_name:           { type: D.PatchType.PARAGRAPH, children: [tr($('placeName').value,        TBL)] },
      coord_gps:            { type: D.PatchType.PARAGRAPH, children: [tr($('cGPS').value,             TBL)] },
      coord_itm:            { type: D.PatchType.PARAGRAPH, children: [tr($('cITM').value,             TBL)] },
      incident_description: { type: D.PatchType.DOCUMENT,  children: descParas },
      v_plate:              { type: D.PatchType.PARAGRAPH, children: [tr($('vPlate').value,           TBL)] },
      v_type:               { type: D.PatchType.PARAGRAPH, children: [tr($('vType').value,            TBL)] },
      v_owner:              { type: D.PatchType.PARAGRAPH, children: [tr($('vOwner').value,           TBL)] },
      v_id:                 { type: D.PatchType.PARAGRAPH, children: [tr($('vId').value,              TBL)] },
      v_addr:               { type: D.PatchType.PARAGRAPH, children: [tr($('vAddr').value,            TBL)] },
      violation:            { type: D.PatchType.PARAGRAPH, children: [tr(viol,                        TBL)] },
      v_waste:              { type: D.PatchType.PARAGRAPH, children: [tr($('vWaste').value,           TBL)] },
      jurisdiction:         { type: D.PatchType.PARAGRAPH, children: [tr($('iJuris').value,           TBL)] },
      block:                { type: D.PatchType.PARAGRAPH, children: [tr($('iBlock').value,           TBL)] },
      parcel:               { type: D.PatchType.PARAGRAPH, children: [tr($('iParcel').value,          TBL)] },
      map_image:            mapPatch,
      photos:               { type: D.PatchType.DOCUMENT,  children: photoParagraphs },
      signature:            sigPatch
    };

    var result = await D.patchDocument(tplBuffer, {
      patches: patches,
      keepOriginalStyles: true
    });

    // Patch footer via JSZip (patchDocument doesn't handle footers)
    if (typeof JSZip !== 'undefined') {
      try {
        function xmlEsc(s) {
          return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        var zip = await JSZip.loadAsync(result);
        var ftFile = zip.file('word/footer1.xml');
        if (ftFile) {
          var ftXml = await ftFile.async('text');

          // replace text placeholders
          ftXml = ftXml.replace(/YNSHOUF_NAME/g, xmlEsc($('inspName').value || ''));
          ftXml = ftXml.replace(/YNSHOUF_NUM/g,  xmlEsc($('inspNum').value  || ''));

          // add signature image if canvas has content
          if (!sigEmpty && sigCanvas) {
            var sigDataUrl = sigCanvas.toDataURL('image/png');
            var sigB64     = sigDataUrl.split(',')[1];
            var sigBin     = atob(sigB64);
            var sigBytesZip = new Uint8Array(sigBin.length);
            for (var si = 0; si < sigBin.length; si++) sigBytesZip[si] = sigBin.charCodeAt(si);

            // add PNG to media folder
            zip.file('word/media/inspector-sig.png', sigBytesZip);

            // create footer1.xml.rels — Target is relative to word/ folder
            var relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
              + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
              + '<Relationship Id="rId1"'
              + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"'
              + ' Target="media/inspector-sig.png"/>'
              + '</Relationships>';
            zip.file('word/_rels/footer1.xml.rels', relsXml);

            // build <w:drawing> paragraph — xmlns:r already on root <w:ftr>, add a/pic inline
            // 1800000 x 600000 EMU ≈ 2" x 0.65", left-aligned
            var drawXml = '<w:p>'
              + '<w:pPr><w:bidi w:val="0"/><w:jc w:val="left"/><w:ind w:left="0" w:right="0"/></w:pPr>'
              + '<w:r><w:drawing>'
              + '<wp:inline distT="0" distB="0" distL="0" distR="0">'
              + '<wp:extent cx="1800000" cy="600000"/>'
              + '<wp:docPr id="101" name="inspector-sig"/>'
              + '<wp:cNvGraphicFramePr>'
              + '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>'
              + '</wp:cNvGraphicFramePr>'
              + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
              + '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
              + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
              + '<pic:nvPicPr>'
              + '<pic:cNvPr id="101" name="inspector-sig"/>'
              + '<pic:cNvPicPr/>'
              + '</pic:nvPicPr>'
              + '<pic:blipFill>'
              + '<a:blip r:embed="rId1"/>'
              + '<a:stretch><a:fillRect/></a:stretch>'
              + '</pic:blipFill>'
              + '<pic:spPr>'
              + '<a:xfrm><a:off x="0" y="0"/><a:ext cx="1800000" cy="600000"/></a:xfrm>'
              + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
              + '</pic:spPr>'
              + '</pic:pic>'
              + '</a:graphicData>'
              + '</a:graphic>'
              + '</wp:inline>'
              + '</w:drawing></w:r></w:p>';

            // insert before closing </w:ftr>
            ftXml = ftXml.replace('</w:ftr>', drawXml + '</w:ftr>');
          }

          zip.file('word/footer1.xml', ftXml);
          result = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
        }
      } catch(e) { console.warn('footer patch failed:', e); }
    }

    // patchDocument returns Uint8Array — wrap in Blob
    var blob = new Blob([result], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'דוח_' + reportId + '.docx';
    a.click();

    saveDraft();
    toast('הדוח הורד ✓ — מעלה לדרייב...');

    // filename: [incident_type]_[dd.mm.yyyy].docx
    var dRaw = new Date($('iDate').value);
    var driveDate = String(dRaw.getDate()).padStart(2,'0') + '.' + String(dRaw.getMonth()+1).padStart(2,'0') + '.' + dRaw.getFullYear();
    var driveFilename = ($('iType').value || 'דוח').replace(/[\s/\\:*?"<>|]+/g, '_') + '_' + driveDate + '.docx';
    saveToDrive(blob, driveFilename, $('inspName').value).then(function() {
      toast('הדוח הורד ✓ — הועלה לגוגל דרייב ✓');
    }).catch(function(err) {
      console.warn('Drive upload failed:', err);
      toast('הדוח הורד ✓ — ההעלאה לדרייב נכשלה', 'err');
    });

  } catch(err) {
    toast('שגיאה: ' + err.message, 'err');
    console.error(err);
  }
}




// סוף קובץ
