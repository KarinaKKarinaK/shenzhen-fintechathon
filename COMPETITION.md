# Competition scan

Snapshot: 18 October 2026, about 19:30 Beijing time. 118 public GitHub repos for this track, 113 of them real entries. Topic D is the thinnest and weakest topic; Topic F is crowded at the top and already covers agent to agent payments, escrow, mandates and session key wallets.

## Method

- Search on GitHub for "fintechathon", "AI as a Financial Participant", "PBCSF", "International FinTech Competition" and similar, repos created after 1 September 2026. All repos cloned.
- 13 independent reviewers read each README against the code (static review, nothing installed or run) and scored it with the official rubric: task completion 40, security and compliance 30, innovation and interaction 30, plus the 0 to 5 bonus for Topic F. Scores on 0 to 100.
- Every reviewer also scored the same two reference repos, so reviewer strictness could be calibrated out. Remaining noise is about plus or minus 3 to 5 points, so ranks can move by 5 to 10 places.
- Limits: only public repos are visible, many repos will still change before the deadline, and the real jury probably reads docs, deck and video more than code.

## Entries per topic

| Topic | Entries | Median score | Best score | Entries at 80 or more |
| --- | --- | --- | --- | --- |
| A Personal finance | 17 | 60 | 91 | 3 |
| B Wealth advisory | 10 | 71 | 91 | 4 |
| C Cross-border and student | 28 | 65 | 94 | 5 |
| D Insurance | 2 | 61 | 61 | 0 |
| E SME copilot | 35 | 60 | 89 | 6 |
| F Agent wallet | 21 | 56 | 97 | 5 |

Across all topics: 12 entries score 85 or more, 23 score 80 or more. Prizes are awarded across topics, so these are the teams to beat.

## Top 15 across all topics

