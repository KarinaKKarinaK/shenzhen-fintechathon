# Zishi 自食 – Design Brief and Handoff

Handoff from a claude.ai planning session (19 Oct 2026, 22:50 HKT) to Claude Code.
Goal of this session: restyle the existing web app to the Zishi brand and make it read well for the jury. Refine, do not rebuild.

## 1. Project in one paragraph

Shenzhen FinTechathon 2026, International Track, theme "AI as a Financial Participant". Team: Julian + Karina. Repo: github.com/KarinaKKarinaK/shenzhen-fintechathon (private, Karina owns it). Live site: https://jixin-fintechathon.vercel.app (routes: `/`, `/app`, `/app/fleet`, `/app/evidence`).
Deadline 20 Oct 2026, 23:59 Beijing time; internal submission 21:00.

Product: "Robot pays for itself" with a bond-agent liability layer. A licensed lessor finances an industrial robot for a small factory; repayment is per verified unit of output. An AI agent checks machine data for physical plausibility, computes the instalment inside an agreed band, pays power and maintenance, and freezes on tampering. The agent's operator posts an on-chain bond; on a proven violation (payment above verified production, payee not on the allowlist, reserve breached) the bond is slashed and paid to the injured party. Money decisions are made by a deterministic policy engine, never by the LLM. Invariants: never pay more than verified production × rate; never go below the reserve.

Scoring: task completion 40 %, security & compliance 30 %, innovation & interaction 30 %, Topic F on-chain bonus 0–5.

## 2. Name

**Zishi 自食**, from 自食其力 (zì shí qí lì), "feed yourself by your own labour". The robot that pays for itself.
- Always show the full idiom **自食其力** next to the logo. 自食 alone can also evoke 自食其果 ("reap what you sow"), which is ambiguous as a brand.
- Tagline: "自食其力 · The robot that pays for itself".
- Replace every "JiXin 机信" (logo, title, meta, copy).

## 3. Audience

Jury (assumed to be the on-site mentors): Wang Shouyang (CAS, ~68), Qiang Yang (ex-WeBank CAIO, ~65), Wen Jung Li (CityU, robotics/sensing, ~60), Li Jianqiang (SZU AI dean, ~46), Chai Yunpeng (Renmin, databases, ~43), Dacheng Xiu (Chicago Booth, econometrics, ~42), Wolfgang Härdle (HU Berlin, statistics/digital assets, 72), Josh Bongard (UVM, evolutionary robotics, 52).
Age range 42–72; they read on a laptop, possibly as PDF. Five of eight are in China; online review likely from mainland China.
They must grasp in 5 seconds: verified production, repayment so far, bond, reserve, violations.

## 4. Design direction

"Infrastructure, not an app": it should look like a contract or an audit report a lessor would trust, not a trading app. Between institutional banking (Lazard) and modern fintech infrastructure (Modern Treasury, Column). Calm, readable, one bold element.

The one bold element is the **red seal (印章, "chop")**. In China a contract becomes binding with a red seal. Every kept commitment gets a stamp; a slashed bond shows a broken stamp.

Note from the frontend-design skill: cream background + serif display + hairlines + monospace labels are common AI-generated tells. So: keep the off-white subtle, no serif display everywhere, monospace only for real hashes and amounts, never for labels.

### Palette (use exactly)

```css
:root {
  --paper:     #FAF9F6;  /* page background, subtle off-white */
  --surface:   #FFFFFF;  /* cards, tables */
  --ink:       #14213D;  /* text, headings – 15:1 on paper */
  --ink-2:     #4A5568;  /* secondary text – 7:1 */
  --rule:      #E4E1D8;  /* hairlines, borders */
  --seal:      #B8322A;  /* ONLY seal, brand, primary CTA – 5.6:1 */
  --gold:      #C9A227;  /* ONLY thin lines and small fills, never text (2.3:1) */
  --gold-text: #8A6A1F;  /* gold as text – 4.8:1 */
  --warn:      #9A5B00;  /* "outside band" warning – 5.1:1, always with icon + text */
}
```

Rules:
- Red is only the seal, the brand and the primary button. Red is never an error colour (in China red means luck and "price up").
- Gold only as thin lines or small accents. Large red + gold areas together read as Chinese New Year or state symbolism.
- No green/red status pairs.

### Status semantics (never colour alone)

| State | Look |
|---|---|
| Kept / verified | ink text + small seal stamp icon + label "Verified" |
| Warning (outside band, data anomaly) | `--warn` + warning icon + label |
| Violation / slashed | ink text + broken-seal icon + label "Bond slashed", amount and recipient shown |

### Typography

