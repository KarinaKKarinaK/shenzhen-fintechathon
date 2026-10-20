# Security

## Reporting

If you find a way to move money the policy engine should have blocked, to slash a bond without a valid proof, to make the model name a payee, or to spend the demo wallet without the demo token, open a private security advisory on the repository or write to the maintainers listed in `LICENSE`. Say what you did, what you expected and what happened. We answer within two days during the competition.

Please do not drain the demo wallet. It holds test ETH only, and every anchor it sends is public.

## What is in scope

- The policy engine (`web/src/engine/policy.ts`) and its mirrors (`web/src/engine/contracts.ts`)
- The gate (`web/src/engine/framing.ts`, `web/src/engine/ml/gate.ts`)
- The contracts in `contracts/src`, deployed at the addresses in `contracts/deployments/base-sepolia.json`
- The public API routes under `web/src/app/api`

## What is not

- The synthetic data sets. They are labelled as synthetic and not a claim about real drones or real attackers.
- The in memory rate limiter. It is best effort per server instance; the demo token guards the funded key.

## Where the analysis lives

- `SELF_ASSESSMENT.md`: risks, what is built against each, what production would do
- `docs/RED_TEAM.md`: the attack set, the benign set and the naive baseline, run at generation time
- `docs/INCIDENT_RESPONSE.md`: what happens when a key is lost, a log is held, a bond is slashed or the drift monitor alarms
