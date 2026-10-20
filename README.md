<p align="center">
  <a href="https://zishi-fintechathon.vercel.app"><img src="docs/brand/banner.png" alt="Zishi 自食其力, software that lets machines pay for themselves" width="100%"></a>
</p>

<p align="center">
  <a href="https://zishi-fintechathon.vercel.app"><img alt="Live demo" src="https://img.shields.io/badge/live%20demo-zishi--fintechathon.vercel.app-c8102e?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Contracts on Base Sepolia" src="https://img.shields.io/badge/contracts-Base%20Sepolia%2C%20verified-1a1a1a">
  <img alt="WeBank stack" src="https://img.shields.io/badge/WeBank%20stack-FISCO%20BCOS%20%2B%20FATE-c8102e">
  <img alt="Foundry tests" src="https://img.shields.io/badge/foundry-44%20tests-d4a017">
  <img alt="Attack set" src="https://img.shields.io/badge/attacks-52%20of%2052%20blocked-1a1a1a">
  <img alt="Languages" src="https://img.shields.io/badge/languages-English%20%7C%20%E4%B8%AD%E6%96%87-d4a017">
  <img alt="Licence" src="https://img.shields.io/badge/licence-MIT-1a1a1a">
</p>

<p align="center">
  <b><a href="https://zishi-fintechathon.vercel.app">Open the live demo</a></b> &nbsp;|&nbsp;
  <a href="docs/JUDGES_GUIDE.md">Judges' guide</a> &nbsp;|&nbsp;
  <a href="docs/pdf/Zishi_Technical_Document.pdf">Technical document</a> &nbsp;|&nbsp;
  <a href="docs/EXECUTION_EVIDENCE.md">On chain evidence</a> &nbsp;|&nbsp;
  <a href="#built-on-webanks-stack-fisco-bcos-and-fate">WeBank stack</a> &nbsp;|&nbsp;
  <a href="SELF_ASSESSMENT.md">Security</a>
</p>

---

Zishi is a wallet for a machine. An agricultural drone on hire purchase earns per mu sprayed, repays its lender from every fee, fills a bond that is slashed only on cryptographic proof of a rule break, and owns itself when the lease reaches zero. **Money decisions are made in code. The model explains, it never decides.**

Entry to the 2026 Shenzhen International FinTech Competition, International Track, Topic F: AI as a Financial Participant.

## Try it in two minutes

