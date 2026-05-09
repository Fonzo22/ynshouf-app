# RTL Word Document — Migration to `docx` Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace docxtemplater + PizZip + YNSHOUF_Template.docx with the `docx` library (v8.5.0) to generate fully RTL Hebrew Word documents in the browser with no XML post-processing.

**Architecture:** The entire document is generated programmatically in `genReport()` using `window.docx.*` classes. Every paragraph uses `bidirectional: true` and every TextRun uses `language: { bidi: 'he-IL' }`. The logo PNG is embedded as a base64 JS constant so the app stays fully offline.

**Tech Stack:** `docx@8.5.0` (jsdelivr CDN, UMD build → `window.docx`), vanilla JS, existing PizZip removed.

---

## File Map

| File | Change |
|---|---|
| `ynshouf-app/ynshouf-app/index.html` | Replace script tags; add `LOGO_B64` constant; remove `getCap`, `getPhotoLabel`; replace `genReport` (lines 934–1136) |
| `ynshouf-app/ynshouf-app/sw.js` | Bump cache `ynshouf-v5` → `ynshouf-v6`; remove `YNSHOUF_Template.docx` from pre-cache |

---

## Task 1 — Replace script tags + embed logo

**Files:**
- Modify: `ynshouf-app/ynshouf-app/index.html` lines 11–13

- [ ] **Step 1: Replace the two old script tags with `docx`**

In `index.html`, replace lines 11–12:
```html
<script src="https://unpkg.com/pizzip@3.1.7/dist/pizzip.min.js"></script>
<script src="https://unpkg.com/docxtemplater@3.37.12/build/docxtemplater.js"></script>
```
With:
```html
<script src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js"></script>
```
Line 13 (`proj4`) stays unchanged.

- [ ] **Step 2: Extract the logo base64 and add as JS constant**

The logo is stored in `YNSHOUF_Template.docx`. Run this Python script once to get the base64 string:
```python
import zipfile, base64
with zipfile.ZipFile('ynshouf-app/ynshouf-app/YNSHOUF_Template.docx', 'r') as z:
    data = z.read('word/media/eb41da2f7d53b917f3e07341602931fc89ee0ce6.png')
print(base64.b64encode(data).decode())
```
(The base64 output is ~48664 chars and is already saved at `docs/superpowers/specs/logo_b64.txt`.)

Immediately after the `<script>` tags in `<head>` (before `<style>`), add:
```html
<script>
var LOGO_B64 = "PASTE_FULL_BASE64_HERE";
</script>
```
Replace `PASTE_FULL_BASE64_HERE` with the full content of `docs/superpowers/specs/logo_b64.txt`.

- [ ] **Step 3: Verify docx loaded**

Open `http://127.0.0.1:5500/ynshouf-app/ynshouf-app/index.html` in a browser and run in DevTools console:
```js
typeof window.docx  // expected: "object"
typeof window.docx.Document  // expected: "function"
typeof LOGO_B64  // expected: "string"
LOGO_B64.length  // expected: 48664
```

---

## Task 2 — Remove old helper functions

**Files:**
- Modify: `ynshouf-app/ynshouf-app/index.html` lines 934–944

- [ ] **Step 1: Delete `getCap` and `getPhotoLabel`**

Remove these two functions entirely (lines 934–944):
```js
function getCap(n) {
  var keys = Object.keys(photos).map(Number).sort(function(a,b){return a-b;});
  var id = keys[n-1];
  return id ? (photos[id].cap || '') : '';
}

function getPhotoLabel(n) {
  var nn = String(n).padStart(2, '0');
  var cap = getCap(n);
  return cap ? 'תמונה מספר ' + nn + ' : ' + cap : 'תמונה מספר ' + nn + ' : ';
}
```
They are only used by the old `genReport`. After replacing `genReport` in Task 3 they are dead code.

---

## Task 3 — Rewrite `genReport`

**Files:**
- Modify: `ynshouf-app/ynshouf-app/index.html` lines 946–1136 (the entire old `genReport` function including the photo-injection IIFE)

- [ ] **Step 1: Replace the entire `genReport` function**

Delete everything from `async function genReport() {` (line 946) up to and including the closing `}` before `function toast(` (line ~1136).

Replace with the following complete function:

