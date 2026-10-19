# Bonded Agent: problems and fixes

A running log of the holes found in BONDED_AGENT.md and what we decided to do about each. Newest decisions are added as we go. BONDED_AGENT.md gets rewritten from this once the list is settled.

## Status

| # | Problem | Status |
|---|---|---|
| 1 | Who pays when the AI agent makes a mistake | Decided: two bonds, the vendor is liable for the AI |
| 2 | Nobody outside the pilot can submit proof, so the bond can never be slashed | Decided: public intent log |
| 3 | The bond starts at zero, so it protects the lender least when risk is highest | Decided: limits scale with the bond, the vendor bond covers the start |
| 4 | Where insurance fits | Decided: not in the build, only above the bonds |
| 5 | The document mixes delivery drone, agricultural drone, robot arm and humanoids | Open |
| 6 | The market section argues for insurance pricing, which the product section rules out | Open |
| 7 | Spraying is seasonal; a fixed monthly minimum causes default in the off-season | Open |
| 8 | Scope is far bigger than the time left | Open |
| 9 | Claims that can backfire: WeBank named as lessor, farm drone subsidies may exist, unverified market sources | Open |

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

## Next to fix

5 to 9 in the status table. Start with 5 (pick one scenario), since 6, 7 and 8 depend on it.