| Step | Where | What you see |
|---|---|---|
| 1 | [Fleet page](https://zishi-fintechathon.vercel.app/app/fleet), press **Start** | One drone, five moments: a job declined, an instalment paid, a faked flight log held, a slash by proof, the title moving to the pilot |
| 2 | Same page, **Live feed** tab | New jobs every few seconds with the odd injection attempt, until you stop |
| 3 | Same page, **Your data** tab | Your own jobs and flight logs as JSON or CSV, run through the same rules |
| 4 | [Evidence page](https://zishi-fintechathon.vercel.app/app/evidence) | 52 attacks run while the page loads; type your own attack at the agent |

No wallet to connect, nothing to install. The public link runs on a simulated chain and labels every hash; real Base Sepolia mode is unlocked with a demo token we hand to the judges.

![The landing page](docs/screenshots/landing.png)

## The problem

China has more than 200,000 agricultural drone pilots. A spraying drone costs about 55,000 yuan and earns 3 to 15 yuan per mu. A pilot with nothing to pledge cannot borrow one: the lender cannot see the work, cannot collect from it, and a flat monthly instalment ignores the season. The drone sits in a showroom and the field waits.

## What Zishi does

| | |
|---|---|
| **The machine is the borrower** | The lease, the bond and the title belong to the drone's wallet. Its verified work is the collateral. |
| **Repayment per mu** | The farmer locks the fee, the drone sprays, the farmer confirms. The fee splits by rule: an instalment inside a 20 to 45 percent band, a rail fee, a bond top up, the rest to the pilot. |
| **Two bonds, slashed by proof** | The pilot bond pays for the pilot's cheating. The vendor bond pays for the agent's mistakes. A slash needs a signed intent in the on chain log that breaks a rule the contract checks against its own records. No trusted judge. |
| **Code decides** | Every intent is typed, EIP-712 signed and checked by a policy engine with 21 rule lines before anything moves. The model holds no key and never names a payee. |
| **Ownership at zero** | The last instalment moves the title from the lender to the pilot on chain. |

## The five moments

![The story, mid run](docs/screenshots/demo.png)

1. **Job declined.** The margin per mu is below the reserve rule. The intent is signed, logged and denied. Nothing moves.
2. **Instalment paid.** The farmer confirms, the fee splits, the instalment reaches the lender.
3. **Faked log held.** The oracle smooths the GPS track and scores it against a conformal threshold. The fee stays locked and the lender is told.
4. **Slash by proof.** A compromised intent pays an address off the allowlist. A party submits the proof, the contract checks it, the vendor bond pays. The pilot bond is untouched.
5. **Title transferred.** The lease reaches zero and the drone belongs to the person who flew it.

## By the numbers

Every figure is measured. Engine figures come from `pnpm test`, `pnpm bench` and `pnpm charts` on fixed seeds; chain figures from Base Sepolia receipts.

| | |
|---|---|
| **4** contracts on Base Sepolia | Source verified on Sourcify, exact match |
| **44** Foundry tests | Three fuzzed over amounts, nonces and payees, 256 runs each |
| **52 of 52** attacks blocked | 7 of 7 benign messages pass; a naive wallet falls to 51 of 52 |
| **21** policy rule lines | Over 7 intent kinds and 4 trust tiers, checked on every signed intent |
| **30 of 30** intents on FISCO BCOS | Every hash read back from the FISCO IntentLog equals the engine's; 15 match Base Sepolia one for one |
| **0.729 to 0.782** AUC | A lender's credit model alone, then trained with two other lenders in FATE, no raw records shared |
| **40 of 40** transactions confirmed | One real run, every receipt fetched back from the chain; 15 were IntentLog contract calls |
| **100%** tamper detection | On five tamper classes, 500 held out flights, at 3.0% false alarm |
| **13.8% to 0.0%** | False alarms on honest flights at full detection, after Kalman smoothing |
| **25,593 to 19,739** yuan | The lender's p95 loss given default, without and with the two bonds |
| **95.0%** classifier accuracy | 100 held out messages in English and Chinese, recall 95.5% |
| **293** events per run | Hash chained; the same head on the same seed, a tampered entry caught at its position |

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

The browser draws what the stream says and computes nothing. Every run is one async generator of typed events, so the story, the live feed and your own data are the same engine with different inputs.

### One task, end to end

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

### Who holds which key

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

Tiers are checked on the signed intent, not on the conversation, so a jailbroken model cannot move one.

### The policy engine

Rules are data in `web/src/engine/policy.ts`. The same numbers live in the Solidity.

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

### Slashing by proof

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

The vendor bond pays for agent rules with a fixed penalty and a daily cap; on a live job the whole penalty goes to the treasury, so a pilot cannot stage a fake scam and collect it. The pilot bond pays for pilot rules and compensates the farmer. Hunters earn bounties on shadow jobs only.

## Contracts on Base Sepolia

| Contract | Address | Gas | What it holds |
|---|---|---|---|
| IntentLog | [`0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51`](https://sepolia.basescan.org/address/0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51) | 197,751 | Every intent hash per job, committed before the engine decides |
| Bond | [`0x6161f6e08c8695849e7A8aF74c39a5A1056d5435`](https://sepolia.basescan.org/address/0x6161f6e08c8695849e7A8aF74c39a5A1056d5435) | 1,949,523 | Pilot and vendor bonds, the EIP-712 digest, slashByProof, the daily penalty cap |
| JobBoard | [`0xAbE83C0dD54EAd67DB63C8f9e854f00756f29952`](https://sepolia.basescan.org/address/0xAbE83C0dD54EAd67DB63C8f9e854f00756f29952) | 1,517,852 | Fee locks, start needs bond cover, release on the farmer's confirmation, 24 hour hold |
| Lease | [`0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2`](https://sepolia.basescan.org/address/0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2) | 800,050 | Hire purchase, instalment per released fee, freeze, title at zero |

Solidity 0.8.26, Foundry, source verified on Sourcify. Bond and JobBoard were redeployed after the collusion fix; addresses and deploy transactions are in [`contracts/deployments/base-sepolia.json`](contracts/deployments/base-sepolia.json). In real mode the engine calls IntentLog for every intent and anchors every money event on the same chain; Bond, JobBoard and Lease rules run in TypeScript mirrors with the same numbers.

## Built on WeBank's stack: FISCO BCOS and FATE

A licensed lender will not run its book on a public chain, and no lender will hand its repayment records to a rival. So Zishi runs on both of WeBank's open source pillars, and each one does a job in the product.

```mermaid
flowchart LR
  subgraph FATE[FATE 2.2, three lenders]
    A[Lender A data] --> AG[Secure aggregation, FedAvg]
    B[Lender B data] --> AG
    C[Lender C data] --> AG
  end
  AG --> M[Pilot credit model]
  M -->|coefficients| E[Engine: credit prior, rate band]
  M -->|sha256| IL2
  E -->|EIP-712 intent hash| IL1[IntentLog on Base Sepolia, public]
  E -->|same hash| IL2[IntentLog on FISCO BCOS, the lender's consortium chain]
```

**FISCO BCOS, the lender's ledger.** The four contracts are deployed on a FISCO BCOS 3.16 chain, compiled with the same solc 0.8.26 source and `evm_version` paris through the `fisco` Foundry profile. The engine has a FISCO target: set `FISCO_RPC_URL`, `FISCO_PRIVATE_KEY` and `FISCO_INTENT_LOG` and every intent is committed to IntentLog on FISCO, next to Base Sepolia when both are set. One full run of the fleet and neighbour scenarios sent 78 transactions to FISCO, all with a successful receipt. Its 30 IntentLog commits were read back from the contract and equal the engine's intent hashes, and 15 of them are the same hashes as in the Base Sepolia run. Same contract, same hash format, two ledgers: the public one for anyone to check, the consortium one for the lender and its regulator. Receipts in [`docs/FISCO_EVIDENCE.md`](docs/FISCO_EVIDENCE.md), addresses in [`contracts/deployments/fisco-bcos.json`](contracts/deployments/fisco-bcos.json).

**FATE, credit across lenders.** A new pilot has no history, so the rate band starts from a guess. Three lenders train one pilot credit model with FATE 2.2 homo logistic regression and FATE's secure aggregation; each lender's rows stay in its own process. On a held out set of 3,000 synthetic pilots:

| Model | AUC | F1 |
|---|---|---|
| Lender A alone | 0.729 | 0.334 |
| FATE federated | 0.782 | 0.399 |
| All data pooled, the upper bound | 0.782 | 0.411 |

The federated model now sets each pilot's starting credit score in the engine. For a pilot with no jobs yet, the error in the instalment share falls from 335 to 153 basis points against a flat start, and risky pilots are underpriced by 255 instead of 1,038 basis points. `pnpm test` checks that the TypeScript scorer reproduces FATE's own predictions on held out rows within 1e-6. Details in [`fate/README.md`](fate/README.md).

**The model on chain.** The sha256 of the exported FATE model is committed to the FISCO IntentLog, so a lender or regulator can prove which model priced each pilot. The Evidence page shows the prior, the FATE version and the model hash.

Scope, stated plainly: the FISCO chain is a single node we run in Docker, so judges reproduce it with one script rather than click a public explorer; Base Sepolia stays the public proof. FISCO reports block time in milliseconds, so the JobBoard time windows need a unit fix before money flows through JobBoard there; today the engine uses the FISCO IntentLog. FATE trains offline on seeded synthetic data and the live app reads its exported coefficients.

```bash
bash contracts/script/fisco.sh   # FISCO BCOS node in Docker, deploy the four contracts, smoke calls
cd web && pnpm fisco             # full run on FISCO, receipts and hashes read back into docs/FISCO_EVIDENCE.md
./fate/run.sh                    # FATE training across three lenders, model export, prior study
```

## Smart where it counts, and measured

Ten components borrowed from other fields, each on a fixed seed with a held out set the agent cannot edit. None of them signs, pays or changes a cap.

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

Every chart below is recomputed from the engine by `pnpm charts`.

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

![Learned components on the Evidence page](docs/screenshots/learned-2.png)

## Verify without trusting us

The Evidence page reruns the attack set on load, takes your own attack, shows each learned component with its seed and split, and polls the drift monitors and the replay log.

![Evidence](docs/screenshots/evidence.png)

![Monitors](docs/screenshots/monitors.png)

## Your data, or a live feed

| Live feed | Your data |
|---|---|
| ![Live feed](docs/screenshots/live.png) | ![Your data](docs/screenshots/your-data.png) |

Schema, CSV columns and limits are in [`TECHNICAL.md`](TECHNICAL.md) section 9. Nothing you upload is stored.

## In Chinese, in the dark, on a phone

| | |
|---|---|
| ![The story in Chinese](docs/screenshots/demo-zh.png) | ![The landing page in Chinese](docs/screenshots/landing-zh.png) |
| ![Dark](docs/screenshots/landing-dark.png) | ![Dashboard](docs/screenshots/dashboard.png) |

<p align="center"><img src="docs/screenshots/phone.png" width="280" alt="Phone"></p>

## What is real, what is simulated

| Layer | Status |
|---|---|
| Contracts | Deployed and source verified on Base Sepolia, 44 Foundry tests. The engine calls IntentLog; Bond, JobBoard and Lease rules run in mirrors, their calls are next |
| FISCO BCOS | Four contracts on a local FISCO BCOS 3.16 node; the engine commits every intent there when its env is set. Reproducible with one script |
| FATE | Real FATE 2.2 federated training across three lenders on synthetic data; the engine scores with the exported model |
| Signatures | Real EIP-712 typed intents, one secp256k1 key per actor, nonce and replay checks |
| Chain | Simulated and labelled by default. With the demo token every intent is committed to IntentLog and every money event anchored on Base Sepolia |
| Model | Scripted explanations unless an AI gateway key is set. Decisions never depend on it |
| Learned components | Trained on seeded synthetic data, labelled as such. Held out metrics asserted in CI |
| Telemetry and actors | Signed by demo keys. Production: the drone's secure element and the farmer's app |

## Documentation

| Document | What it is |
|---|---|
| [Technical document](docs/pdf/Zishi_Technical_Document.pdf) ([docx](docs/Zishi_Technical_Document.docx)) | The official competition template, filled from the result files, with appendices |
| [Judges' guide](docs/JUDGES_GUIDE.md) | Ten minutes in order, what to click, what to verify |
| [TECHNICAL.md](TECHNICAL.md) | The long form: sixteen sections, every algorithm with its file |
| [SELF_ASSESSMENT.md](SELF_ASSESSMENT.md) | Security self assessment: risks, what is built, what production does |
| [Execution evidence](docs/EXECUTION_EVIDENCE.md) | One real run, every receipt fetched back from Base Sepolia |
| [FISCO evidence](docs/FISCO_EVIDENCE.md) | A full run on FISCO BCOS, every receipt and IntentLog hash read back |
| [FATE experiment](fate/README.md) | Federated pilot credit across three lenders, metrics and the prior study |
| [Red team](docs/RED_TEAM.md) | 52 attacks, 7 benign messages, the naive baseline |
| [Evaluation](docs/EVALUATION.md) | Held out results of the ten components, raw values in `docs/results/` |
| [API](docs/API.md), [Glossary](docs/GLOSSARY.md), [Incident response](docs/INCIDENT_RESPONSE.md), [Roadmap](docs/ROADMAP.md) | Reference |
| [Problems and fixes](docs/PROBLEMS_AND_FIXES.md), [DESIGN.md](DESIGN.md) | How the design changed and why |
| [docs/pdf](docs/pdf) | PDF copies of every document |

## Run it

```
cd web
pnpm install
pnpm dev          # app on localhost:3000
pnpm test         # 52 attacks blocked, 7 benign pass, learned metrics asserted, replay heads equal
pnpm bench        # the before and after table
pnpm charts       # redraws docs/charts
pnpm report       # rewrites the execution evidence, red team and evaluation reports
pnpm shots        # retakes docs/screenshots against a build on port 3111

cd ../contracts
forge test        # 44 tests, forge-std vendored in contracts/lib
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --private-key $SURETY_PRIVATE_KEY --broadcast
```

Every environment variable is optional; see `web/.env.example`. Without them the app runs fully with scripted explanations and a labelled simulated chain.

## Repository

```
web/                 Next.js app: engine, API routes, interface, English and Chinese
  src/engine/        policy, gate, agents, planner, oracle, mirrors, chain, ml, fusion, economics, credit, drift, replay
  src/app/api/       run, run-custom, live, samples, judge, attacks, button, metrics, ratchet, replay
  scripts/           evidence, verify, bench, charts, report, shots, pdf, techdoc
contracts/           IntentLog, Bond, JobBoard, Lease, 44 tests, deploy scripts, deployments/
docs/                technical document, judges' guide, reports, charts, screenshots, brand, pdf
TECHNICAL.md         technical documentation
SELF_ASSESSMENT.md   security self assessment
SECURITY.md          reporting a vulnerability
DESIGN.md            product design and economics
```

MIT licence. Third party licences in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
