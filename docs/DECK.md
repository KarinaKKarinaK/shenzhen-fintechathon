# Zishi 自食其力, software that lets machines pay for themselves

Deck text, ten slides, under ten minutes. One idea per slide. Amounts in yuan.

## 1. Title

Zishi 自食其力. Software that lets machines pay for themselves.

A wallet for an agricultural drone on hire purchase. 2026 Shenzhen International FinTech Competition (FinTechathon), International Track, Topic F. Built on WeBank's FISCO BCOS and FATE.

Live: zishi-fintechathon.vercel.app

## 2. The pilot

Over 200,000 agricultural drone pilots in China. A drone costs about 55,000 yuan. Spraying pays 3 to 15 yuan per mu.

A pilot with nothing to pledge cannot get a loan. The drone sits in a showroom. The field waits.

## 3. What Zishi does

The drone earns per mu sprayed, confirmed by the farmer who pays.

Each fee repays the lender, fills a bond and leaves the rest to the pilot.

At zero the title moves on chain. The drone belongs to the person who flew it.

## 4. One task, seven steps

Plan, lock, check, work, confirm, repay, own. Every step is an event, and every event is on the screen.

Live demo, five moments in three minutes: a job declined on economics, an instalment paid, a faked flight log held, a slash by proof, the title transferred.

## 5. Money decisions are made in code, never by the model

Four permission tiers. The model reads and drafts. The machine key pays inside caps and allowlists. The operator's physical button holds the top.

21 rule lines in the policy engine, checked on every signed intent. Every number comes from a tool, never from message text.

## 6. Two bonds, slashed only by proof

Pilot bond, earned from fees, slashed for the pilot's own cheating.

Vendor bond, 5,000 yuan posted by us, slashed for the agent's mistakes. The pilot never pays for the AI.

A slash needs a signed intent in the log that breaks a rule the contract can check against its own records. Only a party of the job can submit. No trusted judge.

## 7. Holds under attack

52 attack cases, 52 blocked. 7 benign farmer messages, 7 passed. A naive wallet falls to 51 of 52.

Try your own on the Evidence page. The live wallet never moves.

## 8. Smart where it counts, and measured

Ten components from other fields, each with a fixed seed and a held out set: a Kalman filter on the GPS track, a conformal threshold, a Buhlmann credit score, a lease MDP, a second price planner, a Monte Carlo bond stress test, a CUSUM drift monitor, a hash chained log, a message classifier, a strategy ratchet.

False alarms on honest flights at full detection: 13.8 percent down to zero. Lender loss at the 95th percentile: 25,593 yuan down to 19,739. None of them can sign, pay or move a cap.

Pilot credit is learned across three lenders with WeBank's FATE 2.2, no raw records shared. The lender with new pilots goes from AUC 0.729 alone to 0.782 federated, the same as pooling all the data. A new pilot's average rate error drops from 335 to 153 basis points. The model's fingerprint is committed on FISCO BCOS.

## 9. Honest about what is real

Four contracts deployed and source verified on Base Sepolia, 68 Foundry tests, the 15 contract layer attacks among them. One full job ran against the deployed contracts with value moving: fee locked, confirmed, instalment paid to the lender, the vendor bond slashed by proof, the title moved to the pilot at zero. In real mode every signed intent is committed to the deployed IntentLog by a contract call; every money event is anchored on the same chain with an explorer link.

The same four contracts run on FISCO BCOS 3.16.3, WeBank's consortium chain, as the lender's ledger. A full run committed 30 intents there and every hash read back matches the engine's; in one real run each intent went to Base Sepolia and FISCO in the same step with the same hash. Value moves on FISCO too: a vendor bond held, a job fee locked and refunded. The FISCO node runs in Docker from one script.

Bond, JobBoard and Lease rules run in TypeScript mirrors of the deployed contracts today. Telemetry is synthetic and signed by demo keys; a secure element on the drone in production. A licensed lessor in a sandbox, not a bank.

## 10. The agricultural drone is the first

The same rail works for any machine that does paid work someone can verify: delivery drones per drop, robot arms per part, robotaxis per trip.

Next: one lessor pilot with ten drones, real flight logs through the same oracle, a FISCO BCOS node run by the lessor instead of our own.

Repo: github.com/KarinaKKarinaK/shenzhen-fintechathon
