path = r'c:/Users/Fonz/ynshouf-app/ynshouf-app/ynshouf-app/js/report.js'
with open(path, encoding='utf-8-sig') as f:
    src = f.read()

old_start = src.index('    var headerTable = new D.Table({')
old_end   = src.index('\n    var children = [headerTable];')

new_block = (
    "    var headerTable = new D.Table({\n"
    "      width: { size: 9000, type: D.WidthType.DXA },\n"
    "      borders: { top: noBrd, bottom: noBrd, left: noBrd, right: noBrd,\n"
    "                 insideH: noBrd, insideV: noBrd },\n"
    "      rows: [new D.TableRow({ children: [\n"
    "\n"
    "        new D.TableCell({\n"
    "          width: { size: 2000, type: D.WidthType.DXA }, borders: noBrds,\n"
    "          verticalAlign: D.VerticalAlign.CENTER,\n"
    "          children: [new D.Paragraph({\n"
    "            bidirectional: true, alignment: D.AlignmentType.CENTER,\n"
    "            spacing: { after: 0 },\n"
    "            children: [new D.ImageRun({\n"
    "              data: logoBytes,\n"
    "              transformation: { width: 80, height: 63 },\n"
    "              type: 'png'\n"
    "            })]\n"
    "          })]\n"
    "        }),\n"
    "\n"
    "        new D.TableCell({\n"
    "          width: { size: 7000, type: D.WidthType.DXA }, borders: noBrds,\n"
    "          verticalAlign: D.VerticalAlign.CENTER,\n"
    "          children: [\n"
    "            new D.Paragraph({\n"
    "              bidirectional: true, alignment: D.AlignmentType.RIGHT,\n"
    "              spacing: { after: 60 },\n"
    "              border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: '1A7A4A', space: 4 }},\n"
    "              children: [run('הרשות לשמירת הטבע והגנים הלאומיים', { bold: true, size: 26, color: '1A7A4A' })]\n"
    "            }),\n"
    "            new D.Paragraph({\n"
    "              bidirectional: true, alignment: D.AlignmentType.RIGHT,\n"
    "              spacing: { after: 0 },\n"
    "              children: [run('ינשו\"פ- יחידה נגד שריפות והשלכות פסולת', { size: 20, color: '1A7A4A' })]\n"
    "            })\n"
    "          ]\n"
    "        })\n"
    "\n"
    "      ]})]"
    "\n"
    "    })"
)

new_src = src[:old_start] + new_block + src[old_end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_src)
print('Done OK')
