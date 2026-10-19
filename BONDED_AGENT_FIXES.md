# Bonded Agent: problems and fixes

A running log of the holes found in BONDED_AGENT.md (now named JiXin) and what we decided to do about each. Newest decisions are added as we go. BONDED_AGENT.md and the contracts get updated from this once the list is settled.

## Status

"Decided" is our decision in this file. "In JiXin" is whether the rewritten BONDED_AGENT.md and the contracts in `contracts/` already reflect it (checked 19 Oct, see the last section).

| # | Problem | Decided | In JiXin |
|---|---|---|---|
| 1 | Who pays when the AI agent makes a mistake | Two bonds, the vendor is liable for the AI | No. One bond per agent, still described as protection against a compromised agent |
| 2 | Nobody outside the pilot can submit proof, so the bond can never be slashed | Public intent log | No. And the contract can be drained with made-up evidence (10) |
| 3 | The bond starts at zero, so it protects the lender least when risk is highest | Limits scale with the bond, the vendor bond covers the start | Partly. Job size scales with the bond, but the minimum blocks a new machine from ever starting (11) |
| 4 | Where insurance fits | Not in the build, only above the bonds | Partly. Physical damage is out, but "cover bound" is still required and insurance is still in the market section |
| 5 | The document mixes delivery drone, agricultural drone, robot arm and humanoids | Open | Worse. Now two sides: drone fleet and a neighbour hiring a humanoid |
| 6 | The market section argues for insurance pricing, which the product section rules out | Open | Still there |
| 7 | Spraying is seasonal; a fixed monthly minimum causes default in the off-season | Open | Not addressed |
| 8 | Scope is far bigger than the time left | Open | Worse. Both sides are in the required demo |
| 9 | Claims that can backfire: WeBank named as lessor, farm drone subsidies may exist, unverified market sources | Open | Partly. Financing caveat kept; WeBank still named as lender; "credit bureau for machines" still there |
| 10 | Slashing evidence is not bound to the signed intent | New | Bug in `Bond.sol` |
| 11 | A new machine can never start a job | New | Bug in `Bond.sol` with `JobBoard.sol` |

## 1. Who pays when the AI agent makes a mistake

The problem. The bond sits in the drone's wallet, but the drone is not a legal person. Its wallet is a ring-fenced sub-account of the pilot's business, the bond is built from the pilot's earnings and returned to the pilot at title transfer. So slashing it means the pilot loses money. As written, the bond is slashed for anything the agent does wrong, including being fooled by a scammer. The pilot would pay for a flaw in software someone else built.

The decision. Two bonds, each covering what its owner controls.

| | Pilot bond | Vendor bond |
|---|---|---|
| Who funds it | Earned from the drone's fees, a slice per job | Posted up front by the agent's vendor (us) |
| What it covers | The pilot's own cheating | The AI agent's mistakes |
| Slashed for | A job claimed without the farmer's confirmation, a faked or replayed flight log, an instalment skipped while the wallet had the balance | The agent signing an intent that breaks a rule: payee not on the allowlist, amount above the cap, a payment triggered by a scammer's message, any action that traces back to untrusted input |
| Who gets paid | The lessor (compensation) and whoever submitted the proof (bounty) | Whoever lost money (compensation) and whoever submitted the proof (bounty) |
| Returned | To the pilot at title transfer | To the vendor if it stops operating the agent and no claims are open |

Two kinds of payout from either bond:

- Penalty. A rule was broken but the policy engine blocked it, so nobody lost money. A fixed amount is slashed and paid to the person who proved it as a bounty. This is what makes the hunter work: it earns from the vendor bond by finding attacks that fool our agent.
- Compensation. A rule was broken and money was actually lost. The loss is repaid to the victim from the bond, up to a cap per incident.

Why this is better. The pilot is never punished for something they did not do. The vendor has money at risk, so it has a reason to ship a safe agent. It also answers the judge's question "who is liable if the AI gets it wrong?" in one sentence: the company that made the AI, from its own bond.

How the contract decides whose fault it is. Each rule in the bond contract is tagged with the bond it slashes. Rules about work and repayment (confirmation, flight log, instalment) hit the pilot bond. Rules about what the agent signs (payee, cap, untrusted input) hit the vendor bond. The contract never has to judge intent; the rule that was broken decides.