| Rank | Entry | Topic | Score | What it is |
| --- | --- | --- | --- | --- |
| 1 | [ABRUBAB/YINGLONG](https://github.com/ABRUBAB/YINGLONG) | F | 97 | Plain language rules compiled into ERC-7710 delegations, enforced by custom contract checks on Base Sepolia and a FISCO chain |
| 2 | [JahanzaibMohsin9/carrypay](https://github.com/JahanzaibMohsin9/carrypay) | C | 94 | Deployed agent that pays a family's hospital and university bills abroad, registry checked recipients, passkey approval |
| 3 | [taivnaaiwnl/shenzhen-comp](https://github.com/taivnaaiwnl/shenzhen-comp) | F | 94 | Agent Credit Bureau: a wallet agent pays other AI agents based on on-chain credit grades, about 214 Base Sepolia transactions |
| 4 | [basicacc/fintechaton_signet](https://github.com/basicacc/fintechaton_signet) | B | 91 | Wealth advisor whose drafts must pass a rule and Z3 checker citing NFRA rules, certificates anchored on FISCO |
| 5 | [odripads/fundbun](https://github.com/odripads/fundbun) | A | 91 | Local first budgeting agent with a five tier policy engine and a sandbox bank |
| 6 | [Brieuclerouxtardif/leash](https://github.com/Brieuclerouxtardif/leash) | F | 91 | LLM proposes, code decides, a vault contract on Sepolia enforces spending |
| 7 | [erkinovvv/keel](https://github.com/erkinovvv/keel) | B | 89 | Wealth advisor with a "crash rehearsal" that replays 2007 to 2013 to measure real risk tolerance |
| 8 | [gabi200/runway](https://github.com/gabi200/runway) | E | 89 | SME finance officer with two person signed approvals and an anchored audit log |
| 9 | [tanhongsheng050204-code/2026-SHENZHEN-FINTECHATHON-INTERNATIONAL-TRACK](https://github.com/tanhongsheng050204-code/2026-SHENZHEN-FINTECHATHON-INTERNATIONAL-TRACK) | E | 88 | DuitDuit: SME back office for a Malaysian importer, forecasting, reconciliation, collections |
| 10 | [Turjo101365/AgentWallet](https://github.com/Turjo101365/AgentWallet) | F | 88 | LLM drafts transfers, the contract checks the owner's signed approval on Sepolia |
| 11 | [FarhanKO/KhataPilot](https://github.com/FarhanKO/KhataPilot) | E | 86 | AI bookkeeper and cash forecaster for Bangladeshi micro shops |
| 12 | [Tasrif-Ahmed-Mohsin/finbuddy](https://github.com/Tasrif-Ahmed-Mohsin/finbuddy) | C | 85 | Bluefin: funds a student moving from Bangladesh to China, passkey signed autopilot |
| 13 | [Jahin-Tazwar/mandate-finance-agent](https://github.com/Jahin-Tazwar/mandate-finance-agent) | A | 84 | MoneyWise: plain English money rules compiled into a PIN signed mandate |
| 14 | [shuvashishofficial2026/Sathi](https://github.com/shuvashishofficial2026/Sathi) | C | 84 | Agent for Bangladeshi students with a 13 rule policy engine and a scam shield |
| 15 | [DataMarketAnalysisClub/Neural-Ledger](https://github.com/DataMarketAnalysisClub/Neural-Ledger) | A | 83 | Protected surplus copilot for Chile with a compliance map against Chilean law |

## Overlap with our ideas

| Our idea | Closest existing entries | How close |
| --- | --- | --- |
| Huaqiangbei Escrow (F) | [shenzhen-comp](https://github.com/taivnaaiwnl/shenzhen-comp) (agent to agent payments with escrow, 94), [sucsage/agentic-wallet](https://github.com/sucsage/agentic-wallet) (session key wallet plus milestone escrow driven by a Claude agent, 79), [AegisPay](https://github.com/nafizalzawad/AegisPay-Autonomous-Treasury-Escrow-Protocol) (session key smart account plus milestone escrow, local chain only, 54) | Mechanism already covered by a top 3 entry. Nobody does Huaqiangbei sourcing or a buyer and supplier negotiation with QC evidence, so the story is new, the mechanism is not. |
| Machine Wallet (F) | none found | Open |
| Guardian Wallet (A or F) | three entries already use the name ([siammds](https://github.com/siammds/Guardian_Wallet), [beingmushfiq](https://github.com/beingmushfiq/Guardian-Wallet), [ahammadshawki8](https://github.com/ahammadshawki8/guardian)); scam shields in Sathi (C, 84), truecost (A) and a payment scam claim check in [CoEdd/bridge-remittance-system](https://github.com/CoEdd/bridge-remittance-system) (C, 82) | Crowded name, partly crowded mechanism. The elderly voice angle is still open. |
| Mandate Wallet (F) | [YINGLONG](https://github.com/ABRUBAB/YINGLONG) (97), MoneyWise (84), [Safius-Sifat Mandate Wallet](https://github.com/Safius-Sifat/Fintechathon) (scaffold), [hoongyu/mandate-engine](https://github.com/hoongyu/mandate-engine) | Done at the very top of the field |
| Landing Day (C) | 28 entries, led by CarryPay (94), Bluefin (85), Sathi (84), [lifeline](https://github.com/sanyuktaphanse/lifeline) (83) | Most crowded scenario in the track |
| Hui Agent (F or A) | none found | Open |
| Seller Cashflow Copilot (E) | 35 entries, incl. exporter and importer copilots [cashbridge](https://github.com/stellarrng/cashbridge) (Vietnam, 71), [tidewise](https://github.com/laijoelton/tidewise-copilot) (Malaysia, 75), [Setu](https://github.com/Ebratul/Setu) (Bangladesh to China, 64) and DuitDuit (88) | Crowded |
| RiderShield (D) | none in D for riders | Open; D has only two entries |
| Bridge Advisor (B) | [Signet](https://github.com/basicacc/fintechaton_signet) (91) mentions Wealth Management Connect and cites NFRA rules | Close on compliance, open on the cross-border quota angle |
| Hidden Coverage, Self-Insure, Second Opinion (D) | [ClaimWise](https://github.com/danial-hossain/ClaimWise) (61) and [claimshield-ai](https://github.com/apon12934/claimshield-ai) (61), both US health insurance | Open. Nobody covers several insurance types or several jurisdictions. |

## Topic D in detail

- ClaimWise (about 61): broad web app with policy Q&A and clause citations, coverage comparison, claim and appeal drafts, strong web security. But the AI permission tiers are never enforced (`require_min_tier` is defined and never called), the 100 percent benchmark ran on mock answers, and its own report lists 54 failing tests. US health insurance only.
- claimshield-ai (about 61): tiers really enforced in code with one time code approvals, but no agent loop, a scripted appeal demo, and an unauthenticated endpoint that hands out the approval code. US health insurance only.

## Patterns across the field

- Table stakes among good entries: a deterministic policy engine outside the LLM, approvals bound to the exact action, a hash chained audit log, a red team test suite. Our SECURITY.md matches this, so it will not set us apart on its own.
- Common weaknesses we can beat: very few real live LLM runs (most evidence comes from mocks or scripted playbooks), decks and videos mostly missing, READMEs that claim more than the code does, evaluations written by the same people who wrote the code.
- Several top entries use FISCO BCOS or cite NFRA rules. The judges will notice.
- At least one entry fakes its evidence: [siammds/Guardian_Wallet](https://github.com/siammds/Guardian_Wallet) hands out hard coded third party Sepolia hashes. Expect the jury to check hashes.
