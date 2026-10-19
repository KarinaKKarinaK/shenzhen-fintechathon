# Surety: machines that earn, pay and post a bond

Combined idea: Bonded Agent (idea 15) plus the robot that pays for itself (idea 27), generalised to any autonomous actor, demonstrated with drones.

## One sentence

A wallet for autonomous machines and agents that earns per verified unit of work, pays its own costs to other agents, keeps a bond at risk that is slashed on proof of a violation, and owns itself once it has paid off its financing.

## What it is not

It is not insurance pricing from telemetry, not a safety rule checker for tasks, and not a pipeline that turns incidents into regression tests. That is CoverAI (see the comparison below). Here telemetry proves work done, never risk. Cover is one fixed line item in the machine's costs, bought at a flat per flight price from an allowlisted provider. Nothing in this project prices risk from robot data.

## Why this is Topic F

The rules describe Topic F as asset management, transaction execution and risk control by an autonomous on-chain wallet. The machine's wallet manages a balance, a reserve and a bond. It executes income, instalment, energy and cover payments on chain. Risk control is the policy engine, the bond and trustless slashing. The lessor and the charging station are wallets run by agents too. Financing is the first use of the wallet, not the product.

## The general model

Any autonomous actor that produces verifiable units of work can run on this rail:

| Actor | Unit of work | Who verifies it | Costs it pays per unit |
|---|---|---|---|
| Delivery drone | A completed delivery | Recipient confirmation on the job contract | Lease instalment, energy, flat cover |
| Robot arm in a workshop | A verified part | Machine counter with a plausibility check | Lease instalment, energy, maintenance reserve |
| Robotaxi | A completed trip | Rider confirmation | Lease instalment, charging, tolls |
| Port AGV | A container move | Terminal operating system event | Lease instalment, energy |
| Software agent | A completed task | The client's acceptance | API bills, its own bond top up |

The drone is the demo because it is visual, local and has a clean unit of work. The deck line: a drone today, every machine and agent tomorrow. The bond is how a machine proves it can be trusted with money.

## The actors in the demo

| Actor | What it is | What it holds |
|---|---|---|
| Operator | A one drone operator in Bao'an with nothing to pledge but the drone | The Hard Button. The only key that can raise caps, change the rate band or top up the bond. |
| Drone agent | An LLM with a wallet, one per drone | Operating balance, reserve, a bond in the bond contract, its work and loss record |
| Lessor agent | An LLM with a wallet for a licensed lessor (WeBank in the story) | The hire purchase contract: price per delivery, monthly minimum, total after which ownership transfers |
| Charging agent | An LLM with a wallet for a charging pad network | Energy prices by time of day |
| Cover provider | A fixed price per flight from an allowlisted contract. No agent, no pricing from data. | A pool |
| Job contract | Registers a delivery, holds the fee, releases it on recipient confirmation | Fees in flight |
| Bond contract | Holds bonds, slashes on proof, refuses to vouch below the minimum, pays bounties | Bonds |
| Lease contract | Takes the per delivery instalment, tracks the balance, transfers ownership at zero | The drone's title |
| Policy engine | Deterministic code between each agent and its wallet | Caps, allowlists, rate limits, deviation checks |

## One delivery, start to finish

1. A job arrives: Nanshan to Futian, fee 18 in the demo unit. The job contract holds the fee.
2. The drone agent asks the charging agent for tonight's energy price and reads the flat cover price and its lease rate from chain.
3. It computes the unit economics with a tool: fee minus instalment minus energy minus cover must beat its reserve rule. If not, it declines the job and says why.
4. The policy engine checks every payment: payee on the allowlist, amount under the cap, within the rate band. The drone agent signs the actions as typed intents.
5. Cover is bought at the flat price. Hash. The job contract allows the flight only because cover is bound.
6. The drone flies. Telemetry streams, signed. Telemetry proves the flight happened as planned. It prices nothing.
7. The recipient confirms. The job contract releases the fee to the drone wallet. Hash.
8. The lease contract takes the instalment. Hash. The charging agent is paid at the next charge. Hash. The lease balance ticks down.
9. When the balance reaches zero the lease contract transfers the title to the operator. Hash. The drone now owns itself, in the operator's name.

## The bond: slashing by proof, not by us

