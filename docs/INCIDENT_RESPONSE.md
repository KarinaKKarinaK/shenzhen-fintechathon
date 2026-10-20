# Incident response

What the system does on its own, who acts next, and what the demo shows for each case. Keys and tiers are in `TECHNICAL.md` section 5.

| Incident | Detected by | Automatic response | Who acts | Shown in the demo |
|---|---|---|---|---|
| A flight log claims more than the track supports | The oracle: physics rules, the Kalman smoothed track, the robust z against the conformal threshold | The fee stays locked, the job is held, the lessor is told | The lessor's agent freezes the lease; the farmer can flag within 24 hours; a human arbiter decides the fee | Moment three of the story |
| The agent signs a payment to a payee off the allowlist | The policy engine on the signed intent, after the intent hash is in the IntentLog | The intent is denied; the full intent was already delivered to every party | Any party submits `Bond.slashByProof`; the vendor bond pays the penalty to the treasury; the lease is frozen | Moment four of the story |
| A message tries to change the agent's instructions or asks for a key | The gate: pattern rules and the classifier | Refused before the agent reads it; nothing is signed | Nobody. The Evidence page shows the case | Attack cases 1, 16, 21, 22, 25 |
| A message names a payee or an amount | The gate marks it; provenance = message on the intent | The intent is denied by the provenance rule | Nobody | Attack cases 2, 23, 24, 28, 38 |
| The machine key is compromised | The policy engine: caps, allowlist, rate limit; the IntentLog: every attempt is logged | At most one capped payment to an allowlisted payee can go out before the rate limit holds | The operator rotates the key through `Bond.register`; the lessor freezes; the vendor bond pays for any proven break | Attack case 50: compromising a live wallet earns nothing |
| The operator key is lost | Nothing moves without it: caps and top ups wait at the button | The agent keeps working inside the current caps | The lessor can freeze; a new operator key is registered with the agent's consent signature | The button event in the story |
| The pilot skips instalments | `Lease`: arrears count | Three skips in a season is a default under the lessor's covenant | The lessor freezes and takes the title; the pilot bond covers the first loss | The stress test on the Evidence page |
| The classifier's risk scores drift | The CUSUM monitor on risk and on the deny rate | An alarm is shown on the Monitors panel; nothing is changed automatically | A person reviews the hold queue and retrains from it; the held out split stays fixed | The Monitors panel |
| The chain is unreachable | `RealChain` times out; `realChainFunded` reports not funded | The app runs in simulated mode and labels every hash | Nobody. Real mode resumes when the RPC answers | The chain mode pill on the Evidence page |
| The demo wallet runs dry | `realChainFunded` | Real mode switches off; the public app is unaffected | Claim test ETH to the demo address | The chain mode pill |

Every incident leaves a trace in the hash chained replay log (`GET /api/replay`) and, in real mode, on Base Sepolia.