Open questions.

- Collusion. A pilot could feed the agent a fake "scam" message on purpose, let it pay a friend, and claim compensation from the vendor bond. Ideas: compensation goes to the lessor first and never to an address the pilot controls; a cap per incident and per month; instructions from the pilot's own channel count as the pilot's, so a "scam" sent from there hits the pilot bond.
- The Hard Button. If the pilot approves an action on the physical button, is it still the agent's mistake? Proposal: anything the pilot approved on the button is the pilot's responsibility.
- Sizing. The vendor bond must cover the worst case across every wallet running our agent, not one drone. For the demo: one vendor bond, sized to the sum of the per-wallet caps.

What a hallucination actually costs. Putting the AI's mistakes on the vendor bond does not mean one hallucination is a disaster. Layers in front of the money:

1. Numbers come from tools. The model explains amounts, it never produces them.
2. Validation before signing. Code checks the action against its schema and the tool outputs before the agent signs it. A malformed or made-up action is discarded and never becomes a signed intent, so it never reaches the intent log and cannot be slashed.
3. The policy engine and the contracts block any signed intent that breaks a rule, so a bad intent moves no money.
4. A blocked bad intent costs the vendor bond a small fixed penalty, paid as a bounty. Nobody lost money.
5. A loss that does get through is capped by the spending limits and repaid from the vendor bond. The pilot bond is never touched.

Worst case for a hallucination: a small penalty paid by the vendor. Open point: penalties need a daily cap, or hunters could drain the vendor bond by attacking all day. The record of attacks, failures and penalties paid is itself demo evidence.

## 2. The public intent log

The problem. Slashing works by proof: anyone holding a signed intent that breaks a rule can submit it and the contract slashes the bond. But the agent signs its intents inside the pilot's system, before the policy engine. Nobody outside ever sees them. The lessor cannot look inside the policy engine. The only party holding the evidence is the pilot, who will not report against their own bond. So as written, nothing is ever slashed.

The decision. Every intent the agent signs is published before the policy engine decides.

1. The agent signs an intent (pay X to Y for reason Z).
2. The intent's hash is written to an intent log contract on chain, with a timestamp. The full intent goes to a public store the app serves. For the testnet demo, the full intent can go on chain.
3. Only then does the policy engine allow or block it.
4. Anyone (the lessor, a hunter, a farmer) can take an intent from the log and submit it to the bond contract. The contract checks the signature, checks the hash is in the log, checks the rule, and slashes the right bond.

Why it works. The evidence is public the moment it exists, so the person with a reason to report (lessor, hunter) has it. An agent cannot hide a bad intent by having the policy engine drop it, because it was logged first. A blocked attack still leaves a public record.

What the log is and is not. It is not a place where people claim something never happened. It is the opposite: a permanent record of what the agent tried to do. An entry looks like "entry 57, 14:02, drone 12's agent: pay 500 to account 0xABC for battery maintenance", with the agent's signature. Nobody else can write an entry in the agent's name, and nobody, including us and the pilot, can edit or delete one. People use it by pointing at an entry and saying "this broke a rule". The contract then checks for itself: is the entry in the log, is the signature the agent's, does it break the rule. If any answer is no, nothing happens, so false claims cost the submitter gas and earn nothing. Without the log a blocked scam attempt is quietly forgotten inside the pilot's system and the vendor never pays for its agent being fooled. With it, every attempt is visible and permanent, like accounts audited in public instead of kept by the company itself.

The other direction, "this never happened", is a different problem with a different fix. A pilot claiming 100 mu that was never sprayed is caught by the farmer's confirmation: the farmer pays, so the farmer only signs if the work was done. No signature, no money, and claiming the job anyway is itself a rule break that hits the pilot bond.

Who can see and who can report. The worry is that random people or hunters flag actions and mess up payouts. They cannot, once fix 10 is in: the contract checks every report against the signed intent and the on-chain agreement, so a false report fails and pays nothing. Who reports is not the risk; a contract that believed the reporter was. So reporting stays open to anyone. What changes is who sees the details:

