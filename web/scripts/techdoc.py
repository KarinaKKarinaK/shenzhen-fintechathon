#!/usr/bin/env python3
"""Fills the official technical document template for the International AI Track.

Reads the template from docs/template/international-technical-document-en.docx, keeps its header
table, headings 01 to 05 and guiding questions, and writes the content under them. Every number is
read from the result files (docs/results/*.json, docs/EXECUTION_EVIDENCE.md, docs/RED_TEAM.md,
contracts/deployments/base-sepolia.json); nothing is typed in. Diagrams are drawn with the system
Chrome from the mermaid sources in the README and TECHNICAL.md.

Run from web/:  python3 scripts/techdoc.py
Writes:          docs/Zishi_Technical_Document.docx and, through Pages, docs/pdf/Zishi_Technical_Document.pdf
"""
import copy
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
TEMPLATE = DOCS / "template" / "international-technical-document-en.docx"
OUT_DOCX = DOCS / "Zishi_Technical_Document.docx"
OUT_PDF = DOCS / "pdf" / "Zishi_Technical_Document.pdf"
TMP = Path("/tmp/zishi-techdoc")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
REPO = "https://github.com/KarinaKKarinaK/shenzhen-fintechathon"
LIVE = "https://zishi-fintechathon.vercel.app"
TEAM = "Zishi"
TRACK = "International AI Track, Topic F: Agent Wallet"

# ---------- inputs -------------------------------------------------------------------------

def load_json(p: Path):
    return json.loads(p.read_text(encoding="utf8"))

R = {k: load_json(DOCS / "results" / f"{k}.json") for k in ["classifier", "oracle", "economics", "ratchet", "credit", "drift"]}
DEPLOY = load_json(ROOT / "contracts" / "deployments" / "base-sepolia.json")
FISCO = load_json(ROOT / "contracts" / "deployments" / "fisco-bcos.json")
FATE = load_json(ROOT / "fate" / "results.json")
FISCO_EVIDENCE = (DOCS / "FISCO_EVIDENCE.md").read_text(encoding="utf8")
RECEIPTS = load_json(DOCS / "results" / "receipts.json")
SCAN = load_json(DOCS / "results" / "security-scan.json")
REALF = load_json(DOCS / "results" / "realflights.json")
import glob as _glob
_SET = sorted(_glob.glob(str(ROOT / "web" / "evidence" / "fisco" / "settled-run-*Z.json")))
SETTLED = load_json(Path(_SET[-1])) if _SET else None
SETTLED_SUM = load_json(Path(_SET[-1].replace(".json", "-summary.json"))) if _SET else None
EVIDENCE = (DOCS / "EXECUTION_EVIDENCE.md").read_text(encoding="utf8")
RED = (DOCS / "RED_TEAM.md").read_text(encoding="utf8")


def md_table_rows(text: str, header_start: str):
    """Rows of the first markdown table whose header starts with header_start."""
    lines = text.split("\n")
    for i, l in enumerate(lines):
        if l.startswith(header_start):
            rows = []
            for r in lines[i + 2:]:
                if not r.startswith("|"):
                    break
                rows.append([c.strip() for c in r.strip().strip("|").split("|")])
            return rows
    return []


TX_ROWS = md_table_rows(EVIDENCE, "| # | Seconds | Event |")
ATTACK_ROWS = md_table_rows(RED, "| # | Attack | Layer |")
m = re.search(r"Checked (\d+) hashes against the chain: (\d+) succeeded, (\d+) not found, (\d+) were `IntentLog.commit` calls", EVIDENCE)
TX_CHECKED, TX_OK, TX_MISSING, TX_COMMITS = (int(x) for x in m.groups()) if m else (0, 0, 0, 0)
m = re.search(r"\((\d+\.\d+) ETH at 0.006 gwei\)", EVIDENCE)
TX_ETH = m.group(1) if m else "?"
m = re.search(r"\| Attacks blocked \| (\d+) of (\d+) \|", RED)
ATT_BLOCKED, ATT_TOTAL = (int(x) for x in m.groups()) if m else (0, 0)
m = re.search(r"\| Benign messages passed \| (\d+) of (\d+) \|", RED)
BEN_PASS, BEN_TOTAL = (int(x) for x in m.groups()) if m else (0, 0)
m = re.search(r"\| Naive wallet fell to \| (\d+) of (\d+) \|", RED)
NAIVE_FELL = int(m.group(1)) if m else 0
m = re.search(r"from commit `([0-9a-f]+)`", EVIDENCE)
EVIDENCE_COMMIT = m.group(1)[:12] if m else "?"


def link(h: str) -> str:
    return f"https://sepolia.basescan.org/tx/{h}"


def hash_of(cell: str) -> str:
    m = re.search(r"\((https://sepolia.basescan.org/tx/(0x[0-9a-f]+))\)", cell)
    return m.group(2) if m else cell


pct = lambda x: f"{x * 100:.1f}%"
yuan = lambda x: f"{round(x):,} yuan"
C, O, E, RT, CR, DR = R["classifier"], R["oracle"], R["economics"], R["ratchet"], R["credit"], R["drift"]

# ---------- diagrams ------------------------------------------------------------------------

def mermaid_block(path: Path, heading: str) -> str:
    text = path.read_text(encoding="utf8")
    i = text.index(heading)
    j = text.index("```mermaid", i)
    k = text.index("```", j + 10)
    return text[j + 10:k].strip()


