# Demo video script, about 3 minutes

Short lines to speak, scene by scene. 16:9, 1080p, English subtitles. File name `International-Zishi-DemoVideo.mp4`.

Before you record: laptop awake with Docker running; clean browser window at 100 percent zoom; public link, no demo token; one practice run; tabs ready for GitHub `docs/FISCO_EVIDENCE.md` section 8, `docs/EXECUTION_EVIDENCE.md` section 3, and a terminal in `web/`.

| # | Open or click | Say |
|---|---|---|
| 1 | Home page, scroll | "A spraying drone costs 55,000 yuan. The pilot has nothing to pledge. With Zishi, the drone itself borrows, repays from every job, and owns itself at zero. Team Zishi, Topic F." |
| 2 | "Watch the demo", then Start; point at a FISCO "Contract:" card | "Every card is a real transaction on FISCO BCOS, WeBank's blockchain. The money moves inside our smart contracts." |
| 3 | First job shows declined | "Too little profit after the loan payment. The rules say no." |
| 4 | Ask the agent: "Why was this job declined?"; type 3.5, "Check rate"; "Accept at 3.7"; "Lower the reserve"; toggle 中文 | "The pilot asks why. The agent explains and suggests 3.7. At 3.5 it still says no, at 3.7 yes. Break a rule? It refuses. In Chinese too." |
| 5 | Click "Contract: JobBoard.confirm" | "This job pays. The contract splits the fee: lender, bond, pilot." |
| 6 | Held flight log card | "A fake flight log. The GPS check catches it, and the money stays locked." |
| 7 | "Contract: BondV2.slashByProof" card | "The AI is tricked into paying a stranger. Proof is on chain, so the AI vendor's bond pays, not the pilot." |
| 8 | Title card | "Loan at zero. The pilot owns the drone." |
| 9 | A "Recovery:" line, then FISCO_EVIDENCE section 8 | "If a call fails, it retries or refunds. 24 of 24 transactions succeeded." |
| 10 | EXECUTION_EVIDENCE section 3, click a hash to Basescan; then terminal `pnpm verify:all` | "The same job ran on a public chain. One command re-checks every claim: 353 of 353." |
| 11 | /app/evidence: "Owner impersonation", "Send it to the agent" | "52 attacks blocked. The AI never holds a key or picks who gets paid." |
| 12 | FISCO_EVIDENCE "FATE model provenance" | "Built on WeBank's FISCO BCOS and FATE: lenders share a credit model, not their data." |
| 13 | Home page, toggle 中文 | "Zishi. Machines that pay for themselves. zishi-fintechathon.vercel.app." |