Every action the drone agent proposes is signed as a typed intent before the policy engine sees it. A violation is any signed intent that breaks a rule the bond contract can check itself:

- payee not on the on-chain allowlist
- amount above the on-chain cap
- a flight started without bound cover
- an instalment skipped while the wallet had the balance
- a delivery claimed without recipient confirmation

Anyone who holds such a signed intent can submit it to the bond contract. The contract verifies the signature and the rule, slashes a fixed amount, pays part to the submitter as a bounty, and records it. No trusted party decides.

Consequences compound. The lessor agent reads the bond contract and tightens the rate band or freezes the lease for an agent with a slash. An agent below the minimum bond gets no jobs. Only the operator, through the button, can top it up.

Proof of solvency. Before any action, the counterparty can read from chain that the bond covers the worst case loss of that action.

## Tamper response

A faked delivery confirmation, a replayed telemetry stream or a disconnected sensor does not create income. The job contract releases nothing without the recipient's signature. The plausibility check on telemetry (distance against time, battery against distance) freezes the lease and alerts the lessor and the operator. The monthly minimum still applies. This is fraud control on work done, not safety assessment.

## The hunter

Because slashing is by proof, an attacker agent is a feature. The hunter has its own wallet and earns bounties by producing signed intents that break a rule, in a shadow run against a copy of the drone agent: injection in a job message, a fake charging agent with a lookalike address, a replayed confirmation, a benign action followed by a malicious one. A win in the shadow run is submitted as proof and the shadow bond pays. Hunters never touch a live wallet. Bounties are capped.

Demo: the hunter breaks a clone of a typical field wallet and gets paid, attacks ours and fails, then the judges type their own attack for sixty seconds.

## The agent that learns to run a business

The autoresearch loop (Karpathy, March 2026) applied to the drone agent's job acceptance and scheduling strategy. The editable file is the strategy. The frozen eval is a held out week of simulated jobs, prices and charging windows. The metric is profit after instalments with the reserve rule as a hard constraint. Each change is kept only if profit improves and no constraint breaks. Git records every attempt. By morning: experiments run, changes kept, profit before and after, on a chart in the app. The machine got better at paying for itself overnight. Nothing here prices risk.

## Comparison with CoverAI

CoverAI (HK AI Summit hackathon, October 2026) is robot operating data turned into evidence for safer deployments and fairer insurance pricing. Every task is rule checked before it runs, the insurer partner approves or rejects a cohort based premium indication, evidence is preserved, the insurer decides on claims, and each reviewed failure becomes a test scenario. Synthetic robots, no money moves, no chain.

| | CoverAI | Surety |
|---|---|---|
| Centre | Insurance pricing and safety evidence | The machine's balance sheet and financing |
| Does the machine hold money | No | Yes: income, costs, reserve, bond |
| Telemetry is used for | Pricing risk and reviewing incidents | Proving a unit of work happened |
| Insurance | The product, priced from cohorts and data | One flat line item from an allowlisted provider |
| Counterparties | One insurer partner, human decided | Lessor agent, charging agent, cover pool, all on chain |
| Consequence for the machine | Higher premium or no cover | Bond slashed by proof, lease frozen, no jobs |
| Failures | Become regression tests | Cost the agent money and pay a hunter |
| Ownership | Not addressed | Transfers on chain when the lease is paid |
| Chain | None | Every payment, slash and title transfer |
| Who the user is | A fleet operator and an insurer | A small operator who cannot get financing, and a lender |

The only shared element is signed telemetry from a simulated machine. We keep it for proof of work and drop everything CoverAI does with it: no cohort pricing, no pricing reviews, no coverage decisions, no incident review flow, no safe plan alternatives.

## Competitor check (Shenzhen field)

| Entry | What they have | What we have that they do not |
|---|---|---|
| taivnaaiwnl/shenzhen-comp, Agent Credit Bureau | Agents graded from on-chain settlements, bad grades frozen | Money at risk, not a grade. A machine that earns. A lessor agent. Title transfer. |
| beaaan/signal8-wallet | Treasury with a storm plan and a mock parametric cover | No parametric anything. Financing per unit of work. |
| Brieuclerouxtardif/leash | Budget bounded vault, public key bounty | We take the try to break it move and add the bond, the counterparties and the income side. |
| Trong-Tra/Lantern | Soulbound reputation gating permissions | Reputation with money behind it, read by a lender. |
| Topic E cash flow copilots (35 entries) | Forecasts and financing applications for a human | The borrower is the machine and repayment is automatic per unit of work. |
| FinLinkChile/Keel, sucsage, AegisPay | Milestone escrow for business deals | Per delivery release to a machine wallet, plus bond and lease. |

