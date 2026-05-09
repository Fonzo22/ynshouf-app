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

    var dateHe = $('iDate').value

      ? new Date($('iDate').value).toLocaleDateString('he-IL') : '';

    var GREEN = '1A7A4A', LIGHT_BG = 'F0F9F4', BORDER_GR = 'CCCCCC';



    function run(text, opts) {

      opts = opts || {};

      return new D.TextRun({

        text: String(text || ''),

        bold:  opts.bold  || false,

        color: opts.color || '000000',

        size:  opts.size  || 22,

        font:  'David',

        rightToLeft: true,

        language: { bidi: 'he-IL' }

      });

    }



    function rtlPara(text, opts) {

      opts = opts || {};

      return new D.Paragraph({

        bidirectional: true,

        alignment: opts.center ? D.AlignmentType.CENTER : D.AlignmentType.RIGHT,

        spacing: opts.spacing || { after: 80 },

        children: [run(text, opts)]

      });

    }



    function sectionHdr(text) {

      return new D.Paragraph({

        bidirectional: true,

        alignment: D.AlignmentType.RIGHT,

        spacing: { before: 240, after: 100 },

        border: { bottom: {

          style: D.BorderStyle.SINGLE, size: 6, color: GREEN, space: 4

        }},

        children: [run(text, { bold: true, color: GREEN, size: 24 })]

      });

    }



    var brd = { style: D.BorderStyle.SINGLE, size: 4, color: BORDER_GR };

    var allBrd = { top: brd, bottom: brd, left: brd, right: brd };

    var noBrd  = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    var noBrds = { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd };



    function detailRow(label, value) {

      return new D.TableRow({ children: [

        new D.TableCell({

          width: { size: 6000, type: D.WidthType.DXA },

          borders: allBrd,

          margins: { top: 80, bottom: 80, left: 80, right: 80 },

          textDirection: D.TextDirection.RIGHT_TO_LEFT,

          children: [new D.Paragraph({

            bidirectional: true, alignment: D.AlignmentType.RIGHT,

            rightTabStop: D.TabStopPosition.MAX,

            children: [run(String(value || ''), { size: 20 })]

          })]

        }),

        new D.TableCell({

          width: { size: 3000, type: D.WidthType.DXA },

          borders: allBrd,

          margins: { top: 80, bottom: 80, left: 80, right: 80 },

          shading: { type: D.ShadingType.CLEAR, fill: LIGHT_BG, color: LIGHT_BG },

          textDirection: D.TextDirection.RIGHT_TO_LEFT,

          children: [new D.Paragraph({

            bidirectional: true, alignment: D.AlignmentType.RIGHT,

            rightTabStop: D.TabStopPosition.MAX,

            children: [run(label, { bold: true, color: '555555', size: 20 })]

          })]

        })

      ]});

    }



    var logoBin = atob(LOGO_B64);

    var logoBytes = new Uint8Array(logoBin.length);

    for (var li = 0; li < logoBin.length; li++) logoBytes[li] = logoBin.charCodeAt(li);



    var headerTable = new D.Table({

      width: { size: 9000, type: D.WidthType.DXA },

      borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,

                 insideH: noBrd, insideV: noBrd },

      rows: [new D.TableRow({ children: [

        new D.TableCell({

          width: { size: 2500, type: D.WidthType.DXA }, borders: noBrds,

          verticalAlign: D.VerticalAlign.CENTER,

          children: [

            rtlPara(dateHe,   { size: 20, color: '888888', spacing: { after: 40 } }),

            rtlPara(reportId, { size: 18, color: '888888', spacing: { after: 0  } })

          ]

        }),

        new D.TableCell({

          width: { size: 4000, type: D.WidthType.DXA }, borders: noBrds,

          verticalAlign: D.VerticalAlign.CENTER,

          children: [

            new D.Paragraph({

              bidirectional: true, alignment: D.AlignmentType.CENTER,

              spacing: { after: 40 },

              children: [new D.ImageRun({

                data: logoBytes,

                transformation: { width: 80, height: 63 },

                type: 'png'

              })]

            }),

            new D.Paragraph({

              bidirectional: true, alignment: D.AlignmentType.CENTER,

              spacing: { after: 0 },

              children: [run('דוח אירוע', { bold: true, size: 26 })]

            })

          ]

        }),

        new D.TableCell({

          width: { size: 2500, type: D.WidthType.DXA }, borders: noBrds,

          verticalAlign: D.VerticalAlign.CENTER,

          children: [

            rtlPara($('inspName').value, { size: 20, spacing: { after: 40 } }),

            rtlPara($('inspNum').value,  { size: 18, color: '888888', spacing: { after: 0 } })

          ]

        })

      ]})]

    });



    var children = [headerTable];



    children.push(new D.Paragraph({

      bidirectional: true, alignment: D.AlignmentType.CENTER,

      spacing: { before: 160, after: 80 },

      children: [run($('iType').value, { bold: true, size: 36 })]

    }));



    if ($('iSub').value) {

      children.push(new D.Paragraph({

        bidirectional: true, alignment: D.AlignmentType.CENTER,

        spacing: { after: 160 },

        children: [run($('iSub').value, { size: 24 })]

      }));

    }



    children.push(sectionHdr('מהות האירוע'));

    $('iDesc').value.split('\n').forEach(function(line) {

      children.push(rtlPara(line || ' ', { size: 22, spacing: { after: 60 } }));

    });



    var rows = [];

    rows.push(detailRow('מספר דוח',        reportId));

    rows.push(detailRow('שם פקח',          $('inspName').value));

    rows.push(detailRow('מספר פקח',        $('inspNum').value));

    rows.push(detailRow('תאריך',           dateHe));

    rows.push(detailRow('שעה',             $('iTime').value));

    if ($('iLoc').value)     rows.push(detailRow('מיקום / כתובת',   $('iLoc').value));

    if ($('iJuris').value)   rows.push(detailRow('רשות מקומית',      $('iJuris').value));

    if ($('iBlock').value)   rows.push(detailRow('גוש',              $('iBlock').value));

    if ($('iParcel').value)  rows.push(detailRow('חלקה',             $('iParcel').value));

    if ($('cGPS').value)     rows.push(detailRow('קואורדינטות GPS',  $('cGPS').value));

    if ($('cITM').value)     rows.push(detailRow('קואורדינטות ITM',  $('cITM').value));

    if ($('placeName').value) rows.push(detailRow('שם המקום',        $('placeName').value));

    if ($('vPlate').value)   rows.push(detailRow('לוחית רישוי',      $('vPlate').value));

    if ($('vType').value)    rows.push(detailRow('סוג רכב',          $('vType').value));

    if ($('vOwner').value)   rows.push(detailRow('בעלים / מבצע',     $('vOwner').value));

    if ($('vId').value)      rows.push(detailRow('מס\u05f3 ח.פ. / ת.ז.', $('vId').value));

    if ($('vAddr').value)    rows.push(detailRow('כתובת בעלים',      $('vAddr').value));

    var viol = getViol();

    if (viol)                rows.push(detailRow('תיאור העבירה',     viol));

    if ($('vWaste').value)   rows.push(detailRow('סוג פסולת',        $('vWaste').value));



    children.push(sectionHdr('פרטים'));

    children.push(new D.Table({

      width: { size: 9000, type: D.WidthType.DXA },

      rows: rows

    }));



    var sortedIds = Object.keys(photos).map(Number).sort(function(a,b){return a-b;});

    if (sortedIds.length > 0) {

      children.push(sectionHdr('תמונות'));

      sortedIds.forEach(function(photoId, i) {

        var n   = i + 1;

        var src = photos[photoId].src;

        var cap = photos[photoId].cap || '';

        var m   = src.match(/^data:image\/(\w+);base64,(.+)$/);

        if (!m) return;

        var imgType = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();

        var bin = atob(m[2]);

        var bytes = new Uint8Array(bin.length);

        for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);

        var paddedN = String(n).padStart(2, '0');

        children.push(new D.Paragraph({

          bidirectional: true, alignment: D.AlignmentType.CENTER,

          spacing: { before: 120, after: 40 },

          children: [new D.ImageRun({

            data: bytes,

            transformation: { width: 450, height: 338 },

            type: imgType

          })]

        }));

        children.push(rtlPara(

          '\u05ea\u05de\u05d5\u05e0\u05d4 \u05de\u05e1\u05e4\u05e8 ' + paddedN + (cap ? ' : ' + cap : ''),

          { size: 20, spacing: { after: 160 } }

        ));

      });

    }



    children.push(sectionHdr('\u05d7\u05ea\u05d9\u05de\u05d4 \u05d5\u05d0\u05d9\u05e9\u05d5\u05e8'));

    children.push(rtlPara('\u05e9\u05dd \u05e4\u05e7\u05d7: '     + $('inspName').value, { size: 22 }));

    children.push(rtlPara('\u05de\u05e1\u05e4\u05e8 \u05e2\u05d5\u05d1\u05d3: '  + $('inspNum').value,  { size: 22 }));

    children.push(rtlPara('\u05ea\u05d0\u05e8\u05d9\u05da: '      + dateHe, { size: 22, spacing: { after: 400 } }));



    var doc = new D.Document({

      creator: '\u05d9\u05d7\u05d9\u05d3\u05ea \u05d9\u05e0\u05e9\u05d5"\u05e4',

      description: '\u05d3\u05d5\u05d7 \u05d0\u05d9\u05e8\u05d5\u05e2 ' + reportId,

      defaultTabStop: 708,
      styles: {
        default: {
          document: {
            run: {
              language: { bidi: 'he-IL' }
            },
            paragraph: {
              bidirectional: true,
              alignment: D.AlignmentType.RIGHT
            }
          }
        },
        paragraphStyles: [
          {
            id: 'Normal',
            name: 'Normal',
            run: { font: 'David', size: 22, language: { bidi: 'he-IL' } },
            paragraph: { bidirectional: true, alignment: D.AlignmentType.RIGHT }
          }
        ]
      },
      sections: [{

        properties: {

          bidi: true,

          page: {

            size: { width: 11906, height: 16838 },

            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }

          }

        },

        children: children

      }]

    });



    var blob = await D.Packer.toBlob(doc);

    var a = document.createElement('a');

    a.href = URL.createObjectURL(blob);

    a.download = '\u05d3\u05d5\u05d7_' + reportId + '.docx';

    a.click();

    saveDraft();

    toast('\u05d4\u05d3\u05d5\u05d7 \u05d4\u05d5\u05e8\u05d3 \u2713');



  } catch(err) {

    toast('\u05e9\u05d2\u05d9\u05d0\u05d4: ' + err.message, 'err');

    console.error(err);

  }

}




// סוף קובץ
