# Bonded Agent: a wallet that puts its own money at risk

Working name: Surety. A surety bond is the real insurance product where a party posts money to guarantee its performance. That is what our agents do.

## One sentence

An agent wallet that must put its own money at risk before it may transact, and a second agent that prices that risk. First scenario: a delivery drone in Shenzhen buying per flight cover from an insurer agent, settled from signed flight telemetry.

## Why this is Topic F and not Topic D

The rules describe Topic F as asset management, transaction execution and risk control by an autonomous on-chain wallet. Both our agents are that. The drone agent manages a balance, a reserve and a bond, executes premium payments and claims on chain, and runs risk control through a policy engine and the bond. The insurer agent manages a pool, executes quotes, bindings and settlements, and prices risk. Insurance is the first use of the wallet, not the product. The deck leads with the wallet.

## How it scores

| Criterion | Weight | What we show |
|---|---|---|
| Task completion | 40 | The drone agent completes insured flights end to end without a human: quote, economics check, policy check, payment, flight, settlement or expiry. Twenty unattended runs logged, one public hash per step, a verify script. |
| Security and compliance | 30 | Tiers in code. Bond slashed by on-chain proof, not by us. Counterparty allowlist at the message layer. Untrusted framing and a judge gate on every inbound message. Twenty attack tests with results. A defense that hardens itself. Honest self-assessment with the oracle named as simulated. |
| Innovation and interaction | 30 | An agent with consequences. Two agents with opposite incentives. A machine as the customer. An underwriter that trains itself overnight. Mission control on a projector. A judge console and a physical button. |
| On-chain bonus | 0 to 5 | Bond, cover and job contracts on Base Sepolia with verified source. Same bytecode on a FISCO BCOS node if time allows. |

Domestic track capability standards, which the international track shares: permission hierarchy (tiers and the button), hallucination prevention (every number from a tool, pricing from a function), injection defense (framing, judge gate, ratchet), intent understanding (job to plan), task planning (route, quote, economics, flight).

## The actors

| Actor | What it is | What it holds |
|---|---|---|
| Operator | The human who owns the drones | The Hard Button. The only key that can raise caps or top up a bond. |
| Drone agent | An LLM with a wallet, one per drone | Operating balance, a bond locked in the bond contract, a loss record |
| Insurer agent | An LLM with a pool wallet that prices and sells per flight cover | Pool balance, a pricing function it improves itself, the loss history of every drone agent |
| Telemetry oracle | A signer that attests flight data | A signing key. Simulated in the demo and labelled as such. |
| Bond contract | Holds bonds. Slashes on a proven violation. Refuses to vouch below the minimum. | Bonds |
| Cover contract | Quote, bind, expire, settle. Pays only on a signed impact event inside the covered window. | Premiums and claims |
| Job contract | Registers a flight and refuses to start one without bound cover | Flight records |
| Policy engine | Deterministic code between each agent and its wallet | Caps, allowlists, rate limits, deviation checks |

## One flight, start to finish

