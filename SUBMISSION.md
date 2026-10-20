# Submission index

Zishi 自食其力, 2026 Shenzhen International FinTech Competition (FinTechathon), International Track, Topic F: AI as a Financial Participant.

Every deliverable the rules ask for, where it is, and in which format.

| # | Deliverable (rules) | File | Format |
|---|---|---|---|
| 1 | Technical documentation: architecture, core algorithm, security design | [`docs/Zishi_Technical_Document.docx`](docs/Zishi_Technical_Document.docx), [`docs/pdf/Zishi_Technical_Document.pdf`](docs/pdf/Zishi_Technical_Document.pdf) | Official template (international-technical-document-en), sections 01 to 05; long form in [`TECHNICAL.md`](TECHNICAL.md) |
| 2 | Pitch deck, 10 minutes or less | [`docs/Zishi_Pitch_Deck.pptx`](docs/Zishi_Pitch_Deck.pptx), [`docs/pdf/Zishi_Pitch_Deck.pdf`](docs/pdf/Zishi_Pitch_Deck.pdf) | 16:9 slides with speaker notes |
| 3 | Demo video, 5 minutes or less | Link: to be added | Script: [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md) |
| 4 | Source code with README, deployment instructions and test cases | This repository, [`README.md`](README.md) (Run it, Repository), tests in `contracts/test` (84 Foundry tests) and `web/src/engine/selfcheck.ts` (`pnpm test`) | GitHub |
| 5 | Security self-assessment: permission tiers and known risks | [`docs/Zishi_Security_Self_Assessment.docx`](docs/Zishi_Security_Self_Assessment.docx), [`SELF_ASSESSMENT.md`](SELF_ASSESSMENT.md) | Official headings 01 Permission Model, 02 Security Tests, 03 Data and Privacy, 04 Known Risks |
| 6 | Execution evidence (Topic F: real on-chain transaction hashes) | [`docs/EXECUTION_EVIDENCE.md`](docs/EXECUTION_EVIDENCE.md), [`docs/FISCO_EVIDENCE.md`](docs/FISCO_EVIDENCE.md), [`docs/results/receipts.json`](docs/results/receipts.json) | Every hash re-fetched from Base Sepolia and FISCO BCOS by `pnpm verify:all` |

Supporting material: [`docs/JUDGES_GUIDE.md`](docs/JUDGES_GUIDE.md) (ten minute tour), [`docs/SECURITY_SCAN.md`](docs/SECURITY_SCAN.md), [`docs/EVALUATION.md`](docs/EVALUATION.md), [`docs/RED_TEAM.md`](docs/RED_TEAM.md), [`fate/README.md`](fate/README.md), all PDFs in [`docs/pdf/`](docs/pdf/).

Live demo: https://zishi-fintechathon.vercel.app (public runs on the real FISCO BCOS chain; real Base Sepolia mode with the demo token given in the submission form).

Licence: PolyForm Noncommercial 1.0.0 ([`LICENSE`](LICENSE)); the deployed contracts are MIT.
