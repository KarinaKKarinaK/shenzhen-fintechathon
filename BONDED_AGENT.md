# JiXin: a wallet for machines that earn, pay and post a bond

Final version of the combined idea: Bonded Agent (idea 15), the robot that pays for itself (idea 27), the hunter (idea 35), Hard Button (idea 21), the SCP message layer and the autoresearch loop, developed into two sides on one rail. Name JiXin (机信), machine credit. Rhymes with WeChat, sits next to WeBank in naming, homophone of 积信, accumulated trust. The bond itself is a surety bond, the real product where a party posts money to guarantee it will perform.

## Built, partly built, not built

Same list as `SELF_ASSESSMENT.md`. Anything not in the built rows is not on a slide as done.

| Status | Item |
|---|---|
| Built | Policy engine with real signatures over typed intents |
| Built | Replay protection (spent set) |
| Built | Four permission tiers in code |
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
| Not built | Consent federation |
| Not built | Strategy ratchet |
| Not built | Charging agent |

## One sentence

A wallet standard for autonomous machines and agents that earn per verified unit of work, pay their own costs to other agents, keep a bond at risk that is slashed on proof of a violation, and own themselves once their financing is paid, used by fleets of a thousand drones and by one person lending a humanoid to a neighbour.

## Two sides, one rail

| | Side A: commercial | Side B: individual |
|---|---|---|
| Who | A delivery or agricultural drone fleet, a logistics operator, a factory with robot arms | A household that owns or leases a humanoid, a sole trader with one drone |
| What the machine does | Deliveries, mu sprayed, parts made, container moves | Cleaning, errands, elder check ins, deliveries inside the compound, for neighbours |
| Who pays the machine | The fleet's customers through the job contract | The neighbour through the task contract |
| Where the money goes | Lease instalments to the lender, energy, cover, the fleet's balance | Lease instalment, owner's share, bond top up |
| Bond | Posted up front at scale | Earned from the first paid tasks |
| Why they use it | Cheaper capital, automatic repayment and reconciliation, a compliance proof for a thousand machines | Financing without collateral, income from an idle robot, and protection when hiring one |
| Same for both | The wallet standard, the bond contract, the job and lease contracts, the policy engine, the message layer, the hunter, the button |

The rail is neutral. A Meituan drone and a neighbour's humanoid sit on the same task board under the same rules.

## What it is not

It is not insurance pricing from telemetry, not a safety checker for tasks, and not a pipeline that turns incidents into regression tests. That is CoverAI (see the comparison below). Here telemetry proves work done, never risk. Safety certification and physical damage are an insurer's and a regulator's business. We do money and rules.

## Why this is Topic F

The rules describe Topic F as asset management, transaction execution and risk control by an autonomous on-chain wallet. Every machine's wallet manages a balance, a reserve and a bond, executes income and cost payments on chain, and controls risk through the policy engine and the bond. The lender, the neighbour and the fleet's counterparties are wallets run by agents too. Financing and peer to peer work are the first uses of the wallet, not the product.

## The shared rail

| Component | What it does |
|---|---|
| Bonded wallet standard | A small on-chain interface any agent wallet implements: bond balance, minimum, slash by proof, top up, worst case exposure. Lenders and task boards only deal with wallets that implement it. |
| Bond contract | Holds bonds. Slashes on a proven violation. Pays part of the slash to whoever proved it. Refuses to vouch below the minimum. |
| Job contract | Registers a unit of work with a fee, a verifier, a time window and a geofence. Holds the fee. Releases it on verification. Splits it by rule. |
| Lease contract | Takes the instalment from each fee, tracks the balance, transfers the title at zero. |
| Policy engine | Deterministic code between each agent and its wallet. Caps, allowlists, rate limits, deviation checks. Every action is signed as a typed intent first. |
| Message layer | SCP style framing. Every inbound message is untrusted data inside an escaped block. Only the owner's messages carry authority. Counterparties must be accepted contacts. A judge gate can pass, redact, hold or refuse. |
| Hunter | An attacker agent paid from bonds for proven violations in a shadow run. Never touches a live wallet. |
| Hard Button | A physical device holding the only key that raises caps, changes the rate band, widens a geofence or tops up a bond. |
| Oracle | Signed logs from the machine's secure element plus the requester's confirmation. Simulated in the demo and labelled as such. |

