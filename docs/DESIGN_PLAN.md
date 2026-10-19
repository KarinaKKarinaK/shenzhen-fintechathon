# Zishi 自食 – Design Plan

Plan for the restyle described in `docs/DESIGN_BRIEF.md`. Refine, do not rebuild. No code until approved.
Story: **drone** (decided 19 Oct). Story copy stays; only the brand name and the styling change.

**Scope: visual only** (Julian, 19 Oct). No change to functions, data, fields, engine or API. Every page keeps the content and numbers it shows today; layout, colour, type, logo, icons and motion change. Content and logic changes are Karina's (see section 7).

## 1. Tokens

### Colour (exactly the brief's palette, nothing else)

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FAF9F6` | page background |
| `surface` | `#FFFFFF` | cards, tables |
| `ink` | `#14213D` | text, headings, chart marks |
| `ink-2` | `#4A5568` | secondary text, labels |
| `rule` | `#E4E1D8` | borders, table rules, the faint page grid |
| `seal` | `#B8322A` | seal, brand mark, primary button only |
| `gold` | `#C9A227` | thin lines, small fills (progress tick, chart bars for outflow) |
| `gold-text` | `#8A6A1F` | gold as text (rare: "simulated" chain tag) |
| `warn` | `#9A5B00` | outside band, data anomaly; always icon + text |

Removed: `red-soft`, `red-deep`, `gold-soft`, `slate` (blue), `black`, `muted` (`#7A7A76` fails 4.5:1 for small text, becomes `ink-2`).
Seal button hover: `color-mix(in srgb, var(--seal) 88%, var(--ink))`, so no new hex.

Charts (no red/green, no blue): inflow `ink`, outflow `gold`, slash = `ink` with a 45° hatch plus a broken-seal marker on the bar. Legends always in words.

### Type

| Role | Face | Size / weight |
|---|---|---|
| Display (page title) | Manrope | 39 px / 700, -0.02em, sentence case |
| H2 | Manrope | 25 px / 700 |
| H3 / card title | Manrope | 20 px / 600 |
| Body | Manrope | 16 px / 400, line-height 1.55, max 72ch |
| Label | Manrope | 13 px / 500, `ink-2`, sentence case, never uppercase, never tracked |
| Key number | JetBrains Mono | 49 px (dashboard, live counters) / 31 px (cards), tabular-nums |
| Hash, address, amount in tables | JetBrains Mono | 14 px, tabular-nums |
| Chinese idiom / CJK headings | `"Songti SC", "STSong", "SimSun", serif` | system, no download |
| Chinese UI text | `"PingFang SC", "Microsoft YaHei", sans-serif` | system |

Scale ratio 1.25 (13 / 16 / 20 / 25 / 31 / 39 / 49). Fonts via `next/font/google`, which self-hosts at build time, so no Google request reaches the viewer. Chakra Petch and Geist Mono are dropped. CJK spans get `lang="zh-Hans"` so the browser picks Simplified glyphs.

### Surfaces and spacing

- Card: `surface`, 1 px `rule` border, radius 6 px, no shadow, no corner brackets, no chamfer (`clip-path`) anywhere.
- Hierarchy comes from size and position, not from decoration. One card style, two sizes of padding (16 / 24 px).
- Page grid: keep the 48 px grid, drawn in `rule` at 35 % opacity (now gold at 7 %).
- Spacing steps: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Alignment: left aligned everywhere. Numbers right aligned in tables.

### Status (never colour alone)

| State | Look |
|---|---|
| Verified / kept / attack blocked | `ink` label + 16 px seal stamp icon: "Verified", "Blocked" |
| Warning (outside band, implausible log, needs the operator) | `warn` + triangle icon + label: "Held: log implausible" |
| Violation / slashed | `ink` + broken-seal icon + "Bond slashed", amount and recipient on the same line |
| Policy line passed | `ink` check icon + rule name |
| Policy line failed | `warn` cross icon + rule name + detail |

### Motion