- UI and headings: **Manrope** (already loaded via `next/font`), sentence case. Drop **Chakra Petch** and all-caps headings.
- Chinese headings and the idiom: system serif, `"Songti SC", "STSong", "SimSun", serif`; Chinese UI text: `"PingFang SC", "Microsoft YaHei", sans-serif`. No webfont download for CJK.
- Hashes and amounts: **JetBrains Mono** via `next/font`, `font-variant-numeric: tabular-nums`.
- Body ≥ 16 px, labels ≥ 13 px, numbers that matter large. Line length < 80 characters.
- All fonts self-hosted (`next/font` does this). **No Google Fonts CDN**: Google is blocked in mainland China.

### Remove

- Gold/pink gradient washes ("The bond rail", "Try your own attack" boxes)
- Corner-bracket ornaments on cards
- Dark terminal panel in the live demo (make the event stream light, mono only for hashes)
- Tiny light-grey labels
- Fade-in on every section; at most one deliberate motion moment

### Keep

- Off-white background with the faint grid (soften if needed)
- Seal logo concept, red primary CTA
- Evidence page structure (attack set, results table) – it is the strongest security story

### No-gos for this jury

Neon/dark crypto look, purple gradients, glassmorphism, 3D coins/rockets, shield-and-lock clichés, stock photos, crypto vocabulary in the UI (token, coin, staking → use "bond", "deposit" is also bad because of the ofo deposit scandal), the number 4 in version labels, fake precision without derivation.

## 5. Logo spec: the seal

- Square red seal (`--seal`) with 自食 in white, slightly irregular edge like a real print.
- Drawn as **SVG paths**, not as text (text would depend on the viewer's fonts).
- Three variants: full logo (with 自食其力 next to it), small stamp ("batch verified"), broken stamp ("bond slashed").

## 6. Screens and priorities

1. `/app` (overview / lessor dashboard): verified units, repaid so far, bond, reserve, last batches with tx hash, incidents.
2. `/app/evidence`: attack results; this is where security points come from. Add a clear "no slashing without proof" case view: left the violation (transaction + violated rule), right the deduction with reason and recipient, bottom the decision.
3. `/app/fleet` (live demo): light event stream, big counters.
4. `/` (landing): hero with the seal, idiom, one sentence, one CTA.

**Open question before changing copy:** the current landing page tells a **drone** story ("Watch a drone pay off its lease", "drones, humanoids and agents"); the project doc describes an **industrial robot arm in a factory**. Check with Karina which story is final. Do not rewrite story copy until this is settled; restyling can proceed.

## 7. Visual references (layout ideas only, no copying)

- Modern Treasury (moderntreasury.com): white, black ink, infrastructure diagram, mono labels
- Column (column.com): navy on white, a ledger card with code
- Lazard (lazard.com): large serif headline, institutional calm
- Stripe annual letter (stripe.com/annual-updates): a document as the hero
- Dribbble "AgentPay" (shots/27761728): wallet with controls, reserve, emergency controls → maps to bond, policy caps, kill switch
- Dribbble "Kredo – AI Claims Review Workspace" (shots/27623706): evidence left, findings right, decision bottom → maps to the slashing case view

## 8. Workflow in Claude Code

Skills installed: `frontend-design` (Anthropic) and `taste-skill` (community). Check exact names with `/skills`; plugin skills may be namespaced like `/frontend-design:frontend-design`. A skill command must be at the **start** of a message.

1. Plan mode (Shift+Tab). Run frontend-design: read the four pages, produce the design plan (tokens, type scale, ASCII layout per page, list of changes per file). No code until Julian approves.
2. Implement in this order: global tokens + fonts → seal logo → `/app` → `/app/evidence` → `/app/fleet` → `/`. After each page take Playwright screenshots at 1440 px and 390 px, compare with the plan, fix, move on.
3. Second opinion: taste-skill review of `/app` and `/app/evidence`, fix only the three weakest points.
4. Manual check at 125 % browser zoom.
5. Commit on branch `design/zishi`, push, review the Vercel preview with Karina, then merge.

## 9. Repo state at handoff

- Local path: `~/Projects/shenzhen-fintechathon`
- Branch `design/zishi` already exists locally, no upstream yet → `git push -u origin design/zishi` later; get latest main with `git fetch origin && git merge origin/main`.
- `npm install` failed: **no `package.json` at the repo root**. The web app is either in a subfolder or deployed from another repo/branch. First step: find it.
  - `find . -name package.json -not -path "*/node_modules/*" -maxdepth 4`
  - if nothing: `git fetch origin && git branch -r`, or ask Karina which repo/branch the Vercel project is linked to.
- Repo content and code comments in English; talk to Julian in German.
- Do not change licence files; IP stays with the team.
