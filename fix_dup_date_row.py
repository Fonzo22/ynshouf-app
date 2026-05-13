"""Remove the duplicate empty תאריך row from YNSHOUF_Template.docx.
The template has two consecutive rows starting with 'תאריך':
  row A: label only, no placeholder  ← DELETE THIS
  row B: label + {{date}}            ← KEEP THIS
"""
import zipfile, shutil, re, os
from lxml import etree

DOCX = r'c:/Users/Fonz/ynshouf-app/YNSHOUF_Template.docx'
BAK  = DOCX + '.bak_dup'

NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
W  = lambda tag: f'{{{NS}}}{tag}'

shutil.copy2(DOCX, BAK)
print(f'Backup: {BAK}')

with zipfile.ZipFile(DOCX, 'r') as z:
    doc_xml = z.read('word/document.xml')
    names   = z.namelist()

tree = etree.fromstring(doc_xml)

def row_texts(tr):
    return ''.join(t.text or '' for t in tr.iter(W('t')))

def row_has_placeholder(tr):
    return '{{date}}' in row_texts(tr)

# find all <w:tr> elements
all_trs = tree.findall('.//' + W('tr'))

removed = 0
for i, tr in enumerate(all_trs):
    txt = row_texts(tr)
    # Look for a row that contains 'תאריך' (the Hebrew label) but NO {{date}} placeholder
    if 'תאריך' in txt and '{{' not in txt:
        # Make sure the NEXT row has {{date}} to confirm this is the duplicate
        if i + 1 < len(all_trs) and row_has_placeholder(all_trs[i + 1]):
            parent = tr.getparent()
            parent.remove(tr)
            removed += 1
            print(f'Removed duplicate empty תאריך row (row index {i})')
            break  # only remove the first match

if removed == 0:
    print('WARNING: No duplicate row found — check manually')

new_xml = etree.tostring(tree, xml_declaration=True, encoding='UTF-8', standalone=True)

# Rewrite the zip
tmp = DOCX + '.tmp'
with zipfile.ZipFile(DOCX, 'r') as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename == 'word/document.xml':
            zout.writestr(item, new_xml)
        else:
            zout.writestr(item, zin.read(item.filename))

os.replace(tmp, DOCX)
print('Done — template saved.')