- The log is kept per job. Each entry is filed under the job it belongs to, so a customer sees everything the agent did for their job in one place.
- Only the hash goes on chain. The full intent (amounts, payees, location) is visible to the parties of that job: the customer, the operator, the lender. Strangers see that entry 57 exists for job 12, not what is in it.
- Anyone who has the full intent can submit it as proof. The contract checks it matches the hash. Customers and the lender always have it. Hunters have it for the shadow copies they attack.
- Payouts are fixed by the agreement, not by the reporter. A bounty goes to whoever proved the violation. Compensation goes to whoever the job agreement says lost the money, never to the reporter. Penalties are capped per day so mass reporting cannot drain a bond.

Why not a log only the customer can use: customers rarely check, and a customer who colludes with the operator would never report. Keeping reporting open means the lender and hunters can still catch what a customer misses.

- Public intent log: catches the agent trying things it should not. Vendor bond.
- Farmer's confirmation: catches the pilot claiming work that was not done. Pilot bond.

Cost. One more contract with one function (commit) and one check in the bond contract (was this intent committed). Intents contain amounts and payees, which is business data. For production: commit only the hash on chain and reveal the body only when it is submitted as proof.

## 3. The bond starts at zero

The problem. The pilot bond is earned from fees, so a new drone has none. A bond protects the lender by covering losses, so on day one it covers nothing. That is when risk is highest: no track record, untested agent. The claim "the counterparty can read from chain that the bond covers the worst case" is false at the start.

The decision. Two parts.

- Limits scale with the bond. The largest job a drone may accept and the largest payment it may make are set by its bond, for example at most five times the bond, with a small floor so a new drone can start working at all. The contract enforces this, not the agent. A new drone takes small jobs only; as the bond fills, bigger jobs unlock. The worst case is always covered.
- The vendor bond covers the start. The vendor bond is posted up front, so it covers agent mistakes from day one. The only risk left uncovered early is pilot cheating, and that is limited by the small job sizes.

Why this is better. The solvency claim is now always true. It also gives the demo a visible moment: the drone starts on small fields and earns its way to bigger jobs and a cheaper rate.

Still to decide. How much of each fee goes to the bond (example: 10 percent), and how much that lengthens the lease. One line on the economics slide.

## 4. Where insurance fits

The question. The earlier versions (Sky Cover, the market section) put insurance at the centre. Now the bonds cover the losses. Is insurance needed at all?

The answer. Bonds and insurance cover different sizes of loss.

- Bonds cover small and medium losses, fast and automatically: a bad payment, a faked job, a scam that got through. These are the losses our system creates, and the bonds pay them from proof.
- Insurance covers losses bigger than the bonds can hold. Two cases: the vendor's agent fails across many wallets at once and the claims exceed the vendor bond; or the drone physically crashes, damages a crop or injures someone. The physical case is outside our project entirely; pilots carry drone liability cover for it today.

The decision. No insurance in the build. The flat per flight cover and the cover pool are dropped. In the pitch, one line: the vendor bond is the first layer, and in production the vendor backs it with AI liability insurance for losses beyond the bond. Physical crash damage stays with the pilot's existing drone insurance. This also keeps us clear of CoverAI.

## Check against JiXin (19 Oct)

The team rewrote BONDED_AGENT.md as JiXin (two sides: a commercial drone fleet and an individual lending a humanoid to a neighbour) and wrote `Bond.sol`, `JobBoard.sol`, `Lease.sol` and `IBonded.sol`. The contracts are not compiled yet (contracts/README.md). What the rewrite already gets right and where it still differs from the decisions above.

Already good:

- The earned bond is in the document and in `Bond.fill`.
- Slashing by proof is implemented: the contract recovers the agent's signature, checks a rule, marks the proof as used, pays half to the submitter.
- Job size is tied to the bond: `JobBoard.start` requires the bond to cover 25 percent of the fee, so a bigger bond unlocks bigger jobs. This is half of fix 3.
- Fees only move on the verifier's confirmation, which covers "this never happened" for work claims.
- Physical damage and injury are declared outside the rail.
- Financing programmes for farm drones are marked as unconfirmed.

