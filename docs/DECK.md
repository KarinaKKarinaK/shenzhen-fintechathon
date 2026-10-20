# Zishi 自食其力, software that lets machines pay for themselves

Pitch deck text, twelve slides, under ten minutes. The slides are `docs/Zishi_Pitch_Deck.pptx` (speaker notes inside) and `docs/pdf/Zishi_Pitch_Deck.pdf`, both built by `python web/scripts/deck.py`. Amounts in yuan.

## 1. Title

Zishi 自食其力. A wallet for a drone on hire purchase. The AI participates, the money rules live in code. 2026 Shenzhen International FinTech Competition (FinTechathon), International Track, Topic F: AI as a Financial Participant. Built on WeBank's FISCO BCOS and FATE.

Live demo: zishi-fintechathon.vercel.app

## 2. The pilot

More than 200,000 agricultural drone pilots in China. A spraying drone costs about 55,000 yuan and earns 3 to 15 yuan per mu. A pilot with nothing to pledge cannot get a loan, because the lender cannot see the work. The drone sits in a showroom. The field waits.

## 3. The machine is the borrower

Earn: the drone earns per mu sprayed; the farmer locks the fee first and confirms the work. Repay: each fee splits by rule, an instalment inside a 20 to 45 percent band, a rail fee, a bond top up, the rest to the pilot. Own: at zero the title moves on chain to the person who flew it.

## 4. One drone, five moments

A job declined on economics, an instalment paid, a faked flight log held, a slash by proof, the title transferred. Every step is a signed event on the screen. Press Start on the Fleet page.

## 5. Ask the agent why

The pilot asks why a job was declined. The agent answers from the engine's numbers: a 60 yuan fee leaves 22.8 yuan, the reserve rule needs 30, the break even is 3.7 yuan per mu. Asked to lower the reserve, it says no: that needs the operator key and the lender. The model only words the answer, free models only, template text without a key. The person affected can ask why (PIPL Article 24).

## 6. The model drafts, code decides the payment

Four tiers on every signed intent: L0 read and L1 draft for the model, L2 pay inside caps and allowlists for the machine key, L3 the operator's physical button. 21 policy rule lines. 52 of 52 attacks blocked, 7 of 7 benign messages pass, a naive wallet falls to 51 of 52. The classifier alone holds 13 of 52; the rules and the policy do the rest.

## 7. Two bonds, slashed only by proof

Pilot bond, earned from fees, slashed for the pilot's own cheating. Vendor bond, 5,000 yuan posted by us, slashed for the agent's mistakes. The pilot never pays for the AI. A slash needs a signed intent in the on chain log that breaks a rule the contract can check against its own records. Only a party of the job can submit. No trusted judge.

## 8. One loop, two ledgers

26 of 26 contract calls on FISCO BCOS from one engine fleet run: the lender paid 650 yuan through Lease, the vendor bond 5,000 to 4,800 by proof, the lease at 0, the title to the pilot (`web/evidence/fisco/settled-run-*.json`). 9 of 9 contract calls in one full job on the deployed contracts on Base Sepolia, with real value. 267 of 267 receipts re-fetched by `pnpm verify:all`. Four contracts source verified on Sourcify; 15 of 15 intents sent to both chains in the same step with the same hash.

## 9. Built on WeBank's stack

FISCO BCOS 3.16.3 runs the same four contracts as the lender's ledger; 30 of 30 intent hashes read back equal the engine's; the agent bound IntentLogV2 fixes front running. FATE 2.2: three lenders train one credit model with no raw records shared, AUC 0.729 alone to 0.782 federated, the same as pooling; a new pilot's rate error drops from 335 to 153 basis points. The FATE model's sha256 is committed to the FISCO IntentLog.

## 10. Security and compliance

Actor keys random per server instance, in memory; the model process holds none. IntentLogV2 accepts a commit only from the job's agent (on FISCO; the Base Sepolia v1 is still open). 84 Foundry tests, 15 contract layer attacks among them. 0 open findings of medium or higher (Slither with 42 triaged, pnpm audit, gitleaks). PIPL Article 24 and hashes only on chain; NFRA, a licensed leasing company is the lessor; PBoC, fees settle through licensed rails or e-CNY; CAAC, a licensed pilot and a real name registered drone.

## 11. Measured, not asserted

72 of 72 tampered flights held (95% interval 94.9 to 100%). Oracle false alarm 3.0%, 13 of 428 (1.8 to 5.1%). Classifier accuracy 93.1% on 87 held out messages, precision 100% (26 of 26), recall 81.3% (64.7 to 91.1%). Lender p95 loss 25,593 to 19,739 yuan with the two bonds. Track feature false alarms 13.8% to 0.0% after Kalman smoothing. Fixed seeds, synthetic data labelled as such. None of these components can sign, pay or move a cap.

## 12. Honest about what is real, and next

Real today: contracts deployed and verified on Base Sepolia, full jobs with value on Base and FISCO, real FATE training, free models live in the public app. Still simulated: in the public engine Bond, JobBoard and Lease run in TypeScript mirrors; FISCO is one local node in Docker; telemetry is synthetic and signed by demo keys.

Next: one licensed lessor pilot with ten drones, real flight logs through the same oracle, a FISCO BCOS node run by the lessor, a secure element on each drone. Then any machine with verifiable paid work: delivery drones, robot arms, robotaxis.

Live demo: zishi-fintechathon.vercel.app. Repo: github.com/KarinaKKarinaK/shenzhen-fintechathon. Licence PolyForm Noncommercial 1.0.0; the deployed contracts stay MIT.
