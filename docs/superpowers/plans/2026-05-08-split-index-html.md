# Split index.html Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `index.html` into separate CSS and JS files with no logic changes.

**Architecture:** Single Python extraction script reads index.html by line range, writes each file, rewrites index.html with link/script tags. BOM preserved on index.html, plain UTF-8 for extracted files.

**Tech Stack:** Python 3, plain JS (no modules), Service Worker cache update.

---

## File Structure

- Create: `ynshouf-app/ynshouf-app/css/style.css`
- Create: `ynshouf-app/ynshouf-app/js/config.js` (LOGO_B64, $, pad, reportId, WORKER, proj4.defs)
- Create: `ynshouf-app/ynshouf-app/js/photos.js`
- Create: `ynshouf-app/ynshouf-app/js/signature.js`
- Create: `ynshouf-app/ynshouf-app/js/ui.js` (showPage...fillSub + toast)
- Create: `ynshouf-app/ynshouf-app/js/gps.js`
- Create: `ynshouf-app/ynshouf-app/js/ai.js`
- Create: `ynshouf-app/ynshouf-app/js/storage.js` (window.onload + updateSig...clearForm)
- Create: `ynshouf-app/ynshouf-app/js/report.js`
- Modify: `ynshouf-app/ynshouf-app/index.html` (HTML + link/script tags only)
- Modify: `ynshouf-app/ynshouf-app/sw.js` (CORE_ASSETS + cache version bump)

---

### Task 1: Write and run extraction script

**Files:**
- Create: `split_index.py` (repo root)

- [x] **Step 1: Write split_index.py**
  See `split_index.py` in repo root — reads index.html by line range, writes CSS/JS files, rewrites index.html.

- [x] **Step 2: Run script**
  ```
  python3 split_index.py
  ```
  Expected output: 9 files written, index.html rewritten to ~286 lines.

- [x] **Step 3: Verify extracted files**
  - `config.js` ends with WORKER + proj4.defs + `// סוף קובץ`
  - `photos.js` starts with `// ── PHOTOS` comment
  - `ui.js` ends with toast function + `// סוף קובץ`
  - `storage.js` starts with `window.onload`
  - `report.js` starts with `async function genReport()`

### Task 2: Update Service Worker

**Files:**
- Modify: `ynshouf-app/ynshouf-app/sw.js`

- [x] **Step 1: Bump cache version and add new assets**
  Change `ynshouf-v7` → `ynshouf-v8`, add all CSS/JS paths to CORE_ASSETS.

### Task 3: Test in browser (manual)

- [ ] Clear site data in DevTools → Application → Storage → Clear site data
- [ ] Reload — check no console errors
- [ ] Verify all UI sections render (form, GPS, AI, photos, signature)
- [ ] Generate a test Word document

### Task 4: Commit

- [ ] `git add ynshouf-app/ynshouf-app/` and commit