### 1. Two bonds: not in

`Bond.sol` keeps one bond per agent, funded by the operator through fees and top ups. Its rules mix pilot rules (`UnconfirmedClaim`, `SkippedInstalment`) with agent rules (`PayeeNotAllowlisted`, `OverCap`) on the same bond. BONDED_AGENT.md line 90 still says the bond protects the counterparty from "an agent that is jailbroken, buggy or malicious", so the owner pays for the agent's mistakes. Slashed money goes half to the submitter and half to a treasury, never to whoever lost money, so there is no compensation path. To do: a vendor bond (one per agent vendor), a tag on each rule saying which bond it hits, and a compensation payout to the victim.

### 2. Public intent log: not in

`slashByProof` checks the signature but not that the intent was ever published, so the evidence still only exists inside the owner's system. To do: an intent log contract and a check in `slashByProof` that the hash was committed.

### 10. New, critical: evidence is not bound to the intent

`slashByProof` takes the signed `intentHash` and, separately, an `evidence` blob chosen by the submitter. It checks that the agent signed the hash, then checks the rule against the evidence, but never checks that the evidence is what the agent signed. So anyone holding any genuine signed intent, even a perfectly legal payment, can submit it with made-up evidence (a payee off the allowlist, `confirmed = false`, `cover = false`) and slash the bond. Each intent can be used once, so every signed intent the agent ever makes is one free slash for an attacker. This is exactly "anyone can just say this never happened". Fix: the evidence must be the intent itself. The submitter passes the full typed intent, the contract hashes it, checks the hash matches the signature and the log, and reads payee, amount and fence from that intent. Claims about confirmation or cover must be read from `JobBoard` state, never taken from the submitter.

Two sources of truth, both already on chain, and the submitter supplies neither:

| What is checked | Read from |
|---|---|
| What the agent tried to do: payee, amount, job id, location | The signed intent itself |
| What was allowed: allowlist, caps, geofence, fee, verifier, window | The agreement on chain: the job registered in `JobBoard` between the requester, the operator and the agent, plus the agent's rules in `Bond` |
| What actually happened: confirmed, released, instalment paid | `JobBoard` and `Lease` state |

The submitter only points: "intent 57 against job 12". The contract compares the two records itself. A violation is a mismatch between what the agent signed and what the agreement allowed.

### 11. New: a new machine can never start

`Bond.covers` requires the balance to be at least the minimum. A new machine's bond starts at zero and only fills from confirmed jobs, but `JobBoard.start` refuses any job until `covers` is true. So with a minimum above zero, nothing ever starts. Fix: drop the minimum from `covers` and let the exposure check alone scale job size, with a small floor, and keep the minimum only for being listed on the board or for a better rate.

### Other contract notes

- `JobBoard.confirm` calls `bond.topUp` from the board, which reverts because the board is not the operator. Already listed as a known gap in contracts/README.md.
- `if (toBond > 0) (bool okb,) = ...` in `JobBoard.confirm` declares a variable outside a block, which Solidity does not allow. It will not compile.
- `JobBoard.bindCover` lets the agent mark cover as bound without paying anything, so "the flight starts only because cover is bound" is self-declared. Either drop cover (decision 4) or make it a real payment.
- `Lease.setRate` is operator only. The rate should be set by the lender inside the band, or the owner sets their own price.
- `Lease` has a fixed monthly minimum (7, seasonality).

### 3 to 9 in the document

- 3: the minimum and the "tighter rate band until it fills" are described but not enforced; see 11.
- 4: "cover bought at a flat price" and "cover bound" are still in Side A and in `JobBoard`; the market section still lists agent liability insurance and "a take rate on every task and cover bound".
- 5 and 8: the rewrite adds Side B (humanoids for neighbours) and makes both sides required in the minimum demo, plus two views of mission control. That is more scope, not less.
- 9: WeBank is still named as the lender (lines 47 and 148), and "a credit bureau for machines" (line 250) is still shenzhen-comp's pitch.

## Next to fix

10 and 11 first, since they break the core mechanism. Then 1 and 2 in the contracts. Then 5 (pick one side for the demo), since 6, 7 and 8 depend on it.