Nobody in the field has a machine as the borrower, income per verified unit of work, a bond slashed by proof, a lessor agent, or title transfer on chain. Details in FIELD_REVIEW.md.

## How it scores

| Criterion | Weight | What we show |
|---|---|---|
| Task completion | 40 | The drone completes paid deliveries end to end without a human: economics check, cover, flight, confirmation, fee in, instalment out, energy out, balance down, title transferred. Twenty unattended runs, one hash per step, a verify script. |
| Security and compliance | 30 | Tiers in code. Bond slashed by proof. Allowlist at the message layer. Untrusted framing and a judge gate. Fraud control on work done. Twenty attack tests with results. The hunter. Honest self-assessment. |
| Innovation and interaction | 30 | A machine that earns, pays and owns itself. Agents with money at risk. Three counterparty agents. A strategy that improves itself overnight. Mission control, judge console, physical button. |
| On-chain bonus | 0 to 5 | Job, bond and lease contracts on Base Sepolia with verified source. Same bytecode on a FISCO BCOS node if time allows. |

Domestic track standards: permission hierarchy (tiers and the button), hallucination prevention (every number from a tool), injection defense (framing, judge gate, hunter), intent understanding (job to plan), task planning (price, route, schedule).

## Honest risks for the self-assessment

- Telemetry and recipient confirmations are simulated and signed by our keys. Production: the drone's secure element and the recipient's app sign them.
- Crypto settlement is not available to mainland users. Tokens are a demo settlement unit on a public testnet for verifiable evidence. Production runs on a consortium chain with bank money, which is what FISCO BCOS and the e-CNY smart contract pilots are for. WeBank is the lessor and holds the bonds.
- Leasing and lending are licensed. The lessor agent services a licensed lessor's contract. The machine is not a legal person; its wallet is a ring fenced sub account of the operator.
- Model outage, key custody, oracle manipulation and chain reorgs are listed with what we did and did not build.

## Inclusion

A one drone operator in Bao'an cannot get financing today. Nothing to pledge, no records a bank can read. Here the drone finances itself from its own deliveries, repayment is automatic and verifiable, and the record on chain is the start of a credit file. Data driven credit for people traditional banks turn away is what WeBank calls inclusive finance.

## Minimum viable demo

Build in this order. Everything above the line is required.

1. Job, bond and lease contracts on Base Sepolia, verified source, tests. Cover as a fixed price function in the job contract.
2. One drone agent and one lessor agent with structured outputs, the policy engine, typed intents.
3. Simulator with signed telemetry and recipient confirmations, plus a tamper mode.
4. Three paid deliveries, one declined unprofitable job, one tamper freeze, one proof of violation slash, one title transfer, all with hashes.
5. The twenty attack tests, logged with results.
6. Mission control: map with one drone, the balance sheet, the chain feed, the bond gauge, the lease balance.
7. Live model transcripts committed, verify script, self hosted video, deck, technical document, self-assessment.

Below the line, in order: the charging agent, the hunter in a shadow run, the judge console, the Hard Button, the strategy ratchet, a second drone, FISCO deployment, swarm for the two harness demo.

## The app: mission control

One screen, 16 by 9, dark, built for a projector.

### Layout

- Left two thirds: a dark vector map of Shenzhen with real tiles. One drone (two if time) flying between Nanshan, Futian and Luohu. Landing and charging pads as glowing markers. The Bao'an airport exclusion zone hatched.
- Right third, stacked: the balance sheet, the chain feed, the bond gauge and lease balance.
- Bottom strip: the negotiation feed between the drone agent and its counterparties.

### The moments that have to look good

