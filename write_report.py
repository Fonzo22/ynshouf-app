path = r'c:/Users/Fonz/ynshouf-app/ynshouf-app/ynshouf-app/js/report.js'

new_content = """\
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
      return new D.TextRun({
        text: String(text || '—'),
        bold: opts.bold || false,
        color: opts.color || '000000',
        size: opts.size || 22,
        font: 'David',
        rightToLeft: true
      });
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

    // incident_description — multi-line
    var descParas = ($('iDesc').value || '').split('\\n').map(function(line) {
      return rtlP(line || ' ');
    });

    // photos
    var photoParagraphs = [];
    var sortedIds = Object.keys(photos).map(Number).sort(function(a, b) { return a - b; });
    sortedIds.forEach(function(photoId, i) {
      var src = photos[photoId].src;
      var cap = photos[photoId].cap || '';
      var m = src.match(/^data:image\\/(\\w+);base64,(.+)$/);
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

    var patches = {
      report_id:            { type: D.PatchType.PARAGRAPH, children: [tr(reportId)] },
      inspector_name:       { type: D.PatchType.PARAGRAPH, children: [tr($('inspName').value)] },
      inspector_num:        { type: D.PatchType.PARAGRAPH, children: [tr($('inspNum').value)] },
      date:                 { type: D.PatchType.PARAGRAPH, children: [tr(dateHe)] },
      time:                 { type: D.PatchType.PARAGRAPH, children: [tr($('iTime').value)] },
      report_type:          { type: D.PatchType.PARAGRAPH, children: [tr($('iType').value, { bold: true })] },
      report_sub:           { type: D.PatchType.PARAGRAPH, children: [tr($('iSub').value)] },
      location:             { type: D.PatchType.PARAGRAPH, children: [tr($('iLoc').value)] },
      place_name:           { type: D.PatchType.PARAGRAPH, children: [tr($('placeName').value)] },
      coord_gps:            { type: D.PatchType.PARAGRAPH, children: [tr($('cGPS').value)] },
      coord_itm:            { type: D.PatchType.PARAGRAPH, children: [tr($('cITM').value)] },
      incident_description: { type: D.PatchType.DOCUMENT,  children: descParas },
      v_plate:              { type: D.PatchType.PARAGRAPH, children: [tr($('vPlate').value)] },
      v_type:               { type: D.PatchType.PARAGRAPH, children: [tr($('vType').value)] },
      v_owner:              { type: D.PatchType.PARAGRAPH, children: [tr($('vOwner').value)] },
      v_id:                 { type: D.PatchType.PARAGRAPH, children: [tr($('vId').value)] },
      v_addr:               { type: D.PatchType.PARAGRAPH, children: [tr($('vAddr').value)] },
      violation:            { type: D.PatchType.PARAGRAPH, children: [tr(viol)] },
      v_waste:              { type: D.PatchType.PARAGRAPH, children: [tr($('vWaste').value)] },
      jurisdiction:         { type: D.PatchType.PARAGRAPH, children: [tr($('iJuris').value)] },
      block:                { type: D.PatchType.PARAGRAPH, children: [tr($('iBlock').value)] },
      parcel:               { type: D.PatchType.PARAGRAPH, children: [tr($('iParcel').value)] },
      map_image:            { type: D.PatchType.PARAGRAPH, children: [tr($('cGPS').value || 'אין קואורדינטות')] },
      photos:               { type: D.PatchType.DOCUMENT,  children: photoParagraphs }
    };

    var blob = await D.patchDocument(tplBuffer, {
      outputType: 'blob',
      patches: patches,
      keepOriginalStyles: true
    });

    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'דוח_' + reportId + '.docx';
    a.click();

    saveDraft();
    toast('הדוח הורד ✓');

  } catch(err) {
    toast('שגיאה: ' + err.message, 'err');
    console.error(err);
  }
}




// סוף קובץ
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done OK — lines:', new_content.count('\n'))
