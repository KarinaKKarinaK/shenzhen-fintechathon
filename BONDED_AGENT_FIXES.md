# Bonded Agent: problems and fixes

A running log of the holes found in BONDED_AGENT.md (now named JiXin) and what we decided to do about each. Newest decisions are added as we go. BONDED_AGENT.md and the contracts get updated from this once the list is settled.

## Status

"Decided" is our decision in this file. "In JiXin" is whether the rewritten BONDED_AGENT.md and the contracts in `contracts/` already reflect it (checked 19 Oct, see the last section).

| # | Problem | Decided | In JiXin |
|---|---|---|---|
| 1 | Who pays when the AI agent makes a mistake | Two bonds, the vendor is liable for the AI | No. One bond per agent, still described as protection against a compromised agent |
| 2 | Nobody outside the pilot can submit proof, so the bond can never be slashed | Private log per job, delivered to every party, hashes on chain | No. And the contract can be drained with made-up evidence (10) |
| 3 | The bond starts at zero, so it protects the lender least when risk is highest | Limits scale with the bond, the vendor bond covers the start | Partly. Job size scales with the bond, but the minimum blocks a new machine from ever starting (11) |
| 4 | Where insurance fits | Not in the build, only above the bonds | Partly. Physical damage is out, but "cover bound" is still required and insurance is still in the market section |
| 5 | The document mixes delivery drone, agricultural drone, robot arm and humanoids | Open | Worse. Now two sides: drone fleet and a neighbour hiring a humanoid |
| 6 | The market section argues for insurance pricing, which the product section rules out | Open | Still there |
| 7 | Spraying is seasonal; a fixed monthly minimum causes default in the off-season | Open | Not addressed |
| 8 | Scope is far bigger than the time left | Open | Worse. Both sides are in the required demo |
| 9 | Claims that can backfire: WeBank named as lessor, farm drone subsidies may exist, unverified market sources | Open | Partly. Financing caveat kept; WeBank still named as lender; "credit bureau for machines" still there |
| 10 | The contract believes the reporter: slashing evidence is typed in, not read from the signed intent and the job records | Reporter submits only the full signed intent and a rule; the contract reads every fact from the intent, `Bond` and `JobBoard` | No. Bug in `Bond.sol` |
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

Decision (revised): the log is private to each job. "Public" was the wrong word. What matters is not that strangers can read it but that no party can hide, edit or delete an entry.

- Who sees an entry: only the parties to that job. The customer, the operator (pilot or fleet), the lender, and the vendor of the agent. Every intent the agent signs for a job is delivered to all of them, including the ones the policy engine blocked. That delivery guarantee is the point: the operator can no longer quietly drop a blocked scam attempt.
- What goes on chain: only a hash of each entry, with a timestamp. It reveals nothing (no amount, payee or location) but proves the entry existed at that time in that form. Nobody, including us, can later delete it or swap it for a different version.
- Who can report: only the parties to the job. Each of them has the full entry and can submit it as proof; the contract checks it against the hash and the job agreement (fix 10). The lender is a party, has its own money at stake and does not depend on the customer noticing, which covers a customer who never checks or who colludes with the operator.
- Hunters: they never see live jobs. They attack shadow copies of the agent and submit the intents from those runs, so their bounties come from the vendor bond without anyone outside a job seeing its data.
- Payouts are fixed by the agreement, not by the reporter. A bounty goes to the party that proved the violation. Compensation goes to whoever the job agreement says lost the money. Penalties are capped per day.

Why this fits China: job data (locations, a neighbour's flat, a farmer's fields) is personal or business data under PIPL. Keeping it among the parties and putting only hashes on chain is also how a FISCO BCOS consortium chain would be used in production.

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

### 10. Critical: the contract believes the reporter

#### The problem

`Bond.slashByProof` takes two separate things from whoever reports a violation:

1. the agent's signed action (as a hash plus signature), and
2. an `evidence` blob describing what went wrong, typed in by the reporter.

