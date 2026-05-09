#!/usr/bin/env python3
"""
Rebuilds index.html from the clean git version with all required changes:
1. Replace pizzip/docxtemplater script tags with local docx.min.js
2. Add LOGO_B64 constant
3. Remove getCap + getPhotoLabel functions
4. Replace genReport with new docx-based implementation
Preserves Hebrew encoding correctly (UTF-8 with BOM).
"""
import subprocess, sys

CLEAN_FILE  = r'C:/Users/Fonz/AppData/Local/Temp/index_clean.html'
TARGET_FILE = r'c:\Users\Fonz\ynshouf-app\ynshouf-app\ynshouf-app\index.html'
LOGO_B64_FILE = r'c:\Users\Fonz\ynshouf-app\docs\superpowers\specs\logo_b64.txt'

# ── 1. Read clean file (UTF-8 no-BOM from git) ──────────────────────────────
with open(CLEAN_FILE, encoding='utf-8') as f:
    content = f.read()

print(f'Read clean file: {len(content)} chars')

# ── 2. Read logo base64 ───────────────────────────────────────────────────────
with open(LOGO_B64_FILE, encoding='utf-8') as f:
    logo_b64 = f.read().strip()

print(f'Logo b64 length: {len(logo_b64)}')

# ── 3. Replace script tags ────────────────────────────────────────────────────
OLD_SCRIPTS = (
    '<script src="https://unpkg.com/pizzip@3.1.7/dist/pizzip.min.js"></script>\n'
    '<script src="https://unpkg.com/docxtemplater@3.37.12/build/docxtemplater.js"></script>'
)
NEW_SCRIPTS = '<script src="./docx.min.js"></script>'

if OLD_SCRIPTS in content:
    content = content.replace(OLD_SCRIPTS, NEW_SCRIPTS, 1)
    print('OK: replaced pizzip/docxtemplater script tags with docx.min.js')
else:
    print('WARNING: old script tags not found — checking alternatives')
    # try just docxtemplater line
    ALT = '<script src="https://unpkg.com/docxtemplater@3.37.12/build/docxtemplater.js"></script>'
    if ALT in content:
        content = content.replace(ALT, NEW_SCRIPTS, 1)
        # also remove pizzip if present
        PIZZIP = '<script src="https://unpkg.com/pizzip@3.1.7/dist/pizzip.min.js"></script>\n'
        content = content.replace(PIZZIP, '', 1)
        print('OK: replaced via alternative match')
    else:
        print('ERROR: cannot find old script tags')
        sys.exit(1)

# ── 4. Add LOGO_B64 constant after the <script> tags block ──────────────────
# Insert after the proj4 script tag (which stays)
PROJ4_TAG = '<script src="https://unpkg.com/proj4@2.9.0/dist/proj4.js"></script>'
LOGO_INJECT = (
    '\n<script>\nvar LOGO_B64 = "' + logo_b64 + '";\n</script>'
)
if PROJ4_TAG in content:
    content = content.replace(PROJ4_TAG, PROJ4_TAG + LOGO_INJECT, 1)
    print('OK: LOGO_B64 injected after proj4 tag')
else:
    print('ERROR: proj4 tag not found')
    sys.exit(1)

# ── 5. Remove getCap + getPhotoLabel ─────────────────────────────────────────
import re
pattern = r'function getCap\(n\) \{.*?function getPhotoLabel\(n\) \{.*?\}\n'
match = re.search(pattern, content, re.DOTALL)
if match:
    content = content[:match.start()] + content[match.end():]
    print('OK: removed getCap + getPhotoLabel')
else:
    print('WARNING: getCap/getPhotoLabel not found (may already be removed)')

