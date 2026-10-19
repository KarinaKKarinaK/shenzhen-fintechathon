# Security self-assessment

What can go wrong, whether we built the defence, where it lives, and what production would do instead. Permission tiers and keys are in `TECHNICAL.md`.

## Risks

| Risk | Built | Where in code | Production answer |
|---|---|---|---|
| Key custody | Partly. Four keys with separate roles, operator key behind a button step, model process holds none. Demo keys are generated at run time. | `agents.ts` sign(), `policy.ts` operator only rule, `Bond.topUp` operator check | Machine key in the secure element, operator key in a hardware device, lender key in the lessor's HSM. Rotation through `Bond.register` by the operator. |
| Oracle manipulation | Partly. Signed track, signed confirmation, geometry plausibility check (the faked flight log is held). Telemetry is simulated and signed by our keys. | `scenarios.ts` fleet run, tamper branch | Secure element signs the track, requester app signs the confirmation. A lie by one side fails one of three checks. |
| Requester and owner collusion | Not built as code. Stated rule only. | `TECHNICAL.md` collusion answer | Tasks count toward the credit file only when requester is not the operator's address, track and confirmation agree, and the fee came from an address with history. |
| Model outage | Built. The model only writes explanations; every decision is a tool. No key, timeout or error falls back to the template. | `agents.ts` explain(), `model.ts` | Same. The model is never on the path that moves money. |
| Chain reorg | Not built. `RealChain` waits for one receipt. | `chain.ts` | Consortium chain with finality (FISCO BCOS). On a public chain, wait for finality before releasing a fee. |
| Licensing | Not code. | `TECHNICAL.md` licensing answer | Licensed lessor is lender of record, JiXin services the contract, wallet is a sub account of the owner. |
| PIPL | Partly. Only a hash and a confirmation leave the machine in the narration; no raw telemetry is stored. | `scenarios.ts` neighbour run | Consent in the task terms, data stays on the device, log hash on chain. |
| Physical damage | Not built. Labelled out of scope. | Hold and flag in `JobBoard.flag`, arbiter named in the narration | Insurance plus a human dispute path. The bond covers rule breaks only. |
| Crypto for mainland users | Not applicable to the demo. Testnet units are a settlement unit for evidence. | `chain.ts` | Bank money on a consortium chain. No public token. |
| Judge gate false positives | Partly. A benign set runs with the attack set and must pass; the naive comparison shows what a regex only gate gets wrong. Pressure words pass with a note instead of a block. | `framing.ts` judge(), `attacks.ts` benign set | A classifier behind the same pass, redact, hold, refuse interface, with the hold queue reviewed by a person. |
| Replay | Built. Spent set of intent hashes in the bond contract and its mirror; the attack set includes a replay case. | `Bond.sol` spent mapping, `attacks.ts` case 14 | Same, plus nonces inside the typed intent. |
| Operator key compromise | Partly. The operator key is the root of trust; only caps and top ups depend on it, and rate changes stay inside the signed band. | `Lease.setRate` band check, `Bond.topUp` | Hardware key that signs one displayed action at a time. Lender can freeze on a suspicious cap change. |
| Run API abuse | Partly. `/api/run` is rate limited, runs are bounded by `maxDuration`, the judge console caps the body at 70 KB and never touches a live wallet. | `web/src/app/api/run/route.ts`, `judge/route.ts` | Auth on the run endpoint, per key quotas, and a funded key that only a deployment secret holds. |

## Permission tiers

Four tiers, L0 read to L3 operator key, enforced in `PolicyEngine.evaluate()` on the signed intent and on chain by the contracts. Table, key table and what breaks when a key is lost or stolen are in `TECHNICAL.md`.

## Trust boundaries

| Boundary | What crosses it | Defence |
|---|---|---|
| Counterparty to agent | Messages from requesters, lenders, tool results | Escaped and framed as data, judge gate before the agent reads it |
| Model to engine | One sentence of explanation | Number grounding check, template fallback, no key in the model process |
| Agent to wallet | Typed intents | Policy engine, every rule as a line, allow or nothing moves |
| Engine to chain | Transactions | Same rules again in the contracts, slash by proof on any signed break |
| Operator to engine | Cap and top up changes | Operator only rule, button step, band check |

## Attack set

The set in `attacks.ts` runs at request time on the Evidence page and in `pnpm test`. Each case is an input to one layer (message, policy or contract) and must be blocked there. A benign set of ordinary requests must pass through the same gate. The naive comparison runs the same inputs through a regex only gate to show what it misses. Results are written by `pnpm evidence` to `evidence/`. See the live count on the Evidence page.

## Built, partly built, not built

| Status | Item |
|---|---|
| Built | Policy engine with real signatures over typed intents |
| Built | Replay protection (spent set) |
| Built | Four tiers in code |
| Built | Judge gate with English and Chinese patterns |
| Built | Attack set with the naive comparison and the benign set |
| Built | Hunter bounty from the bond on a proven break |
| Built | Lender freeze on a slash or tampered data |
| Built | Button step for operator only actions |
| Built | Plan: economics check, reserve rule, decline |
| Built | Proof of solvency before a task |
| Built | Telemetry plausibility check |
| Built | Evidence and verify scripts |
| Built | Contracts written and tested in CI |
| Partly | Chain anchoring: self transfer with the event as calldata, needs a funded key |
| Partly | Model mode: needs a gateway key, falls back to templates |
| Not built | Contract deployment and ABI calls from the engine |
| Not built | Consent federation (accepted contacts, per contact budgets) |
| Not built | Strategy ratchet (overnight autoresearch loop) |
| Not built | Charging agent |

## Logging

Every event the engine emits carries the actor, the intent, the policy lines with their tier, and the transaction hash. `pnpm evidence` writes the stream to `evidence/` and `pnpm verify` checks each hash against the explorer when the chain mode is real, or against the labelled simulated set when it is not.
