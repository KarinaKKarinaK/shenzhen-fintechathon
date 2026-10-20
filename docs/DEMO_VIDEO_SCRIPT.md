# Demo video script, about 2 minutes of speech

About 290 spoken words: a story with the technical parts named. Scene by scene. 16:9, 1080p, English subtitles. File name `International-Zishi-DemoVideo.mp4`.

Before you record: laptop awake with Docker running; clean browser window at 100 percent zoom; public link, no demo token; one practice run; tabs ready for GitHub `docs/FISCO_EVIDENCE.md` section 8, `docs/EXECUTION_EVIDENCE.md` section 3, and a terminal in `web/`.

| # | Open or click | Say |
|---|---|---|
| 1 | Home page, scroll | "Meet a drone pilot. His spraying drone costs 55,000 yuan, and with nothing to pledge, no bank will lend to him. Zishi makes the drone the borrower: an AI wallet that earns per mu sprayed, repays the lender from every job, and owns itself at zero. We are team Zishi, Topic F." |
| 2 | "Watch the demo", then Start; point at a FISCO "Contract:" card | "Every card is a real transaction on FISCO BCOS, WeBank's consortium blockchain, settled through our smart contracts. A free AI model reads each job offer, and code checks every number." |
| 3 | First job shows declined | "The first job pays too little after the loan instalment, so the policy engine, 21 written rules, declines it." |
| 4 | Ask the agent: "Why was this job declined?"; type 3.5, "Check rate"; "Accept at 3.7"; "Lower the reserve"; toggle 中文 | "The pilot asks why. The agent shows the numbers and asks back: accept at 3.7 yuan per mu? At 3.5 it still says no, at 3.7 yes, and asked to bend a rule, it refuses and names who could change it. In Chinese too." |
| 5 | Click "Contract: JobBoard.confirm" | "The next job pays. The fee was locked in the JobBoard contract; when the farmer confirms, the contract splits it: the instalment to the lender through the Lease contract, the bond, the pilot." |
| 6 | Held flight log card | "Then a faked flight log. A Kalman filter smooths the GPS track, the score fails, and the money stays locked." |
| 7 | "Contract: BondV2.slashByProof" card | "Then the AI is tricked into paying a stranger. Its signed intent was logged on chain first, so a party submits the proof and the AI vendor's bond pays, not the pilot." |
| 8 | Title card | "The loan hits zero, and the title moves to the pilot." |
| 9 | A "Recovery:" line, then FISCO_EVIDENCE section 8 | "If a call fails, the wallet retries, or the contract refunds the farmer. 24 of 24 transactions succeeded." |
| 10 | EXECUTION_EVIDENCE section 3, click a hash to Basescan; then terminal `pnpm verify:all` | "The same job ran on Base Sepolia, a public chain, and one command re-checks every claim: 353 of 353 receipts." |
| 11 | /app/evidence: "Owner impersonation", "Send it to the agent" | "52 attacks are blocked. The AI never holds a key and never chooses who gets paid." |
| 12 | FISCO_EVIDENCE "FATE model provenance" | "And with WeBank's FATE, lenders train one credit model without sharing data, its fingerprint on chain." |
| 13 | Home page, toggle 中文 | "Zishi. Software that lets machines pay for themselves." |