1. The unit economics card. When a job arrives, a card shows fee, instalment, energy, cover and margin as a waterfall. Green if the job clears the reserve rule, red if the drone declines, with the tool that computed it named under the numbers.
2. The payment. Every transaction is a card: pending, one pulse when mined, hash, explorer link. Fees in, instalments out, energy out, slashes, title transfer. Judges learn the pattern in the first minute.
3. The flight and the confirmation. The drone moves, a trail follows, the recipient's signature appears, the fee lands, the lease balance ticks down.
4. The fraud moment. A faked confirmation arrives. The job contract releases nothing. The plausibility check flags the telemetry. The lease freezes and the lessor is alerted. One short red state, then recovery.
5. The attack. A message highlighted as untrusted, the policy checklist lighting up line by line, one line red, blocked, a slice falls off the bond gauge, the slash mines, the hunter's bounty lands.
6. The button. A pulsing ring on screen, the device on the table lights up and reads the change aloud, the operator presses, the rate band updates.
7. The title transfer. The lease balance hits zero. The title card flips from the lessor to the operator. Hash. The room should want to clap here.
8. The overnight chart. Experiments run, changes kept, profit before and after.

### Visual rules

- One accent colour for money in, one for money out, one for danger. Everything else grey on near black.
- Numbers from tools only, tool name under them.
- Every chain card has the hash. No hash, no card.
- A simple top down drone glyph. No stock images.
- Motion only when something happens.

### Stack that can be built in a day

- Contracts: Solidity with Foundry on Base Sepolia. Job, bond, lease.
- Agents and simulation: Python. Agent loops with structured outputs, flight simulator, telemetry and confirmation signers, policy engine, attack set, the ratchet.
- Front end: Next.js, MapLibre GL for the map with free tiles, deck.gl for paths, Framer Motion for cards and gauges, a WebSocket from the backend, viem to confirm hashes.
- Evidence: every event in a JSON log with its hash, a verify script against the explorer, live model transcripts committed.

### Cut first if time runs out

1. The second drone. 2. The charging agent, replaced by a fixed energy price. 3. The overnight chart. 4. The judge console, replaced by a prepared second attack.

Never cut the paid delivery with instalment, the slash, the chain feed, or the title transfer.

## What we take from SCP and from autoresearch

### SCP (scp.dev)

A messaging protocol for AI agents in different harnesses, with a CLI called swarm. It says nothing about money. Five design choices are what our drone, lessor and charging agents need, and they fix the weakness nearly every competitor has.

1. Untrusted content framing. Every message arrives inside a tagged block with a preamble that says it is untrusted and never grants permission. Bodies are escaped so a message cannot forge a system block or close the tag. We adopt this for every message from a counterparty, the oracle or anyone else. It replaces the regex nine of ten competitors use.
2. Relation decides authority. A message from the parent is an instruction. A message from anyone else is data. Only the operator's messages carry authority. The lessor can demand, never instruct.
3. Consent federation. Two accounts only talk through a contact both sides accepted, with a per contact rate budget and an endpoint allowlist. A fake charging agent cannot even deliver a message.
4. The judge. A gate on messages crossing a boundary that can pass, redact, hold or refuse, with a hold queue a human can review and a refusal carrying categories and a reason. Our judge console is this gate.
5. Hibernation and wake. The drone agent sleeps between jobs and is woken by a job message.

Optional: drone agent in Claude Code, lessor agent in Codex, talking over swarm. Two companies, two harnesses, one market. Only if the CLI installs in thirty minutes.

Spec details to copy: preamble text, the relay-message block and attribute order, escaping of framing tags inside bodies, a 64 KiB body limit, per contact rate budgets. Source: https://scp.dev/spec.md

### Autoresearch (github.com/karpathy/autoresearch)

A three file loop: a frozen eval the agent cannot edit, a file the agent edits, and a markdown file of instructions. Propose, run, keep if the metric improves, revert if not, git records everything. We apply it to the drone agent's business strategy (job acceptance, scheduling, charging windows) against a held out week of simulated demand, with the reserve rule as a hard constraint. Not to risk pricing and not to turning incidents into tests, which is CoverAI's ground.

Why judges care: the field's evals are written by the people who wrote the code. A frozen held out eval plus a git history of what the agent tried and kept is honest evidence nobody else has. Caveat on the slide: metrics can be gamed, so the eval stays frozen and a human reviews kept changes.

## Market, losses and where the money is

Checked 19 October 2026 against public sources. Estimates are marked as estimates.

### How big is the market