It checks that the signature is genuinely the agent's, then checks the rule against the reporter's evidence. It never checks that the evidence matches what the agent actually signed, and it never looks at `JobBoard` to see what really happened. The truth is already on chain (the farmer's confirmation is recorded in `JobBoard`), but `Bond` ignores it and takes the reporter's word.

Who can exploit it: anyone holding a genuine signed action from the agent. With the per-job log (fix 2) that is every party to a job: the client, the owner, the lender. If a signed action ever appears on chain, anyone at all.

Example. A farmer hires the drone for job 12. Everything goes right and the farmer confirms. The agent signs "pay 160 to 0xBANK for job 12", a legal payment. The farmer takes that signed action and calls `slashByProof` with the rule "unconfirmed claim" and the evidence "job 12, confirmed = false". The signature checks out, "confirmed = false" breaks the rule, the bond is slashed and the farmer gets half as a bounty. The same works with a made-up payee ("payee was 0xSCAMMER") or "no cover". Each signed action can be used once, but the agent signs many per job, so every one is a free bounty. The bond can be drained by lying.

This is not the oracle problem (getting the truth about the real world onto the chain; see the farmer's confirmation, signed flight logs, plausibility checks and the dispute window). It is a wiring bug: the contract does not use the truth that is already on chain.

#### The solution

The reporter only points. The contract works out every fact itself.

1. The signed action carries all the details. When the agent decides to do something it signs a complete typed intent:

   | Field | Example |
   |---|---|
   | Agent | drone 7's agent |
   | Job | 12 |
   | Action | pay |
   | Payee | 0xBANK |
   | Amount | 160 |
   | Nonce | 57 (unique, so it cannot be reused) |

   The signature covers every field. Change one digit and the signature no longer matches.

2. The reporter submits only the full signed intent and the rule they say it broke. No evidence field, no facts.

3. The contract checks, in order:
   1. The signature: it hashes the intent and checks the agent signed that hash. An edited intent fails here.
   2. The log: the hash was committed to job 12's log (fix 2). Otherwise rejected.
   3. The rule: it compares what the agent signed with what was allowed or what happened, read from its own records:

   | Rule claimed | What the agent signed | Compared with | Read from |
   |---|---|---|---|
   | Payee not approved | The payee in the intent | The agent's approved payees | `Bond` |
   | Over the cap | The amount in the intent | The agent's spending cap | `Bond` |
   | Claimed a job not done | "Job 12 complete, pay me" | Was job 12 confirmed by its verifier | `JobBoard` |
   | Outside the area | The location in the intent | Job 12's geofence | `JobBoard` |

   4. Only on a real mismatch is the bond slashed and the bounty paid.

The farmer's attack after the fix. The contract reads the payee from the signed intent: 0xBANK. It is approved, so the report is rejected. The farmer cannot change the intent to say 0xSCAMMER, because then the signature fails. The claim "job 12 was not confirmed" is checked against `JobBoard`, which shows the farmer confirmed it, so that is rejected too.

Why it works. Every fact comes from a source the reporter cannot control:

| Fact | Source |
|---|---|
| What the agent did | Sealed by the agent's signature |
| What was allowed | Fixed when the bond and the job were registered |
| What happened | Recorded by `JobBoard` when the verifier confirmed |

A report that points at a real violation pays. A report that points at something fine does nothing except cost the reporter gas.

#### What it takes in code

- Define the typed intent (fields above, EIP-712 style) and have the agent sign in that format.
- Change `slashByProof` to take the full intent and a rule instead of `intentHash` plus `evidence`.
- Give `Bond` the address of `JobBoard` so it can read a job's verifier, confirmation and geofence.
- Check the intent's hash against the job's log, which needs fix 2.

Mainly `Bond.sol`, plus the signing format in the agent code. The same rule applies everywhere else: never take a fact from the caller when the contract can read it. `JobBoard.confirm` breaks this rule too (see "Other contract notes").

### 11. New: a new machine can never start

`Bond.covers` requires the balance to be at least the minimum. A new machine's bond starts at zero and only fills from confirmed jobs, but `JobBoard.start` refuses any job until `covers` is true. So with a minimum above zero, nothing ever starts. Fix: drop the minimum from `covers` and let the exposure check alone scale job size, with a small floor, and keep the minimum only for being listed on the board or for a better rate.

### Other contract notes

- `JobBoard.confirm` calls `bond.topUp` from the board, which reverts because the board is not the operator. Already listed as a known gap in contracts/README.md.
- `if (toBond > 0) (bool okb,) = ...` in `JobBoard.confirm` declares a variable outside a block, which Solidity does not allow. It will not compile.
- `JobBoard.bindCover` lets the agent mark cover as bound without paying anything, so "the flight starts only because cover is bound" is self-declared. Either drop cover (decision 4) or make it a real payment.
- `Lease.setRate` is operator only. The rate should be set by the lender inside the band, or the owner sets their own price.
- `Lease` has a fixed monthly minimum (7, seasonality).
- `JobBoard.confirm` takes the instalment and the bond top up as inputs from the verifier, so the farmer decides how much the lender gets and could pass zero. Same kind of bug as 10. The instalment should be computed from the lease (`Lease.instalmentFor`).
- `JobBoard.confirm` sends the instalment to the `Lease` contract as a plain transfer instead of calling `Lease.pay`, and `Lease` has no receive function, so the payment reverts and the loan balance never goes down. A job also does not record which lease it belongs to.
- `Bond.register` makes whoever calls it the operator of any agent address, so someone can register another person's agent first.

### 3 to 9 in the document

- 3: the minimum and the "tighter rate band until it fills" are described but not enforced; see 11.
- 4: "cover bought at a flat price" and "cover bound" are still in Side A and in `JobBoard`; the market section still lists agent liability insurance and "a take rate on every task and cover bound".
- 5 and 8: the rewrite adds Side B (humanoids for neighbours) and makes both sides required in the minimum demo, plus two views of mission control. That is more scope, not less.
- 9: WeBank is still named as the lender (lines 47 and 148), and "a credit bureau for machines" (line 250) is still shenzhen-comp's pitch.

## Next to fix

10 and 11 first, since they break the core mechanism. Then 1 and 2 in the contracts. Then 5 (pick one side for the demo), since 6, 7 and 8 depend on it.
