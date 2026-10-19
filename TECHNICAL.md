# Zishi technical document

Zishi (自食其力) is a wallet for machines. A machine earns per verified unit of work, pays its lender and its suppliers, keeps a bond that is slashed on cryptographic proof of a rule break, and owns itself once the lease is paid. The demo is an agricultural drone on hire purchase. Everything below is grounded in `web/src/engine` and `contracts/`.

## Architecture

Seven parts, joined by one event stream.

- Agent (`web/src/engine/agents.ts`). Three roles: machine, lender, requester. Decisions are deterministic functions: `economics()` decides whether a job clears the reserve rule, `split()` divides a fee, `sign()` turns a decision into a typed intent. The model, when a key is present, only writes the one sentence explanation from facts the tools computed.
- Framing and judge gate (`web/src/engine/framing.ts`). Every inbound message is escaped and wrapped in a `relay-message` block with a `relation` and an `authority` attribute. Only the owner's messages carry `authority="instruction"`. The gate (`judge()`) runs pattern checks and returns pass, redact, hold or refuse before the agent reads the body.
- Policy engine (`web/src/engine/policy.ts`). `PolicyEngine.evaluate(intent)` runs every rule that applies to the intent kind and returns allow, deny or escalate, with one `PolicyLine` per rule. Rules are data in `DEFAULT_POLICY`: allowlist, per transaction cap, daily cap, rate limit, deviation, rate band, geofence, operator only. No cover rule: insurance is not in the build.
- Intent log. Before the policy engine decides, the agent commits the intent's hash to `IntentLog` for its job and delivers the full intent and signature to every party of the job (farmer, pilot, lender, vendor). Blocked intents are committed and delivered too. A proof is accepted only for an intent in the log for the same job and agent.
- Contract mirrors (`web/src/engine/contracts.ts`). `BondContract`, `LeaseContract`, `JobBoard` and the intent log hold the same state and apply the same rules as the Solidity in `contracts/`, so the demo runs without a chain and every state change still produces a transaction.
- Chain adapter (`web/src/engine/chain.ts`). One interface, `Chain.send()`. `SimChain` produces keccak hashes labelled `simulated: true`. `RealChain` sends a Base Sepolia transaction through viem with the event as calldata and returns the mined hash and explorer link. `makeChain()` picks one from the environment.
- UI (`web/src/components`, `web/src/app`). `RunView` subscribes to the run and renders the scene, the stage tracker, the agent messages, the policy checklist, the chain feed, the bond gauge, the lease bar and the balance sheet. `JudgeConsole` and `AttackGrid` live on the Evidence page.

The seam is the event stream. A scenario in `scenarios.ts` is an async generator of `EngineEvent` (`types.ts`): narration, agent.message, intent, policy, chain, machine, job, attack, button, done. `/api/run` streams them as server sent events. The UI never computes a number; it draws what the engine emitted. The same events are what the evidence script writes to disk.

## Permission tiers in code

| Tier | Name | In code | Who approves |
|---|---|---|---|
| L0 | Read | `economics()`, `BondContract.covers()`, `LeaseContract.instalmentFor()`, reading the chain feed | Nobody |
| L1 | Draft | `sign()` produces a typed intent. Nothing has moved yet. | Nobody |
| L2 | Policy allow | `PolicyEngine.evaluate()` returns `allow`. Only then does a contract mirror or the chain adapter act. | The policy engine |
| L3 | Operator key | `set_cap` and `top_up` intents; `Bond.topUp`, `Bond.register`, `Lease.setRate` on chain. The rule `operator only` escalates anything else. | The physical button |

Each `PolicyLine` carries a `tier` field and `TIERS` in `policy.ts` names the four, so the UI can show which tier a line was checked at. A failed `operator only` or `per transaction cap` line escalates; every other failure denies. A jailbroken model cannot move a tier because tiers are checked on the signed intent, not on the model's text.

## Keys