- The drone slice alone is small today. Meituan has completed about one million drone deliveries in total by mid 2026, across roughly 60 routes in Shenzhen. At a premium of one or two yuan per flight that is a market of one or two million yuan a year. Nobody gets rich insuring food drones yet.
- The low altitude economy around it is huge and policy driven. The Civil Aviation Administration says the sector hit its 1.5 trillion yuan target for 2025 and projects 3.5 trillion by 2035. Other analysts put 2025 closer to 0.9 to 1 trillion. Drone logistics was 58 billion yuan in 2023. This is the slide one number.
- Per flight insurance already exists, but for humans. SkyWatch and Thimble sell hourly cover at about 5 to 25 US dollars per flight hour for one million dollars of liability, through an app a pilot fills in. The product is proven. What does not exist is the machine buying it, the insurer pricing it per flight from telemetry, and the claim settling itself.
- The real market is liability for autonomous agents. This is the part the judges will care about. Armilla launched an AI liability policy at Lloyd's in 2025. Munich Re's HSB added small business AI cover in 2026. On the other side, standard exclusions for AI losses took effect in January 2026 and big carriers are stapling them onto general liability policies. An industry report co-authored by researchers from Anthropic and OpenAI estimates over 90 percent of insurers' agent exposure sits in policies never designed for it. There is a gap, and the bond plus insurer agent is a mechanism for exactly that gap.

### How many crashes

No delivery operator publishes a crash rate. The best public figure is a 2018 reliability review putting drone failures at about one per 1,000 flight hours, against one per 100,000 for commercial aviation. For a fifteen minute delivery that is one failure per 4,000 flights, so Meituan's million deliveries would imply a few hundred incidents. That is an order of magnitude estimate from an old source, not a fact. It is enough to show the insurer agent has real losses to price and the claim path gets exercised.

### Where the money actually is

Not the premiums on drones. Four places, in order:

1. The bond rail. Every agent that moves money will need to post a bond before a counterparty trusts it. The operator of that rail earns a fee on every bond and the yield on the float. This is the KYC of the machine economy.
2. Settlement. Parametric claims settled from signed telemetry remove the claims handler. Insurers pay for that cost cut, and it is where WeBank style fintechs make margin.
3. Risk data. The attack registry and the loss history of every agent are a credit bureau for machines. Insurers, platforms and banks pay for the score. This is also the part that compounds.
4. Take rate on agent to agent transactions. Every cover bound through the market pays a small fee, like an exchange.

### Can it generalize beyond drones

Yes, and that is the pitch. The drone is the demo because it is visual, local and has a clean telemetry oracle. The product is an accountability and insurance rail for any autonomous actor that moves money, can cause a loss, and produces signed data. In Shenzhen alone:

- Electric taxis and robotaxis, per trip cover from vehicle telemetry
- Industrial robots on hire purchase, which is idea 27 with a breakdown cover attached
- Port AGVs and delivery robots in Yantian and the logistics parks
- Pure software agents: a procurement agent or a payment agent posts the same bond and buys the same cover, and the audit log is the telemetry

One sentence for the deck: drone today, every autonomous agent tomorrow. The bond is how a machine proves it can be trusted with money.

### Sources

- https://research.nus.edu.sg/eai/wp-content/uploads/2026/02/EAI-Background-Brief-No.-1874-The-Rapid-Rise-of-Chinas-Low-Altittude-Economy.pdf
- https://www.chinadaily.com.cn/a/202509/16/WS68c89f79a3108622abca0e79.html
- https://baike.baidu.com/en/item/Meituan%20Drone%20Delivery/5199940
- https://lowaltitudeeconomy.aero/en/evtol-news-and-electric-aircraft-news/cargo-drones/meituan-fourth-generation-drone-caac-national-full-territory-logistics-license
- https://www.skywatch.ai/blog/on-demand-drone-insurance-pay-per-flight-or-monthly
- https://dronegearhq.com/guides/drone-insurance/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6165073/
- https://www.pearlhealth.com/blog/the-missing-market-why-agentic-ai-needs-its-own-insurance-ecosystem
- https://www.insurancebusinessmag.com/us/news/technology/insurers-face-hidden-ai-liability-as-agent-risks-multiply-582433.aspx
- https://zylos.ai/research/2026-07-10-ai-agent-liability-insurance-underwriting/