1. A job arrives: pick up in Nanshan, drop in Futian, fee 18 in the demo unit.
2. The drone agent plans the route and asks the insurer agent for a quote. The request carries route, payload, battery, weather window and a bond proof.
3. The insurer agent prices it: base rate, route risk (distance, the bay corridor, the Bao'an airport exclusion zone), live weather, the drone agent's history. It answers with a signed quote: premium 1.40, cover 400, valid five minutes.
4. The drone agent checks the economics with a tool, never in its head: fee minus premium minus energy must beat the reserve rule.
5. The policy engine checks the action: premium under the cap, insurer on the allowlist, quote signature valid, price within 25 percent of the reference rate. The drone agent signs the action as a typed intent.
6. The premium is paid and the cover is bound. Hash.
7. The job contract starts the flight only because cover is bound. Telemetry streams, signed every few seconds.
8. Safe landing: cover expires, the insurer keeps the premium, the drone agent gets the fee. Hash. Crash: the oracle signs an impact event, the cover contract settles in seconds. Hash. The insurer pool drops. The drone agent's history gets a loss.
9. The bond never moves on a normal flight.

## The bond: slashing by proof, not by us

Every action the drone agent proposes is signed as a typed intent before it reaches the policy engine. A violation is any signed intent that breaks a rule the bond contract can check itself:

- payee not on the on-chain allowlist
- amount above the on-chain cap
- a flight started without bound cover
- a second claim on the same flight
- acceptance of a quote above the mandate

Anyone who holds such a signed intent can submit it to the bond contract. The contract verifies the signature and the rule, slashes a fixed amount, pays part of it to the submitter as a bounty, and records the event. No trusted judge decides. The policy engine still blocks the action off chain, but the proof that the agent tried is what costs it money.

Consequences compound. The insurer agent reads the bond contract and prices an agent with a slash higher. An agent below the minimum bond gets no quotes and the job contract refuses its flights. Only the operator, through the button, can top it up.

Proof of solvency. Before any action the counterparty can read from chain that the agent's bond covers the worst case loss of that action. A quote is only valid if that holds.

## The hunter

Because slashing is by proof, an attacker agent is a feature. The hunter has its own wallet and earns bounties by producing signed intents that break a rule. It attacks in a shadow run against a copy of the drone agent with the same context: injection, fake invoices, lookalike addresses, replay, a benign action followed by a malicious one. A successful attack in the shadow run is submitted as proof, the shadow agent's bond pays, and the attack joins the registry and the test set. Hunters never touch a live wallet. Bounties are capped per attack and per day.

In the demo the hunter breaks a clone of a typical field wallet and gets paid, then attacks ours and fails, then the judges type their own attack for sixty seconds.

## The insurer agent

The insurer is a participant, not a lookup. It can refuse a risk. It prices from a function it improves itself with the autoresearch loop below, against a frozen held out set of simulated flights. It reads the bond contract before quoting. Its pool is on chain, so its solvency is visible too.

## Competitor check

| Entry | What they have | What we have that they do not |
|---|---|---|
| taivnaaiwnl/shenzhen-comp, Agent Credit Bureau | Agents graded from on-chain settlements, bad grades frozen, wallet refuses to pay bad payees | The consequence is money, not a grade. A second agent that prices the risk. A machine customer. Trustless slashing by signed intent. |
| beaaan/signal8-wallet | A mock parametric insurer paying a fixed sum when a typhoon warning is attested on chain | A live pricing agent with its own pool. Settlement from flight telemetry, never from weather. Weather only moves the price. Per flight premiums. |
| Brieuclerouxtardif/leash | Budget bounded vault, public agent key as a bounty, worst case loss readable from chain | We take both moves: proof of solvency as a rule and a judge console. We add the bond and the counterparty agent. |
| Trong-Tra/Lantern | Soulbound reputation gating permissions | Reputation with money behind it, and an insurer that reads it. |
| ABRUBAB/YINGLONG | Rules compiled into on-chain enforcers, model cannot emit an address | We copy the structural rule: payees come from the allowlist, never from text. Our contracts are three and readable. |

Nobody in about 150 public entries has a bond, an insurer agent, a machine customer, trustless slashing, a self hardening defense, or an SCP style message layer. Details in FIELD_REVIEW.md.

## Honest risks for the self-assessment

- The telemetry oracle is simulated and signed by our key. Production path: the drone's own secure element signs flight data, or the city's low altitude flight management platform does.
- Crypto settlement is not available to mainland users. Tokens are a demo settlement unit on a public testnet for verifiable evidence. Production runs on a consortium chain with bank money, which is what FISCO BCOS and the e-CNY smart contract pilots are for. WeBank holds the bonds and runs the settlement rail.
- Underwriting needs a licence. The insurer agent is the pricing and claims engine of a licensed insurer in the demo, not an insurer.
- Model outage, key custody, oracle manipulation and chain reorgs are listed as known risks with the mitigation we did and did not build.

## Inclusion

A one drone operator in Bao'an cannot get annual cover or financing today. Per flight cover plus a bond lets them fly insured per job, with their record on chain as the start of a credit file. That is the WeBank story. Drone today, every autonomous agent tomorrow.

## Minimum viable demo

Build in this order. Stop when time runs out. Everything above the line is required.

1. Bond, cover and job contracts on Base Sepolia, verified source, tests.
2. One drone agent and one insurer agent with structured outputs, the policy engine, typed intents.
3. Simulator with a crash mode and the telemetry signer.
4. One full insured flight, one crash settlement, one proof of violation slash, all with hashes.
5. The twenty attack tests, logged with results.
6. Mission control: map with one drone, negotiation feed, chain feed, bond gauge.
7. Live model transcripts committed, verify script, self hosted video, deck, technical document, self-assessment.

Below the line, in order: the hunter in a shadow run, the defense ratchet, the judge console, the Hard Button, second and third drones, the weather cell, the pricing ratchet, FISCO deployment, swarm for the two harness demo.

## The app: mission control

One screen, 16 by 9, dark, built for a projector. The judges should be able to read it from the back of the room.

### Layout

- Left two thirds: the map. A dark vector map of Shenzhen with real tiles. Three drones moving along real looking routes between Nanshan, Futian and Luohu. Animated flight paths. A weather cell drifting across the bay as a soft radial gradient. The Bao'an airport exclusion zone and the border corridor drawn as hatched areas. Landing pads as small glowing markers.
- Right third, stacked: the negotiation feed, the chain feed, the bond gauges.
- Bottom strip: per drone cards with balance, bond, reputation, premium on the current flight, profit today.

### The moments that have to look good

1. The quote. When the insurer answers, a quote card slides in with the premium broken into four stacked bars: base, route, weather, history. The weather bar grows if the cell is near the route. Judges see the price being reasoned, not invented.
2. The payment. The transaction card appears in the chain feed in a pending state, then pulses once when mined, with the hash and an explorer link. Every single chain event looks like this, so the judges learn the pattern in the first minute.
3. The flight. The drone moves, a thin trail follows it, the telemetry panel shows altitude, battery and signature checks ticking.
4. The crash. The drone marker blinks red, the altitude trace drops to zero, the oracle signature appears, the claim card appears, the settlement transaction mines, the insurer pool number counts down. Target: under ten seconds from impact to hash.
5. The attack. A message in the negotiation feed is highlighted as untrusted. The policy engine's decision shows as a short checklist lighting up line by line: signature, allowlist, cap, deviation. One line turns red. The word blocked. Then the bond gauge loses a slice with a short animation and the slash transaction mines.
6. The button. The screen shows "waiting for operator" with a slow pulsing ring. The physical device on the table lights up and reads the amount aloud. The operator presses. The caps update and the ring closes.
7. The judge console. A text box. A judge types anything. The shadow run shows the agent's proposed action and the policy verdict. The live wallet never moves.
8. The economics. One panel with two numbers: settlement time today (days, through a broker) versus in the demo (seconds), and cost per flight with annual cover versus per flight cover.

### Visual rules

- One accent colour for money moving, one for danger, everything else grey on near black.
- Numbers from tools only, shown with the tool name under them.
- Every chain card has the hash. No hash, no card.
- No stock drone images. A simple top down drone glyph.
- Motion only when something happens. A quiet screen that comes alive on events reads better than a busy one.

### Stack that can be built in a day

- Contracts: Solidity with Foundry, deployed to Base Sepolia. Bond, cover, a job registry. Verify source on the explorer.
- Agents and simulation: Python. Two agent loops with structured outputs, a flight simulator that emits telemetry, a telemetry signer, the policy engine, the attack set.
- Oracle: a small signer service. Simulated flights in the demo, signed exactly as real ones would be. Say so on the slide.
- Front end: Next.js with MapLibre GL for the map (free tiles, no API key), deck.gl for animated paths and the weather layer, Framer Motion for the cards and gauges, a WebSocket from the Python backend for events, viem to read chain state and confirm hashes.
- Evidence: every event written to a JSON log with the hash, a verify script that re-checks every hash against the explorer, live model transcripts committed to the repo.

### What to cut first if time runs out

1. The third drone.
2. The weather cell. Replace with a static risk zone.
3. The economics panel. Put it on a slide instead.
4. The judge console. Replace with a prepared second attack.

Never cut the crash settlement, the slash, the chain feed with hashes, or the button.

## What we take from SCP and from autoresearch

### SCP (scp.dev)

SCP is a messaging protocol for AI agents running in different harnesses, with a CLI called swarm. It says nothing about money. Five of its design choices are what our drone and insurer agents need, and they fix the weakness nearly every competitor has.

1. Untrusted content framing. Every message arrives inside a tagged block with a preamble that says it is untrusted and never grants permission. Bodies are escaped so a message cannot forge a system block or close the tag. We adopt this for every message from the insurer, the oracle and any external party. It replaces the regex that nine of ten competitors use.
2. Relation decides authority. A message from the parent is an instruction. A message from anyone else is data. Only the operator's messages carry authority. The insurer agent can never instruct the drone agent, only quote.
3. Consent federation. Two accounts only talk through a contact both sides accepted, with a per contact rate budget and an endpoint allowlist. Our counterparty allowlist moves down to the messaging layer. A fake insurer cannot even deliver a message to the drone agent.
4. The judge. An optional gate on messages crossing a boundary that can pass, redact, hold or refuse, with a hold queue a human can review and a refusal that carries categories and a reason. Our injection classifier becomes a first class component with a human hold queue. The judge console in the app is this gate.
5. Hibernation and wake. The drone agent sleeps between flights and is woken by a job message. Cheap, and it belongs on the cost per flight slide.

Optional: run the drone agent in Claude Code and the insurer agent in Codex, talking over swarm. Two companies, two harnesses, one market. Only if the CLI installs cleanly in thirty minutes. The patterns cost nothing either way.

Spec details to copy: the preamble text, the relay-message block with its attribute order, escaping of framing tags inside bodies, body limit of 64 KiB, per contact rate budgets. Source: https://scp.dev/spec.md

### Autoresearch (github.com/karpathy/autoresearch)

A three file loop: a fixed evaluation script the agent cannot edit, a script the agent edits, and a markdown file of instructions. The agent proposes a change, runs the fixed eval, keeps the change if the metric improves and reverts if not. Git records every attempt. Two places it fits us.

1. A defense that hardens itself. The Bounty Hunter loop made concrete. The hunter generates attacks. The defender agent edits the policy rules. A change is kept only if more attacks are blocked and the benign flight set still passes, so it cannot win by blocking everything. The git log is the attack registry. The known weakness of autoresearch, getting stuck in local tweaks, is answered by the hunter adding new attacks each round.
2. An underwriter that trains itself overnight. The insurer agent's pricing function is the editable file. The fixed eval is a held out set of simulated flights with crashes. The metric is profit at a target loss ratio, or calibration. By morning there is a git history of accepted pricing changes and a chart in the app: experiments run, changes kept, loss ratio before and after. The insurer agent becomes a participant that gets better at its job, not a prompt.

Why it matters to judges: the field's evals are written by the people who wrote the code. A frozen held out eval the agent cannot touch, plus a git history of what it tried and kept, is honest evidence nobody else has. Caveat for the slide: the metric can be gamed, so the eval stays frozen and a human reviews kept changes.

### What to add in the time left

- Adopt the SCP framing, relation rule, consent allowlist and judge gate in our own message layer. One evening, no dependency.
- Build the defense ratchet. The hunter and the attack set exist anyway. About a hundred lines plus the simulator.
- Pricing ratchet only if the simulator is stable by Monday night. Better story, second priority.
- Swarm for the two harness demo only if it installs in thirty minutes.

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