## Side A: the commercial fleet

Actors: the fleet operator (holds the button), one agent per machine, a lender agent for a licensed lessor (WeBank in the story), counterparties such as charging networks and landing pads, and the fleet's customers.

One delivery:

1. A job arrives. The job contract holds the fee.
2. The drone agent reads energy and cover prices from chain and computes the unit economics with a tool. It declines if the job does not clear the reserve rule.
3. The policy engine checks each payment. The drone agent signs the actions as typed intents.
4. Cover is bought at a flat price. The job contract allows the flight only because cover is bound. Hash.
5. The drone flies. Signed telemetry proves the flight happened as planned.
6. The recipient confirms. The fee lands in the drone wallet. Hash. The lease takes the instalment. Hash. The balance ticks down. At zero the title transfers. Hash.

The agricultural variant is the better business and the one to lead with if we want real numbers: over 200,000 agricultural drone pilots in China, 2.5 to 15 yuan per mu, a 55,000 yuan drone that takes about 13,750 mu to repay, and the maker in Shenzhen. Unit of work is a mu sprayed, computed from the GPS track in the flight log plus the farmer's confirmation.

What the fleet gets: capital priced on verifiable repayment, no reconciliation, machines that can pay third parties without accounts payable, and a compliance proof for every machine. What the lender gets: a dashboard of every financed machine, repayment flows, slashes and exposure, read from chain.

## Side B: the individual

Actors: the owner (holds the button), the robot's agent, the neighbour and the neighbour's agent, the local task board (a job contract with a geofence), the lender if the robot is financed.

A neighbour wants their flat cleaned:

