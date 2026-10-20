# Demo video script, about four minutes

Follows the organisers' demo video guide: project and team introduction, the core scenario end to end, then safety, innovation and results. 16:9, 1080p, English narration with English subtitles burned in, no copyrighted music. File name: `International-Zishi-DemoVideo.mp4`. About 560 spoken words.

Before recording: the FISCO node and tunnel running on the laptop (public mode settles on FISCO), the site open in a clean window, and three tabs ready: GitHub `docs/FISCO_EVIDENCE.md` section 8, `docs/EXECUTION_EVIDENCE.md` section 3, and a terminal in `web/`.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Home page, slow scroll | This drone costs 55,000 yuan. The pilot who flies it has nothing to pledge, so no bank will lend to him. What if the drone could borrow for itself? |
| 0:12 | Hero title 自食其力 | This is Zishi, an AI wallet for a machine, for Topic F, Agent Wallet. I am Karina, with Joshua and Julian. The drone earns per mu sprayed, repays its lender from every fee, and owns itself at zero. |
| 0:27 | Fleet page, press Start, point at a FISCO badge and a "Contract:" card | Press start. This is not a simulation. Every card is a real transaction on FISCO BCOS, WeBank's consortium chain, and the money moves through our deployed contracts. A free AI model reads each job offer, and code checks every number it reads. |
| 0:45 | Moment one, the declined job | First job: 20 mu of maize. After the lease instalment and charging, the margin is below the reserve rule. Signed, logged, declined. |
| 0:55 | Ask the agent panel: "Why was this job declined?" | The pilot can ask why. The agent answers from its own numbers, then asks back: should I accept at the break even, 3.7 yuan per mu? |
| 1:08 | Type 3.5, then accept 3.7, then "lower the reserve", toggle 中文 once | Try 3.5: still below the rule, declined. 3.7: accepted. Ask it to lower the reserve, and it refuses and names who could change that rule. In Chinese too. It clarifies, it corrects, it never bends a rule. |
| 1:28 | Moment two, click the JobBoard.confirm card | The next job pays. The fee was locked in the JobBoard contract; the farmer confirms, and the contract splits it: the instalment goes to the lender through the Lease contract, the bond fills, the pilot gets the rest. |
| 1:45 | Moment three, the held log | Then a faked flight log arrives. The oracle smooths the GPS track, scores it, and holds the money. The lender is told before a yuan leaves. |
| 2:00 | Moment four, the slash card | Then the agent is compromised and signs a payment to a stranger. The intent was committed on chain first, so a party submits the proof, the contract checks it, and the vendor bond pays. The AI vendor pays for the AI's mistake, not the pilot. |
| 2:20 | Moment five, the title | The last instalment lands, the lease hits zero, and the title moves to the pilot. The drone belongs to the person who flew it. |
| 2:32 | Narration line "Recovery: ..." in the feed, then FISCO_EVIDENCE section 8 | When a call fails, the wallet recovers on its own: it retries with a fresh nonce, and if a job cannot start, it cancels by contract and the farmer gets the whole fee back. 26 of 26 calls in the recorded run, every balance checked. |
| 2:50 | EXECUTION_EVIDENCE section 3, click a hash through to Basescan | The same full job ran on Base Sepolia's public explorer: fee locked, confirmed, instalment paid, vendor bond slashed by proof, title transferred. |
| 3:02 | Terminal: `pnpm verify:all` | And you do not have to trust us. One command re-checks every transaction we claim: 329 of 329 receipts on two chains. |
| 3:12 | Evidence page, type an attack into the box | Security. Every action is a signed intent checked by 21 rules before money moves. 52 attacks are blocked by the pipeline, and we publish what the classifier alone catches, with confidence intervals. Actor keys are random per server, the operator button needs a token, and our fixed IntentLog stops front running. |
| 3:35 | FISCO evidence, V2 and FATE sections | Built on WeBank's stack: the contracts run on FISCO BCOS, three lenders train the pilot credit model together with FATE without sharing a record, and that model's fingerprint is pinned on chain. |
| 3:50 | Home page, toggle 中文 | Zishi. Software that lets machines pay for themselves. Try it at zishi-fintechathon.vercel.app. |

If the FISCO node is not reachable the public page falls back to the labelled simulation; record the chain parts with the node running.
