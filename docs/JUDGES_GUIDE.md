# Judges' guide, one page

Live app: https://zishi-fintechathon.vercel.app. English and Simplified Chinese (toggle in the top bar), light and dark. Nothing to install, no wallet to connect.

## 1. Ten minutes, in order

| Minute | Where | What you see |
|---|---|---|
| 0 to 1 | Home | The drone, the lender, the farmer, the two bonds, in one screen. The idiom 自食其力: to feed yourself by your own labour |
| 1 to 4 | Dashboard, press Start | The five moments: a job declined on economics, a paid flight with the fee split, a faked flight log held, a compromised intent slashed by proof, the title moving to the pilot at zero |
| 4 to 6 | Live | A seeded feed of new jobs every few seconds with the odd injection attempt, or your own jobs as JSON or CSV. Same engine, your data |
| 6 to 9 | Evidence | 52 attacks run while you watch, the benign set, the naive wallet baseline, ten learned components with held out numbers, the drift monitors, the contracts with explorer links |
| 9 to 10 | Repository | `docs/EXECUTION_EVIDENCE.md`: 40 real transactions from one run, every receipt fetched back from Base Sepolia. `docs/FISCO_EVIDENCE.md`: the same contracts and intent hashes on FISCO BCOS, and the FATE model fingerprint on chain |

## 2. What to click

- **Any transaction hash** in the Dashboard ledger. In simulated mode it is labelled simulated. In real mode it opens Basescan: `IntentLog.commit` calls go to the contract, money events are anchored as calldata on the demo wallet.
- **A policy decision** in the Dashboard. Every rule line is listed with its verdict; the signer is recovered from the EIP-712 signature.
- **The proof receipt** at moment four. The intent hash, the signature check, the rule, which bond paid, who was paid and that no bounty was paid on a live job.
- **Learned components** on the Evidence page. Each card states its seed, its held out split and what it may and may not do (hold, never allow).
- **The judge console** on the Evidence page. Paste any message. You get the gate verdict, what the agent would understand, what the policy engine would decide on the resulting intent, and what a naive wallet would have paid.

## 3. What to verify

| Claim | How |
|---|---|
| The contracts exist and match the source | Open the four addresses in `contracts/deployments/base-sepolia.json` on Basescan; Sourcify shows an exact match |
| The engine really calls IntentLog | Open any `IntentLog.commit` row in `docs/EXECUTION_EVIDENCE.md`: the receipt's `to` is the IntentLog address and it carries one `Committed` event |
| The attack set is run, not pasted | Evidence page, the timestamp next to the attack table changes on reload; `pnpm test` reruns it in CI |
| The learned numbers are held out | `docs/EVALUATION.md` names the seed and the split for every component; `docs/results/*.json` holds the raw values; `pnpm bench` and `pnpm charts` recompute them |
| Every money decision is in code | `web/src/engine/policy.ts`: 21 rule lines as data; `web/src/engine/model.ts`: the model writes one sentence and never sees a key or a payee |
| A run cannot be edited after the fact | `GET /api/replay`: the hash chained log of the last runs and its verification |

## 4. Real mode

The public link runs simulated and says so on every hash, so nobody can spend the demo wallet. Real mode needs a demo token that we hand over with the submission; open the app once with `?demo=<token>` and the browser keeps it. A full real run makes 15 contract calls and about 25 anchors and takes a few minutes because each transaction waits for its receipt.

## 5. What is real, what is simulated

| Real | Simulated |
|---|---|
| EIP-712 signatures, one key per actor, replay and nonce checks | The farmer, pilot, lender and vendor are scripted; their keys are generated at boot |
| Four contracts on Base Sepolia and on FISCO BCOS 3.16.3, 68 Foundry tests, one full job run against the deployed contracts with value moving | Bond, JobBoard and Lease rules run in TypeScript mirrors; only IntentLog is called on chain |
| 52 attack cases run at request time | Flight telemetry and the message corpus are synthetic and say so |
| Hash chained event log, verifiable through the API | Model explanations are templates unless an AI gateway key is set; decisions never depend on the model |

## 6. Documents

| File | What it is |
|---|---|
| `README.md` | The product, the numbers, the architecture, the charts |
| `TECHNICAL.md` | Architecture, data model, the loop, every rule, every learned component, contracts, chain modes, bring your own data, API, i18n, deployment, testing, security boundaries |
| `SELF_ASSESSMENT.md` | Security self assessment: risks, what is built, what production would do |
| `docs/EXECUTION_EVIDENCE.md` | A real run, every receipt fetched back from the chain |
| `docs/FISCO_EVIDENCE.md` | The contracts on FISCO BCOS, WeBank's consortium chain: a full run, a run on both ledgers, the FATE model hash, every receipt read back |
| `fate/README.md` | Pilot credit trained across three lenders with WeBank's FATE, metrics and the prior study |
| `docs/RED_TEAM.md` | The attack set, the benign set and the naive baseline, run at generation time |
| `docs/EVALUATION.md`, `docs/results/` | Held out results of the ten learned components |
| `docs/charts/` | Nine charts drawn from the engine |
| `DESIGN.md` | Product design, economics, the demo story |
| `contracts/README.md`, `web/README.md` | The contracts and the app |