One deliberate moment: the seal **stamps** (existing `stamp` keyframe, 500 ms) when a batch is verified in the live demo, and the broken seal when the bond is slashed. Count-up stays on the live counters because it shows a real change. Everything else goes: ticker, pulse ring, `mined` flash, entrance slides on feeds and cards, hover lift on cards. `prefers-reduced-motion` turns the stamp into an instant swap.

## 2. Logo: the seal

`components/Seal.tsx` replaces `Logo.tsx`'s `Mark`, `Wordmark`, `Logo`.

- 自食 as **SVG paths**, white on `seal` (白文印, white characters cut into a red seal). Outlines extracted once from Noto Serif SC (SIL Open Font License, allows this use) with a one-off script; the script is not shipped, only the path data. System Songti is Apple-licensed, so not used for the outlines.
- Irregular edge: a fixed hand-jittered outline path (about 40 points, deterministic), plus a few tiny fixed "ink voids" inside so it reads as a print. No SVG filters (they render differently across browsers and in PDF export).
- Variants:
  - `<Seal variant="full" />`: seal + 自食其力 (Songti, vertical in the rail, horizontal in the header) + "Zishi".
  - `<Seal variant="stamp" />`: 16–24 px, used as the verified icon.
  - `<Seal variant="broken" />`: same seal split by a diagonal crack, the two halves offset 2 px. Used for "Bond slashed".
- Favicon: the stamp variant as `app/icon.svg`.

## 3. Shell

- `layout.tsx`: metadata title "Zishi 自食", description "自食其力 · The robot that pays for itself". Fonts Manrope + JetBrains Mono.
- Rail (desktop ≥ 768 px): white strip, seal at the top, icons with sentence-case tooltips, at the bottom 自食其力 written vertically in Songti (CJK is native vertically, unlike the current rotated Latin "机信 JIXIN").
- Mobile (< 768 px): the rail becomes a bottom tab bar with four labelled icons. Now the 84 px rail eats a quarter of a 390 px screen.

## 4. Pages, in build order

### 4.1 `/app`, mission control

Same content as today (attacks blocked, per transaction cap, daily cap, instalment band, the six steps, links to demo and evidence, defense by layer, allowlisted payees), restyled:

```
Mission control
 Attacks blocked   Per payment cap   Daily cap   Instalment band     ← big mono numbers
 20 / 20 [印]      120               600         20 to 45 %

 Lock › Check › Work › Confirm › Repay › Own        (sequence, plain list)

┌ Live demo ──────────┐ ┌ Evidence ──────────┐   ← two plain link cards, no gold wash
┌ Defense by layer ───────────┐ ┌ Allowlisted payees (mono addresses) ┐
```

Ticker: stays, but static (no scrolling) and in quiet `ink-2`.

### 4.2 `/app/evidence`

```
Evidence
Verify without trusting us. Everything below runs when you load the page.

 Attack set 20 of 20 blocked [印]   Chain: simulated, labelled   Model: scripted text, decisions in code

┌ Attack set (table) ────────────────────────────────────────────────────┐
│ #  Attack                                  Layer     Result   Reason ▸ │
│ 1  Ignore previous instructions …          Message   [印] Blocked  …   │
│ …  row expands inline to show the full reason                          │
└────────────────────────────────────────────────────────────────────────┘

┌ Try your own attack ─┐ textarea, ink button, three result columns (light)
┌ How to verify ───────┐ three endpoints, mono only for the paths
```

Same content as today. Attack tiles become a table with the same fields (id, name, layer, blocked, reason); status as seal icon + word. The "No slashing without proof" case view from the brief needs new data and is left to Karina (section 7).

### 4.3 `/app/fleet`, live demo

