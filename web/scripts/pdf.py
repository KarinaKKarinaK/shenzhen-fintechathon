#!/usr/bin/env python3
"""Renders the submission documents to PDF with the system Chrome.

Markdown to HTML with python-markdown, plain black on white, one serif face, no decoration.
Mermaid blocks are drawn by mermaid from a CDN while Chrome renders the page.
Run from web/: python3 scripts/pdf.py
"""
import re
import subprocess
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "pdf"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DOCS = [
    ("README.md", "README"),
    ("TECHNICAL.md", "Technical documentation"),
    ("SELF_ASSESSMENT.md", "Security self assessment"),
    ("docs/JUDGES_GUIDE.md", "Judges guide"),
    ("docs/EXECUTION_EVIDENCE.md", "Execution evidence"),
    ("docs/RED_TEAM.md", "Red team report"),
    ("docs/EVALUATION.md", "Evaluation"),
    ("docs/DECK.md", "Deck"),
    ("docs/DEMO_VIDEO_SCRIPT.md", "Demo video script"),
    ("DESIGN.md", "Design"),
]

CSS = """
@page { size: A4; margin: 18mm 16mm; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.45; color: #000; max-width: 100%; }
h1 { font-size: 20pt; margin: 0 0 6pt; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; }
p, li { margin: 0 0 6pt; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 9pt; page-break-inside: auto; }
th, td { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; text-align: left; }
th { background: #eee; }
tr { page-break-inside: avoid; }
code { font-family: Menlo, Consolas, monospace; font-size: 8.5pt; }
pre { font-family: Menlo, Consolas, monospace; font-size: 8pt; border: 1px solid #000; padding: 6pt; white-space: pre-wrap; word-break: break-all; }
img { max-width: 100%; }
a { color: #000; }
.mermaid { margin: 8pt 0; }
.mermaid svg { max-width: 100%; max-height: 120mm; height: auto; }
"""

MERMAID = '<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,theme:"neutral",flowchart:{wrappingWidth:420,htmlLabels:true}});</script>'


def to_html(md_path: Path, title: str) -> str:
    text = md_path.read_text(encoding="utf8")
    # Mermaid fences become <pre class="mermaid"> blocks before markdown runs.
    text = re.sub(r"```mermaid\n(.*?)```", lambda m: f'<pre class="mermaid">\n{m.group(1)}</pre>', text, flags=re.S)
    body = markdown.markdown(text, extensions=["tables", "fenced_code"])
    base = (md_path.parent).as_uri() + "/"
    return f'<!doctype html><html><head><meta charset="utf-8"><base href="{base}"><title>{title}</title><style>{CSS}</style>{MERMAID}</head><body>{body}</body></html>'


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for rel, title in DOCS:
        src = ROOT / rel
        if not src.exists():
            print("missing", rel)
            continue
        html = OUT / (src.stem + ".html")
        pdf = OUT / (src.stem + ".pdf")
        html.write_text(to_html(src, title), encoding="utf8")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=15000", f"--print-to-pdf={pdf}", html.as_uri()], check=True, capture_output=True)
        html.unlink()
        print("wrote", pdf.relative_to(ROOT), f"{pdf.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