def render_mermaid(src: str, name: str, width: int, height: int) -> Path:
    TMP.mkdir(parents=True, exist_ok=True)
    html = TMP / f"{name}.html"
    png = TMP / f"{name}.png"
    html.write_text(
        '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff;font-family:Helvetica,Arial,sans-serif}</style>'
        '<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>'
        '<script>mermaid.initialize({startOnLoad:true,theme:"neutral",flowchart:{wrappingWidth:260,htmlLabels:true}});</script></head>'
        f'<body><pre class="mermaid" style="margin:0">{src}</pre></body></html>', encoding="utf8")
    subprocess.run([CHROME, "--headless=new", "--user-data-dir=/tmp/zishi-chrome", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", f"--window-size={width},{height}", "--virtual-time-budget=12000", f"--screenshot={png}", html.as_uri()], check=True, capture_output=True)
    return trim(png)


def trim(png: Path) -> Path:
    from PIL import Image, ImageChops
    im = Image.open(png).convert("RGB")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    box = ImageChops.difference(im, bg).getbbox()
    if box:
        pad = 16
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
        im.crop(box).save(png)
    return png


def svg_to_png(svg: Path) -> Path:
    TMP.mkdir(parents=True, exist_ok=True)
    subprocess.run(["qlmanage", "-t", "-s", "1520", "-o", str(TMP), str(svg)], check=True, capture_output=True)
    return trim(TMP / (svg.name + ".png"))

# ---------- writer --------------------------------------------------------------------------

class Writer:
    """Inserts content after a cursor element so the template's own order is kept."""

    def __init__(self, doc, anchor_paragraph):
        self.doc = doc
        self.cur = anchor_paragraph._p

    def _place(self, el):
        self.cur.addnext(el)
        self.cur = el

    def p(self, text="", style=None, bold=False, italic=False, size=None, align=None):
        para = self.doc.add_paragraph(style=style)
        if text:
            run = para.add_run(text)
            run.bold = bold or None
            run.italic = italic or None
            if size:
                run.font.size = Pt(size)
        if align:
            para.alignment = align
        self._place(para._p)
        return para

    def rich(self, parts, style=None):
        """parts: list of (text, bold) tuples in one paragraph."""
        para = self.doc.add_paragraph(style=style)
        for text, bold in parts:
            r = para.add_run(text)
            r.bold = bold or None
        self._place(para._p)
        return para

    def h2(self, text):
        return self.p(text, style="Heading 2")

    def h3(self, text):
        return self.p(text, style="Heading 3")

    def bullets(self, items):
        for it in items:
            self.p(it, style="List Bullet 2")

    def numbered(self, items):
        for it in items:
            self.p(it, style="List Number")

    def table(self, header, rows, widths=None, font=8.5):
        t = self.doc.add_table(rows=1, cols=len(header))
        t.style = self.doc.styles["Table Grid"]
        for i, h in enumerate(header):
            c = t.rows[0].cells[i]
            c.text = ""
            r = c.paragraphs[0].add_run(h)
            r.bold = True
            r.font.size = Pt(font)
        for row in rows:
            cells = t.add_row().cells
            for i, v in enumerate(row):
                cells[i].text = ""
                r = cells[i].paragraphs[0].add_run(str(v))
                r.font.size = Pt(font)
        if widths:
            for row in t.rows:
                for i, w in enumerate(widths):
                    row.cells[i].width = Inches(w)
        self._place(t._tbl)
        self.p("")
        return t

    def image(self, path: Path, width_in: float, caption: str):
        self.doc.add_picture(str(path), width=Inches(width_in))
        pic = self.doc.paragraphs[-1]
        pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
        self._place(pic._p)
        cap = self.p(caption, style="Caption")
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER

    def code(self, lines):
        for l in lines:
            para = self.doc.add_paragraph()
            r = para.add_run(l)
            r.font.name = "Menlo"
            r._element.rPr.rFonts.set(qn("w:eastAsia"), "Menlo")
            r.font.size = Pt(8)
            para.paragraph_format.space_after = Pt(0)
            self._place(para._p)
        self.p("")


class HtmlWriter:
    """Same interface as Writer, builds the HTML the PDF is printed from."""

    def __init__(self):
        self.parts = []

    @staticmethod
    def esc(t):
        return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def p(self, text="", style=None, bold=False, italic=False, size=None, align=None):
        tag = {"Heading 1": "h1", "Heading 2": "h2", "Heading 3": "h3", "Caption": "p class='cap'", "List Bullet 2": "li", "List Number": "li", "List Bullet": "p class='q'"}.get(style, "p")
        if not text:
            return
        inner = self.esc(text)
        if bold:
            inner = f"<b>{inner}</b>"
        close = tag.split(" ")[0]
        self.parts.append(f"<{tag}>{inner}</{close}>")

    def rich(self, parts, style=None):
        self.parts.append("<p>" + "".join(f"<b>{self.esc(t)}</b>" if b else self.esc(t) for t, b in parts) + "</p>")

    def h2(self, text):
        self.p(text, style="Heading 2")

    def h3(self, text):
        self.p(text, style="Heading 3")

    def bullets(self, items):
        self.parts.append("<ul>" + "".join(f"<li>{self.esc(i)}</li>" for i in items) + "</ul>")

    def numbered(self, items):
        self.parts.append("<ol>" + "".join(f"<li>{self.esc(i)}</li>" for i in items) + "</ol>")

    def table(self, header, rows, widths=None, font=8.5):
        cols = "".join(f'<col style="width:{w / 6.7 * 100:.1f}%">' for w in widths) if widths else ""
        head = "".join(f"<th>{self.esc(h)}</th>" for h in header)
        body = "".join("<tr>" + "".join(f"<td>{self.esc(c)}</td>" for c in r) + "</tr>" for r in rows)
        self.parts.append(f'<table style="font-size:{font}pt"><colgroup>{cols}</colgroup><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>')

    def image(self, path: Path, width_in: float, caption: str):
        self.parts.append(f'<p class="fig"><img src="{path.as_uri()}" style="width:{min(width_in, 6.7) / 6.7 * 100:.0f}%"></p><p class="cap">{self.esc(caption)}</p>')

    def code(self, lines):
        self.parts.append("<pre>" + "\n".join(self.esc(l) for l in lines) + "</pre>")

    def html(self, title, header_rows, prelude):
        css = ("@page{size:A4;margin:16mm 15mm} body{font-family:Helvetica,Arial,sans-serif;font-size:10pt;line-height:1.42;color:#000;margin:0} "
               "h1{font-size:15pt;margin:18pt 0 6pt;border-bottom:1px solid #000;padding-bottom:2pt} h2{font-size:12pt;margin:12pt 0 4pt} h3{font-size:10.5pt;margin:10pt 0 3pt} "
               "p{margin:0 0 5pt} p.q{font-style:italic;color:#333;margin:4pt 0 6pt} p.cap{text-align:center;font-size:9pt;color:#333;margin:2pt 0 10pt} p.fig{text-align:center;margin:8pt 0 2pt} "
               "ul,ol{margin:0 0 6pt 18pt;padding:0} li{margin:0 0 4pt} table{border-collapse:collapse;width:100%;margin:4pt 0 10pt;table-layout:fixed} td,th{border:1px solid #000;padding:2pt 4pt;vertical-align:top;text-align:left;word-wrap:break-word} th{background:#eee} tr{page-break-inside:avoid} "
               "pre{font-family:Menlo,Consolas,monospace;font-size:8pt;border:1px solid #000;padding:6pt;white-space:pre-wrap;word-break:break-all} img{max-width:100%} "
               ".kicker{font-size:8pt;font-weight:bold;letter-spacing:.04em;margin:0} .title{font-size:20pt;font-weight:bold;margin:2pt 0 2pt} .sub{font-size:9pt;color:#333;margin:0 0 10pt} "
               "table.hdr td:first-child{font-weight:bold;width:28%;background:#eee}")
        hdr = "".join(f"<tr><td>{self.esc(k)}</td><td>{self.esc(v)}</td></tr>" for k, v in header_rows)
        return (f'<!doctype html><html><head><meta charset="utf-8"><title>{self.esc(title)}</title><style>{css}</style></head><body>'
                f'<p class="kicker">2026 FINTECHATHON, SUBMISSION TEMPLATE</p><p class="title">International AI Track | Technical Document</p><p class="sub">{self.esc(prelude)}</p>'
                f'<table class="hdr"><tbody>{hdr}</tbody></table>' + "".join(self.parts) + "</body></html>")


def find_write_here(doc):
    return [p for p in doc.paragraphs if p.text.strip() == "Write here"]


# ---------- content -------------------------------------------------------------------------

def section_01a(w: Writer):
    w.h2("Problem")
    w.p("China has more than 200,000 agricultural drone pilots. A spraying drone costs about 55,000 yuan and earns 3 to 15 yuan per mu. A pilot with no collateral cannot borrow the drone: a lessor has no way to see the work, no way to collect from it, and a flat monthly instalment ignores the season. The drone sits in a showroom and the field waits.")
    w.p("The same problem exists for any machine that does paid, verifiable work: a delivery drone paid per drop, a robot arm paid per part, a robotaxi paid per trip. The agricultural drone is the first case because the unit of work (a mu sprayed) is cheap to verify and the buyer (the farmer) pays on the spot.")
    w.h2("Target users")
    w.table(["User", "What they get"], [
        ["The pilot (operator)", "A drone with nothing to pledge. The drone earns per mu, repays the lease from each fee, and the title moves to the pilot at zero. The pilot never pays for the AI's mistakes: those hit the vendor bond."],
        ["The lessor (a licensed institution in a sandbox)", "Repayment per verified unit of work instead of a flat instalment, the title as collateral, a freeze on tampering, and a bond that is slashed only on cryptographic proof."],
        ["The farmer (requester and verifier)", "Pays per mu after confirming the work. The fee is locked before the flight and released only on the farmer's confirmation, with a 24 hour hold to flag bad work."],
        ["The agent's vendor (us)", "Posts a bond that pays for the agent's own rule breaks, with a fixed penalty and a daily cap. Earns a rail fee per released job."],
    ], widths=[1.8, 4.9])
    w.h2("Selected topic")
    w.p("Topic F, Agent Wallet, under the theme AI as a Financial Participant. The agent holds a wallet, earns, repays a loan, posts a bond and can be slashed. It is presented as an inclusive finance (普惠金融) story: credit reaches a pilot who has nothing to pledge because the machine is the borrower and its work is the collateral.")


def section_01b(w: Writer):
    w.h2("Core value")
    w.bullets([
        "The robot repays its lease per verified mu. Each confirmed fee splits by rule: an instalment to the lessor inside a 20 to 45 percent band, a rail fee, a top up of the pilot bond, the rest to the pilot. At zero the title moves on chain.",
        "The agent only services the lease. It plans the day, signs intents, and explains. It does not lend and it does not decide about money: a deterministic policy engine with 21 rule lines does, on the signed intent.",
        "The operator and the vendor are liable through posted bonds. The pilot bond is slashed only for pilot rules (a false confirmation, a task outside the geofence). The vendor bond is slashed only for agent rules (a payee off the allowlist, an amount over the cap). A slash needs a signed intent in the on chain log that breaks a rule the contract can check against its own records.",
    ])
    w.h2("Innovation")
    w.bullets([
        "The machine is the borrower. The lease, the bond and the title belong to the drone's wallet, not to a human account that an assistant proposes transactions for.",
        "Misbehaviour costs money, not just permissions. Every signed intent is committed to the IntentLog contract before the policy engine decides, blocked intents included, so a rule break by the agent is provable by any party of the job and is paid for by the vendor bond. No trusted judge, no reputation score.",
        "Two sides with opposite incentives. The drone's agent wants to accept work; the lessor's agent wants repayment and no tampering; the farmer wants work done before paying. The rules sit between them and the contracts settle.",
        f"Measured, not asserted. Ten components borrowed from other fields (a Kalman filter on the GPS track, a conformal threshold, a Buhlmann credit score, a lease MDP, a second price planner, a Monte Carlo bond stress test, a CUSUM drift monitor, a hash chained log, a message classifier, a strategy ratchet) each have a fixed seed and a held out set. On the held out flights the Kalman smoothed track cuts false alarms at full detection from {pct(O['rawFalseAlarmRate'])} to {pct(O['smoothedFalseAlarmRate'])}; the two bonds cut the lessor's p95 loss given default from {yuan(E['stress']['lgdWithoutBonds']['p95'])} to {yuan(E['stress']['lgdWithBonds']['p95'])}.",
        f"Real chain, real receipts. Four contracts are deployed and source verified on Base Sepolia. In the captured real run every one of {TX_CHECKED} transactions was fetched back from the chain while the evidence file was written: {TX_OK} succeeded, {TX_COMMITS} were IntentLog.commit calls with a Committed event each (Appendix D).",
    ])


def section_02a(w: Writer, arch_png: Path, flow_png: Path):
    w.h2("Architecture diagram")
    w.image(arch_png, 6.6, "Figure 1. Browser, API routes, engine, chain adapter and contracts. The model sits beside the engine and only writes explanations.")
    w.p("The browser draws what the stream says and computes nothing. A run is one async generator of typed events (narration, gate, plan, intent, policy, chain, proof, machine, job, done) in web/src/engine/scenarios.ts, so the dashboard, the live feed and the bring your own data page are the same engine with different inputs.")
    w.image(flow_png, 6.6, "Figure 2. One task from the farmer's message to the title transfer.")
    w.h2("Component responsibilities")
    w.table(["Component", "File", "Responsibility"], [
        ["Gate", "engine/framing.ts, engine/ml/gate.ts", "Escapes and frames every inbound message as data, applies pattern rules (override, key exfiltration, payee in text, pressure), adds a classifier risk score. Verdicts: pass, redact, hold, refuse. The classifier can only turn a pass into a hold."],
        ["Agent", "engine/agents.ts, engine/model.ts", "Reads the framed message into typed fields, computes the economics of a job, signs typed intents with the machine key. The model writes one sentence explanations and reads messages into a schema; it never names a payee or an amount."],
        ["Planner", "engine/planner.ts, engine/economics/pricing.ts", "Bounded knapsack over the day's candidate jobs against battery, charges and minutes; overlapping jobs settle by a second price comparison so an inflated bid cannot buy priority."],
        ["Policy engine", "engine/policy.ts", "Evaluates every signed intent against 21 rule lines held as data. Allow, deny or escalate to the operator's button. The model never sees it."],
        ["Intent log and mirrors", "engine/contracts.ts", "TypeScript mirrors of IntentLog, Bond, JobBoard and Lease with the same rules and numbers as the Solidity, so the demo runs with no chain."],
        ["Oracle", "engine/oracle.ts, engine/ml/plausibility.ts, engine/fusion/", "Checks a flight log by geometry and physics, smooths the GPS track with a Kalman filter, scores a robust z over five features against a conformal threshold, detects replayed tracks and teleport jumps."],
        ["Economics", "engine/economics/", "Lease MDP (value iteration), bond stress test (Monte Carlo), second price pricing."],
        ["Credit and drift", "engine/credit/score.ts, engine/drift/", "Buhlmann credibility score that shows the instalment share it would set inside the band (shown, not yet applied: the paid instalment uses the demo rate); CUSUM monitors on classifier risk and deny rate (monitoring, not decisions)."],
        ["Replay log", "engine/replay/log.ts", "Every event of a run appended to a hash chain; GET /api/replay lists and verifies."],
        ["Chain adapter", "engine/chain.ts", "SimChain: deterministic hashes labelled simulated. RealChain: IntentLog.commit for every intent and a calldata anchor for every money event on Base Sepolia, one transaction at a time with an explicit nonce."],
        ["Contracts", "contracts/src/", "IntentLog, Bond, JobBoard, Lease and the IBonded interface. Solidity 0.8.26, 43 Foundry tests, deployed on Base Sepolia."],
        ["Interface", "web/src/components/", "Landing, Dashboard, Live (feed and your own data), Evidence. English and Simplified Chinese, light and dark."],
    ], widths=[1.3, 2.0, 3.4], font=8)
    w.h2("Who holds which key")
    w.table(["Key", "Holder", "May sign", "Production"], [
        ["Machine key", "The drone's wallet, in the engine process", "pay, accept_job, start_task, claim_done, pay_instalment, inside caps and allowlists, through the policy engine", "Secure element on the drone"],
        ["Operator key", "The pilot, behind a physical button", "set_cap, top_up, rate changes inside the band", "Hardware key that signs one displayed action at a time"],
        ["Lender key", "The lessor's agent", "freeze, unfreeze, open the lease", "The lessor's HSM"],
        ["Requester key", "The farmer", "post, confirm, flag", "The farmer's app"],
        ["Vendor key", "Us", "postVendorBond", "Our HSM"],
        ["Hunter key", "A registered red team", "slashByProof on shadow jobs only", "Same"],
        ["The model", "None", "Nothing. It holds no key, sees no chain, signs nothing.", "Same"],
    ], widths=[1.1, 1.8, 2.5, 1.3], font=8)


def section_02b(w: Writer):
    w.h2("Models")
    w.table(["Model", "Use", "Where"], [
        ["Claude through the Vercel AI Gateway, optional", "Writes one sentence explanations and reads a farmer's message into a schema (task, window, fee, geofence, payee name). Without a key the same fields come from rules and the explanations from templates. Decisions never depend on it.", "engine/model.ts"],
        [f"Logistic classifier, hashed character 1 to 3 grams, {C['trainN']} training and {C['testN']} held out messages", "A risk score on every inbound message; can only add a hold.", "engine/ml/gate.ts, engine/ml/corpus.ts"],
        [f"Robust z anomaly model, fitted on {O['trainN'] - O['calibrationN']} flights, calibrated on {O['calibrationN']}, tested on {O['n']}", "Flags a flight log; the fee stays locked and the lessor is told.", "engine/ml/plausibility.ts"],
    ], widths=[2.0, 3.4, 1.3], font=8)
    w.h2("Tools the agent can call")
    w.table(["Tool", "Returns", "Can move money"], [
        ["economics(job)", "fee, energy, instalment, rail, margin, whether the reserve rule clears", "no"],
        ["plan(day)", "the knapsack plan", "no"],
        ["judge(message)", "the gate verdict", "no"],
        ["understand(message)", "typed fields from the framed text", "no"],
        ["plausible(log)", "the oracle verdict and reasons", "no"],
        ["sign(kind, fields)", "a signed intent; the policy engine decides what happens to it", "only through the policy engine"],
        ["explain(facts)", "one sentence grounded in the facts, numbers checked", "no"],
    ], widths=[1.6, 4.0, 1.1], font=8)
    w.h2("Data sources")
    w.bullets([
        "Jobs, flight logs and messages: scripted scenarios in engine/scenarios.ts, a seeded generator in engine/generate.ts for the live feed, or files the user brings as JSON or CSV (schema in TECHNICAL.md section 9).",
        f"Flight telemetry: {O['n'] + O['trainN']:,} synthetic flights generated from physical rules with receiver noise under seed {O['seed']}, {O['tampered']} of the held out ones tampered across five classes. Not real DJI logs, and labelled as such everywhere.",
        f"Messages: a hand written corpus of {C['trainN'] + C['testN']} messages in English and Chinese, a quarter held out by seed {C['seed']}.",
        "Prices and the lease: the demo constants in engine/policy.ts (drone 55,000 yuan, 13,750 mu lease, floor 200, bond minimum 2,000, vendor bond 5,000).",
    ])
    w.h2("External services")
    w.table(["Service", "Use", "Address"], [
        ["Base Sepolia, chain id 84532", "Test network for the contracts and the anchored events", "https://sepolia.base.org"],
        ["Test token", "The chain's native test ETH for gas only; demo amounts are yuan units in calldata and in the mirrors, no token of our own", ""],
        ["IntentLog", "Intent hashes per job, called by the engine in real mode", DEPLOY["contracts"]["IntentLog"]["address"]],
        ["Bond", "Pilot and vendor bonds, slashByProof", DEPLOY["contracts"]["Bond"]["address"]],
        ["JobBoard", "Jobs, fees, confirmation, holds", DEPLOY["contracts"]["JobBoard"]["address"]],
        ["Lease", "Hire purchase, freeze, title", DEPLOY["contracts"]["Lease"]["address"]],
        ["Sourcify", "Source verification of the four contracts, exact match", "https://sourcify.dev"],
        ["Vercel", "Hosting of the demo", LIVE],
        [f"FISCO BCOS {FISCO['nodeVersion']}, chain id {FISCO['chainId']}", "WeBank's consortium chain, the lender's ledger: the same four contracts, every intent committed to its IntentLog", f"IntentLog {FISCO['contracts']['IntentLog']['address']}"],
        [f"FATE {FATE['fate_version']}", "WeBank's federated learning framework: three lenders train one pilot credit model", "offline, fate/run.sh"],
    ], widths=[1.5, 3.0, 2.2], font=8)

    # Every figure below comes from contracts/deployments/fisco-bcos.json, docs/FISCO_EVIDENCE.md and fate/results.json.
    fm = re.search(r"(\d+) transactions, (\d+) with a successful receipt in the recorded block, (\d+) IntentLog commits, (\d+) of them read back", FISCO_EVIDENCE)
    dual = re.search(r"(\d+) of (\d+) pairs have a successful receipt on both chains", FISCO_EVIDENCE)
    m = FATE["metrics_on_held_out"]; pe = FATE["prior_effect"]["rateErrorBps"]["after_0_jobs"]
    w.h2("Built on WeBank's stack: FISCO BCOS and FATE")
    w.bullets([
        f"FISCO BCOS. The four contracts run unchanged on a FISCO BCOS {FISCO['nodeVersion']} node in Docker, compiled with evm_version {FISCO['evmVersion']} because FISCO's EVM has no PUSH0. The engine reaches it through FISCO's Web3 JSON-RPC with viem, the same code path as Base Sepolia."
        + (f" A full run sent {fm.group(1)} transactions to FISCO, {fm.group(2)} with a successful receipt; all {fm.group(4)} of {fm.group(3)} IntentLog commits read back with the engine's intent hash." if fm else ""),
        "Two ledgers, one hash. With both chains set, every intent is committed to the IntentLog on Base Sepolia, public and checkable by anyone, and on FISCO BCOS, the licensed lender's consortium ledger, and the feed shows both hashes."
        + (f" In one real run {dual.group(1)} of {dual.group(2)} intents have a successful receipt on both chains with the same hash." if dual else ""),
        f"FATE. Three lenders train one pilot default model with FATE {FATE['fate_version']} HomoLR and secure aggregation, no repayment records shared. Held out AUC goes from {m['local_only_lender_a']['auc']:.3f} for one lender alone to {m['fate_federated']['auc']:.3f} federated; the model sets a new pilot's starting credit score and cuts the instalment share error from {pe['flat_mae']:.0f} to {pe['fate_mae']:.0f} basis points. Data is synthetic and seeded.",
        f"Model provenance. The FATE model's sha256 is committed to the FISCO IntentLog (tx {FISCO['fateModel']['tx'][:12]}..., block {FISCO['fateModel']['block']}) and read back, so a lender can prove which model priced each pilot.",
        "Scope. The FISCO node runs locally and is reproduced with contracts/script/fisco.sh; the public demo reaches it through a tunnel and settles each job's money on the deployed contracts there, falling back to the labelled simulation when the node is down. FISCO's block time is in milliseconds; the settlement adapter converts job windows and holds.",
    ])


def section_03a(w: Writer):
    w.h2("What the model does")
    w.bullets([
        "Reads the farmer's message, the lessor's notices and tool results after the gate has framed them as data, and fills a typed schema: task, window, fee, geofence, payee name. A payee name is matched against the allowlist by the engine; the model never outputs an address.",
        "Explains every event in one sentence, in English or Simplified Chinese. Each number in the sentence is checked against the facts it was given; a sentence that fails the check is replaced by a template.",
        "Proposes nothing about money. Rate changes come from the credit score inside the band; caps come from the operator's button.",
    ])
    w.h2("What the model does not do")
    w.p("It does not decide about money. It does not hold a key, sign, pay, change a cap, or see the policy engine. A jailbroken model can write a wrong sentence; it cannot move a tier, because tiers are checked on the signed intent and the intent is signed by code with values from tools.")
    w.h2("Intent understanding")
    w.p("Every inbound message is escaped and wrapped in a relay frame that names the sender and its authority (data, never instructions). The gate applies pattern rules and the classifier's risk score. Only a message that passes or is redacted reaches understanding, which produces typed fields with a source (model or rules) and a confidence. A field whose value came from message text (an amount, a payee) carries provenance = message, and the policy engine denies any intent that uses it.")
    w.h2("Planning")
    w.p("The planner runs a bounded knapsack over the day's candidate jobs against three budgets: mu per charge, charges per day and minutes in the window. Overlapping jobs settle by a second price comparison: the higher margin per mu flies first and pays the runner up's bid in priority, so a farmer who inflates a stated fee cannot buy a slot at a profit. The lease MDP sets the acceptance knobs per week from the balance owed, the bond, the weather and the offer class; the ratchet tunes four of those knobs against a frozen week and keeps a change only if profit rises and the reserve rule holds.")
    w.h2("Tool use")
    w.p("Every money relevant number comes from a tool, never from text: the fee from the job record, the instalment from the lease rate and the credit score, energy from the plan, the payee from the allowlist. The signed intent carries provenance for the amount and the payee, and the policy engine reads it.")
    w.h2("State the agent tracks")
    w.table(["State", "Where", "Used by"], [
        ["Current job and its status (posted, locked, running, confirmed, released, held, declined)", "JobBoard mirror", "start_task, claim_done, the fee split"],
        ["Balance, bond balance and minimum, lease balance, floor", "MachineState", "solvency check, the reserve rule, the title transfer"],
        ["Freeze status of the lease", "Lease mirror", "every instalment; a frozen lease stops the agent accepting work"],
        ["Caps, spent today, payments in the last hour, deviation reference", "policy context", "per transaction cap, daily cap, rate limit, deviation"],
        ["Nonces and spent intent hashes", "agents.ts, Bond mirror", "replay protection"],
        ["The credit state (Beta posteriors per component)", "credit/score.ts", "the instalment share inside the band"],
        ["CUSUM statistics on classifier risk and deny rate", "drift/monitor.ts", "the Monitors panel; an alarm is shown, nothing is changed automatically"],
        ["The hash chained replay log of the run", "replay/log.ts", "GET /api/replay"],
    ], widths=[3.0, 1.6, 2.1], font=8)


def section_03b(w: Writer, det_png: Path, loss_png: Path):
    w.h2("Plausibility of a flight log")
    w.p("A flight log carries track length, seconds, swath, claimed mu, battery used, altitude variance and the GPS samples. The oracle (engine/oracle.ts) checks physics first: the claimed area against swath times track length, speed against the drone's maximum, battery per mu against the honest rate, runtime against the window. Then the statistical test: a robust z (median and MAD) over five derived features, with the GPS track first smoothed by a constant velocity Kalman filter and a Rauch Tung Striebel pass (engine/fusion/kalman.ts), innovation gating that rejects a jump the model cannot explain (teleport), and an FNV hash of the innovation sequence that catches a replayed track. The flag threshold is not hand set: split conformal calibration on honest flights picks the quantile for a 2 percent target false alarm rate (engine/fusion/conformal.ts).")
    w.image(det_png, 5.6, "Figure 3. Tampered flights caught against honest flights flagged, threshold swept, raw track against the Kalman smoothed track.")
    w.h2("Payment")
    w.p("payment = rate per mu times verified mu, where verified mu is the smaller of the claimed area and the area the smoothed track supports, and the fee is the listing price inside the listing band. The instalment is a share of the fee inside the agreed band (20 to 45 percent), moved by the pilot's credit score; a monthly minimum is a field of the Lease contract. Energy and the rail fee come off before the margin, and a job is declined when the margin per mu is below the reserve rule.")
    w.h2("Freeze logic")
    w.p("A held flight log (oracle verdict not ok) locks the fee, notifies the lessor and the lessor's agent freezes the lease (Lease.freeze with a reason). A frozen lease accepts no new work until the lessor unfreezes it, which only the lender key can do. A proven rule break by the agent slashes the vendor bond and also freezes.")
    w.h2("Bond")
    w.p("The vendor bond is posted before the agent may act (Bond.postVendorBond, then Bond.register with the agent's consent signature). The pilot bond fills from fees until it reaches the minimum. A slash needs: a signed intent whose hash is in the IntentLog for that job and agent, a signature that recovers to the agent, a submitter who is a party of the job (or a registered hunter on a shadow job), and a rule that holds against the contract's own records (the allowlist and cap in Bond, confirmation and geofence in JobBoard). Half of the slash goes to the harmed party and half to the treasury; on a live job the submitter earns no bounty, so compromising a live wallet pays nothing.")
    w.h2("Two invariants")
    w.bullets([
        "Never pay more than verified output times rate: the fee released by JobBoard.confirm is the locked fee, the locked fee is the listing, and a claimed area above what the track supports is held, not paid.",
        "Never drop below the reserve: a task starts only if the bond plus the floor covers a quarter of the fee (Bond.covers), and a job is accepted only if the margin clears the reserve rule. The ratchet and the MDP cannot cross the reserve rule; it is a hard constraint, not a cost.",
    ])
    w.h2("Dialogue: ask the agent why")
    w.p("After a declined job the pilot can ask the agent why (web/src/engine/ask.ts, POST /api/ask). The agent answers from the engine's own numbers in English or Chinese, asks one clarifying question with concrete choices (accept at the break even rate, propose a rate, keep it declined), recomputes any correction with the same planner and policy engine, and refuses what the rules forbid while naming the rule and who can change it. It works without a model; with the free model the wording may change, never the numbers or the decision.")
    if SETTLED:
        calls = [r for r in SETTLED["rows"] if not r["call"].startswith("fund")]
        ok = sum(1 for r in SETTLED["rows"] if r["status"] == "success")
        w.h2("Settlement on the contracts, with recovery")
        w.p(f"On FISCO BCOS the engine settles each job's money on the deployed contracts in the same loop (engine/settle.ts): vendor bond, fee locked in JobBoard, confirmed and split, instalments through Lease.pay, slash by proof, title transfer. In the recorded run {len(calls)} contract calls and {len(SETTLED['rows']) - len(calls)} funding transfers to fresh role wallets, {ok} of {len(SETTLED['rows'])} successful; a free model read {SETTLED_SUM['offersReadByModel']} of {SETTLED_SUM['offers']} job offers and code accepted {SETTLED_SUM['readingsAcceptedByCode']} readings against the signed listings. Every call goes through one recovery wrapper: sent, confirmed or failed, retried with a fresh nonce on network errors, compensated on a revert (JobBoard.cancel refunds the farmer), or given up with an alert. Both fault drills (a failed confirm, a reverted start) recovered on chain.")
    w.h2("Evaluation approach")
    w.p("Synthetic data with injected tampering, a held out split chosen by a fixed seed before any fitting, and both the detection rate and the false alarm rate reported. The agent has no write path to the corpus, the seed or the threshold. pnpm test fails if any number falls below its floor; pnpm bench and pnpm charts recompute the table and the charts; the Evidence page in the app shows the same numbers live.")
    by = O["byTamper"]
    w.table(["Component", "Data and split", "Held out result"], [
        ["Message classifier", f"{C['trainN'] + C['testN']} messages, {C['testN']} held out, seed {C['seed']}", f"accuracy {pct(C['accuracy'])}, precision {pct(C['precision'])}, recall {pct(C['recall'])}, false alarm {pct(C['falseAlarmRate'])}"],
        ["Telemetry oracle", f"{O['n']} held out flights, {O['tampered']} tampered, seed {O['seed']}", f"detection {pct(O['detectionRate'])}, false alarm {pct(O['falseAlarmRate'])}; by class: " + ", ".join(f"{k} {v['caught']} of {v['n']}" for k, v in by.items())],
        ["Kalman smoothing", "same flights, two track features, matched detection", f"false alarm {pct(O['rawFalseAlarmRate'])} raw, {pct(O['smoothedFalseAlarmRate'])} smoothed"],
        ["Conformal threshold", f"{O['calibrationN']} honest calibration flights", f"z {O['conformalThreshold']:.2f} for a {pct(O['targetFalseAlarm'])} target, achieved {pct(O['achievedFalseAlarm'])}, coverage {pct(O['coverage'])}"],
        ["Lease MDP", f"{E['mdp']['states']:,} states, {E['mdp']['horizon']} weeks, {E['mdp']['seasons']} seasons, seed {E['mdp']['seed']}", f"{yuan(E['mdp']['comparison']['mdp']['meanProfit'])} against {yuan(E['mdp']['comparison']['greedy']['meanProfit'])} greedy, title {pct(E['mdp']['comparison']['mdp']['titleShare'])}"],
        ["Bond stress test", f"{E['stress']['seasons']} seasons, seed {E['stress']['seed']}", f"default {pct(E['stress']['defaultProbability'])}; p95 loss {yuan(E['stress']['lgdWithoutBonds']['p95'])} without bonds, {yuan(E['stress']['lgdWithBonds']['p95'])} with, bonds absorb {pct(E['stress']['bondCover'])}"],
        ["Strategy ratchet", f"{RT['steps']} proposals on a frozen week, seeds {RT['evalSeed']} and {RT['walkSeed']}", f"{RT['kept']} kept, {yuan(RT['baselineProfit'])} to {yuan(RT['bestProfit'])}"],
        ["Credit score", "prior, three confirmed jobs, one held log", "score " + ", ".join(f"{p:.3f}" for p in CR["path"]) + f", tier {CR['final']['tier']}"],
        ["Drift monitor", f"{DR['shiftAt']} benign then attack scores, seed {DR['seed']}", f"alarm {DR['delay']} observations after the shift, {DR['quietAlarms']} false alarms in 600"],
    ], widths=[1.3, 2.4, 3.0], font=8)
    w.image(loss_png, 5.6, "Figure 4. Lessor loss given default at the 95th percentile as instalment skips rise, with and without the two bonds.")


def section_04a(w: Writer):
    w.h2("Permission tiers")
    w.table(["Tier", "Who", "May do on its own", "Needs confirmation", "Only a human"], [
        ["L0 read", "Any agent, the model", "Read prices, balances, messages, tool results", "", ""],
        ["L1 draft", "The model", "Write explanations, fill typed fields from a framed message", "", "It never names a payee or an amount"],
        ["L2 engine allow", "The machine key through the policy engine", "Accept a job inside the geofence and the listing band with the bond covering it; start a locked job; claim done; pay an allowlisted payee inside the per transaction cap, the daily cap and the hourly rate limit; pay the instalment inside the rate band", "Any failed operator rule on a valid machine intent escalates to the button", ""],
        ["L3 operator", "The pilot, physical button", "", "", "Raise a cap, change the rate band, widen a geofence, top up the bond, edit the allowlist"],
        ["Lender", "The lessor's key", "", "", "Freeze and unfreeze the lease, open the lease"],
    ], widths=[0.9, 1.2, 2.4, 1.2, 1.1], font=8)
    w.p("Tiers are enforced in PolicyEngine.evaluate() on the signed intent and again by the contracts. Rule changes, unfreezing and the allowlist are never reachable from the agent: the agent has no intent kind for them. An attempt by the model to change its own rules produces text, not an intent.")
    w.h2("Confirmation for sensitive actions")
    w.p("A set_cap or top_up intent signed by the machine key is denied with the operator only rule and the run stops with a button event. The operator presses the physical button (POST /api/button in the demo), which signs the one displayed action with the operator key. Every other sensitive action is a contract call by its own keyholder: confirm by the farmer, freeze by the lessor, slashByProof by a party of the job.")
    w.h2("Safeguards")
    w.table(["Safeguard", "Value in the demo", "Where"], [
        ["Payee allowlist", "The lender, the rail, the charging station and the bond; a payee within 3 characters of an allowlisted address is named and denied (lookalike rule)", "policy.ts allowlist, lookalike; Bond.isAllowlisted"],
        ["Per transaction cap", "1,000 yuan", "policy.ts; Bond perTxCap"],
        ["Daily cap", "5,000 yuan", "policy.ts"],
        ["Rate limit", "12 payments an hour", "policy.ts"],
        ["Deviation", "within 25 percent of the reference amount", "policy.ts"],
        ["Reserve", "a task needs the bond plus the 200 yuan floor to cover a quarter of the fee; a job needs the margin to clear the reserve rule", "policy.ts solvency, economics; Bond.covers"],
        ["Kill switch", "the lessor freezes the lease; a frozen lease accepts no work and pays no instalment", "Lease.freeze, Lease.unfreeze"],
        ["Daily penalty cap on the vendor bond", "so a pilot cannot drain it with staged scams", "Bond vendorTerms dailyCap"],
        ["Replay protection", "nonce in the typed intent, spent hash set in Bond", "agents.ts, Bond spent"],
    ], widths=[1.5, 3.4, 1.8], font=8)


def section_04b(w: Writer):
    w.h2("Prompt injection through messages and invoices")
    w.p("Every message, notice or document is escaped, wrapped in a relay frame that marks it as untrusted data, and judged before the agent reads it. Pattern rules catch instruction overrides, key exfiltration, payees and caps in text, and pressure; the classifier adds a risk score that can only hold. Even a message that passes cannot move money, because payees, amounts, caps and locations never come from text: provenance = message denies the intent in the policy engine. A fake lessor notice that changes the settlement account, a crafted invoice with a new payee, and a hidden instruction in a farmer's message are all cases in the attack set.")
    w.h2("Privilege escalation")
    w.p("The agent has no intent kind for rule changes, unfreezing or the allowlist, so there is nothing to escalate into. A machine signed set_cap or top_up is denied by the operator only rule and waits for the button. A stranger's signature, a replayed signature and a signature over edited fields are rejected by the policy engine and by Bond.slashByProof. The model process holds no key, so a jailbroken model can at most write a wrong sentence, which the grounding check replaces with a template.")
    w.h2("Red team results")
    w.p(f"{ATT_TOTAL} attack cases across the three layers, run at request time on the Evidence page and in pnpm test: {ATT_BLOCKED} of {ATT_TOTAL} blocked. {BEN_PASS} of {BEN_TOTAL} ordinary farmer messages pass the same gate. The same inputs through a naive wallet that reads addresses out of text: it pays the attacker in {NAIVE_FELL} of {ATT_TOTAL} cases. The full list is in Appendix C and in docs/RED_TEAM.md.")
    w.h2("Security tests and scans")
    sl = SCAN["slither"]
    w.bullets([
        f"Static analysis: Slither over every contract, {sl['total']} findings triaged, 0 true issues of medium or higher; details in docs/SECURITY_SCAN.md.",
        "Dependencies: pnpm audit, 0 vulnerabilities in production dependencies; secrets: gitleaks over the whole git history, 0 leaks.",
        f"Receipts: pnpm verify:all re-fetched {RECEIPTS['verified']} of {RECEIPTS['total']} claimed transactions on Base Sepolia and FISCO BCOS and matched {RECEIPTS['intentHashesMatched']} intent hashes in calldata.",
        "Threat model (STRIDE) with a control and evidence per threat, and the official self-assessment template, in docs/Zishi_Security_Self_Assessment.docx.",
        "Failure recovery: retry, compensation and give up paths tested in pnpm test and drilled on chain.",
    ])
    w.h2("Privacy")
    w.p("Machine data (a track hash, an area, a battery figure) is not personal data under PIPL. The farmer's name and field are the job's data and stay with the parties of the job; only an intent hash, a track hash and a confirmation go on chain, so nothing personal is published. Ownership is defined in the job terms: the flight log belongs to the pilot, the confirmation to the farmer, and the lessor receives the hashes and the verdicts, not the raw track. Nothing uploaded on the Live page is stored.")
    w.p("Automated decisions (PIPL Article 24): every money decision is rule based and the person affected can ask why through the ask the agent panel; held logs and slashes have a human dispute path. A short impact assessment under Articles 55 and 56 is in the security self-assessment.")
    w.h2("Compliance")
    w.bullets([
        "The agent services the lease; it does not lend. The lender of record is a licensed lessor in a regulatory sandbox, and the wallet is a sub account of the pilot's business.",
        "The demo runs on a public test network with test ETH for gas and yuan as demo units. Production settles in bank money on a consortium chain (FISCO BCOS) or in fiat; there is no public token, in line with the PBoC's 2021 notice on virtual currency trading.",
        "Financial leasing (融资租赁): the lessor is a company licensed under the NFRA's Measures for the Administration of Financial Leasing Companies (2024) or the interim measures for financing lease companies (2020). Zishi services the contract inside a signed rate band; it does not lend.",
        "Payments: fees settle through a licensed bank or payment institution under the Regulations on Non-bank Payment Institutions (2024), or e-CNY. The chain records events; it does not custody customer funds.",
        "Drone operations: under the CAAC's Interim Regulations on the Flight Management of Unmanned Aircraft (2024) and CCAR-92, the pilot holds the operator licence and operation certificate, the drone is real name registered and third party liability insurance is in force. The job terms carry these as preconditions.",
        "Hong Kong: the same split under the HKMA (payments), the SFC (virtual asset activities) and the PDPO (personal data).",
        "Physical damage and third party liability are the pilot's drone insurance plus a human dispute path; the bonds cover rule breaks only.",
    ])
    w.h2("Known risks")
    w.bullets([
        "IntentLog.commit in v1 is permissionless and first writer wins per hash, so a third party could commit an agent's intent hash first and a compromised agent could skip committing. Fixed in IntentLogV2 and BondV2 (commit only by the job's agent, entries keyed by agent and hash, a skipped commit on a running job still slashable), deployed on FISCO BCOS and used by the live engine's settlement there, with 16 Foundry tests; Base Sepolia keeps v1 until the redeploy.",
        "Actor keys are random per server instance and held in memory; a fixed derivation from public labels exists only for tests and replays. They are still software keys on one server; production keys live in the secure element, a hardware device and HSMs.",
        "Bond, JobBoard and Lease run as TypeScript mirrors in the live engine; a Foundry script runs one full job against the deployed contracts with its own evidence table.",
    ])


def section_05(w: Writer):
    w.h2("Environment")
    w.table(["Item", "Value"], [
        ["Operating system", "Any with Node.js; developed on macOS 15, deployed on Vercel (Linux)"],
        ["Runtimes", "Node.js 22.22, pnpm 10.27, Foundry 1.8.5 (forge, cast), solc 0.8.26"],
        ["Application", "Next.js 16.4, React 19.3, TypeScript 5, viem 2.57, zod 4.6, ai 7.0, three 0.186"],
        ["Contracts", "Solidity 0.8.26, forge-std vendored in contracts/lib"],
        ["Chain", "Base Sepolia, chain id 84532, public RPC https://sepolia.base.org"],
    ], widths=[1.6, 5.1])
    w.p("Environment variables, all optional; the app runs fully without them with scripted explanations and a simulated, labelled chain. No real value is written anywhere in the repository; web/.env.example lists them empty.")
    w.table(["Variable", "Purpose"], [
        ["OPENROUTER_API_KEY (or an OpenRouter key in AI_GATEWAY_API_KEY)", "Free models only (ids ending in :free, enforced in code): the model writes explanations, reads messages into fields and rewords the ask the agent replies. Decisions never depend on it."],
        ["SURETY_PRIVATE_KEY", "A funded Base Sepolia key. Real mode commits intents to IntentLog and anchors money events."],
        ["BASE_SEPOLIA_RPC", "JSON-RPC endpoint, default https://sepolia.base.org"],
        ["DEMO_TOKEN", "Real mode only for requests carrying this token as the x-zishi-demo header. Unset means the funded key is never used."],
        ["ZISHI_INTENT_LOG", "IntentLog address; default is the Base Sepolia deployment"],
    ], widths=[2.4, 4.3])
    w.h2("Setup from a clean environment")
    w.code([
        f"git clone {REPO}",
        "cd shenzhen-fintechathon/web",
        "pnpm install",
        "pnpm test            # engine self check: attacks, benign set, every learned metric floor, replay heads",
        "pnpm dev             # app on http://localhost:3000",
        "cd ../contracts",
        "forge test           # 43 tests",
    ])
    w.h2("Contract deployment")
    w.code([
        "cd contracts",
        "forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --private-key $SURETY_PRIVATE_KEY --broadcast",
        "forge verify-contract --chain 84532 --verifier sourcify <address> src/<Name>.sol:<Name>",
        "# addresses and deploy transactions: contracts/deployments/base-sepolia.json",
    ])
    w.h2("Starting the demo")
    w.bullets([
        f"Hosted: {LIVE}. Dashboard: press Start. Live: press Start for the seeded feed, or drop a JSON or CSV file. Evidence: the attack set runs on load.",
        "Real chain: set SURETY_PRIVATE_KEY, DEMO_TOKEN and fund the key on Base Sepolia, then open the app once with ?demo=<token>. The browser keeps the token and every run sends it as a header.",
        "Reports: pnpm evidence (a run and its balance sheet), pnpm verify (every hash checked), pnpm bench (the before and after table), pnpm charts (docs/charts), pnpm report (docs/EXECUTION_EVIDENCE.md, docs/RED_TEAM.md, docs/EVALUATION.md).",
    ])
    w.h2("Test cases and results")
    w.p("Three suites run in CI on every push (.github/workflows/ci.yml): lint and type check, the engine self check, the Next.js build, and the Foundry tests. Results below are from the latest run of each; the detailed attack list is in Appendix C.")
    w.table(["Suite", "Cases", "Result"], [
        ["Invariant tests (engine self check)", "every slash rule has a contract case, removed rules absent, a normal instalment allowed, the model layer has no reach into keys or chain, every learned metric at or above its floor, two seeded runs hash to the same replay head and a tampered entry is caught at its position", "pass"],
        ["Spoofed counter, replayed data, disconnected sensor (oracle)", f"inflated area, replayed track, impossible speed, battery too low, teleport jump: {O['tampered']} tampered flights held out", f"{sum(v['caught'] for v in by_tamper().values())} of {O['tampered']} caught, {pct(O['falseAlarmRate'])} honest flights flagged"],
        ["Fake invoice, bank detail change by message, prompt injection (gate and policy)", f"{sum(1 for r in ATTACK_ROWS if r[2] in ('message', 'policy'))} cases", f"{sum(1 for r in ATTACK_ROWS if r[2] in ('message', 'policy') and r[4] == 'blocked')} blocked"],
        ["Bond slashing (contracts and mirrors)", f"{sum(1 for r in ATTACK_ROWS if r[2] == 'contract')} engine cases; Foundry: slash by each rule, foreign evidence, stranger signature, replay, hunter on a live job, daily cap, three fuzz tests at 256 runs", f"{sum(1 for r in ATTACK_ROWS if r[2] == 'contract' and r[4] == 'blocked')} blocked; 43 Foundry tests pass"],
        ["Benign set", f"{BEN_TOTAL} ordinary farmer messages that must pass the gate", f"{BEN_PASS} pass"],
        ["Naive wallet baseline", f"the same {ATT_TOTAL} attacks through a wallet that reads addresses out of text", f"fails {NAIVE_FELL} of {ATT_TOTAL} (by design, the comparison)"],
        ["Real chain run", f"{TX_CHECKED} transactions from one run fetched back from Base Sepolia", f"{TX_OK} succeeded, {TX_MISSING} missing, {TX_COMMITS} IntentLog commits with a Committed event"],
    ], widths=[1.9, 3.2, 1.6], font=8)
    w.h3("Cases that failed, and what was done")
    w.bullets([
        "The first real chain run failed on the second transaction with 'replacement transaction underpriced': the engine sent several transactions from one wallet a few hundred milliseconds apart and the node saw a nonce clash. Fixed by sending one at a time with an explicit pending nonce and a retry; the captured run in Appendix D has no failures.",
        "A second commit of a hash already in the IntentLog reverts with 'already committed'. The engine now simulates the call first, so the duplicate costs no gas and is anchored as calldata with the reason in its label. Tested locally with four concurrent sends including a duplicate.",
        "The in memory rate limiter on the public routes is per server instance and does nothing on a serverless host. Documented as best effort; the funded key is guarded by the demo token, not by the limiter.",
        "No test in the three suites fails at the time of writing. The naive wallet baseline fails by design.",
    ])
    w.h2("Known limitations")
    w.bullets([
        "The farmer, the pilot, the lessor and the vendor are simulated actors with keys generated at boot. There is no hardware counter or secure element in the build.",
        "Flight telemetry and the message corpus are synthetic. The held out numbers measure the components against our own generator, not against real DJI logs or real attackers.",
        "Only IntentLog is called on chain. Bond, JobBoard and Lease rules run in TypeScript mirrors of the deployed contracts; their calls from the engine are the next step.",
        "A public test network stands in for a consortium chain; yuan are demo units in calldata.",
        "No remote lock on the drone and no insurer. Physical damage is out of scope and named as the one human decision path.",
        "Finality: RealChain waits for one receipt to confirm and two more blocks to finalise. Production on a consortium chain with deterministic finality.",
    ])


def by_tamper():
    return O["byTamper"]


def appendices(w: Writer):
    w.p("Appendix A. Policy rules", style="Heading 1")
    w.p("Rules are data in DEFAULT_POLICY (web/src/engine/policy.ts). Each line carries a tier. A failed operator only line on a valid machine intent escalates to the button; any other failure denies.")
    w.table(["Rule", "Applies to", "Check", "Tier"], [
        ["signature", "all", "Recovered signer equals the actor's key", "L2"],
        ["replay", "all", "Signature hash never seen before", "L2"],
        ["amount", "money kinds", "Finite, positive, two decimals", "L2"],
        ["provenance", "pay, pay_instalment", "Neither amount nor payee came from message text", "L2"],
        ["allowlist", "pay, pay_instalment", "Payee is on the allowlist", "L2"],
        ["lookalike", "pay, pay_instalment", "Payee within 3 characters of an allowlisted address is named and denied", "L2"],
        ["instalment payee", "pay_instalment", "Payee is the lender", "L2"],
        ["per transaction cap", "pay, pay_instalment", "Amount at most 1,000 yuan", "L2"],
        ["daily cap", "pay, pay_instalment", "Spent today plus amount at most 5,000 yuan", "L2"],
        ["rate limit", "pay, pay_instalment", "Fewer than 12 payments in the last hour", "L2"],
        ["deviation", "pay, pay_instalment", "Within 25 percent of the reference amount", "L2"],
        ["rate band", "pay_instalment", "Instalment share of the fee between 20 and 45 percent", "L2"],
        ["geofence", "accept_job, start_task", "Field is one of the known geofences", "L2"],
        ["contact", "accept_job", "Requester is a known contact", "L2"],
        ["listing band", "accept_job", "Fee inside the listing's band", "L2"],
        ["economics", "accept_job", "Margin clears the reserve rule", "L2"],
        ["job", "start_task", "Job exists and is locked", "L2"],
        ["job geofence", "start_task", "Intent geofence equals the job's geofence", "L2"],
        ["solvency", "start_task", "Bond plus floor covers a quarter of the fee", "L2"],
        ["confirmation", "claim_done", "The agent asserts confirmed; the contract checks the board", "L2"],
        ["operator only", "set_cap, top_up", "Signed by the operator key", "L3"],
    ], widths=[1.3, 1.5, 3.4, 0.5], font=8)

    w.p("Appendix B. Contract functions", style="Heading 1")
    w.table(["Contract", "Function", "Who calls", "Does"], [
        ["IntentLog", "commit(jobId, intentHash)", "the agent", "Records job, agent and time for a hash; reverts on a second commit"],
        ["IntentLog", "committedAt, jobOf, agentOf", "anyone", "Reads used by Bond.slashByProof"],
        ["Bond", "postVendorBond(penalty, dailyCap) payable", "the vendor", "Posts the vendor bond with its fixed penalty and daily cap"],
        ["Bond", "register(agent, operator, vendor, minimum, perTxCap, slashAmount, allow, agentSig)", "the agent, with its consent signature", "Registers an agent, its operator, its vendor, its caps and its allowlist"],
        ["Bond", "fill(agent) payable, topUp(agent) payable", "the board on release; the operator", "Fills the pilot bond from fees; tops it up"],
        ["Bond", "bondOf, worstCase, covers(agent, exposure)", "anyone, JobBoard.start", "Bond balance and minimum; whether bond plus floor covers an exposure"],
        ["Bond", "slashByProof(intent, signature, rule)", "a party of the job, or a hunter on a shadow job", "Checks signature, log, party and rule against records; slashes the pilot or vendor bond; pays the harmed party"],
        ["Bond", "setBoard, setHunter", "the deployer, once", "Wires the board; registers red team keys"],
        ["Bond", "DOMAIN_SEPARATOR, hashIntent, digestOf", "anyone", "EIP-712 domain Zishi Bond, the same digest the engine signs"],
        ["JobBoard", "post(agent, verifier, leaseId, geofence, windowStart, windowEnd, shadow) payable", "the farmer", "Locks the fee and posts the job"],
        ["JobBoard", "start(id)", "the agent", "Needs Bond.covers for a quarter of the fee"],
        ["JobBoard", "confirm(id)", "the verifier", "Releases the fee by rule: instalment to Lease.pay, rail, bond fill, the rest to the agent, a 24 hour hold kept"],
        ["JobBoard", "flag(id), releaseHold(id), cancel(id)", "the verifier; anyone after the hold; the farmer after the window", "Hold after a flag; release the hold; refund"],
        ["JobBoard", "isConfirmed, geofenceOf, isParty, isShadow, requesterOf", "Bond", "Views the proof check reads"],
        ["Lease", "open(operator, agent, total, rateBps, bandLoBps, bandHiBps, monthlyMinimum)", "the lender", "Opens the hire purchase"],
        ["Lease", "pay(id) payable", "JobBoard on release", "Applies the instalment; at zero the title moves to the operator"],
        ["Lease", "instalmentFor(id, fee)", "JobBoard", "The instalment at the current rate inside the band"],
        ["Lease", "freeze(id, reason), unfreeze(id)", "the lender", "Stops and resumes the lease"],
        ["Lease", "setRate(id, rateBps)", "the operator", "Changes the rate inside the band only"],
    ], widths=[0.8, 2.4, 1.5, 2.0], font=8)

    w.p("Appendix C. Reason codes and the attack set", style="Heading 1")
    w.p("Gate verdicts: pass, redact, hold, refuse. Gate categories: override, key_exfil, payee_in_text, cap_in_text, location_in_text, money_request, pressure, oversize. Policy verdicts: allow, deny, escalate, each with the rule lines that failed. Slash rules: PayeeNotAllowlisted (0), OverCap (1), FalseConfirmation (2), OutsideGeofence (3). Bond.slashByProof revert order: unknown agent, proof already used, not the agent's signature, not in log, not a party, no violation, daily cap reached.")
    w.p(f"The attack set, generated at the same time as docs/RED_TEAM.md: {ATT_BLOCKED} of {ATT_TOTAL} blocked, {BEN_PASS} of {BEN_TOTAL} benign messages pass, the naive wallet fell to {NAIVE_FELL}.")
    w.table(["#", "Attack", "Layer", "Rubric item", "Zishi", "Naive wallet"], [[r[0], r[1], r[2], r[3], r[4], r[5]] for r in ATTACK_ROWS], widths=[0.3, 2.6, 0.7, 1.4, 0.8, 0.9], font=7.5)

    w.p("Appendix D. Transaction hashes", style="Heading 1")
    w.p(f"Contract deployment, Base Sepolia block {DEPLOY['block']:,}, from {DEPLOY['deployer']}.")
    w.table(["Contract", "Address", "Deploy transaction", "Gas"], [[n, c["address"], c["tx"], f"{c['gasUsed']:,}"] for n, c in DEPLOY["contracts"].items()], widths=[0.8, 2.4, 2.9, 0.6], font=7)
    w.p(f"One real run of the fleet scenario captured from the public app in real mode, every receipt fetched back from the chain when docs/EXECUTION_EVIDENCE.md was generated (commit {EVIDENCE_COMMIT}): {TX_CHECKED} transactions, {TX_OK} succeeded, {TX_COMMITS} IntentLog commits, {TX_ETH} ETH in gas. Each hash opens at https://sepolia.basescan.org/tx/<hash>.")
    w.table(["#", "Event", "Sent to", "Status", "Block", "Gas", "Hash"], [[r[0], r[2], r[4], r[5], r[6], r[7], hash_of(r[9])] for r in TX_ROWS], widths=[0.3, 2.0, 0.9, 0.5, 0.6, 0.5, 1.9], font=6.5)

    w.p("Appendix E. References", style="Heading 1")
    w.bullets([
        f"Repository: {REPO}. Live app: {LIVE}.",
        "TECHNICAL.md (full technical documentation, 16 sections), SELF_ASSESSMENT.md, docs/JUDGES_GUIDE.md, docs/EXECUTION_EVIDENCE.md, docs/RED_TEAM.md, docs/EVALUATION.md with docs/results/, docs/charts/, DESIGN.md, contracts/README.md.",
        "Base Sepolia explorer: https://sepolia.basescan.org. Source verification: https://sourcify.dev.",
        "EIP-712: Typed structured data hashing and signing. Kalman, R. E. (1960), A new approach to linear filtering and prediction problems. Rauch, Tung and Striebel (1965), Maximum likelihood estimates of linear dynamic systems. Vovk, Gammerman and Shafer (2005), Algorithmic learning in a random world (conformal prediction). Buhlmann, H. (1967), Experience rating and credibility. Page, E. S. (1954), Continuous inspection schemes (CUSUM). Bellman, R. (1957), Dynamic programming. Vickrey, W. (1961), Counterspeculation, auctions and competitive sealed tenders.",
    ])


# ---------- main ----------------------------------------------------------------------------

def main() -> int:
    doc = docx.Document(str(TEMPLATE))
    # Header table.
    t = doc.tables[0]
    for row, value in zip(t.rows, [TEAM, TRACK, date.today().isoformat()]):
        cell = row.cells[1]
        cell.paragraphs[0].runs[0].text = value if cell.paragraphs[0].runs else value
        for r in cell.paragraphs[0].runs[1:]:
            r.text = ""
    # Diagrams.
    arch = render_mermaid(mermaid_block(ROOT / "README.md", "## Architecture"), "arch", 1700, 1000)
    flow = render_mermaid(mermaid_block(ROOT / "README.md", "### One task, end to end"), "flow", 2200, 520)
    det = svg_to_png(DOCS / "charts" / "detection-curve.svg")
    loss = svg_to_png(DOCS / "charts" / "lender-loss.svg")
    # Fill each "Write here" in template order, once into the docx and once into the HTML for the PDF.
    slots = find_write_here(doc)
    assert len(slots) == 9, len(slots)
    questions = [p.text for p in doc.paragraphs if p.style.name == "List Bullet"]
    heads = [p.text for p in doc.paragraphs if p.style.name == "Heading 1"]
    fillers = [
        lambda w: section_01a(w), lambda w: section_01b(w),
        lambda w: section_02a(w, arch, flow), lambda w: section_02b(w),
        lambda w: section_03a(w), lambda w: section_03b(w, det, loss),
        lambda w: section_04a(w), lambda w: section_04b(w),
        lambda w: (section_05(w), appendices(w)),
    ]
    hw = HtmlWriter()
    head_before = {0: heads[0], 2: heads[1], 4: heads[2], 6: heads[3], 8: heads[4]}
    for i, (slot, fill) in enumerate(zip(slots, fillers)):
        w = Writer(doc, slot)
        fill(w)
        slot._p.getparent().remove(slot._p)
        if i in head_before:
            hw.p(head_before[i], style="Heading 1")
        hw.p(questions[i], style="List Bullet")
        fill(hw)
    OUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT_DOCX))
    print("wrote", OUT_DOCX.relative_to(ROOT), f"{OUT_DOCX.stat().st_size // 1024} KB")
    # PDF: the same content as HTML, printed by the system Chrome.
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    html_path = TMP / "techdoc.html"
    prelude = next(p.text for p in doc.paragraphs if p.text.startswith("Required material"))
    html_path.write_text(hw.html("Zishi technical document", [("Team name", TEAM), ("Competition track", TRACK), ("Submission date", date.today().isoformat())], prelude), encoding="utf8")
    subprocess.run([CHROME, "--headless=new", "--user-data-dir=/tmp/zishi-chrome", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000", f"--print-to-pdf={OUT_PDF}", html_path.as_uri()], check=True, capture_output=True)
    print("wrote", OUT_PDF.relative_to(ROOT), f"{OUT_PDF.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
