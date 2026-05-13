"""Clear the 'תאריך' label text from the first cell of the {{date}} table row."""
import zipfile, shutil, os
from lxml import etree

DOCX = r'c:/Users/Fonz/ynshouf-app/YNSHOUF_Template.docx'
BAK  = DOCX + '.bak_label'

NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
W  = lambda tag: f'{{{NS}}}{tag}'

shutil.copy2(DOCX, BAK)

with zipfile.ZipFile(DOCX, 'r') as z:
    doc_xml = z.read('word/document.xml')

tree = etree.fromstring(doc_xml)

def row_texts(tr):
    return ''.join(t.text or '' for t in tr.iter(W('t')))

trs = tree.findall('.//' + W('tr'))
fixed = 0
for tr in trs:
    if '{{date}}' in row_texts(tr):
        # First cell = label cell; clear all <w:t> text nodes inside it
        cells = tr.findall(W('tc'))
        if cells:
            label_cell = cells[0]
            for t in label_cell.iter(W('t')):
                t.text = ''
            print('Cleared label cell in {{date}} row')
            fixed += 1
        break

if not fixed:
    print('ERROR: {{date}} row not found')

new_xml = etree.tostring(tree, xml_declaration=True, encoding='UTF-8', standalone=True)

tmp = DOCX + '.tmp'
with zipfile.ZipFile(DOCX, 'r') as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename == 'word/document.xml':
            zout.writestr(item, new_xml)
        else:
            zout.writestr(item, zin.read(item.filename))

os.replace(tmp, DOCX)
print('Done.')