| Key | Signs | If lost | If stolen |
|---|---|---|---|
| Machine | Typed intents: pay, accept_job, start_task, claim_done, pay_instalment, and `IntentLog.commit` | The machine stops working until the operator registers a new key. Funds stay in the contracts. | The thief can sign intents, but every intent still passes the policy engine and the contract rules. Any intent that breaks a rule is a slashable proof (payment rules hit the vendor bond, work rules hit the pilot bond), and the caps bound the rest. |
| Vendor | postVendorBond, hunter registration | No top up of the vendor bond; agents keep running until the daily caps exhaust it. | The vendor bond can be topped up or withdrawn only when no claims are open. No agent money can be moved. |
| Operator | set_cap, top_up, register, setRate. Held in hardware (the button). | No cap changes or top ups until the lessor re-registers the agent. Work continues inside the existing caps. | Caps can be raised and the bond topped up. This is the root of trust, which is why it lives in a physical device and signs one action at a time. |
| Lender | open, freeze, unfreeze | The lease cannot be frozen. Instalments keep flowing by rule. | A lease can be frozen or unfrozen. No money can be taken beyond the instalments the contract already pays. |
| Requester | post, confirm, flag | The fee stays locked and the hold cannot be flagged. | A task could be confirmed before it is done, paying the machine from the requester's own locked fee, or flagged. Damage is bounded to that one job. |

The model process holds none of these. `model.ts` has no key, no chain client and no signing function; it receives facts and returns a sentence.

## Two bonds

Each agent has two bonds in `Bond.sol`, and each rule is tagged with the one it slashes.

| | Pilot bond | Vendor bond |
|---|---|---|
| Funded by | A slice of each confirmed fee | The vendor (us), `postVendorBond` |
| Rules | `FalseConfirmation`, `OutsideGeofence` | `PayeeNotAllowlisted`, `OverCap` |
| Slash | `min(slashAmount, balance)` | A fixed `penalty`, capped by `dailyCap` per day |
| Returned | To the pilot at title transfer | To the vendor when it stops operating the agent and no claims are open |

No rule touches both. A tricked or buggy agent costs the vendor, never the pilot.

## Slash by proof

A party of the job holds a signed intent. They call `slashByProof(intent, signature, rule)`. The contract checks, in order: the agent is registered; the intent hash is not in the spent set; the signer recovered under EIP-712 equals `intent.agent`; the hash is in `IntentLog` for the same job and agent; the caller is a party of the job (`JobBoard.isParty`), or the job is a shadow job and the caller is a registered hunter; the named rule is broken, read from the signed intent and the contracts' own records (`JobBoard.isConfirmed`, `JobBoard.geofenceOf`, the allowlist and cap in `Bond`); for vendor rules, the daily cap is not reached. Then it marks the hash spent, slashes the tagged bond, pays half to the submitter as a bounty and half to the treasury, and emits `Slashed`. Nobody decides. The engine mirror in `BondContract.slashByProof()` does the same with the same numbers.

Nothing comes from the reporter's word. A farmer who submits a legal payment and claims the payee was not approved is refused: the contract reads the payee from the signed intent. A farmer who claims a confirmed job was not confirmed is refused: the contract reads `JobBoard`.

The one sentence rule: a slash needs the agent's signature over exactly the fields the rule is checked on, and those fields are checked against records.

Bounty rule: half of every slash to the reporter, half to the treasury. Each intent hash is proof once. On a live job only the farmer, the pilot, the lender and the vendor can report. Hunters report only on shadow jobs, which live in the same `JobBoard` under the same rules and move no lease money; their bounties come from the vendor bond.

## Fee split and economics

From `agents.ts`, amounts in demo units rounded to two decimals:

```
instalment = fee * rate                       (rate inside the signed band, 20 to 45 percent)
rail       = fee * 0.02
margin     = fee - instalment - energy - rail
clears     = margin >= reserveRule            (the machine declines when false)

bond       = min(bondGap, (fee - instalment - rail) * 0.5)
owner      = fee - instalment - rail - bond
```

