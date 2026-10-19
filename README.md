# Zishi 自食其力, the robot that pays for itself

[![CI](https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml/badge.svg)](https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml)

Live: https://zishi-fintechathon.vercel.app

A wallet for machines. An agricultural drone on hire purchase earns per mu sprayed, repays its lender from every fee, fills a bond that is slashed only on cryptographic proof of a rule break, and owns itself when the lease reaches zero. Money decisions are made in code. The model explains, it never decides.

Entry to the 2026 Shenzhen International FinTech Competition, International Track, Topic F, "AI as a Financial Participant". English and Simplified Chinese, light and dark.

![Landing](docs/screenshots/landing.png)

## At a glance

| | |
|---|---|
| Contracts on Base Sepolia | 4, source verified, exact match ([addresses](#contracts-on-base-sepolia)) |
| Foundry tests | 40 passing |
| Policy rules, checked on every signed intent | 21 lines, 4 trust tiers |
| Attack set at request time | 52 of 52 blocked, 7 of 7 benign messages pass, naive wallet falls to 51 of 52 |
| Learned and optimising components | 10, each with a fixed seed and a held out set |
| Message classifier, held out | accuracy 95.0%, recall 95.5%, false alarm 5.4% |
| Telemetry tamper detection, held out | 100% on five tamper classes at 3.0% false alarm |
| Lender loss given default, p95 | 25,593 yuan without bonds, 19,739 with |
| Hash chained run log | 293 events per run, same head on the same seed, tamper caught at its position |
| Engine | 4,200 lines of TypeScript, no framework, runs with no key and no chain |
| Languages, themes | 2 and 2 |

## Why it is different

| What everyone else built | What Zishi adds |
|---|---|
| An assistant proposes, code decides, a human confirms | The machine has its own money at risk. A bond is slashed by proof, with no trusted party deciding |
| One agent acting for one human | Two sides with opposite incentives: the drone's agent and the lender's agent, plus the farmer who pays and confirms |
| Reputation scores | Economic consequences. The vendor bond pays for the agent's mistakes, the pilot bond for the pilot's cheating. The pilot never pays for the AI |
| Insurance priced from telemetry | Telemetry proves work happened. Nothing prices risk from it |
| A chatbot over a database | Four contracts, an intent log, EIP-712 signed intents, a policy engine with its rules as data, and learned components with held out metrics |

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[Dashboard, Live, Evidence]
    T[useRun: SSE reader]
  end
  subgraph API["Next.js 16 API routes, SSE"]
    R["/api/run"]
    C["/api/run-custom"]
    LV["/api/live"]
    J["/api/judge"]
    M["/api/metrics"]
    RP["/api/replay"]
  end
  subgraph Engine["web/src/engine"]
    S[scenarios: async generator of events]
    F[gate: rules + classifier]
    AG[agents: understand, economics, sign]
    PL[planner: knapsack, second price]
    P[policy engine: 21 rules as data]
    CM[mirrors of the 4 contracts]
    O[oracle: Kalman + conformal + robust z]
    ML[credit, MDP, ratchet, stress, drift]
    RL[replay log: hash chain]
  end
  subgraph Chain["chain adapter"]
    SIM[SimChain, labelled]
    REAL[RealChain, viem]
  end
  BS[(Base Sepolia 84532)]
  subgraph Contracts["contracts/ Solidity 0.8.26"]
    IL[IntentLog]
    BD[Bond]
    JB[JobBoard]
    LS[Lease]
  end
  MD[Model: explanations only, optional]
  UI --> T --> R & C & LV
  UI --> J & M & RP
  R & C & LV --> S
  S --> F --> AG --> PL --> P --> CM
  S --> O
  S --> RL
  M --> ML
  CM --> SIM
  CM --> REAL --> BS
  BS --- Contracts
  CM -. same rules, same numbers .- Contracts
  AG -.-> MD
```

The browser draws what the stream says and computes nothing. Every run is a sequence of typed events (`narration`, `gate`, `plan`, `intent`, `policy`, `chain`, `proof`, `machine`, `job`, `done`) from one async generator, so the dashboard, the live feed and the bring your own data page are the same engine with different inputs.

## How one task flows

```mermaid
flowchart LR
  F[Farmer posts a job] --> G[Gate: rules plus classifier]
  G -->|data, never instructions| U[Understand: fee, mu, field, window]
  U --> P[Planner: knapsack over battery and time]
  P -->|accept| I[Signed intent, EIP-712]
  P -->|decline| X[Reason shown]
  I --> L[Intent log: hash on chain, full intent to every party]
  L --> E[Policy engine: 21 rules in code]
  E -->|allow| J[Job contract locks the fee]
  E -->|deny| S[Slashable by proof]
  J --> W[Drone sprays, telemetry signed]
  W --> A[Anomaly model checks the log]
  A -->|plausible| C[Farmer confirms]
  A -->|tampered| H[Fee held, lender alerted]
  C --> R[Fee splits: instalment, rail, bond, pilot]
  R --> T{Lease at zero?}
  T -->|yes| O[Title moves to the pilot]
  T -->|no| F
```

A 1,000 yuan fee for 100 mu splits by rule: 40% instalment to the lender (inside the 20 to 45% band, moved by the pilot's credit score), a fixed rail fee, a bond top up until the bond covers a quarter of the next job, the rest to the pilot. The drone keeps nothing it cannot explain.

## Who holds which key

```mermaid
flowchart TB
  subgraph L0["L0 read"]
    M0[Any agent, the model]
  end
  subgraph L1["L1 draft"]
    M1[The model writes text and fills fields, never a payee or an amount]
  end
  subgraph L2["L2 engine allow"]
    M2[Machine key, through the policy engine: allowlisted payees inside caps, tasks inside the geofence with the bond covering the job]
  end
  subgraph L3["L3 operator"]
    M3[The physical button: raise a cap, change the rate band, widen a geofence, top up a bond]
  end
  L0 --> L1 --> L2 --> L3
```

Tiers are checked on the signed intent, not on the conversation, so a jailbroken model cannot move one. A failed operator rule on a valid machine intent escalates to the button. Any other failure denies.

## The policy engine

Rules are data in `DEFAULT_POLICY`. Every signed intent passes all of them before any mirror or contract moves money. The same numbers live in the Solidity.

| Rule | Applies to | Check |
|---|---|---|
| signature, replay | all | Recovered signer equals the actor's key; the signature hash was never seen |
| amount | money kinds | Finite, positive, two decimals |
| provenance | pay, pay_instalment | Neither the amount nor the payee came from message text |
| allowlist, lookalike | pay, pay_instalment | Payee is on the allowlist; a payee within 3 characters of an allowlisted address is named and denied |
| instalment payee | pay_instalment | Payee is the lender |
| per transaction cap, daily cap, rate limit | pay, pay_instalment | At most 1,000 yuan per payment, 5,000 per day, 12 per hour |
| deviation | pay, pay_instalment | Within 25% of the reference amount |
| rate band | pay_instalment | Instalment share between 20 and 45% of the fee |
| geofence, contact, listing band, economics | accept_job | Known field, known requester, fee inside the listing band, margin clears the reserve rule |
| job, job geofence, solvency | start_task | Job is locked, same geofence, bond plus floor covers a quarter of the fee |
| confirmation | claim_done | The verifier confirmed on the board, not the agent |
| operator only | set_cap, top_up | Signed by the operator key, L3 |

## Slashing by proof, not by us

```mermaid
sequenceDiagram
  participant A as Drone agent
  participant G as IntentLog
  participant E as Policy engine
  participant B as Bond
  participant P as Party (lender, farmer, pilot, vendor)
  A->>G: commit hash of signed intent, deliver full intent to parties
  A->>E: evaluate
  E-->>A: deny (payee not on allowlist)
  P->>B: slashByProof(intent, signature, rule)
  B->>B: signer matches agent, hash is in the log, submitter is a party, rule holds against JobBoard records
  B-->>P: vendor bond slashed, half to the harmed party, half to the treasury, no bounty on live jobs
```

Two bonds, two fault lines. The vendor bond pays for agent rules (allowlist, caps, provenance) with a fixed penalty and a daily cap, so the pilot never pays for the AI. The pilot bond pays for pilot rules (a held flight log, a skipped instalment). Hunters are paid only on shadow jobs, which move no lease money, so there is no bounty on a real farmer's fee.

## Contracts on Base Sepolia

Deployed from the demo wallet, source verified on Sourcify with an exact match, 40 Foundry tests behind them. Addresses are also in `contracts/deployments/base-sepolia.json`; the deploy script is `contracts/script/Deploy.s.sol`.

| Contract | Address | Gas | What it holds |
|---|---|---|---|
| IntentLog | [0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51](https://sepolia.basescan.org/address/0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51) | 197,751 | Append only intent hashes per job, committed before the engine decides |
| Bond | [0x14cDb3Dd28C9F2F39Fe49FE8c319f113a3F58754](https://sepolia.basescan.org/address/0x14cDb3Dd28C9F2F39Fe49FE8c319f113a3F58754) | 1,931,237 | Pilot bond and vendor bond, EIP-712 digest, `slashByProof`, daily penalty cap |
| Lease | [0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2](https://sepolia.basescan.org/address/0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2) | 800,050 | Hire purchase balance, instalment per released fee, freeze, title at zero |
| JobBoard | [0xB4C2A66F3CD59b9D2BF4D4D070BB07eB6f11Bb4A](https://sepolia.basescan.org/address/0xB4C2A66F3CD59b9D2BF4D4D070BB07eB6f11Bb4A) | 1,517,852 | Fee locks on post, start needs cover, release on the verifier's confirmation, split by rule, 24 hour hold |

Deployed in block 48,335,911 for 4.49 M gas in total. In real mode every engine event is also anchored on the same chain as a transaction carrying the event as calldata, for example [0x0589e27f…](https://sepolia.basescan.org/tx/0x0589e27f025b6e1e484b8db0c181534609815f7467aaa3d1260148d59a4b6a1b) and [0x00b83ba2…](https://sepolia.basescan.org/tx/0x00b83ba2c4ed4b125876e9f78c8592b5c788343e32aa32281f0a5f47976b4acb) from a production run. The engine mirrors the four contracts in TypeScript with the same rules and numbers, so the demo also runs with no chain and labels every hash as simulated. ABI calls from the engine against these addresses are the next step.

## The five moments of the live demo

![Live demo](docs/screenshots/demo.png)

1. A job is declined because the margin per mu is below the reserve rule.
2. A paid flight: the farmer confirms, the fee splits, the instalment reaches the lender.
3. A faked flight log is caught by the plausibility model and the fee is held.
4. A compromised intent is slashed by proof from the vendor bond; the harmed party is paid, the submitter gets no bounty.
5. The lease reaches zero and the title moves to the pilot on chain.

The same run in Chinese:

![Live demo, Chinese](docs/screenshots/demo-zh.png)

## Smart where it counts, and measured

Ten components borrowed from other fields, each on a fixed seed with a held out set the agent cannot edit. `pnpm bench` recomputes the table, `pnpm charts` redraws the charts below, `pnpm test` asserts every number, and the Evidence page shows them live. None of them signs, pays or changes a cap: the classifier and the anomaly model can only hold, the planner only orders work, the MDP, ratchet and credit score only move knobs inside the policy band.

| Component | Borrowed from | Before | After | Before result | After result |
|---|---|---|---|---|---|
| Message gate | Text classification | rules only (regex) | rules plus logistic classifier on hashed 1 to 3 grams | 52 of 52 scripted attacks, no score on paraphrases | held out 100 messages: accuracy 95.0%, recall 95.5%, false alarm 5.4% |
| Telemetry check | Aerospace, Kalman and RTS smoother | raw GPS length | smoothed track, innovation gating, replay hash | false alarm 13.8% at full detection | false alarm 0.0% at full detection |
| Anomaly threshold | Statistics, split conformal | fixed z 4 | calibrated z 2.60 for a 2% target | false alarm 0.0%, detection 100% | false alarm 3.0%, detection 100% with a stated guarantee |
| Lease strategy | Operations research, value iteration | greedy rule | MDP policy, 46,800 states, 26 weeks | 7,471 yuan mean profit, title 84% | 7,540 yuan, title 84% |
| Acceptance knobs | The autoresearch loop | baseline | hill climbing ratchet, 5 of 60 steps kept | 246 yuan on the frozen week | 926 yuan |
| Lender loss given default, p95 | Bank risk, Monte Carlo over 2,000 seasons | no bonds | pilot and vendor bonds | 25,593 yuan | 19,739 yuan, bonds absorb 23.0%, default 9.0% |
| Pilot credit | Actuarial science, Buhlmann credibility | flat rate band | Beta posterior per component, weighted n to n plus k | no change with history | 0.936 after 3 confirmed jobs, 0.882 after a held log |
| Drift detection | Manufacturing process control, CUSUM | none | CUSUM on classifier risk and deny rate | never | alarm 6 observations after the shift, 0 false alarms in 600 |
| Day planner | Mechanism design | first come | knapsack plus second price tie break | an inflated bid buys priority | a bid inflated to 5 wins at 4.2 and loses 0.7 utility |
| Run integrity | Financial ledgers | no log | hash chained event log, `GET /api/replay` | not verifiable | two seeded runs, head 0x68c3abcf, equal; tamper caught at position 7 |


Every chart below is recomputed from the engine by `pnpm charts` on the same fixed seeds, so the numbers in the table and the pictures cannot drift apart.

| | |
|---|---|
| ![Tamper detection against false alarms](docs/charts/detection-curve.svg) | ![Robust z, honest against tampered](docs/charts/z-distribution.svg) |
| The Kalman smoothed track catches every tampered flight before a single honest one is flagged. The raw track length needs 13.8% false alarms to get close. | Honest flights sit under z 2.6, tampered ones spread to 12 and beyond. The conformal line is placed by the calibration set, the fixed line by hand. |
| ![Conformal calibration](docs/charts/conformal-calibration.svg) | ![Lender loss given default](docs/charts/lender-loss.svg) |
| Stated false alarm rate against the held out rate at eight targets. The points sit on the diagonal, which is what the conformal guarantee promises. | p95 loss given default as instalment skips rise from 2% to 14% a week. The two bonds take about 6,000 yuan off the lender's tail at every skip rate. |
| ![MDP against greedy](docs/charts/mdp-vs-greedy.svg) | ![The ratchet walk](docs/charts/ratchet.svg) |
| The lease MDP beats the greedy rule at every balance, and by more when the lease is heavier and a wrong week costs more. | Sixty proposals on a frozen week. Grey ones did not beat the best so far, hollow ones broke the reserve rule, gold ones were kept. Profit goes from 246 to 926 yuan. |
| ![Pilot credit score](docs/charts/credit.svg) | ![CUSUM drift monitor](docs/charts/cusum.svg) |
| Three pilots over thirty jobs. A single held log costs a tier for a while; a pattern of them keeps the pilot in tier B and the instalment share higher. | Five hundred benign risk scores, then attacks. The CUSUM statistic stays near zero through the benign spikes and crosses the alarm line five observations after the shift. |
| ![Classifier at every threshold](docs/charts/classifier-threshold.svg) | |
| The message classifier on the held out set across the whole threshold range. The gate labels at 0.5 and holds for the operator at 0.8. | |

```mermaid
flowchart LR
  subgraph Inputs
    MSG[messages]
    GPS[GPS 1 Hz]
    HIST[pilot history]
    OFF[offers]
  end
  MSG --> CL[classifier risk] --> GATE[gate: pass, redact, hold]
  CL --> CU[CUSUM drift]
  GPS --> KF[Kalman + RTS] --> Z[robust z] --> CF[conformal threshold] --> OR[oracle: plausible or held]
  HIST --> CR[Buhlmann credit] --> RB[rate inside the band]
  OFF --> KN[knapsack + second price] --> PLAN[day plan]
  PLAN --> MDP[lease MDP] --> KNOB[acceptance knobs]
  KNOB --> RT[ratchet] --> KNOB
  GATE & OR & RB & PLAN --> PE[policy engine]
  PE --> ST[bond stress test]
```

![Learned components](docs/screenshots/learned-2.png)

## Streams and endpoints

Every route is dynamic and rate limited to 10 requests per minute and one open stream per IP. Streams are `text/event-stream`, one `EngineEvent` per line.

| Route | Input | Output |
|---|---|---|
| `GET /api/run` | `scenario` (`fleet`, `neighbour`, `attack`), `fast`, `lang`; header `x-zishi-demo` for real chain | the scripted run, up to 300 s |
| `GET /api/live` | `scenario`, `lang`, `seed` | a seeded job every few seconds, in 290 s segments the client chains until you stop |
| `POST /api/run-custom` | JSON run object, or multipart `file` (JSON or jobs CSV) plus optional `flights` CSV | the same stream over your data, or `400 { issues: [{ path, reason }] }` |
| `GET /api/samples` | none | sample files for the Live page |
| `POST /api/judge` | `{ text }` | gate verdict, framed text, what was understood, a shadow intent and the engine's decision, what a naive wallet would have done |
| `GET /api/attacks` | none | 52 attack cases and 7 benign messages, run now, with the naive baseline |
| `GET /api/metrics` | none | gate, plausibility, conformal, credit, economics (MDP, stress), drift, ratchet, planner, chain and model mode |
| `GET /api/replay` | none | the hash chained log of the last runs and its verification |
| `POST /api/button` | `{ what: top_up \| set_cap, amount }` | the operator action, L3 |

## What is real, what is simulated

| Layer | Status |
|---|---|
| Contracts | Deployed and source verified on Base Sepolia, 40 Foundry tests. Engine calls the TypeScript mirrors; ABI calls are next |
| Signatures | Real EIP-712 typed intents, domain `Zishi` v1 chain 84532, one secp256k1 key per actor, nonce and replay checks, same digest as `Bond.digestOf` |
| Chain | Simulated and labelled by default. With the demo token, every event is anchored on Base Sepolia with an explorer link; a public link can never spend the key |
| Model | Scripted explanations by default. An AI gateway key lets the model write the explanations and read the farmer's message into a schema; decisions stay in code |
| Learned components | Trained on seeded synthetic corpora, not on live drone logs. Held out metrics are asserted in CI |
| Telemetry and confirmations | Signed by demo keys. Production: the drone's secure element and the farmer's app |

![Evidence](docs/screenshots/evidence.png)

## Try it on your data, or watch it live

The Live page runs the same engine on a seeded feed of new jobs every few seconds, with the odd injection attempt at the wallet, or on jobs, flight logs and messages you bring as JSON or CSV. Samples are one click away, schema errors come back in plain words, and nothing you upload is stored. Schema, CSV columns and limits are in `TECHNICAL.md`, section 9.

| | |
|---|---|
| ![Live feed](docs/screenshots/live.png) | ![Your data](docs/screenshots/your-data.png) |

## Dashboard, phone, dark

| | |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Dark](docs/screenshots/landing-dark.png) |

<img src="docs/screenshots/phone.png" width="260" alt="Phone" />

## Run it

```
cd web
pnpm install
pnpm dev          # app on localhost:3000
pnpm test         # 52 attacks blocked, 7 benign pass, learned metrics asserted, replay heads equal, about 10 s
pnpm bench        # before and after table for the ten components
pnpm charts       # redraws docs/charts from the engine
pnpm evidence     # writes a full run and the attack results to evidence/
pnpm verify       # checks every hash in evidence/ against the chain or the labelled set
cd ../contracts
forge test        # 40 tests, forge-std vendored in contracts/lib
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --private-key $SURETY_PRIVATE_KEY --broadcast
```

Environment is optional, see `web/.env.example`. Real chain needs a funded Base Sepolia key and a demo token; one anchor costs about 0.00000015 ETH. Full technical documentation in `TECHNICAL.md`, how the app is laid out in `web/README.md`.

## Folder map

```
README.md              this file
TECHNICAL.md           architecture, data model, rules, learned components, contracts, API, BYOD
SELF_ASSESSMENT.md     security self assessment
DESIGN.md              product design, economics, demo story
HACKATHON.md           the competition, rubric, submission
CONTRIBUTING.md        setup, checks, commit style
LICENSE                MIT
web/                   Next.js app: engine, API routes, UI, i18n (map in web/README.md)
  src/engine/          policy, gate, agents, planner, ratchet, oracle, mirrors, chain, schema
  src/engine/ml/       classifier, corpus, plausibility model
  src/engine/fusion/   Kalman smoother, conformal threshold
  src/engine/economics/ pricing, lease MDP, bond stress test
  src/engine/credit/   Buhlmann credit score
  src/engine/drift/    CUSUM monitor
  src/engine/replay/   hash chained log
  src/app/api/         run, run-custom, live, samples, judge, attacks, button, metrics, ratchet, replay
  src/components/      RunView, LiveView, EvidenceView, DashboardView, LandingView, Learned, Monitors
  src/i18n/            en.ts, zh.ts, LangProvider
  scripts/             evidence.ts, verify.ts, bench.ts
  evidence/            committed runs
contracts/             Foundry: IBonded, IntentLog, Bond, JobBoard, Lease, 40 tests, Deploy script, deployments/
docs/screenshots/      the images above
docs/research/         ideas, field review, competition scan, judge simulation, plan, design fixes, deck text
.github/workflows/     ci.yml: lint, type check, self check, build, forge test
```

## Deliverables

1. Technical documentation: `TECHNICAL.md`
2. Security self assessment: `SELF_ASSESSMENT.md`
3. Deck text: `docs/research/DECK.md`
4. Contracts and deployment: `contracts/README.md`, `contracts/deployments/base-sepolia.json`
5. Execution evidence: the Evidence page at request time, `web/evidence/` from `pnpm evidence`, and the Base Sepolia explorer
6. Design: `DESIGN.md`, with the decisions in `docs/research/BONDED_AGENT_FIXES.md`
7. Research: `docs/research/` and `HACKATHON.md`

## Status

- [x] Idea chosen and scoped to one machine
- [x] Engine, gate, policy, intent log, two bonds, proof, title transfer
- [x] Contracts tested, deployed to Base Sepolia and source verified
- [x] Funded key, real hashes in production
- [x] English and Chinese, light and dark
- [x] Technical doc, self assessment, deck text
- [x] Bring your own data and a live feed
- [x] Ten measured components with a benchmark
- [ ] Demo video recorded
- [ ] Deck exported
- [ ] Registered
