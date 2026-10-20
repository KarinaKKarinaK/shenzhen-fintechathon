#!/usr/bin/env python3
"""Writes docs/Zishi_Security_Self_Assessment.docx from SELF_ASSESSMENT.md, keeping the official
template's four headings (01 Permission Model, 02 Security Tests, 03 Data and Privacy, 04 Known Risks).
Run from web/:  python3 scripts/selfassess.py
"""
import re
from pathlib import Path
from docx import Document
from docx.shared import Pt

ROOT = Path(__file__).resolve().parents[2]
md = (ROOT / "SELF_ASSESSMENT.md").read_text(encoding="utf8").splitlines()
doc = Document()
doc.styles["Normal"].font.size = Pt(10)


def runs(par, text):
    # **bold** and `code` only, the rest plain
    for part in re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text):
        if not part:
            continue
        if part.startswith("**"):
            par.add_run(part[2:-2]).bold = True
        elif part.startswith("`"):
            r = par.add_run(part[1:-1]); r.font.name = "Menlo"; r.font.size = Pt(9)
        else:
            par.add_run(part)


i = 0
while i < len(md):
    line = md[i]
    if line.startswith("# "):
        doc.add_heading(line[2:], 0)
    elif line.startswith("## "):
        doc.add_heading(line[3:], 1)
    elif line.startswith("|"):
        rows = []
        while i < len(md) and md[i].startswith("|"):
            if not re.match(r"^\|[-| ]+\|$", md[i]):
                rows.append([c.strip() for c in md[i].strip("|").split("|")])
            i += 1
        t = doc.add_table(rows=len(rows), cols=len(rows[0]))
        t.style = "Table Grid"
        for r, row in enumerate(rows):
            for c, cell in enumerate(row[: len(rows[0])]):
                p = t.cell(r, c).paragraphs[0]
                runs(p, cell)
                for run in p.runs:
                    run.font.size = Pt(8)
                    if r == 0:
                        run.bold = True
        continue
    elif line.strip():
        runs(doc.add_paragraph(), line)
    i += 1

out = ROOT / "docs" / "Zishi_Security_Self_Assessment.docx"
doc.save(out)
print(f"wrote {out.relative_to(ROOT)}")
