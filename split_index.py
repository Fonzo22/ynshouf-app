#!/usr/bin/env python3
# split_index.py — splits index.html into separate CSS and JS files
# No logic changes — pure extraction by line range.
import os

BASE = r'c:\Users\Fonz\ynshouf-app\ynshouf-app\ynshouf-app'
HTML = os.path.join(BASE, 'index.html')

with open(HTML, 'rb') as f:
    raw = f.read()

bom = raw[:3] == b'\xef\xbb\xbf'
text = raw[3:].decode('utf-8') if bom else raw.decode('utf-8')
lines = text.split('\n')
total = len(lines)
print(f'Total lines: {total}, BOM: {bom}')

def L(start, end=None):
    """Get lines start..end (1-indexed, inclusive)."""
    if end is None:
        end = start
    return '\n'.join(lines[start - 1:end])

def preview(label, start, end):
    content = L(start, end)
    first = content.split('\n')[0][:80]
    last  = content.split('\n')[-1][:80]
    print(f'  {label}: lines {start}-{end} | first="{first}" | last="{last}"')

# Verify key line numbers
print('\n--- Verification ---')
preview('LOGO_B64',     14, 14)
preview('$ and pad',   442, 443)
preview('reportId',    538, 538)
preview('WORKER',      621, 621)
preview('proj4.defs',  624, 624)
preview('gpsMap var',  626, 626)
preview('window.onload', 540, 555)
preview('updateSig',   851, 851)
preview('clearForm end', 937, 938)
preview('genReport start', 940, 940)
preview('genReport end',  1179, 1179)
preview('toast',       1180, 1188)
preview('SW reg',      1189, 1189)
print()

# Create directories
os.makedirs(os.path.join(BASE, 'css'), exist_ok=True)
os.makedirs(os.path.join(BASE, 'js'),  exist_ok=True)

def write_utf8(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    kb = len(content.encode('utf-8')) / 1024
    print(f'  Wrote {os.path.basename(path)} ({kb:.1f} KB)')

# ── css/style.css ────────────────────────────────────────────────────────────
write_utf8(
    os.path.join(BASE, 'css', 'style.css'),
    L(17, 180) + '\n\n/* סוף קובץ */\n'
)

# ── js/config.js ─────────────────────────────────────────────────────────────
# LOGO_B64 (line 14) + $ + pad (442-443) + reportId (538) + WORKER + proj4.defs (621-624)
write_utf8(
    os.path.join(BASE, 'js', 'config.js'),
    L(14, 14) + '\n\n' +
    L(442, 443) + '\n\n' +
    L(538, 538) + '\n\n' +
    L(621, 624) + '\n\n// סוף קובץ\n'
)

# ── js/photos.js ──────────────────────────────────────────────────────────────
# Section header comment (444) + photos/photoCounter vars + all photo functions
write_utf8(
    os.path.join(BASE, 'js', 'photos.js'),
    L(444, 493) + '\n\n// סוף קובץ\n'
)

# ── js/signature.js ───────────────────────────────────────────────────────────
write_utf8(
    os.path.join(BASE, 'js', 'signature.js'),
    L(495, 536) + '\n\n// סוף קובץ\n'
)

# ── js/ui.js ──────────────────────────────────────────────────────────────────
# showPage...fillSub (557-619) + toast (1180-1188)
write_utf8(
    os.path.join(BASE, 'js', 'ui.js'),
    L(557, 619) + '\n\n' +
    L(1180, 1188) + '\n\n// סוף קובץ\n'
)

# ── js/gps.js ─────────────────────────────────────────────────────────────────
# gpsMap var (626) + all GPS functions through getGPS
write_utf8(
    os.path.join(BASE, 'js', 'gps.js'),
    L(626, 779) + '\n\n// סוף קובץ\n'
)

# ── js/ai.js ──────────────────────────────────────────────────────────────────
# buildPrompt, runAI, runAIFix (780-849)
write_utf8(
    os.path.join(BASE, 'js', 'ai.js'),
    L(780, 849) + '\n\n// סוף קובץ\n'
)

# ── js/storage.js ─────────────────────────────────────────────────────────────
# window.onload (540-555) + updateSig...clearForm (851-938)
write_utf8(
    os.path.join(BASE, 'js', 'storage.js'),
    L(540, 555) + '\n\n' +
    L(851, 938) + '\n\n// סוף קובץ\n'
)

# ── js/report.js ──────────────────────────────────────────────────────────────
# genReport (940-1179)
write_utf8(
    os.path.join(BASE, 'js', 'report.js'),
    L(940, 1179) + '\n\n// סוף קובץ\n'
)

# ── Rewrite index.html ────────────────────────────────────────────────────────
# Keep:   lines 1-12  (doctype → proj4 script tag)
# Add:    <link rel="stylesheet" href="css/style.css">
# Skip:   lines 13-15 (LOGO_B64 head script)
# Skip:   lines 16-181 (<style>...</style>)
# Keep:   lines 182-440 (</head> + body HTML)
# Replace lines 441-1190 (main script block) with per-file script tags + SW
# Keep:   lines 1191+ (</body></html>)

script_tags = (
    '<script src="js/config.js"></script>\n'
    '<script src="js/photos.js"></script>\n'
    '<script src="js/signature.js"></script>\n'
    '<script src="js/ui.js"></script>\n'
    '<script src="js/gps.js"></script>\n'
    '<script src="js/ai.js"></script>\n'
    '<script src="js/storage.js"></script>\n'
    '<script src="js/report.js"></script>\n'
    '<script>\n'
    "if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function(){});\n"
    '</script>'
)

new_html = (
    L(1, 12) + '\n' +
    '<link rel="stylesheet" href="css/style.css">\n' +
    L(182, 440) + '\n' +
    script_tags + '\n' +
    L(1191, total)
)

out_bytes = (b'\xef\xbb\xbf' if bom else b'') + new_html.encode('utf-8')
with open(HTML, 'wb') as f:
    f.write(out_bytes)

new_lines = new_html.count('\n') + 1
print(f'  Rewrote index.html: {len(out_bytes)/1024:.1f} KB, ~{new_lines} lines')
print('\nDone!')
