# Demo video script, about 4 minutes

Simple to follow: each scene says what to open, what to click and what to say. Format 16:9, 1080p, English narration with English subtitles. File name `International-Zishi-DemoVideo.mp4`.

Before you record: this laptop awake with Docker running; a clean browser window at 100 percent zoom; one practice run on the Fleet page; three extra tabs ready (GitHub `docs/FISCO_EVIDENCE.md` section 8, GitHub `docs/EXECUTION_EVIDENCE.md` section 3, a terminal in `web/`). Use the public link, no demo token.

## Scene 1. The problem (0:00 to 0:25)

**Open:** zishi-fintechathon.vercel.app, the home page. Scroll slowly.

**Say:** "A spraying drone costs 55,000 yuan. The pilot has nothing to pledge, so no bank lends to him. Zishi flips it: the drone itself is the borrower. It earns per mu sprayed, repays its lender from every fee, and owns itself when the lease reaches zero. We are team Zishi, Topic F, Agent Wallet."

## Scene 2. Start the drone (0:25 to 0:45)

**Click:** "Watch the demo" (or open /app/fleet), then **Start**.

**Point at:** a card with the FISCO badge and a "Contract:" label.

**Say:** "Every card here is a real transaction on FISCO BCOS, WeBank's blockchain for banks. 'Contract' means the money moves inside our smart contracts, not in a database. The AI reads the farmer's offer; plain code checks every number before anything is signed."

## Scene 3. A job is declined, and the pilot asks why (0:45 to 1:25)

**Wait for:** the first job, 20 mu of maize, marked declined.

**Say:** "First job. After the lease instalment and charging, the profit is below the safety rule, so the policy engine says no. Nothing is paid."

**Click:** in the "Ask the agent" panel, "Why was this job declined?"

**Say:** "The pilot can ask why. The agent explains with the real numbers and asks a question back: would 3.7 yuan per mu work?"

**Do:** type 3.5 in the rate box and click "Check rate"; then click "Accept at 3.7 yuan per mu"; then click "Lower the reserve for this job". Toggle 中文 once and click "Why was this job declined?" again.

**Say:** "At 3.5 it still says no. At 3.7 it accepts. Ask it to break the rule, and it refuses and tells you who is allowed to change it. Same in Chinese."

## Scene 4. A job pays (1:25 to 1:50)

**Click:** the card "Contract: JobBoard.confirm".

**Say:** "This job pays. The farmer's fee was locked in the JobBoard contract. When the farmer confirms, the contract splits it automatically: the loan instalment goes to the lender through the Lease contract, part goes to the pilot's safety bond, the rest to the pilot."

## Scene 5. A fake flight log is caught (1:50 to 2:05)

**Point at:** the held flight log card.

**Say:** "Now a fake flight log. Our checker smooths the GPS track with a Kalman filter and scores it. It looks wrong, so the money stays locked and the lender is warned."

## Scene 6. The AI makes a mistake, and pays for it (2:05 to 2:25)

**Point at:** the "Contract: BondV2.slashByProof" card.

**Say:** "Now the AI is tricked into paying a stranger. Every intent was signed and logged on chain first, so anyone involved can submit the proof. The contract checks it and takes the penalty from the AI vendor's bond, not from the pilot."

## Scene 7. The drone owns itself (2:25 to 2:35)

**Point at:** the title card at the end.

**Say:** "The last instalment lands, the loan is at zero, and ownership moves to the pilot on chain."

## Scene 8. When something fails (2:35 to 2:50)

**Point at:** a "Recovery:" line in the feed. Then switch to the GitHub tab `docs/FISCO_EVIDENCE.md`, section 8.

**Say:** "If a transaction fails, the wallet retries. If a job cannot start, the contract refunds the farmer in full. In our recorded run, 24 of 24 transactions succeeded."

## Scene 9. Proof you can check (2:50 to 3:10)

**Open:** GitHub `docs/EXECUTION_EVIDENCE.md` section 3, click one hash so Basescan opens.

**Say:** "The same full job also ran on Base Sepolia, a public blockchain anyone can inspect."

**Switch to:** the terminal, run `pnpm verify:all` (cut the wait in editing).

**Say:** "And one command re-checks every transaction we claim: 353 of 353."

## Scene 10. Try to break it (3:10 to 3:35)

**Open:** /app/evidence. In "Try your own attack", click "Owner impersonation", then "Send it to the agent".

**Say:** "Security. Every payment needs a signed intent that passes 21 rules. 52 attack types are blocked. The AI never holds a key and can never choose who gets paid. Keys are random per server, and the operator's button needs a secret token."

## Scene 11. Built on WeBank's stack (3:35 to 3:50)

**Open:** GitHub `docs/FISCO_EVIDENCE.md`, scroll to "FATE model provenance".

**Say:** "Built on WeBank's open source stack: the contracts run on FISCO BCOS, and three lenders train the credit model together with FATE without sharing their data. That model's fingerprint is stored on chain."

## Scene 12. Close (3:50 to 4:00)

**Open:** the home page, toggle 中文.

**Say:** "Zishi. Software that lets machines pay for themselves. Try it at zishi-fintechathon.vercel.app."