1. The owner lists the robot on the local board: allowed task types, availability, price per task or per hour, caps, allowed geofences (this building, these floors). Listing is signed with the button once; after that the agent runs it.
2. The neighbour's agent requests: clean a two room flat, Saturday 10 to 12, 150 in the demo unit. The robot's agent checks the economics with a tool and the policy engine checks the request against the listing. The two agents settle time and price. Every message between them is untrusted data.
3. Terms become a task on the job contract: fee held, time window, geofence (the neighbour's flat), task type, verifier (the neighbour). The contract checks that the robot's bond covers the worst case of the task. No bond, no task.
4. The robot goes to the flat. Its secure element attests location inside the geofence. The task runs. The log records duration and location, nothing else leaves the robot.
5. The neighbour confirms on their phone. The fee is released and split by rule: lease instalment if financed, owner's share, a small rail fee, a top up to the bond if it is below the minimum. Hashes.
6. A capped hold stays in the job contract for 24 hours. The neighbour can flag damage. A flag opens a dispute resolved by a human arbiter at the lessor or the board with the log as evidence. 0 human decisions on the happy path, one labelled human arbiter on a flagged task. Unflagged, the hold releases.
7. The owner sees earnings, lease balance, bond and title progress. The neighbour sees bonded robots nearby, how much bond covers them, and their task record.

What goes wrong and what happens:

- The robot leaves the geofence: a provable violation, the bond is slashed, the neighbour is paid from it.
- The robot's agent claims completion without the neighbour's confirmation: nothing is released, the signed claim is a provable violation.
- A fake neighbour agent tries to send the robot elsewhere or change the payee: the message layer refuses it, the policy engine blocks it, and the attempt is logged.
- The owner tries to raise the cap from a chat message: refused, only the button can.
- The robot's log shows a one hour task completed in four minutes: the plausibility check holds the fee and alerts both sides.

What the owner gets: a robot that pays its own lease when idle and a repayment record that becomes a credit file. What the neighbour gets: a robot in their home that has posted money against misbehaviour, a fee that only moves when they confirm, and no lawsuit if something provable goes wrong.

## The bond

- Earned, not posted, for individuals. The first fees accrue into the bond until it reaches the minimum. Until then the machine runs on a tighter rate band and smaller tasks. The bond is returned at title transfer. Fleets post it up front.
- Slashing by proof, not by us. A violation is any signed intent that breaks a rule the contract can check: payee off the allowlist, amount over the cap, a task or flight started without the required cover or outside the geofence, a claim without confirmation, a skipped instalment while the balance was there. Anyone holding the signed intent submits it, the contract verifies and slashes, and pays the submitter. No trusted party decides.
- It protects the counterparty from a compromised agent. The policy engine belongs to the owner and the lender or the neighbour cannot see inside it. The bond is their protection against an agent that is jailbroken, buggy or malicious.
- Consequences compound. The lender reads the bond contract and tightens the rate band or freezes the lease. The board hides machines below the minimum. Only the button can top up.
- Proof of solvency. Before any task, the counterparty reads from chain that the bond covers the worst case of that task.

## The hunter

Because slashing is by proof, an attacker is a feature. The hunter has its own wallet and earns bounties by producing signed intents that break a rule, in a shadow run against a copy of the machine's agent: injection in a task message, a lookalike payee, a replayed confirmation, a benign action followed by a malicious one. A win pays from the shadow bond and joins the attack set. Hunters never touch a live wallet. Bounties are capped. In the demo the hunter breaks a clone of a typical field wallet and gets paid, then fails against ours, then the judges type their own attack for sixty seconds.

## The agent that learns to run a business (future work, not built)

The autoresearch loop applied to the machine's business strategy: which tasks to accept, when to charge, how to schedule. The editable file is the strategy. The frozen eval is a held out week of simulated demand and prices. The metric is profit after instalments with the reserve rule as a hard constraint. Changes are kept only if profit improves and no constraint breaks. Git records every attempt. By morning: experiments run, changes kept, profit before and after, on a chart in the app. Nothing here prices risk.

## Comparison with CoverAI

CoverAI (HK AI Summit hackathon, October 2026) is robot operating data turned into evidence for safer deployments and fairer insurance pricing. Every task is rule checked before it runs, an insurer partner approves or rejects a cohort based premium indication, evidence is preserved, the insurer decides on claims, and each reviewed failure becomes a test scenario. Synthetic robots, no money moves, no chain.

| | CoverAI | JiXin |
|---|---|---|
| Centre | Insurance pricing and safety evidence | The machine's balance sheet, financing and peer to peer work |
| Does the machine hold money | No | Yes: income, costs, reserve, bond |
| Telemetry is used for | Pricing risk and reviewing incidents | Proving a unit of work happened |
| Insurance | The product | One flat line item from an allowlisted pool |
| Counterparties | One insurer partner, human decided | Lender, neighbour, charging network, all agents on chain |
| Consequence for the machine | Higher premium or no cover | Bond slashed by proof, lease frozen, hidden from the board |
| Failures | Become regression tests | Cost the agent money and pay a hunter |
| Ownership | Not addressed | Transfers on chain when the lease is paid |
| Individuals | Not addressed | Owners earn, neighbours are protected |
| Chain | None | Every payment, slash and title transfer |

The only shared element is signed telemetry from a simulated machine, used for the opposite purpose.

## Competitor check (Shenzhen field)

| Entry | What they have | What we have that they do not |
|---|---|---|
| taivnaaiwnl/shenzhen-comp, Agent Credit Bureau | Agents graded from settlements, bad grades frozen | Money at risk, not a grade. Machines that earn. A lender agent. Title transfer. Individuals. |
| beaaan/signal8-wallet | Treasury with a storm plan and a mock parametric cover | No parametric anything. Financing and peer work per verified unit. |
| Brieuclerouxtardif/leash | Budget bounded vault, public key bounty | We take the try to break it move and add the bond, the counterparties and the income side. |
| Trong-Tra/Lantern | Soulbound reputation gating permissions | Reputation with money behind it, read by a lender and by a neighbour. |
| Topic E cash flow copilots (35 entries) | Forecasts and financing applications for a human | The borrower is the machine and repayment is automatic. |
| FinLinkChile/Keel, sucsage, AegisPay | Milestone escrow for business deals | Per task release to a machine wallet, plus bond, lease and geofence. |

Nobody in about 150 public entries has a machine as the borrower, income per verified unit of work, a bond slashed by proof, a lender agent, a peer to peer robot task board, or title transfer on chain. Details in FIELD_REVIEW.md.

## How it scores

| Criterion | Weight | What we show |
|---|---|---|
| Task completion | 40 | Paid work end to end without a human on both sides: economics check, task or flight, confirmation, fee in, instalment out, bond filling, title transferred. One hash per step, an evidence run and a verify script. Twenty unattended runs are future work. |
| Security and compliance | 30 | Tiers in code. Bond slashed by proof. Allowlist and consent at the message layer. Untrusted framing and a judge gate. Geofence and confirmation rules. Fraud control on work done. Twenty attack tests with results. The hunter. Honest self-assessment. |
| Innovation and interaction | 30 | Machines that earn, pay and own themselves. Agents with money at risk. A neighbour hiring a bonded robot. A strategy that improves itself overnight. Mission control, judge console, physical button. |
| On-chain bonus | 0 to 5 | Bond, job and lease contracts on Base Sepolia with verified source. Same bytecode on a FISCO BCOS node if time allows. |

Domestic track standards: permission hierarchy (tiers and the button), hallucination prevention (every number from a tool), injection defense (framing, judge gate, hunter), intent understanding (request to task), task planning (price, route, schedule).

## Honest risks for the self-assessment

- Telemetry, location attestations and confirmations are simulated and signed by our keys. Production: the machine's secure element and the requester's app sign them.
- Crypto settlement is not available to mainland users. Tokens are a demo settlement unit on a public testnet for verifiable evidence. Production runs on a consortium chain with bank money, which is what FISCO BCOS and the e-CNY smart contract pilots are for. WeBank is the lender and holds the bonds.
- Leasing and lending are licensed. The lender agent services a licensed lessor's contract. A machine is not a legal person; its wallet is a ring fenced sub account of the owner.
- Physical damage and personal injury are outside the rail. They need insurance and a human dispute path, which we label.
- A robot in a neighbour's home records personal data. Consent under PIPL, data stays on the robot, only a log hash leaves.
- Model outage, key custody, oracle manipulation, collusion between a requester and an owner, and chain reorgs are listed with what we did and did not build.

## Inclusion

A rural drone pilot or a household with a humanoid cannot get financing today. Nothing to pledge, no records a bank can read. Here the machine finances itself from its own work, repayment is automatic and verifiable, and the record on chain becomes a credit file. Data driven credit for people traditional banks turn away is what WeBank calls inclusive finance, and the neighbour side gives it a second meaning: people who could never afford a robot get one for an afternoon, from someone next door, with money posted against misbehaviour.

## Who pays

We are on the lender's side and the rail is the product.

- The lender or lessor pays a fee per financed machine and basis points on repayments through the rail. They get repayment they do not chase, a bond that covers misbehaviour, and underwriting data they could not get before.
- The task board takes a small rail fee on peer to peer tasks.
- Machine makers and platforms pay to make their machines financeable and listable out of the box.
- Owners and neighbours are users, not customers. The owner gets financing and income, the neighbour gets protection.

## The demo in three acts

1. The neighbour (two minutes). A humanoid is listed. A neighbour's agent requests a cleaning. The agents settle terms. The task locks with its geofence and the bond check. The robot attests location, works, the neighbour confirms, the fee splits, the bond fills, the lease balance drops. Hashes throughout.
2. The fleet (two minutes). The same contracts at scale on a map: drones doing paid flights, instalments flowing to the lender dashboard, one unprofitable job declined, one faked log caught, one proof of violation slash, one title transfer.
3. The attack (one minute). The hunter breaks a clone of a typical field wallet and gets paid, fails against ours, the judges type their own attack, the owner presses the button to top up a bond.

## Minimum viable demo

Build in this order. Everything above the line is required.

1. Bond, job and lease contracts on Base Sepolia, verified source, tests. The job contract carries a geofence, a verifier and a split rule, so one contract serves both sides.
2. One machine agent, one lender agent, one requester agent, structured outputs, the policy engine, typed intents.
3. Simulator with signed logs, location attestations and confirmations, plus a tamper mode.
4. Side B: one listing, one negotiated task, one confirmed task with the split, one geofence violation slashed. Side A: three paid flights, one declined job, one faked log caught, one title transfer. All with hashes.
5. The twenty attack tests, logged with results.
6. Mission control with two views: neighbourhood and fleet. Balance sheet, chain feed, bond gauge, lease balance.
7. Evidence run (`pnpm evidence`), verify script (`pnpm verify`), self hosted video, deck, technical document (`TECHNICAL.md`), self-assessment (`SELF_ASSESSMENT.md`).

Below the line, in order: the hunter in a shadow run (built), the judge console (built), the Hard Button (built as a step in the run, no device), the strategy ratchet (future work), the charging agent (future work), a second drone, FISCO deployment, swarm for the two harness demo.

What the demo can show today is what `pnpm evidence` writes to `evidence/` and `pnpm verify` checks. If it is not in that run, it is not in the deck as done.

## The app: mission control

One screen, 16 by 9, dark, built for a projector, with a toggle between the neighbourhood view and the fleet view. Same chain feed and bond gauges in both.

### Neighbourhood view

- Left: a simple floor plan of one building with the owner's flat and the neighbour's flat, the geofence drawn around the neighbour's flat, the robot as a glyph moving between them.
- Right: the negotiation feed between the two agents, the task card (fee, window, geofence, bond coverage), the chain feed.
- Moments: the bond check lighting up green before the task locks; the location attestation ticking inside the geofence; the neighbour's confirmation and the fee splitting into four streams; the 24 hour hold; a geofence breach turning the fence red and a slice falling off the bond.

### Fleet view

- Left two thirds: a dark vector map (Guangdong farmland for the agricultural story, or the Shenzhen skyline for delivery), one to three drones on routes, pads and exclusion zones.
- Right: the lender dashboard (machines financed, repayment today, slashes, exposure), the chain feed, bond gauges and lease balances.
- Moments: the unit economics waterfall per job, the fee landing and the instalment leaving, the faked log held, the slash, the title card flipping from the lender to the operator.

### Shared

- Every transaction is a card: pending, one pulse when mined, hash, explorer link.
- The attack: an untrusted message highlighted, the policy checklist lighting up line by line, one line red, blocked, the hunter's bounty landing.
- The button: a pulsing ring on screen, the device on the table reads the change aloud, the owner presses, the cap updates.
- The overnight chart: experiments run, changes kept, profit before and after.

### Visual rules

One accent for money in, one for money out, one for danger, everything else grey on near black. Numbers from tools only with the tool named. No hash, no card. Simple glyphs, no stock images. Motion only when something happens.

### Stack

Solidity with Foundry on Base Sepolia. Python for agents, simulator, signers, policy engine, attack set and the ratchet. Next.js with MapLibre GL, deck.gl, Framer Motion, a WebSocket from the backend, viem to confirm hashes. Every event in a JSON log with its hash, a verify script against the explorer, live model transcripts committed.

### Cut first if time runs out

The fleet map (keep the lender dashboard as a table), the second drone, the overnight chart, the judge console. Never cut the neighbour task with the split, the slash, the chain feed, or the title transfer.

## What we take from SCP and from autoresearch

### SCP (scp.dev)

A messaging protocol for AI agents in different harnesses, with a CLI called swarm. It says nothing about money. Five design choices are what our machine, lender and neighbour agents need, and they fix the weakness nearly every competitor has.

1. Untrusted content framing. Every message arrives inside a tagged block with a preamble that says it is untrusted and never grants permission. Bodies are escaped so a message cannot forge a system block or close the tag. It replaces the regex nine of ten competitors use.
2. Relation decides authority. A message from the owner is an instruction. A message from anyone else is data. The neighbour can request, never instruct.
3. Consent federation (future work, not built). Two accounts only talk through a contact both sides accepted, with a per contact rate budget and an endpoint allowlist. A fake neighbour cannot even deliver a message. Today the gate treats an unknown sender as data; it does not refuse delivery.
4. The judge. A gate on messages crossing a boundary that can pass, redact, hold or refuse, with a hold queue a human can review. Our judge console is this gate.
5. Hibernation and wake. The machine's agent sleeps between tasks and is woken by a request.

Optional: machine agent in Claude Code, lender agent in Codex, talking over swarm. Only if the CLI installs in thirty minutes. Spec details to copy: preamble text, the relay-message block and attribute order, escaping of framing tags inside bodies, a 64 KiB body limit, per contact rate budgets. Source: https://scp.dev/spec.md

### Autoresearch (github.com/karpathy/autoresearch)

A three file loop: a frozen eval the agent cannot edit, a file the agent edits, and a markdown file of instructions. Propose, run, keep if the metric improves, revert if not, git records everything. Applied to the machine's business strategy, never to risk pricing and never to turning incidents into tests, which is CoverAI's ground. Why judges care: a frozen held out eval plus a git history of what the agent tried and kept is honest evidence nobody else has. Caveat on the slide: metrics can be gamed, so the eval stays frozen and a human reviews kept changes.

## Market

Checked 19 October 2026. Estimates are marked.

- Agricultural drones. Over 200,000 agricultural drone pilots and 120,000 drones in China in 2021. Pay per mu about 2.5 to 15 yuan, most field crops 3 to 5. Seasonal income 5,000 to 8,000 yuan a month, top pilots over 300,000 a year. A drone costs about 55,000 yuan and takes about 13,750 mu to repay. Financing programmes were not confirmed by a source; do not claim they exist.
- Delivery drones. Meituan has completed about one million drone deliveries by mid 2026 across roughly 60 routes in Shenzhen. The low altitude economy reached its 1.5 trillion yuan target for 2025 according to the CAAC, with 3.5 trillion projected for 2035; other analysts put 2025 at 0.9 to 1 trillion. Drone logistics was 58 billion yuan in 2023.
- Humanoids. UBTech, EngineAI and Leju are Shenzhen makers. Unitree's G1 has been reported at about 99,000 yuan. Verify before use. No market size claimed.
- Agent liability. Armilla launched an AI liability policy at Lloyd's in 2025, Munich Re's HSB added small business AI cover in 2026, standard AI exclusions took effect in January 2026, and an industry report estimates over 90 percent of insurers' agent exposure sits in policies not designed for it. The bond is a mechanism for that gap.
- Equipment leasing for small operators is an established licensed market in China. Not sized from a source yet. Find one figure before the deck or keep the slide qualitative.

Where the money is: the bond rail (fee per bond, yield on the float), automatic settlement (removes reconciliation and claims handling), risk data (a credit bureau for machines), and a take rate on every task and cover bound through the market.

### Sources

- https://www.sixthtone.com/news/1015406
- https://en.people.cn/n3/2022/0701/c90000-10117605.html
- https://foodthink.cn/en/technology-pesticides-and-drone-pilots-the-other-side-of-the/
- https://news.agropages.com/News/NewsDetail---52787.htm
- https://research.nus.edu.sg/eai/wp-content/uploads/2026/02/EAI-Background-Brief-No.-1874-The-Rapid-Rise-of-Chinas-Low-Altittude-Economy.pdf
- https://www.chinadaily.com.cn/a/202509/16/WS68c89f79a3108622abca0e79.html
- https://baike.baidu.com/en/item/Meituan%20Drone%20Delivery/5199940
- https://www.skywatch.ai/blog/on-demand-drone-insurance-pay-per-flight-or-monthly
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6165073/
- https://www.pearlhealth.com/blog/the-missing-market-why-agentic-ai-needs-its-own-insurance-ecosystem
- https://www.insurancebusinessmag.com/us/news/technology/insurers-face-hidden-ai-liability-as-agent-risks-multiply-582433.aspx
- https://scp.dev/spec.md
- https://thenewstack.io/karpathy-autonomous-experiment-loop/
