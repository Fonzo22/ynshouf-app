from docx import Document
from docx.oxml import OxmlElement

path = r'c:/Users/Fonz/ynshouf-app/ynshouf-app/ynshouf-app/YNSHOUF_Template.docx'
doc = Document(path)

count = 0
for tbl in doc.tables:
    for row in tbl.rows:
        trPr = row._tr.find('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}trPr')
        if trPr is None:
            trPr = OxmlElement('w:trPr')
            row._tr.insert(0, trPr)
        # remove existing cantSplit if present to avoid duplicates
        ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        for old in trPr.findall(f'{{{ns}}}cantSplit'):
            trPr.remove(old)
        cantSplit = OxmlElement('w:cantSplit')
        trPr.append(cantSplit)
        count += 1

doc.save(path)
print(f'Done — cantSplit added to {count} rows')
