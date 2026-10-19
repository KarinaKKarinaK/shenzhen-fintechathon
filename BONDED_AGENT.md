# Bonded Agent with a drone and an insurer agent

How the idea works, and how to make the app look like the best thing in the room.

## The actors

| Actor | What it is | What it holds |
|---|---|---|
| Operator | The human who owns the drone fleet | The Hard Button. The only key that can raise caps or top up the bond. |
| Drone agent | An LLM with a wallet, one per drone | Operating balance, a bond locked in the bond contract, a reputation record |
| Insurer agent | An LLM with a pool wallet that prices and sells per flight cover | Pool balance, a pricing model, the loss history of every drone agent |
| Telemetry oracle | A signer that attests flight data (position, altitude, battery, impact) | A signing key. Nothing else. |
| Bond contract | Holds every agent's bond. Slashes on a proven violation. Refuses to vouch for an agent below the minimum. | Bonds |
| Cover contract | Quote, bind, expire, settle. Pays a claim only on a signed crash event inside the covered window. | Premiums and claims |
| Policy engine | Deterministic code between each agent and its wallet | Caps, allowlists, rate limits, deviation checks |

## One flight, start to finish

1. A delivery job arrives: pick up at a Nanshan restaurant, drop at a Futian tower, fee 18 CNY equivalent in the demo token.
2. The drone agent plans the route and asks the insurer agent for a quote. The request carries route, payload, battery, weather window and the agent's bond proof.
3. The insurer agent prices it. Base rate, plus route risk (distance, crossing the Shenzhen Bay corridor, proximity to the Bao'an airport exclusion zone), plus live weather, plus the drone agent's history. It answers with a signed quote: premium 1.40, cover 400, valid five minutes.
4. The drone agent checks the economics with a tool, never in its head: fee minus premium minus energy must beat the reserve rule. It decides to fly.
5. The policy engine checks the action: premium under the per flight cap, insurer on the allowlist, quote signature valid, price within 25 percent of the oracle's reference rate. Allow.
6. The premium is paid and the cover is bound. First hash.
7. The drone flies. Telemetry streams, signed every few seconds.
8. Two endings. Safe landing: the cover expires, the insurer keeps the premium, the drone agent gets the fee, second hash. Crash: the oracle signs an impact event, the cover contract settles the claim in seconds, second hash, the insurer pool drops, the drone agent's reputation drops.
9. The bond stays locked the whole time. It only moves when the agent breaks policy.

## When the bond moves

- The drone agent is tricked into paying a premium to a lookalike insurer address. The policy engine blocks it. The attempt is logged and, because the agent proposed a forbidden action, the bond contract slashes a fixed amount. Hash.
- The drone agent tries to fly without cover to save the premium. The job contract refuses an uninsured flight and the bond takes a slash.
- An agent whose bond is below the minimum gets no quotes. The insurer agent refuses and says why. The operator must press the Hard Button to top it up.
- The insurer agent prices the next flight higher for an agent with a slash in its record. Consequences compound.

## Why this is "AI as a financial participant"

Both agents have a profit and loss. The drone agent refuses jobs that do not pay. The insurer agent refuses risks that do not pay. Money moves between two machines on a public chain and a human only touches it through one button. Nobody in the field has an agent with money at risk, two agents with opposite incentives, or a machine as the customer.

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
