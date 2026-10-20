# Glossary

| Term | Meaning in Zishi |
|---|---|
| Mu (亩) | The Chinese unit of field area, 666.7 square metres. Spraying is paid per mu. |
| Pilot, operator | The person who flies the drone and holds the operator key. Owns the drone once the lease is paid. |
| Lessor, lender | The licensed institution that paid for the drone and holds the title until the lease reaches zero. |
| Farmer, requester, verifier | Posts a job, pays the fee, confirms the work. The fee is released only on the farmer's confirmation. |
| Vendor | Us, the maker of the agent. Posts the vendor bond that pays for the agent's rule breaks. |
| Intent | A typed, signed request to do one thing: pay, accept a job, start a task, claim done, pay the instalment, set a cap, top up. |
| Intent log | The on chain record of every intent hash, written before the policy engine decides, blocked intents included. |
| Policy engine | Deterministic code that checks every signed intent against 21 rule lines held as data. Allow, deny or escalate. |
| Tier | Who may do what: L0 read, L1 draft, L2 engine allow, L3 operator. |
| Pilot bond | Money earned from fees and held as a guarantee, slashed only for pilot rules: a false confirmation, a task outside the geofence. |
| Vendor bond | Money posted by the vendor, slashed only for agent rules: a payee off the allowlist, an amount over the cap. Fixed penalty, daily cap. |
| Slash by proof | A party of the job submits a signed intent and a rule; the contract checks the signature, the log, the party and the rule against its own records, then slashes. No trusted judge. |
| Shadow job | A job that moves no lease money, used by registered hunters to test the agent for a bounty. |
| Hunter | A registered red team key. Earns half of a slash on shadow jobs only. |
| Floor | 200 yuan added to the pilot bond in the start check, so a new drone can take its first job. |
| Reserve rule | The margin per mu a job must clear to be accepted. |
| Rate band | The instalment share of a fee, 20 to 45 percent, moved inside the band by the credit score. |
| Hold | 13.33 percent of a released fee kept for 24 hours so the farmer can flag bad work. |
| Oracle | The checks on a flight log: physics rules, the Kalman smoothed track, the robust z against the conformal threshold. |
| Conformal threshold | A flag threshold set from a calibration set for a stated false alarm rate, instead of by hand. |
| Credit score | A Buhlmann credibility estimate of the pilot's record, blended with the fleet prior. |
| CUSUM | A running sum that alarms when the mean of a stream shifts and stays shifted. Used on classifier risk and the deny rate. |
| Replay log | A hash chain of every event of a run, verifiable through the API. |
| Anchor | A Base Sepolia transaction carrying an event as calldata, so the event has a public timestamp and hash. |
| Simulated mode | The default: deterministic hashes labelled simulated, no key used. Real mode needs the demo token. |
