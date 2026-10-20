# Submission index

Zishi 自食其力, 2026 Shenzhen International FinTech Competition (FinTechathon), International Track, Topic F: Agent Wallet (theme: AI as a Financial Participant).

Every item on the official submission checklist, where it is, and in which format. The .docx files are written on the organisers' templates from fintechathon.g-ican.com/templates (copies in `docs/template/`) by `web/scripts/techdoc.py` and `web/scripts/officialdocs.py`.

| # | Deliverable (rules) | File | Format |
|---|---|---|---|
| 1 | Technical documentation: architecture, core algorithm, security design | [`docs/Zishi_Technical_Document.docx`](docs/Zishi_Technical_Document.docx), [`docs/pdf/Zishi_Technical_Document.pdf`](docs/pdf/Zishi_Technical_Document.pdf) | Official template (international-technical-document-en), sections 01 to 05; long form in [`TECHNICAL.md`](TECHNICAL.md) |
| 2 | Presentation deck, final presentation 10 minutes or less | [`docs/Zishi_Pitch_Deck.pptx`](docs/Zishi_Pitch_Deck.pptx), [`docs/pdf/Zishi_Pitch_Deck.pdf`](docs/pdf/Zishi_Pitch_Deck.pdf) | Official presentation template, 12 slides with speaker notes (about 9.5 minutes) |
| 3 | Demo video, 5 minutes or less | Link: to be added (`International-Zishi-DemoVideo.mp4`) | Plan on the official demo video guide: [`docs/Zishi_Demo_Video_Plan.docx`](docs/Zishi_Demo_Video_Plan.docx); script: [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md) |
| 4 | Source code with README, deployment instructions and test cases | This repository; [`README.md`](README.md) follows the official Source Code README Template (sections 1 to 7), tests in `contracts/test` (84 Foundry tests) and `web/src/engine/selfcheck.ts` (`pnpm test`) | GitHub |
| 5 | Security self-assessment report: permission tiers and known risks | [`docs/Zishi_Security_Self_Assessment.docx`](docs/Zishi_Security_Self_Assessment.docx), [`SELF_ASSESSMENT.md`](SELF_ASSESSMENT.md) | Official template (international-security-self-assessment-en), every guiding item answered |
| 6 | Execution evidence (Topic F: real on-chain transaction hashes) | [`docs/Zishi_Execution_Evidence.docx`](docs/Zishi_Execution_Evidence.docx), full tables in [`docs/EXECUTION_EVIDENCE.md`](docs/EXECUTION_EVIDENCE.md) and [`docs/FISCO_EVIDENCE.md`](docs/FISCO_EVIDENCE.md), [`docs/results/receipts.json`](docs/results/receipts.json) | Official template (international-execution-evidence-en); every hash re-fetched from Base Sepolia and FISCO BCOS by `pnpm verify:all` |

Supporting material: [`docs/JUDGES_GUIDE.md`](docs/JUDGES_GUIDE.md) (ten minute tour), [`docs/SECURITY_SCAN.md`](docs/SECURITY_SCAN.md), [`docs/EVALUATION.md`](docs/EVALUATION.md), [`docs/RED_TEAM.md`](docs/RED_TEAM.md), [`fate/README.md`](fate/README.md), all PDFs in [`docs/pdf/`](docs/pdf/).

Live demo: https://zishi-fintechathon.vercel.app (public runs on the real FISCO BCOS chain; real Base Sepolia mode with the demo token given in the submission form).

Licence: PolyForm Noncommercial 1.0.0 ([`LICENSE`](LICENSE)); the deployed contracts are MIT.