```js
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

    // ── helpers ───────────────────────────────────────────────────────────────
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

    // ── logo ──────────────────────────────────────────────────────────────────
    var logoBin = atob(LOGO_B64);
    var logoBytes = new Uint8Array(logoBin.length);
    for (var li = 0; li < logoBin.length; li++) logoBytes[li] = logoBin.charCodeAt(li);

    // ── header table (logo + date/id + inspector) ─────────────────────────────
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

    // ── document body ─────────────────────────────────────────────────────────
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

    // details table
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
    if ($('vId').value)      rows.push(detailRow('מס׳ ח.פ. / ת.ז.', $('vId').value));
    if ($('vAddr').value)    rows.push(detailRow('כתובת בעלים',      $('vAddr').value));
    var viol = getViol();
    if (viol)                rows.push(detailRow('תיאור העבירה',     viol));
    if ($('vWaste').value)   rows.push(detailRow('סוג פסולת',        $('vWaste').value));

    children.push(sectionHdr('פרטים'));
    children.push(new D.Table({
      width: { size: 9000, type: D.WidthType.DXA },
      rows: rows
    }));

    // photos
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
          'תמונה מספר ' + paddedN + (cap ? ' : ' + cap : ''),
          { size: 20, spacing: { after: 160 } }
        ));
      });
    }

    // signature
    children.push(sectionHdr('חתימה ואישור'));
    children.push(rtlPara('שם פקח: '     + $('inspName').value, { size: 22 }));
    children.push(rtlPara('מספר עובד: '  + $('inspNum').value,  { size: 22 }));
    children.push(rtlPara('תאריך: '      + dateHe, { size: 22, spacing: { after: 400 } }));

    // ── generate & download ───────────────────────────────────────────────────
    var doc = new D.Document({
      creator: 'יחידת ינשו"פ',
      description: 'דוח אירוע ' + reportId,
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
    a.download = 'דוח_' + reportId + '.docx';
    a.click();
    saveDraft();
    toast('הדוח הורד ✓');

  } catch(err) {
    toast('שגיאה: ' + err.message, 'err');
    console.error(err);
  }
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Open DevTools console on the app page after saving. Run:
```js
typeof genReport  // expected: "function"
```
No red errors in the console on page load.

---

## Task 4 — Update Service Worker

**Files:**
- Modify: `ynshouf-app/ynshouf-app/sw.js`

- [ ] **Step 1: Bump cache name and remove template from pre-cache**

Current `sw.js` lines 1–7:
```js
const CACHE = 'ynshouf-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  'https://unpkg.com/pizzip@3.1.7/dist/pizzip.min.js',
  'https://unpkg.com/docxtemplater@3.37.12/build/docxtemplater.js'
];
```

Replace with:
```js
const CACHE = 'ynshouf-v6';
const CORE_ASSETS = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js'
];
```

Remove the `try { await c.add('./YNSHOUF_Template.docx'); } catch (_) {}` line from the `install` handler too.

---

## Task 5 — Test manually

- [ ] **Step 1: Hard-refresh**

In the browser: Ctrl+Shift+R to bypass service worker cache.

- [ ] **Step 2: Fill in required fields**

Fill: inspector name, inspector number, incident date, incident type, description.
Add at least 2 photos via the photo button.
Add a caption to one photo.

- [ ] **Step 3: Click "הורד קובץ Word"**

Expected:
- Toast shows "מייצר דוח..."
- File `דוח_YNS-...docx` downloads

- [ ] **Step 4: Open the file in Microsoft Word**

Verify:
- [ ] All Hebrew text is RTL (right-aligned, flows right-to-left)
- [ ] Section headers are green
- [ ] Logo appears in header
- [ ] Details table has two columns (label | value), label column has light green background
- [ ] Photos appear as embedded images (not placeholder boxes)
- [ ] Photo captions appear below each image

- [ ] **Step 5: If any RTL issue — check DevTools console for errors**

Run in console to confirm docx version:
```js
window.docx.Document.name  // "Document"
```

---

## Task 6 — Commit

- [ ] **Step 1: Commit all changes**

```bash
git add ynshouf-app/ynshouf-app/index.html ynshouf-app/ynshouf-app/sw.js
git commit -m "Replace docxtemplater with docx library for native RTL Word generation

- Remove PizZip, docxtemplater, YNSHOUF_Template.docx dependency
- Add docx@8.5.0 (jsdelivr CDN) with bidirectional:true on all paragraphs
- Embed logo as base64 constant for offline support
- Photos embedded as ImageRun (no XML manipulation needed)
- Bump SW cache to ynshouf-v6

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 2: Push**

```bash
git push
```
