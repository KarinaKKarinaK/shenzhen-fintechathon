# Zishi 自食其力, the robot that pays for itself

[![CI](https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml/badge.svg)](https://github.com/KarinaKKarinaK/shenzhen-fintechathon/actions/workflows/ci.yml)

Live: https://zishi-fintechathon.vercel.app

A wallet for machines. An agricultural drone on hire purchase earns per mu sprayed, repays its lender from every fee, fills a bond that is slashed only on cryptographic proof of a rule break, and owns itself when the lease reaches zero. Money decisions are made in code. The model explains, it never decides.

Entry to the 2026 Shenzhen International FinTech Competition, International Track, Topic F, "AI as a Financial Participant". English and Simplified Chinese, light and dark.

![Landing](docs/screenshots/landing.png)

## Why it is different

| What everyone else built | What Zishi adds |
|---|---|
| An assistant proposes, code decides, a human confirms | The machine has its own money at risk. A bond is slashed by proof, with no trusted party deciding |
| One agent acting for one human | Two sides with opposite incentives: the drone's agent and the lender's agent, plus the farmer who pays and confirms |
| Reputation scores | Economic consequences. The vendor bond pays for the agent's mistakes, the pilot bond for the pilot's cheating. The pilot never pays for the AI |
| Insurance priced from telemetry | Telemetry proves work happened. Nothing prices risk from it |
| A chatbot over a database | Four contracts, an intent log, EIP-712 signed intents, a policy engine with fourteen rules, and learned components with held out metrics |

## How one task flows

```mermaid
flowchart LR
  F[Farmer posts a job] --> G[Gate: rules plus classifier]
  G -->|data, never instructions| U[Understand: fee, mu, field, window]
  U --> P[Planner: knapsack over battery and time]
  P -->|accept| I[Signed intent, EIP-712]
  P -->|decline| X[Reason shown]
  I --> L[Intent log: hash on chain, full intent to every party]
  L --> E[Policy engine: 14 rules in code]
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

## The five moments of the live demo

![Live demo](docs/screenshots/demo.png)

1. A job is declined because the margin per mu is below the reserve rule.
2. A paid flight: the farmer confirms, the fee splits, the instalment reaches the lender.
3. A faked flight log is caught by the plausibility model and the fee is held.
4. A compromised intent is slashed by proof from the vendor bond; the harmed party is paid, the submitter gets no bounty.
5. The lease reaches zero and the title moves to the pilot on chain.

The same run in Chinese:

![Live demo, Chinese](docs/screenshots/demo-zh.png)

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

## Slashing by proof, not by us

```mermaid
sequenceDiagram
  participant A as Drone agent
  participant G as Intent log
  participant E as Policy engine
  participant B as Bond contract
  participant P as Party (lender, farmer, pilot, vendor)
  A->>G: commit hash of signed intent, deliver full intent to parties
  A->>E: evaluate
  E-->>A: deny (payee not on allowlist)
  P->>B: slashByProof(intent, signature, rule)
  B->>B: signer matches agent, hash is in the log, submitter is a party, rule holds against JobBoard records
  B-->>P: vendor bond slashed, half to the harmed party, half to the treasury, no bounty on live jobs
```

## What is real, what is simulated

| Layer | Status |
|---|---|
| Contracts (IntentLog, Bond, JobBoard, Lease) | Compiled and tested with Foundry, 40 tests passing. Not yet deployed |
| Engine mirror of every rule | TypeScript, same rules as the contracts, self check on every build |
| Signatures | Real EIP-712 typed intents, one key per actor, nonce and replay checks |
| Chain | Simulated and labelled by default. A funded key in the environment anchors every event on Base Sepolia with explorer links |
| Model | Scripted explanations by default. An AI gateway key lets the model write the explanations and read the farmer's message; decisions stay in code |
| Telemetry and confirmations | Signed by demo keys. Production: the drone's secure element and the farmer's app |
| Attack set | 52 cases and 7 benign messages, run at request time on the Evidence page, with a naive wallet baseline |

![Evidence](docs/screenshots/evidence.png)

## Learned and optimising components

Four components do real work, each with a fixed seed and a held out set the agent cannot edit. The numbers below are what the self check prints on every build and what the Evidence page computes at request time.

| Component | What it is | Held out result |
|---|---|---|
| Message classifier | Logistic regression on hashed character n-grams, trained on 52 attack texts, 108 attack paraphrases and 193 benign messages in English and Chinese. Adds a risk score to the rule gate; rules still decide, the classifier can only hold | 100 of 401 messages held out: accuracy 0.95, precision 0.93, recall 0.96, F1 0.94, false alarm rate 0.05 |
| Telemetry anomaly model | Robust z-scores over area ratio, speed, battery per mu and altitude variance, fitted on 1,500 synthetic flights with physical noise and 15 percent tampering | 500 flights held out, 72 tampered: detection 1.00, false alarms 0.00, threshold z 4. The demo's faked log scores z 214 |
| Day planner | Bounded knapsack by dynamic programming over the day's candidate jobs, maximising margin subject to mu per charge, charges and minutes | Replaces the greedy ranking; the plan event carries budget, used mu, charges and total margin |
| Strategy ratchet | Hill climbing over the drone's acceptance strategy against a frozen simulated week, keeping a change only if profit after instalments improves and the reserve rule holds, every step logged | 60 steps, 5 kept, profit 246 to 926 yuan on the frozen week. The eval cannot be edited by the strategy |

With an AI gateway key the model also reads the farmer's message into a typed schema with a confidence, and writes the explanations. Without a key, rules do the reading and templates do the writing. In both cases the decisions are the engine's.

![Learned components](docs/screenshots/learned.png)

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
pnpm test         # attack set blocked, benign set passes, normal flow allowed, learned metrics asserted
pnpm evidence     # writes a full run and the attack results to evidence/
pnpm verify       # checks every hash in evidence/ against the chain or the labelled set
cd ../contracts && forge install foundry-rs/forge-std && forge test
```

Environment is optional, see `web/.env.example`.

## Layout

- `web/src/engine`: policy engine, gate, contract mirrors, agents, model wrapper, planner, ratchet, ml (classifier, plausibility), attack set, scenarios, chain adapter, self check.
- `web/src/app/api`: `run` streams a scenario as server sent events in either language, `judge`, `attacks`, `button`, `metrics`, `ratchet`.
- `web/src/components`: scene, panels, stages, graphs, attack accordion, judge console, views.
- `web/src/i18n`: dictionaries and the language provider.
- `contracts`: `IBonded`, `IntentLog`, `Bond`, `JobBoard`, `Lease` with Foundry tests.
- `docs/screenshots`: the images above.

## Deliverables

1. Technical documentation: `TECHNICAL.md`
2. Security self-assessment: `SELF_ASSESSMENT.md`
3. Deck text: `DECK.md`
4. Contracts: `contracts/README.md`
5. Execution evidence: the Evidence page at request time, and `evidence/` from `pnpm evidence`
6. Design and research: `BONDED_AGENT.md`, `BONDED_AGENT_FIXES.md`, `HACKATHON.md`, `FINAL_IDEAS.md`, `FIELD_REVIEW.md`, `COMPETITION.md`, `JUDGE_REVIEW.md`

## Status

- [x] Idea chosen and scoped to one machine
- [x] Engine, gate, policy, intent log, two bonds, proof, title transfer
- [x] Contracts compiled and tested
- [x] English and Chinese, light and dark
- [x] Technical doc, self assessment, deck text
- [ ] Funded key set so every hash is real
- [ ] Demo video recorded
- [ ] Deck exported
- [ ] Registered
