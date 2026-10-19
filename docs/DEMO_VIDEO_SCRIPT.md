# Demo video script, five minutes

Screen recording of the live app in real mode, one voice, no music. Record at 1920 by 1080, English interface, then show the Chinese toggle once. Keep the browser at 100 percent zoom.

Before recording: open the app once with the demo token so hashes are real, check the wallet balance on Basescan, and refresh the Dashboard so the ledger is empty.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Home page, hero | A drone costs about 55,000 yuan. A pilot with nothing to pledge cannot borrow it. Zishi is a wallet that lets the drone pay for itself: it earns per mu sprayed, repays the lender from every fee, and owns itself at zero. |
| 0:25 | Scroll the home page to the two bonds | Two bonds stand behind it. The pilot bond pays for the pilot's cheating. The vendor bond pays for the agent's mistakes. Both are slashed only on cryptographic proof. The pilot never pays for the AI. |
| 0:45 | Dashboard, press Start | This is the engine running with real transactions on Base Sepolia. Every event you see is a signed intent, a policy decision, or a transaction. |
| 1:00 | Moment one: the declined job | A farmer offers 20 mu of maize at 3 yuan. The planner runs the economics: after energy and the instalment the margin is below the reserve rule. The intent is signed, logged, and the policy engine declines it. Nothing moves. |
| 1:30 | Moment two: the paid flight | A 100 mu passion fruit job. The fee is locked on the board, the drone flies, the farmer confirms. The fee splits by rule: instalment to the lender, rail fee, bond fill, the rest to the pilot. Click the instalment hash. It opens Basescan. |
| 2:10 | Moment three: the held flight log | This flight log claims more area than the track supports. The oracle runs a Kalman filter on the GPS samples and a robust z score against a conformal threshold. The log is held, the fee stays locked, the lender is told. |
| 2:40 | Moment four: the slash by proof | A compromised agent signs a payment to an address not on the allowlist. The intent hash is already in the log on chain. The lender submits the signed intent and the rule. The contract checks the signature, the log and the rule, and slashes the vendor bond. The harmed party is paid. No bounty on a live job. |
| 3:15 | Moment five: the title | The last instalment brings the lease to zero and the title moves from the lender to the pilot. The drone belongs to the person who flew it. |
| 3:35 | Evidence page, attack table | Fifty two attack cases run while the page loads: injection, impersonation, a payee in the text, replay, foreign evidence. Fifty two blocked, seven benign messages pass, a naive wallet falls to fifty one. |
| 4:00 | Evidence page, learned components | Ten components from other fields, each on a fixed seed with a held out set. Kalman smoothing cut false alarms on honest flights from 13.8 percent to zero at full detection. The bonds take about 6,000 yuan off the lender's 95th percentile loss. None of them can sign or pay. |
| 4:25 | Evidence page, contracts row, click an address | Four contracts, deployed and source verified. The engine calls IntentLog for every intent. The others run as mirrors today; their calls are next. |
| 4:40 | Demo page, Live feed mode, press Start, then the Chinese toggle | The same engine on a live feed of new jobs, or on your own jobs as JSON or CSV. English and Simplified Chinese. |
| 4:55 | Home page | Zishi. Software that lets machines pay for themselves. zishi-fintechathon.vercel.app. |

If a real transaction is slow, keep talking over the pending state; the status pill moves from pending to confirmed to finalised on its own. If the wallet runs dry, switch to simulated mode and say so on camera.
