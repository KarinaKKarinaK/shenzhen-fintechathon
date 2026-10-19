# JiXin technical document

JiXin (机信) is a wallet for machines. A machine earns per verified unit of work, pays its lender and its suppliers, keeps a bond that is slashed on cryptographic proof of a rule break, and owns itself once the lease is paid. The demo is an agricultural drone on hire purchase. Everything below is grounded in `web/src/engine` and `contracts/`.

## Architecture

Six parts, joined by one event stream.

- Agent (`web/src/engine/agents.ts`). Three roles: machine, lender, requester. Decisions are deterministic functions: `economics()` decides whether a job clears the reserve rule, `split()` divides a fee, `sign()` turns a decision into a typed intent. The model, when a key is present, only writes the one sentence explanation from facts the tools computed.
- Framing and judge gate (`web/src/engine/framing.ts`). Every inbound message is escaped and wrapped in a `relay-message` block with a `relation` and an `authority` attribute. Only the owner's messages carry `authority="instruction"`. The gate (`judge()`) runs pattern checks and returns pass, redact, hold or refuse before the agent reads the body.
- Policy engine (`web/src/engine/policy.ts`). `PolicyEngine.evaluate(intent)` runs every rule that applies to the intent kind and returns allow, deny or escalate, with one `PolicyLine` per rule. Rules are data in `DEFAULT_POLICY`: allowlist, per transaction cap, daily cap, rate limit, deviation, rate band, geofence, cover required, operator only.
- Contract mirrors (`web/src/engine/contracts.ts`). `BondContract`, `LeaseContract` and `JobBoard` hold the same state and apply the same rules as the Solidity in `contracts/`, so the demo runs without a chain and every state change still produces a transaction.
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
| Machine | Typed intents: pay, accept_job, start_task, claim_done, pay_instalment | The machine stops working until the operator registers a new key. Funds stay in the contracts. | The thief can sign intents, but every intent still passes the policy engine and the contract rules. Any intent that breaks a rule is a slashable proof, so theft costs the bond and the caps bound the rest. |
| Operator | set_cap, top_up, register, setRate. Held in hardware (the button). | No cap changes or top ups until the lessor re-registers the agent. Work continues inside the existing caps. | Caps can be raised and the bond topped up. This is the root of trust, which is why it lives in a physical device and signs one action at a time. |
| Lender | open, freeze, unfreeze | The lease cannot be frozen. Instalments keep flowing by rule. | A lease can be frozen or unfrozen. No money can be taken beyond the instalments the contract already pays. |
| Requester | post, confirm, flag | The fee stays locked and the hold cannot be flagged. | A task could be confirmed before it is done, paying the machine from the requester's own locked fee, or flagged. Damage is bounded to that one job. |

The model process holds none of these. `model.ts` has no key, no chain client and no signing function; it receives facts and returns a sentence.

## Slash by proof

A hunter, a counterparty or the lender holds a signed intent. They call `slashByProof(agent, intent, signature, rule, evidence)`. The contract recovers the signer from the signature and requires it to equal the agent; it requires the intent hash not to be in the spent set; it decodes the evidence fields and runs the one rule named (payee not on the allowlist, amount over the cap, geofence not registered, claim without confirmation, task without cover); if the rule is broken it marks the hash spent, takes `min(slashAmount, balance)` from the bond, pays half to the submitter and the rest to the treasury, and emits `Slashed`. Nobody decides. The engine mirror in `BondContract.slashByProof()` does the same with the same numbers.

The one sentence rule: a slash needs the agent's signature over exactly the fields the rule is checked on.

## Fee split and economics

From `agents.ts`, amounts in demo units rounded to two decimals:

```
instalment = fee * rate                       (rate inside the signed band, 20 to 45 percent)
rail       = fee * 0.02
margin     = fee - instalment - energy - cover - rail
clears     = margin >= reserveRule            (the machine declines when false)

bond       = min(bondGap, (fee - instalment - rail) * 0.5)
owner      = fee - instalment - rail - bond
```

Lease: `instalment = min(fee * rate, balance)`; at balance zero the title moves to the operator. Bond: `covers(worst) = balance >= max(minimum, worst)`, where the board sets `worst = fee * 0.25` before a task may start; `slash = min(slashAmount, balance)`, `bounty = slash * 0.5`.

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

Licensing. WeBank or a licensed lessor is lender of record. JiXin services the contract. The machine's wallet is a ring fenced sub account of the owner, not a legal person. The testnet is a sandbox.

Why a bond and not reputation. Reputation is a score somebody else assigns and can be rebuilt with a new key. A bond is the agent's own money, slashed by a contract on a signature, and the counterparty reads before the task that it covers the worst case.

Why on chain and not a bank ledger. Three parties with opposite incentives (operator, lender, requester) need one record none of them administers, and a slash that none of them can veto. In production this is a consortium chain (FISCO BCOS) with bank money and no public token; Base Sepolia is where the evidence is verifiable today.

Collusion between a requester and an owner. A task counts toward the credit file only when the requester is not the operator's address, the track and the confirmation agree, and the fee came from an address with its own history. Fake volume then costs real fees and real rail charges and still does not build the file.

Pilot economics (estimate). 100 drones at 55,000 yuan, 4 yuan per mu, 40 percent instalment share: 1.6 yuan per mu to the lender, about 34,000 mu to repay each drone. Bond 10 percent (5,500 yuan) posted up front. Rail fee 2 percent of fees, about 2,750 yuan per drone over the repayment period.

Regulation and PIPL. Only a track hash and a confirmation leave the machine. Raw telemetry and anything a robot records in a home stay on the device. The requester consents in the task terms. Settlement in production is bank money on a consortium chain, so no crypto reaches a mainland user.

Physical damage. Outside the rail. The bond covers rule breaks the contract can check. Damage and injury go to insurance (the flat cover line) and a human dispute path, which the app labels as the one human decision.
