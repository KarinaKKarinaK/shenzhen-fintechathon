# Zishi web app

Next.js 16, React 19, TypeScript, Tailwind 4. The engine, the API and the UI live here. Contracts are in `../contracts`.

## Run

```
pnpm install
pnpm dev          # localhost:3000
```

Optional environment in `.env` (see `.env.example`): a model key for written explanations, a funded Base Sepolia key plus a demo token for real hashes. Without them the app runs with templates and a simulated chain, labelled as such.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Serve the build |
| `pnpm lint` | ESLint |
| `npx tsc --noEmit` | Type check, catches a missing i18n key |
| `pnpm test` | Engine self check: attack set blocked, benign set passing, rule coverage, learned metrics |
| `pnpm evidence` | Runs both scenarios and writes `evidence/run-<stamp>.json`, `.state.json` and a model transcript |
| `pnpm verify` | Recomputes the balance sheet from the evidence and checks anchored hashes on Base Sepolia |

## Pages

| Route | What |
|---|---|
| `/` | Landing |
| `/app` | Dashboard: attack numbers, policy, allowlist, caps |
| `/app/fleet`, `/app/neighbour` | The live run, five moments, Details toggle |
| `/app/live` | Live feed of generated jobs, or your own JSON or CSV through the same engine |
| `/app/evidence` | Attack set at request time, judge console, learned components |

## Folder map

```
src/
  app/                 Next.js app router
    page.tsx           landing
    layout.tsx         fonts, theme, language provider
    globals.css        tokens: white, red, gold, dark theme
    app/               the product pages (dashboard, fleet, neighbour, evidence, live)
    api/               one folder per route, each a route.ts
      run/             GET, SSE stream of a scenario
      run-custom/      POST, SSE stream over uploaded jobs, flights and messages
      live/            GET, SSE stream of generated jobs until the client closes
      samples/         GET, the sample files the live page offers
      judge/           POST, gate plus shadow policy run on any text
      attacks/         GET, the attack set
      button/          POST, the operator key path
      metrics/         GET, held out metrics
      ratchet/         GET, strategy search
  engine/              no React, no Next. Everything that decides
    types.ts           EngineEvent, Intent, Job, MachineState, Telemetry
    scenarios.ts       fleet, neighbour, attack generators; RUNS state per scenario
    schema.ts          Zod schema for a custom run: jobs, flights, messages, policy, lease
    generate.ts        seeded job generator for the live feed
    policy.ts          PolicyEngine, DEFAULT_POLICY, DEMO numbers, TIERS
    framing.ts         frame, escape, judge: the gate rules
    agents.ts          sign, understand, economics, split, explain
    model.ts           the only file that talks to a model; no keys, no chain
    planner.ts         knapsack over the day
    ratchet.ts         strategy hill climbing on a frozen week
    oracle.ts          flight log geometry
    contracts.ts       mirrors of IntentLog, Bond, JobBoard, Lease
    chain.ts           SimChain, RealChain, demo token check
    keys.ts            actor keys, EIP-712 domain, intent hash, recover
    attacks.ts         52 attack cases, benign set, naive wallet comparison
    naive.ts           a wallet with no gate, for the comparison
    ratelimit.ts       per IP limits for the public routes
    i18n.ts            tr and both for engine text
    selfcheck.ts       pnpm test
    ml/
      corpus.ts        classifier training and held out text
      gate.ts          logistic regression classifier, METRICS
      plausibility.ts  telemetry anomaly model, METRICS
  components/          UI, every string through useLang
    RunView.tsx        the live run: five moments, Details toggle
    useRun.ts          EventSource client, event reducer
    Panels.tsx         policy checklist, chain feed, bond, lease, balance sheet
    Graphs.tsx         charts
    EvidenceView.tsx   evidence page, AttackGrid, JudgeConsole, Learned
    DashboardView.tsx  dashboard
    LandingView.tsx    landing sections
    LiveView.tsx       live feed and your data tabs
    Learned.tsx        learned component cards
    demoToken.ts       capture ?demo= and send the header
    money.ts           yuan formatting
  lib/
    csv.ts             small CSV parser
    ingest.ts          JSON or CSV upload into a validated run input
  i18n/
    en.ts, zh.ts       dictionaries, same keys
    LangProvider.tsx   useLang
    LangToggle.tsx     switch
scripts/
  evidence.ts          pnpm evidence
  verify.ts            pnpm verify
public/
  photos/, hero.jpg    images
evidence/              committed runs the README cites
```

## Conventions

- The UI never computes a number. It draws events from the engine.
- Add a UI string to both dictionaries, correct Simplified Chinese in `zh.ts`.
- No em dashes, no emojis, less text.
- Full technical documentation: `../TECHNICAL.md`. Contributing: `../CONTRIBUTING.md`.
