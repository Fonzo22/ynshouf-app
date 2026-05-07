# RTL Word Document Generation — Migration to `docx` Library

**Date:** 2026-05-07  
**Status:** Approved  
**Scope:** Replace docxtemplater + PizZip + YNSHOUF_Template.docx with the `docx` library (dolanmiu) for fully RTL Hebrew Word document generation in the browser.

---

## Problem

The current approach (docxtemplater + YNSHOUF_Template.docx + regex XML post-processing) consistently produces broken RTL formatting. Every fix attempt has been fragile because:
- docxtemplater splits replaced text across XML runs unpredictably
- Regex post-processing of raw XML is brittle
- The template file itself has inconsistent RTL settings

## Solution

Generate the entire Word document programmatically using the `docx` library (v8.5.0), which exposes native RTL support via `bidirectional: true` on paragraphs and `language: { bidi: 'he-IL' }` on text runs. No template file, no XML manipulation, no regex.

---

## Libraries

| Library | Before | After |
|---|---|---|
| PizZip | loaded | removed |
| docxtemplater | loaded | removed |
| **docx@8.5.0** | — | **added** |

CDN: `https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js`  
Exposes global: `window.docx`

---

## Document Structure (matches existing template)

### 1. Header Row
Three-column layout (via `Table`):
- Right cell: date + report ID (small, gray)
- Center cell: logo image (229×181px PNG, extracted from existing template) + "דוח אירוע" bold centered
- Left cell: inspector name + number

### 2. Main Title
Large bold centered paragraph: incident type (`iType`)

### 3. Sub-title
Medium centered paragraph: sub-title (`iSub`) — omitted if empty

### 4. Section "מהות האירוע"
Green section header (`#1A7A4A`, bold, underline border) + description text (`iDesc`), split by `\n` into separate paragraphs.

### 5. Section "פרטים"
Green section header + 2-column `Table` (9000 DXA wide):
- Right column (value, 6000 DXA): plain text
- Left column (label, 3000 DXA): bold, gray text, light green background `#F0F9F4`

Rows (shown only when field is filled):

| Label | Field |
|---|---|
| מספר דוח | `reportId` |
| שם פקח | `inspName` |
| מספר פקח | `inspNum` |
| תאריך | `iDate` (formatted he-IL) |
| שעה | `iTime` |
| מיקום / כתובת | `iLoc` |
| רשות מקומית | `iJuris` |
| גוש | `iBlock` |
| חלקה | `iParcel` |
| קואורדינטות GPS | `cGPS` |
| קואורדינטות ITM | `cITM` |
| שם המקום | `placeName` |
| לוחית רישוי | `vPlate` |
| סוג רכב | `vType` |
| בעלים / מבצע | `vOwner` |
| מס׳ ח.פ. / ת.ז. | `vId` |
| כתובת בעלים | `vAddr` |
| תיאור העבירה | `getViol()` |
| סוג פסולת | `vWaste` |

### 6. Section "תמונות"
Shown only when photos exist. For each photo (sorted by insertion order, max 10):
- `ImageRun`: 450×338px (4:3), inline, centered
- RTL caption paragraph: `תמונה מספר NN : <caption>`

Base64 data URL → `Uint8Array` via `atob()`.

### 7. Section "חתימה ואישור"
Green section header + 3 RTL paragraphs: inspector name, employee number, date.

---

## RTL Strategy

Every paragraph in the document uses:
```js
new docx.Paragraph({
  bidirectional: true,
  alignment: docx.AlignmentType.RIGHT,
  children: [
    new docx.TextRun({
      text: "...",
      font: "David",
      language: { bidi: "he-IL" }
    })
  ]
})
```

The section header `Green` paragraphs additionally carry a bottom border in `#1A7A4A`.

---

## Page Settings

- Size: A4 (11906 × 16838 DXA)
- Margins: 20mm all sides (1134 DXA)
- Creator: `יחידת ינשו"פ`

---

## Files Changed

| File | Change |
|---|---|
| `ynshouf-app/ynshouf-app/index.html` | Replace `<script>` tags; rewrite `genReport`; remove `getCap`, `getPhotoLabel`, photo-injection IIFE |
| `ynshouf-app/ynshouf-app/sw.js` | Bump cache version (v5 → v6); remove YNSHOUF_Template.docx from pre-cache |
| `ynshouf-app/ynshouf-app/YNSHOUF_Template.docx` | No longer used — can be deleted after successful test |

---

## Logo

The logo PNG (229×181px) is currently embedded in `YNSHOUF_Template.docx/word/media/`. It will be embedded in the HTML as a base64 constant so it's always available offline, consistent with the app's PWA nature.

---

## Out of Scope

- Signature canvas image in the Word doc (signature is visual-only in the app)
- Page headers/footers (not in current template)
- Print styles or PDF export