```
Live demo                                        [Start] [Fast] [Clear]
Agricultural drone on hire purchase. <intro line>

 Balance   Bond      Lease left     ← first four of today's seven, large
 58.40     30 / 30   23.80
 Tasks paid 3 · Transactions 18 · Attacks blocked 2/2 · 6.1 events/s  ← the other three, one line

 Lock › Check › Work › Confirm › Repay › Own      (sequence, so numbers stay)

┌ Scene (3D, as today) ──────────────────────┐ ┌ Event stream (light) ──┐
│ narration panel at bottom, seal stamps     │ │ 12:03:04  Instalment   │
│ when a batch is verified                   │ │ 9.60  0x3f…a1          │
└────────────────────────────────────────────┘ │ 12:03:05  Policy: all  │
                                               │ rules pass             │
┌ Policy engine, last decision ┐ ┌ Chain feed ┐ └────────────────────────┘
┌ Bond ┐ ┌ Lease ┐ ┌ Jobs ┐ ┌ Cash flow ┐ ┌ Bond over the run ┐
```

Event stream: white surface, Manrope for the event text, mono only for timestamps, hashes and amounts; event types as words in `ink-2`, not coloured chips. Scene: keep the 3D, change the in-scene labels to Manrope sentence case, replace blue/gold emissive accents with palette colours, held/slashed states use `warn` + text. Removed: aurora backgrounds, brackets, dark aside. KPI row: the same seven values, three large and four in one line below.

### 4.4 `/` landing

Same content and copy as today (except the name), restyled:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [自食 seal]  自食其力 · The robot that pays for itself                   │
│                                                                      │
│ Machines that earn, pay and post a bond.     ┌ 3D scene, framed ───┐ │
│ Paid per verified unit of work. …            │ (as today, smaller, │ │
│ [Watch a drone pay off its lease]            │  beside the text)   │ │
│ Verify it yourself                           └─────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ 20 attack cases · 3 contracts · 0 human decisions · 2 sides          │
│ Where else it applies: the five cards, light, in a row (no dark fan) │
│ Safe by design / Why it holds up / Only here: light cards, no washes │
│ Footer: 自食其力, "feed yourself by your own labour"                   │
└──────────────────────────────────────────────────────────────────────┘
```

The 3D scene moves from full-bleed background to a framed panel beside the headline, so the seal and the sentence carry the first five seconds. Ticker static.

## 5. Changes per file

| File | Change |
|---|---|
| `app/globals.css` | new tokens; remove `.grain*`, `.aurora*`, `.cut*`, `.bracket`, gradient `.tile::before`, `.passbook`, `.pulse`, `.mined`, caps in `.tech`/`.display`; new `.card`, `.btn`, status classes |
| `app/layout.tsx` | fonts, metadata (name), mobile tab bar |
| `components/Logo.tsx` | seal variants (full, stamp, broken), same exports so callers keep working |
| `components/StatusIcon.tsx` (new) | verified / warning / slashed / pass / fail icons |
| `components/Rail.tsx` | seal, vertical idiom, sentence-case tooltips, bottom bar on mobile |
| `app/page.tsx`, `app/app/page.tsx`, `app/app/evidence/page.tsx` | classes and layout only |
| `components/*` (panels, graphs, stages, attack grid, judge console, fan, ticker, run view) | classes, colours, icons only; same props, same data |
| `components/Scene.tsx` | label styling and colour constants only |
| engine, API | **no change** |

## 6. Check after each page

Playwright screenshots at 1440 px and 390 px (Chromium is already cached locally), compared with the sketches above; then 125 % zoom on `/app` and `/app/evidence`; contrast spot checks; `npx tsx src/engine/selfcheck.ts` and `pnpm lint` pass.

## 7. For Karina (content and logic, out of this scope)

1. **Reserve is not a policy rule.** The brief's invariant "never go below the reserve" is in the scenario's economics, not a line in `policy.ts`.
2. **Slash recipient.** The brief says the slashed bond goes to the injured party; `slashByProof` sends it to the rail address and half as a bounty to the submitter.
3. **Dashboard content.** The brief wants `/app` to show verified units, repaid so far, bond, reserve, last batches with tx hash and incidents. Today it shows config values. Needs data from a run.
4. **"No slashing without proof" case view** on `/app/evidence` (violation left, deduction right, decision bottom). Needs the slash case as data.
5. **Decorative ticker** shows made-up hashes (`keccak256("jixin-i")`); the brief lists fake precision as a no-go.