# ── 6. Replace genReport ──────────────────────────────────────────────────────
NEW_GENREPORT = '''async function genReport() {
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
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new D.Paragraph({
            bidirectional: true, alignment: D.AlignmentType.RIGHT,
            children: [run(String(value || ''), { size: 20 })]
          })]
        }),
        new D.TableCell({
          width: { size: 3000, type: D.WidthType.DXA },
          borders: allBrd,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { type: D.ShadingType.CLEAR, fill: LIGHT_BG, color: LIGHT_BG },
          children: [new D.Paragraph({
            bidirectional: true, alignment: D.AlignmentType.RIGHT,
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
    $('iDesc').value.split('\\n').forEach(function(line) {
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
    if ($('vId').value)      rows.push(detailRow('מס\\u05f3 ח.פ. / ת.ז.', $('vId').value));
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
        var m   = src.match(/^data:image\\/(\\w+);base64,(.+)$/);
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
          '\\u05ea\\u05de\\u05d5\\u05e0\\u05d4 \\u05de\\u05e1\\u05e4\\u05e8 ' + paddedN + (cap ? ' : ' + cap : ''),
          { size: 20, spacing: { after: 160 } }
        ));
      });
    }

    children.push(sectionHdr('\\u05d7\\u05ea\\u05d9\\u05de\\u05d4 \\u05d5\\u05d0\\u05d9\\u05e9\\u05d5\\u05e8'));
    children.push(rtlPara('\\u05e9\\u05dd \\u05e4\\u05e7\\u05d7: '     + $('inspName').value, { size: 22 }));
    children.push(rtlPara('\\u05de\\u05e1\\u05e4\\u05e8 \\u05e2\\u05d5\\u05d1\\u05d3: '  + $('inspNum').value,  { size: 22 }));
    children.push(rtlPara('\\u05ea\\u05d0\\u05e8\\u05d9\\u05da: '      + dateHe, { size: 22, spacing: { after: 400 } }));

    var doc = new D.Document({
      creator: '\\u05d9\\u05d7\\u05d9\\u05d3\\u05ea \\u05d9\\u05e0\\u05e9\\u05d5"\\u05e4',
      description: '\\u05d3\\u05d5\\u05d7 \\u05d0\\u05d9\\u05e8\\u05d5\\u05e2 ' + reportId,
      sections: [{
        properties: {
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
    a.download = '\\u05d3\\u05d5\\u05d7_' + reportId + '.docx';
    a.click();
    saveDraft();
    toast('\\u05d4\\u05d3\\u05d5\\u05d7 \\u05d4\\u05d5\\u05e8\\u05d3 \\u2713');

  } catch(err) {
    toast('\\u05e9\\u05d2\\u05d9\\u05d0\\u05d4: ' + err.message, 'err');
    console.error(err);
  }
}
'''

# Find and replace old genReport (from "async function genReport" to "function toast(")
start_marker = 'async function genReport()'
end_marker   = 'function toast('

start_idx = content.find(start_marker)
end_idx   = content.find(end_marker)

if start_idx < 0 or end_idx < 0:
    print(f'ERROR: genReport markers not found (start={start_idx}, end={end_idx})')
    sys.exit(1)

content = content[:start_idx] + NEW_GENREPORT + '\n' + content[end_idx:]
print('OK: genReport replaced')

# ── 7. Write result with UTF-8 BOM ───────────────────────────────────────────
with open(TARGET_FILE, 'w', encoding='utf-8-sig', newline='\r\n') as f:
    f.write(content)

print(f'OK: written to {TARGET_FILE}')
print(f'Final size: {len(content)} chars')

# ── 8. Quick verification ─────────────────────────────────────────────────────
with open(TARGET_FILE, encoding='utf-8-sig') as f:
    result = f.read()

checks = [
    ('docx.min.js script tag', './docx.min.js' in result),
    ('LOGO_B64 present',        'var LOGO_B64' in result),
    ('getCap removed',          'function getCap' not in result),
    ('getPhotoLabel removed',   'function getPhotoLabel' not in result),
    ('new genReport present',   'D.Packer.toBlob' in result),
    ('toast function intact',   'function toast(' in result),
    ('Hebrew label intact',     'שם פקח' in result),
]
print()
for name, ok in checks:
    print(('✓' if ok else '✗'), name)