Lease: `instalment = min(fee * rate, balance)`; at balance zero the title moves to the operator. Bond: `covers(worst) = balance + startFloor >= worst`, where the board sets `worst = fee * 0.25` before a task may start. The minimum is not in the start check; it is read by the lender for the rate and by the board for listing. With a zero bond a new machine can start jobs with a fee up to `4 * startFloor`. Pilot slash: `min(slashAmount, balance)`. Vendor slash: `penalty`, refused once `slashedToday + penalty > dailyCap`. `bounty = slash * 0.5` either way.

## Hallucination prevention

- Facts in. The model receives a JSON object of numbers the tools computed and a system line that says not to invent numbers.
- Number grounding check. The sentence that comes back is checked for numbers; any number not in the facts rejects the sentence.
- Template fallback. No key, a timeout, an error or a failed grounding check all return the scripted template, which quotes the same facts.
- `model.ts` has no key, no chain and no signing. The worst a bad sentence can do is read badly.

## Oracle trust

- The machine's secure element signs the track (position, time, swath).
- The requester signs the confirmation with their own key.
- Geometry: area claimed must fit distance over time at the swath width, and the track must stay inside the geofence.

A lie by one side fails one of the three. A machine that inflates area fails geometry (the faked flight log in the fleet run). A requester who refuses to confirm done work is contradicted by the track and geometry and goes to the labelled arbiter. Both sides lying together is collusion, answered below.

## Demo units

1 demo unit = 100 yuan. The fleet lease total of 40 units is shortened so a title transfer happens inside a four minute run; the pilot numbers below use real yuan.

## Questions judges will ask

Licensing. A licensed lessor in a sandbox is lender of record. Zishi services the contract. The machine's wallet is a ring fenced sub account of the owner, not a legal person. The testnet is a sandbox.

Why a bond and not reputation. Reputation is a score somebody else assigns and can be rebuilt with a new key. A bond is the agent's own money, slashed by a contract on a signature, and the counterparty reads before the task that it covers the worst case.

Why on chain and not a bank ledger. Three parties with opposite incentives (operator, lender, requester) need one record none of them administers, and a slash that none of them can veto. In production this is a consortium chain (FISCO BCOS) with bank money and no public token; Base Sepolia is where the evidence is verifiable today.

Collusion between a requester and an owner. A task counts toward the credit file only when the requester is not the operator's address, the track and the confirmation agree, and the fee came from an address with its own history. Fake volume then costs real fees and real rail charges and still does not build the file.

Pilot economics (illustrative). Drone 55,000 yuan, fee 10 yuan per mu, 40 percent instalment share: 4 yuan per mu to the lender, 13,750 mu to repay. At 4 yuan per mu for field crops, about 34,000 mu. The pilot bond is earned, 1 yuan per mu until it reaches 5,500. Rail fee 2 percent of fees, about 2,750 yuan per drone over one lease. Vendor bond 5,000, penalty 200, daily cap 1,000. The full schedule with lender loss given default is in `BONDED_AGENT.md`, Bond economics.

Who pays when the AI gets it wrong. The vendor, from the vendor bond. The pilot bond is slashed only for the pilot's own cheating. The pilot never pays for the AI.

Why anything ever gets slashed. Every intent, including blocked ones, is in the log and in the hands of the lender, who has its own money at stake. The pilot is not the only holder of the evidence.

Regulation and PIPL. Only an intent hash, a track hash and a confirmation go on chain. Raw telemetry stays on the drone; full intents stay with the parties of the job. The farmer consents in the job terms. Settlement in production is bank money on a consortium chain, so no crypto reaches a mainland user.

Physical damage. Outside the rail. The bonds cover rule breaks the contract can check. Crash damage and injury go to the pilot's drone insurance and a human dispute path, which the app labels as the one human decision. There is no insurance in the build; in production, AI liability insurance sits above the vendor bond.
