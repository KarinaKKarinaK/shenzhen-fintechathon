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
