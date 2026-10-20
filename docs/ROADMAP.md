# Roadmap

What is built, what is next, and what it would take. Dates are targets, not promises.

## Built

- The engine: gate, planner, policy engine with 21 rule lines, intent log, two bonds, slash by proof, title transfer, ten measured components
- Four contracts on Base Sepolia, source verified, 44 Foundry tests; the engine calls IntentLog in real mode
- The app in English and Simplified Chinese: story, live feed, your own data, evidence page with the attack set run at request time
- The documents: official technical document, self assessment, execution evidence, red team report, evaluation, judges' guide

## Next three months

| Step | What | Needs |
|---|---|---|
| Contracts in the loop | The engine calls Bond, JobBoard and Lease through their ABIs instead of the TypeScript mirrors; the mirrors become the test oracle | A funded key per actor on the test network, about two weeks of work |
| Real flight logs | Signed logs from a real spraying drone through the same oracle, with the gap between synthetic and real reported | One pilot willing to share logs; a secure element or a signing dongle on the drone |
| A lessor in a sandbox | One licensed lessor as lender of record for ten drones, Zishi servicing the contract, repayment per mu reported weekly | A sandbox agreement; a bank money settlement rail |
| Consortium chain | Done locally: the four contracts run on a FISCO BCOS 3.16.3 node and the engine commits every intent there ([evidence](FISCO_EVIDENCE.md)). Next: a hosted node the public demo can reach, JobBoard windows in FISCO's millisecond time, bank money instead of demo units | A FISCO BCOS node with a public RPC, ideally the lender's own consortium group |

## Six to twelve months

- A second machine class on the same rail (a delivery drone paid per drop, or a robot arm paid per part), to show the engine is not drone specific
- AI liability insurance above the vendor bond, priced from the red team and drift data
- Retraining the classifier from the held queue on a schedule, with the held out split fixed across versions and an alert when F1 drops
- A remote lock on the drone as the lessor's last resort, behind the lender key only

## Not planned

- A token of our own. Settlement is bank money.
- Pricing risk from telemetry. Telemetry proves work happened; it does not set a premium.
