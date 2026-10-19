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

## Market, losses and where the money is

Checked 19 October 2026. Estimates are marked.

### Market

- The drone slice alone is small today. Meituan has completed about one million drone deliveries in total by mid 2026 across roughly 60 routes in Shenzhen. At one or two yuan of premium per flight that is one or two million yuan a year.
- The low altitude economy around it is large and policy driven. The CAAC says the sector reached its 1.5 trillion yuan target for 2025 and projects 3.5 trillion by 2035. Other analysts put 2025 at 0.9 to 1 trillion. Drone logistics was 58 billion yuan in 2023.
- Per flight insurance exists for human pilots. SkyWatch and Thimble sell hourly cover at about 5 to 25 US dollars per flight hour for one million dollars of liability through an app. The product is proven. The machine buying it, the insurer pricing it per flight from telemetry, and the claim settling itself do not exist.
- The real market is liability for autonomous agents. Armilla launched an AI liability policy at Lloyd's in 2025. Munich Re's HSB added small business AI cover in 2026. Standard AI exclusions took effect in January 2026 and large carriers are adding them to general liability. An industry report co-authored by researchers from Anthropic and OpenAI estimates over 90 percent of insurers' agent exposure sits in policies never designed for it.

### Losses

No delivery operator publishes a crash rate. A 2018 reliability review puts drone failures at about one per 1,000 flight hours against one per 100,000 for commercial aviation. Estimate: for a fifteen minute delivery that is one failure per 4,000 flights, so a million deliveries implies a few hundred incidents. Old source, order of magnitude only.

### Where the money is

1. The bond rail. Every agent that moves money needs a bond before a counterparty trusts it. Fee per bond plus yield on the float.
2. Settlement. Parametric claims from signed telemetry remove the claims handler. Insurers pay for the cost cut.
3. Risk data. The attack registry and each agent's loss history are a credit bureau for machines. Insurers, platforms and banks pay for the score, and it compounds.
4. Take rate on every cover bound through the market.

### Beyond drones

The drone is the demo: visual, local, clean telemetry. The product is an accountability and insurance rail for any autonomous actor that moves money, can cause a loss, and produces signed data. In Shenzhen: electric taxis and robotaxis per trip, industrial robots on hire purchase with breakdown cover (idea 27), port AGVs and delivery robots, and pure software agents where the audit log is the telemetry.

Deck line: drone today, every autonomous agent tomorrow. The bond is how a machine proves it can be trusted with money.

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
