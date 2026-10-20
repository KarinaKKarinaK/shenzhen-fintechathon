# Demo video script, about three minutes

Screen recording of the live app, one voice, light music under the first ten seconds only. 1920 by 1080, English interface, 100 percent zoom. About 430 spoken words.

Before recording: open zishi-fintechathon.vercel.app once in a clean window (public mode runs on the real FISCO BCOS chain, the laptop running the node must be awake). Keep three tabs ready: the Evidence page, docs/EXECUTION_EVIDENCE.md section 3 on GitHub, and Basescan.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Home page, slow scroll | This drone costs 55,000 yuan. The pilot who flies it has nothing to pledge, so no bank will lend to him. What if the drone could borrow for itself? |
| 0:12 | Hero title 自食其力 | This is Zishi, a wallet for a machine. It earns per mu sprayed, repays its lender from every fee, and owns itself at zero. |
| 0:22 | Fleet page, press Start, point at a FISCO badge | Press start. This is not a simulation: every card is a real transaction on FISCO BCOS, WeBank's consortium chain, and a free AI model writes the explanations. |
| 0:35 | Moment one, the declined job | First job: 20 mu of maize. The margin is too thin, so the code says no. Signed, logged, declined. |
| 0:45 | Ask the agent panel: "Why was this job declined?" | And the pilot can ask why. The agent answers from its own numbers, then asks back: should I accept at the break even, 3.7 yuan per mu? |
| 0:58 | Type 3.5, then accept 3.7, then "lower the reserve" | Try 3.5: still below the rule, declined. 3.7: accepted. Ask it to lower the reserve, and it refuses and names the rule. It clarifies, it corrects, it never bends a rule. |
| 1:15 | Moments two and three | The next job pays. The fee splits by rule: instalment to the lender, bond, pilot. Then a faked flight log arrives, the oracle holds the money, and the lender is told. |
| 1:32 | Moment four, the slash by proof | Then the agent is compromised and signs a payment to a stranger. The intent was already on chain. A party submits the proof and the vendor bond pays, not the pilot. |
| 1:48 | Moment five, the title | The lease hits zero and the title moves to the pilot. |
| 1:55 | GitHub, EXECUTION_EVIDENCE section 3, click one hash to Basescan | And this is not only a story. The same job ran against our deployed contracts on Base Sepolia: fee locked, confirmed, instalment paid, vendor bond slashed by proof, title transferred. Nine contract calls, real value, every receipt on chain. |
| 2:13 | Terminal: pnpm verify:all | Don't trust us. One command re-checks every transaction we claim: 267 of 267 receipts verified on two chains. |
| 2:25 | Evidence page, type an attack | Try to break it. 52 attacks blocked by the pipeline, and we report what the classifier alone catches, with confidence intervals, not a perfect score. |
| 2:40 | FISCO evidence, V2 table | Built on WeBank's stack: the contracts run on FISCO BCOS, our fixed IntentLog stops front running there, and three lenders train the credit model together with FATE, its fingerprint pinned on chain. |
| 2:55 | Toggle 中文, home page | In English and Chinese. Zishi. Software that lets machines pay for themselves. |

If the FISCO node is not reachable the public page falls back to the labelled simulation; record the FISCO part with the node running.
