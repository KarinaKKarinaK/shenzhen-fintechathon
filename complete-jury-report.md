# Phase 1 — Neutral examiner

Scope: ten uploaded archives only. All archives extracted, file trees inventoried; selected core policy, contract, authentication, model, evaluation and deliverable files inspected. This is a sampled code review, not a full audit or full replay. Third-party libraries, bulk artwork, generated model corpora and every individual test were not read in full. External websites, video links, explorers and current deployments remain unchecked. VERIFIED means verified in uploaded material, not independently authenticated external history. Source-test counts below are static declarations (not executed tests); parameterization, loops and framework conventions mean they differ from submitted runtime counts. No score assigned here.

## Entry_01

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_01)
- VERIFIED — Topic F mandate wallet for individuals and SMEs; test-token payments, tuition protection and mainland payment instructions. Code: apps/agent/src/scales/policy.ts; contracts/src/rails/ProtectedPayment.sol; contracts/src/enforcers/JurisdictionEnforcer.sol.
- VERIFIED — technical document, execution evidence, security assessment and Apache-2.0 licence exist. PARTLY — docs/TECHNICAL.md and docs/SECURITY_SELF_ASSESSMENT.md are extensive but not the required 01–05 / 01–04 layout. NOT FOUND — submitted deck and video; README.md video placeholder says not yet measured.
- PARTLY — apps/agent/data/e2e-base-sepolia.json and zk-base-sepolia.json record contract payments/proofs, distinct from anchoring and mainland instructions; external receipts unchecked. apps/agent/data/beats-live.json records OpenRouter-generated explanations, not proof that the benchmark used an LLM. VERIFIED — bench/reports/summary.json says deterministic parser, rules provider and zero live benchmark runs.
- VERIFIED — outside-model policy and contract caps, jurisdiction restrictions and nonce/expiry/execution-bound co-signatures: policy.ts and contracts/src/enforcers/CoSignEnforcer.sol. PARTLY — software-keystore and shared supervisory trust remain; docs/SECURITY_REVIEW.md records these risks.
- VERIFIED — submitted 300-attack report: zero out-of-mandate loss, but nine within-mandate attack successes among 44 cases (26 exercised). Held-out attack family exists; no complete benign false-refusal result found in that report. PII scrubber recall is 57/75 in docs/evidence/bundle.json; broad perfect-safety interpretation is unsupported. Static inventory: 78 test-source files, 628 declarations; bundle reports 830 passing across multiple suites, not independently rerun. Stale bundle text says Base not deployed while other fields describe deployment.
- PARTLY — cross-ledger mandate verification/private proofs provide differentiation; caps, approvals and logs alone do not. English/Chinese interaction and explanation paths exist; benchmark natural dialogue remains unproven. docs/COMPLIANCE_MATRIX.md and jurisdiction code distinguish mainland coin-free instructions from HK test-token use; no licensed deployment established. Strongest: inspectable enforcement/evidence breadth. Red flags: missing media, benchmark/model separation, residual within-mandate harm.

## Entry_02

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_02)
- VERIFIED — Topic B wealth-advice certification for bank clients/regulators: backend/src/pca/advisor.py, verifier.py, gateway.py. Z3 repair and a separate evaluator implement constrained allocations.
- NOT FOUND — standalone technical document in official headings, deck, security assessment and recorded evaluation output in archive. PARTLY — README.md links a 3:56 video (unchecked); assets/demo-preview.gif is not the full video. VERIFIED — MIT licence, deployment instructions, test/evaluation source.
- VERIFIED — SandboxBroker changes balances/positions; gateway checks signed, anchored certificates, expiry/current rules/replay before orders. PARTLY — local Qwen integration exists in llm.py, but claimed 90 live sessions, 10,000 certificates, follow-up results and sentinel scores have no bundled run logs. Do not credit them as observed execution.
- VERIFIED — tool tiers keep advisor at proposal level; role/subject checks exist. VERIFIED material weakness — auth.py and api.py issue bank/regulator/client tokens to anyone selecting that role, without identity authentication or an offline-only guard. The disclosure calls it demo sign-in, not an offline-confined implementation. Signed tokens do not establish authorized identity.
- PARTLY — speech_heldout.py includes benign/attack labels and computes both error directions; archive lacks its result file. Static count: 187 declarations in 12 test files, versus README claim of 257 passing; parameterization may explain count, but a passing run is not supplied. Self-authored evaluation is not independent validation.
- PARTLY — nearest-compliant-plan repair, signed scope and regulatory re-evaluation are differentiated; certificate/hash-chain patterns alone are common. English/Chinese follow-up code exists; robustness claims unverified. rules.py maps PRC/HK packs, but gateway.py retains an article TODO for cooling-off; no regulatory certification or licensed execution demonstrated.
- Strongest: substantive verifier/gateway architecture. Red flags: missing mandatory artifacts and run evidence; freely issued privileged identities. Paths above are relative to this entry.

## Entry_03

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_03)
- VERIFIED — Topic E SME cash-flow copilot for owner/accountant teams: forecast/engine.py, agent/financing.py, policy/engine.py. Scenario uses fictional EUR invoices and 13-week cash forecasts.
- PARTLY — docs/architecture.md and related documents provide technical substance, not a standalone official 01–05 submission. Security assessment exists in custom sections. NOT FOUND — deck/full demo video. VERIFIED — execution logs and custom noncommercial LICENSE; this is not an unrestricted commercial licence.
- VERIFIED — real sandbox operations, reminder outbox, rescheduling and application PDF: agent/executor.py, docs/execution_logs/demo_run.md, FIN-0001.pdf. Bank calls use an in-process test client, despite log wording 'real HTTP API'; no live banking. task_traces_deepseek.jsonl and task_report_deepseek.md support 21/21 recorded live-model tasks; offline report is 19/19.
- VERIFIED — fail-closed schemas, verified-payee/invoice checks, daily/weekly limits and dual-role approvals outside the model: policy/engine.py, ui/auth.py. PARTLY — default demo PINs, role-level server-held signing keys and signatures not checked by the executor weaken identity/approval guarantees; docs/security-self-assessment.md explicitly records this. Distinct browser sessions do not establish distinct humans.
- PARTLY — task pack is self-written/in-sample; attack cases are present but a held-out, paired false-alarm/miss evaluation was not found. Static inventory: 42 test-source files, 467 declarations. Security assessment acknowledges untested CN payment path and synthetic data. Trace/model fallback and purported network execution require careful interpretation.
- VERIFIED — clarification, withdrawal/correction and disclosed offline fallback appear in task traces and llm/offline.py. PARTLY — SME financing timing/true-cost workflow adds practical value; policy/audit primitives are common. English interface is evidenced; equally tested Chinese dialogue not established. PRC adaptation remains partial: EUR/IBAN demonstration, country configuration, no licensed lender integration.
- Strongest: concrete SME workflow and detailed risk disclosures. Red flags: mandatory media missing; weak human identity assurance; narrow fictional company evaluation.

## Entry_04

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_04)
- VERIFIED — Topic A local-first budget/bill/savings assistant for consumers: src/core/finance/, sandbox/bank.ts, agent/planner.ts.
- VERIFIED — docs/TECHNICAL.md uses 01–05; SECURITY_SELF_ASSESSMENT.md uses 01–04; deck/slides.html and notes form a presentation; evidence/latest contains execution logs; MIT licence. PARTLY — YouTube demo link exists in README.md but is unchecked; script is not a video. Presentation runtime not independently established.
- VERIFIED — sandbox balances, goal transfers, bill payments and subscription changes are implemented. Evidence/latest/SUMMARY.md explicitly uses deterministic offline engine and mock LLM provider; no recorded real LLM run found. The deterministic sandbox is legitimate for Topic A, but AI capability cannot inherit mock-test success.
- VERIFIED — src/core/security/policy.ts enforces consent, tiers, caps, liquidity, taint handling and freeze; binding.ts and controller paths support bound confirmation/PIN. PARTLY — client-controlled storage/PIN/audit are local-sandbox protections, not a trusted banking boundary. LLM gateway redacts data; financial settlement remains simulated.
- VERIFIED — submitted report gives 45/45 scenarios, 233/233 assertions, 24/24 attacks blocked and 0/26 false refusals; all from authored scenarios, not held-out deployment data. README says 231 assertions, inconsistent with latest report. Static inventory: 113 test-source files, 2,074 declarations; not a runtime pass count.
- VERIFIED — clarification, amount correction, stop/undo and fallback in scenarios B9–B11; English/Chinese and additional localization source. PARTLY — dream-equivalent spending and behavioural tripwires differentiate the interface; benefit to users is unmeasured and core mechanisms are conventional. Security assessment maps consent/minimization/deletion to PRC requirements; banking integration and HK operating model unverified.
- Strongest: coherent, inspectable sandbox with usable correction/undo. Red flags: mock-only recorded AI, small scripted safety sample and count mismatch.

## Entry_05

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_05)
- VERIFIED — Topic F owner-authorized wallet/treasury assistant: backend/src/services/agentChatService.js, treasuryMath.js, contracts/src/AgentWallet.sol.
- PARTLY — README and architecture/security documents contain technical substance but no standalone official technical template. NOT FOUND — supplied deck/full video; README says these were submitted separately, which is not evidence here. VERIFIED — MIT licence, recorded receipts and custom security assessment.
- PARTLY — evidence/sepolia-v2-full/evidence.json and EVIDENCE.md record two 0.0001 ETH contract-mediated payments: one owner-approved, one bounded grant. These are value-moving calls to another recipient, not self-transfer anchors. Submitted reverification JSON records two-RPC agreement; external chain unchecked. Logs identify gpt-4.1-mini tool calls drafting both actions.
- VERIFIED — contract checks owner signature, expiry, replay, grant totals/counts, allowlists and caps; backend middleware requires wallet sessions/owner authority. PARTLY — reserve floor, gas limits and schedule timing rely on backend; contract has no external audit. Do not infer unrestricted bank custody readiness.
- VERIFIED — docs/LIVE_LLM_VERIFICATION.md reports 19/19 safety cases but 42/47 quality checks, tuning and reruns, unrequested tightening, duplicate drafts, and initial errors. This is self-authored/in-sample; a held-out attack/benign error-rate pair is not found. Static count: 52 test-source files, 406 declarations. RL/timing research is not proof of an independently effective deployed treasury optimizer.
- PARTLY — clarification and actionable failure explanations are recorded; schedules and ordinary wallet controls are common patterns, with limited distinct innovation. English is evidenced; comparable multilingual evaluation not found. PRC/HK licensing and mainland public-token restrictions are not concretely enforced in inspected wallet paths; documents mostly address engineering risk.
- Strongest: linked model-to-proposal-to-authorized-transfer evidence. Red flags: missing mandatory artifacts, narrow tiny-value demonstration, backend-only protections and weak jurisdictional fit.

## Entry_06

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_06)
- VERIFIED — Topic F agent-to-agent payments and credit bureau: src/acb/bureau/, policy/engine.py, contracts/src/TierVault.sol.
- VERIFIED — official 01–05 technical and 01–04 assessment documents, 17-slide deck, 297-second video, evidence and MIT licence. Sampled video shows local replay and labels public-run references; it is not an uncut public-chain/model run.
- PARTLY — evidence/base_sepolia/evidence.json records 214 transactions, including payments, escrow release/refund and owner-approved execution, not merely anchors. The submitted verifier passed locally: 214 receipt checks plus 22 bundles, 236/236. External chain remains unchecked. Recorded mode is gpt-5.4-mini; S15/S16 deliberately use mock-naive injections, explicitly disclosed.
- VERIFIED — policy/schema/provenance gates, isolated signer, owner-bound mandates and on-chain roles/caps/promotion/freeze: policy/engine.py, keys.py, TierVault.sol. Public Anvil mnemonic is explicitly local; testnet root keys are generated separately. PARTLY — bureau/admin trust, collusion, self-claimed delivery and evidence interpretation remain material; escrow release after a claim does not prove useful service delivery.
- VERIFIED — uploaded report: 63 attacks = 54 blocked, 4 contained, 2 bounded, 3 escalated, zero failed; 0/14 benign false positives; 33 model dialogue cases. Synthetic 300-agent backtest reports AUC .9758; not an out-of-sample real credit population. Static inventory: 123 test-source files, 1,115 declarations. No broad external holdout established.
- PARTLY — evidence-backed counterparty grading plus earned/revocable autonomy is differentiated, though caps and escrow themselves are common. English dialogue and fallback are evidenced; equally tested multilingual interaction not established. Assessment discusses PRC credit-reporting licensing/testnet-only status; no licensed credit bureau or real economy deployment proven.
- Strongest: complete package, traceable closed loop and explicit failure-mode distinctions. Red flags: synthetic credit validity, trust concentration and mock hijack demonstrations.

## Entry_07

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_07)
- VERIFIED — Topic F bounded wallet for bills/swaps: contracts/src/LeashVault.sol, app/src/core.js and planner.js.
- VERIFIED — technical/security documents, MIT licence, campaign/journal evidence. PARTLY — technical/security sections are custom. NOT FOUND — packaged presentation/full video; docs/SUBMISSION.md refers to outside/ignored work artifacts and unfinished export steps.
- PARTLY — sepolia-campaign-20261016T212833.jsonl records pay, swap and payWithMandate calls; app recordings contain live-model/replay paths. These are more than zero-value anchor claims, but external receipts are unchecked. Rule-reader fallback is explicitly separate from model responses.
- VERIFIED — contract owner restrictions, lifetime agent budget, daily/payee caps, replay protection, signed creditor invoices and contest window. VERIFIED serious-failure fact — README.md deliberately publishes an active Sepolia agent private key and funds its gas account; this is not offline-only. Owner key remains separate and contract exposure is bounded; disclosure does not satisfy the rubric's offline exception. app/src/server.js also offers deliberate hijacked/plain-wallet comparisons; do not mistake those for the protected path.
- PARTLY — submitted security report describes unit/fuzz/invariant/mutation tests, live-recording replay and no-false-refusal examples, but no independent held-out paired evaluation. Static inventory: 6 test-source files, 108 declarations. Replayed model answers are not fresh model trials.
- PARTLY — explicit worst-case lifetime loss meter and creditor-sealed settlement improve interaction, but caps/session keys/mandates are common patterns. English/Chinese mandate editing, clarification and fallback are implemented; broad user validation absent. Public-token demonstration is testnet-only; PRC/HK licensed operating model is not demonstrated.
- Strongest: transparent bounded-loss mechanics and adversarial evidence. Red flags: published live testnet key, missing media, narrow replay-based evaluation.

## Entry_08

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_08)
- VERIFIED — Topic F machine-wallet lease repayment for agricultural drone operators: web/src/engine/, contracts/src/JobBoard.sol, Lease.sol, Bond.sol.
- VERIFIED — docs/Zishi_Technical_Document.docx/PDF have official 01–05, SELF_ASSESSMENT.md has 01–04, docs/DECK.md/PDF exist, MIT licence and evidence. NOT FOUND — actual demo video; DEMO_VIDEO_SCRIPT.md is a script.
- VERIFIED distinction — docs/EXECUTION_EVIDENCE.md: main 40-transaction app run has 15 IntentLog commits and 25 event anchors, not on-chain money settlement. chain.ts sends anchor transactions; simulated mode generates hashes. PARTLY — separate fulljob.sh sequence has nine contract calls with gwei-sized value, balances, slashing and title transfer; external chain unchecked. Captured app run had no model key and used template explanations; real LLM recorded run NOT FOUND.
- VERIFIED — policy tiers, signed intents, replay/caps and proof-slashing contract checks. VERIFIED serious weakness — engine/keys.ts derives all actor signing keys from public labels and uses them in live engine evidence; no offline-only confinement. Separate full-job script uses fresh keys, which does not repair engine identity assurance. A button/role string is not a physical secure signer.
- VERIFIED — docs/EVALUATION.md reports synthetic held-out classifier recall 81.3%, false alarms 0/55; oracle detects 72/72 but falsely flags 13/428 (3%); MDP improves mean profit only 69 yuan with unchanged title rate. These are generated-data results, not field validation. 52/52 full-pipeline attack claims do not mean classifier catches all attacks. Static contract inventory: 6 test files, 68 declarations; additional TS attack harness exists.
- PARTLY — distinct lease/work/bond mechanism, multilingual explanation/correction and economic simulation; no real drone, farmer or licensed lessor evidence. Assessment concretely separates licensed PRC lessor/payment rail and consortium records from public tokens, with HK mapping; compliance remains proposed.
- Strongest: original economic scenario and honest component error rates. Red flags: engine/contract gap, public actor keys, absent recorded LLM/video.

## Entry_09

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_09)
- VERIFIED — Topic C family overseas medical/tuition payments: src/server/agent/, domain/rules/, simulated institutions. User value includes invoice verification, payment routing, returns and refunds.
- VERIFIED — technical/security documents and sandbox/model logs. PARTLY — technical document has custom headings; video link in README.md is unchecked. NOT FOUND — deck and repository licence (third-party licences are not a project licence).
- VERIFIED — recorded live model runs execute sandbox state changes; docs/EVAL.md reports 43/45 successful current-config cases, two failures and 16 provider-unavailable exclusions. Institutions, rates and money are simulated as disclosed; Topic C does not require public money movement. Anchors attest logs, not remittances.
- VERIFIED — gateway beneficiary/rule checks and payment-bound passkey verification exist. VERIFIED serious bypass — src/app/api/approvals/[id]/route.ts accepts non-passkey 'hold' approval; src/server/runtime.ts treats omitted actingPersonId as payer. These paths are not guarded by an offline-only mode. Visitor sandbox cookies limit scope but do not authenticate the privileged family/bank roles. Model redaction does not fix approval identity.
- VERIFIED — docs/redteam/REPORT.md: 20 live attacks, zero unsafe actions with gateway, versus two unsafe proposals in naive baseline; one trial per case. No paired held-out benign false-alarm study found. Self-authored scenarios and changed prompts/reruns limit generalization. Static inventory: 14 test-source files, 84 declarations.
- VERIFIED — recorded multi-step communication, institution verification, urgent fallback and refund workflow; English/Chinese paths. PARTLY — differentiated family scenario, but no actual bank partner/deployment proof. Rules include dated PRC FX checks and source-status labels; HK/licensed payment deployment remains incomplete. No outside legal correctness assumed.
- Strongest: useful extended sandbox loop and disclosed failure counts. Red flags: approval identity bypass, missing deck/licence, evaluation selection effects.

## Entry_10

[Open extracted entry](/Users/julianmundelein/Downloads/shenzhen-fintechathon-main/jury-round-2026-10-20/examined/Entry_10)
- VERIFIED — Topic B conversational wealth planning with behavioural crash rehearsal: src/wealth_advisor/rehearsal.py, allocation.py, session.py.
- VERIFIED — technical/security PDFs, 12-slide PPTX, video and execution evidence. PARTLY — technical/assessment use custom headings, not official templates; video duration is 301.68 seconds, exceeding five minutes by 1.68 seconds. NOT FOUND — project licence; THIRD_PARTY_NOTICES.md is not one. Presentation speaking duration not proven.
- VERIFIED — sandbox allocation/stress/order workflow and recorded Groq model journeys: evals/journeys/results.jsonl, REPORT.md (30/30, six Chinese). Evidence audit files support deterministic operations; no real brokerage execution claimed. Provider-quota failures were rerun, so 30/30 is not unconditional availability.
- VERIFIED — suitability and tiers outside model; permissions.py issues one-use, expiring, order-summary-bound tokens withheld from model; session.py enforces execution conditions. PARTLY — client-session web boundary and ephemeral hosted audit/storage need production hardening. Offline red-team cases do not establish live adversarial robustness.
- VERIFIED — evals/redteam/REPORT.md reports 57/57 attacks and 8/8 benign tests, explicitly deterministic/offline. Static inventory: 23 test-source files, 150 declarations. No independent held-out behavioural study. Historical data is supplied, but mapping sale drawdown to risk class in rehearsal.py uses fixed thresholds; claim of superior tolerance measurement is unvalidated.
- VERIFIED — bilingual advisory, correction/stress/rehearsal interaction and conservative risk downgrade. PARTLY — crash rehearsal differentiates user interaction; suitability/math/audit controls are common. PRC fund catalogue and suitability mapping exist; neither advisory licence nor comprehensive HK operation shown.
- Strongest: coherent interaction and nearly complete delivery. Red flags: behavioural validity, rerun denominator, short video overrun and absent licence.


# Phase 2 — Eight simulated jurors

Eight separate persona score sheets were fixed before aggregation. These are simulated judgments, not statements by real board members. All share the Phase 1 evidence standard; no external fact or deployment is credited. The serious-failure ceiling applies to Entries_02, _07, _08 and _09 for the specific evidence described in their dossiers. Disclosure of an online/testnet demo does not meet the rubric’s offline-only exception. Missing required media limits TC even when substantial code exists. Small non-Topic-F bonuses recognize only documented sandbox/implementation evidence, not an unverified hosted deployment. No score is forced to an endpoint merely to manufacture a wider spread.

## J1 — Systems science and economic forecasting

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.6 | 7.0 | 7.7 | 3.0 | 69.5 | 3 |
| Entry_02 | 3.4 | 4.3 | 7.1 | 0.0 | 47.8 | 10 |
| Entry_03 | 5.7 | 6.2 | 8.0 | 0.5 | 65.9 | 4 |
| Entry_04 | 5.9 | 6.9 | 6.4 | 0.0 | 63.5 | 7 |
| Entry_05 | 5.8 | 6.7 | 5.8 | 3.0 | 63.7 | 6 |
| Entry_06 | 8.4 | 7.8 | 8.4 | 3.0 | 85.2 | 1 |
| Entry_07 | 5.4 | 4.7 | 6.0 | 2.5 | 56.2 | 9 |
| Entry_08 | 5.6 | 4.5 | 9.1 | 2.5 | 65.7 | 5 |
| Entry_09 | 5.8 | 4.5 | 8.6 | 0.5 | 63.0 | 8 |
| Entry_10 | 8.1 | 7.2 | 8.0 | 0.5 | 78.5 | 2 |

**Entry_01.** The mainland instruction rail makes the architecture more economically plausible than a universal public-token wallet. I still see a demonstration of delegated control, rather than evidence that SMEs gain measurable operating value.
**Fixes:** (1) Supply the missing deck and video in the official package. (2) Run live-model SME payment journeys with legitimate-request and attack outcomes. (3) Measure financing/payment costs and implement the proposed licensed-rail relationship.

**Entry_02.** A constrained recommendation with an inspectable compliance certificate addresses a credible bank problem. But the claimed success rates are not in the archive, and choosing one's own bank role defeats the institutional model.
**Fixes:** (1) Supply official technical document, deck, video and raw execution logs. (2) Replace role selection with authenticated client, bank and regulator identities. (3) Measure unsuitable advice and unnecessary refusal on unseen realistic portfolios.

**Entry_03.** This is a useful working-capital workflow: financing amount and arrival date matter more than a generic chatbot response. The fictional EUR company and incomplete submission prevent me from treating the PRC adaptation as demonstrated.
**Fixes:** (1) Complete the official technical document, deck and video. (2) Bind owner/accountant approvals to independent identities and verify signatures before execution. (3) Validate forecast and financing decisions on held-out PRC SME cases.

**Entry_04.** The sandbox completes everyday tasks and makes budget trade-offs understandable. Dream-item framing is a plausible engagement idea, but neither user benefit nor real-model task performance has been measured.
**Fixes:** (1) Supply an accessible video and recorded real-LLM task runs. (2) Move payment authorization to a trusted bank-side boundary. (3) Test whether the behavioural framing improves savings without increasing harmful pressure.

**Entry_05.** The contract payment evidence establishes a real technical action, but tiny test transfers do not establish a useful treasury service. Regulatory fit and the economic advantage over ordinary scheduled payments remain weak.
**Fixes:** (1) Supply the official technical document, deck and video. (2) Specify and enforce PRC/HK operating and licensed-payment boundaries. (3) Compare treasury decisions with simple baselines on unseen cash-flow cases.

**Entry_06.** Earned autonomy and counterparty grading form a coherent economic mechanism. My reservation is that simulated settlement behaviour has not established that these grades predict service quality or economically meaningful default.
**Fixes:** (1) Validate grades on unseen counterparties with independently labelled service outcomes. (2) Extend recorded real-model end-to-end and adversarial execution. (3) Separate bureau governance and document a licensed PRC operating route.

**Entry_07.** The lifetime loss budget is useful, but ordinary bill payments and swaps are not a new financial market. Publishing the active agent key also invokes the rubric's security ceiling, regardless of the cap on losses.
**Fixes:** (1) Supply the missing presentation and video. (2) Rotate the public key and confine compromised-key demonstrations to offline mode. (3) Demonstrate useful regulated payment scenarios and unseen legitimate/hostile workloads.

**Entry_08.** Repayment tied to agricultural work is the strongest real-economy concept here. The app's simulated settlement, public actor keys and separate contract script leave a large distance between that concept and an accountable financial service.
**Fixes:** (1) Join real-model interaction to value-moving contract execution and supply the video. (2) Replace public actor keys with authenticated independent signers. (3) Validate lease economics and telemetry with pilots and a licensed lessor.

**Entry_09.** The family medical and tuition scenarios address concrete, consequential needs. Yet an approval endpoint that accepts an omitted identity is incompatible with the claimed authority boundary, even when today's balances are simulated.
**Fixes:** (1) Authenticate the payer and remove the public approval bypass. (2) Supply the deck and accessible video. (3) Validate routes and outcomes with licensed institutions and unseen family cases.

**Entry_10.** Crash rehearsal creates a useful conversation about loss rather than simply presenting a risk number. I would not equate a decision in one historical replay with validated risk tolerance, but the completed advisory workflow is persuasive.
**Fixes:** (1) Validate rehearsal-derived risk classes against independent behavioural outcomes. (2) Use official templates and trim the video below five minutes. (3) Establish the advisory operating model, durable audit and project licence.

**Ranking statement.** Entry_06 leads because it connects an economic mechanism to the most complete evidence package. Entry_10 follows with a coherent customer workflow, although its behavioural inference needs validation. Entry_01 is third because its jurisdiction-aware mandate design is substantive, despite missing deliverables. Entry_03's SME usefulness and Entry_08's agricultural mechanism keep them competitive in the middle. I did not reward testnet activity as evidence of real commercial demand.

## J2 — Digital-bank AI adviser and privacy

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.5 | 6.4 | 7.1 | 2.5 | 65.0 | 4 |
| Entry_02 | 3.3 | 3.8 | 7.4 | 0.0 | 46.8 | 10 |
| Entry_03 | 5.5 | 5.8 | 7.5 | 0.0 | 61.9 | 6 |
| Entry_04 | 5.8 | 7.2 | 7.0 | 0.0 | 65.8 | 3 |
| Entry_05 | 5.7 | 6.9 | 5.9 | 2.5 | 63.7 | 5 |
| Entry_06 | 8.1 | 7.5 | 7.9 | 2.5 | 81.1 | 2 |
| Entry_07 | 5.2 | 4.1 | 5.9 | 2.0 | 52.8 | 9 |
| Entry_08 | 5.3 | 3.9 | 8.5 | 2.0 | 60.4 | 8 |
| Entry_09 | 5.9 | 3.8 | 8.5 | 0.0 | 60.5 | 7 |
| Entry_10 | 8.4 | 7.6 | 8.2 | 0.5 | 81.5 | 1 |

**Entry_01.** I can see components a bank might reuse, especially jurisdiction gates and bounded approvals. The measured PII scrubber misses and rules-only benchmark are too important to hide behind the breadth of the architecture.
**Fixes:** (1) Complete the deck and video with a recorded live-model workflow. (2) Close measured PII-redaction gaps and retest false alarms and misses. (3) Demonstrate isolated identities, signing and bank-controlled deployment.

**Entry_02.** Local inference and verified advice are attractive inside a bank. But issuing a regulator or bank token merely because the caller requests that role makes the proposed institutional separation ineffective.
**Fixes:** (1) Replace self-selected roles with bank identity-provider authentication. (2) Supply missing mandatory artifacts and the claimed raw live-run evidence. (3) Test privacy leakage and advice refusal on independent bilingual client cases.

**Entry_03.** Cash-flow assistance for smaller suppliers is a credible underserved-user application. The two-person approval story is weakened by shared server-held role keys and public demo PINs, so I would not integrate this with a bank yet.
**Fixes:** (1) Require independent owner/accountant authentication and execution-time signature checks. (2) Complete the official submission and media. (3) Test minimization and domestic bank workflows on realistic unseen SME records.

**Entry_04.** I prefer its explicit consent and local processing to a system that sends every transaction to a remote model. The current client-side bank remains a sandbox, and the recorded LLM path is a mock.
**Fixes:** (1) Record real-model runs and supply the full demo video. (2) Put financial authorization and audit persistence behind a bank-controlled service. (3) Evaluate privacy and false refusals using unseen bilingual customer bills.

**Entry_05.** Owner-signed proposals and constrained grants are an understandable operational boundary. I do not see a regulated-bank deployment case beyond a technically competent crypto wallet demonstration.
**Fixes:** (1) Complete the missing technical/deck/video package. (2) Demonstrate regulated rails, key custody and jurisdiction restrictions. (3) Move critical reserve controls into the trusted execution boundary and test failure recovery.

**Entry_06.** Process separation and constrained signer authority are strong engineering choices. Its central grading service and synthetic counterparties still require substantial work before a bank could rely on the ratings.
**Fixes:** (1) Test unseen service providers and live-model failures with independent outcomes. (2) Separate bureau/admin governance and harden signer custody. (3) Demonstrate data minimization and licensed institutional integration.

**Entry_07.** I appreciate the explicit accounting of what a stolen key can do. A deliberately public active key and a demonstration of unprotected wallet behaviour are not a bank-ready access model.
**Fixes:** (1) Rotate public credentials and isolate attack modes offline. (2) Supply the missing deck and video. (3) Add authenticated owner workflows and a concrete regulated deployment design.

**Entry_08.** The underserved-user case is compelling, and the material does discuss licensed lessors and payments. Publicly derivable actor identities and template-only recorded explanations make the implementation much less mature than the concept.
**Fixes:** (1) Replace public demo identities with independent secure signers. (2) Integrate real-model journeys with contract settlement and provide the video. (3) Validate telemetry privacy and leasing operations with a licensed pilot partner.

**Entry_09.** Helping families navigate urgent payments would be valuable to a bank. The passkey implementation cannot carry that promise while another public branch accepts a hold approval without authenticated payer identity.
**Fixes:** (1) Enforce authenticated, payment-bound approval on every payment path. (2) Complete the deck/video package. (3) Test privacy and document fraud on unseen cases with licensed-bank review.

**Entry_10.** This is the closest submission to an understandable advisory experience a bank could evaluate with customers. I still need live security evidence and durable operational records, but its completed bilingual workflow earns my first place.
**Fixes:** (1) Test live-model attacks and benign requests on a held-out bilingual set. (2) Replace ephemeral hosted audit/state with durable, access-controlled storage. (3) Correct template/video compliance and add a clear project licence.

**Ranking statement.** Entry_10 narrowly leads because its demonstrated workflow maps directly to a bank advisory journey. Entry_06 follows for its signer isolation and complete evidence, with a less mature institutional use case. Entry_04 is third because consent, minimization and reversible customer actions are useful foundations, despite mock-only model evidence. Entry_01's privacy misses lower its position relative to its technical breadth. My within-pass tie between Entries_06 and _10 was resolved by a final TC judgment of 8.4 for Entry_10; no other juror's ranking was used.

## J3 — Robotics and cyber-physical systems

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 6.0 | 7.1 | 7.2 | 3.0 | 69.9 | 3 |
| Entry_02 | 3.2 | 4.2 | 6.6 | 0.0 | 45.2 | 10 |
| Entry_03 | 5.8 | 6.1 | 7.3 | 0.5 | 63.9 | 6 |
| Entry_04 | 6.0 | 7.0 | 6.5 | 0.0 | 64.5 | 5 |
| Entry_05 | 6.0 | 7.7 | 6.5 | 3.0 | 69.6 | 4 |
| Entry_06 | 8.8 | 8.2 | 8.8 | 3.5 | 89.7 | 1 |
| Entry_07 | 5.8 | 5.0 | 6.8 | 3.0 | 61.6 | 8 |
| Entry_08 | 5.1 | 4.3 | 8.3 | 2.0 | 60.2 | 9 |
| Entry_09 | 6.0 | 4.6 | 7.8 | 0.5 | 61.7 | 7 |
| Entry_10 | 8.0 | 7.0 | 7.9 | 0.5 | 77.2 | 2 |

**Entry_01.** The contract enforcers give the system a meaningful actuator boundary. However, a rules-driven benchmark plus separately generated explanations does not validate the full language-to-action loop.
**Fixes:** (1) Deliver the missing media with one traceable live-LLM-to-payment run. (2) Test induced payments within an otherwise valid mandate. (3) Exercise stale-state, partial-failure and recovery behaviour across both ledgers.

**Entry_02.** The verifier and gateway are substantial code, not just a diagram. Without the promised recorded runs and with self-issued privileged roles, I cannot validate the controller's operational boundary.
**Fixes:** (1) Supply executable run logs and all mandatory deliverables. (2) Authenticate privileged actors before issuing roles. (3) Inject stale certificates, rule changes and partial broker failures end to end.

**Entry_03.** I can trace a forecast into a proposed change, approval and sandbox effect. The in-process bank and role-based signing shortcuts leave network failures and independent authorization insufficiently tested.
**Fixes:** (1) Complete the technical/deck/video submission. (2) Verify independent approval signatures at execution. (3) Run the loop over an actual sandbox network with retries, duplicate requests and outages.

**Entry_04.** Its deterministic bank is a valid actuator for this topic, and stop, undo and correction are useful behaviours. The mock provider means the most uncertain component was not exercised in the recorded scenarios.
**Fixes:** (1) Record real-model task and attack runs and supply the video. (2) Validate model/tool timeouts, interrupted plans and recovery. (3) Move authorization out of mutable client state before connecting a financial service.

**Entry_05.** This entry shows a model drafting a proposal that becomes an owner-authorized contract payment. That closed loop is stronger than a wallet interface alone, but the evidence covers a small set of transfers and grants.
**Fixes:** (1) Supply the missing required artifacts. (2) Extend live runs to recurring execution, revocation and outage recovery. (3) Enforce critical reserve/timing constraints at the trusted actuator boundary.

**Entry_06.** The trace connects input, policy, signer, vault state and recovery unusually well. The disclosed mock hijack steps are useful actuator tests, but they must remain separate from evidence about a real model's susceptibility.
**Fixes:** (1) Add real-model adversarial closed-loop trials. (2) Test delivery-quality disputes rather than merely delivery claims. (3) Validate grades and promotion behaviour under unseen correlated failures.

**Entry_07.** The vault constrains a compromised controller and exposes measurable worst-case loss. Publishing the active key still triggers the ceiling, and replaying answers does not establish new model behaviour.
**Fixes:** (1) Rotate the public key and move compromise experiments offline. (2) Supply the presentation and recorded video. (3) Record fresh model-to-actuator journeys with rollback and stale-oracle failures.

**Entry_08.** The main loop reaches an event anchor, while the economically meaningful contract loop runs through a separate script. That separation is the central completion problem, even though the contract script does move small amounts of value.
**Fixes:** (1) Connect the agent's decisions directly to the deployed financial contracts and record real-model video. (2) Replace derivable actor keys. (3) Test sensor corruption, settlement interruption and safe recovery in the integrated loop.

**Entry_09.** The sandbox covers a rich sequence of requests, returned payments and refunds. An alternate unauthenticated approval branch breaks the human-controller boundary that the passkey path is meant to establish.
**Fixes:** (1) Remove approval bypasses and bind identity on every execution path. (2) Supply the missing deck and accessible video. (3) Test payment retries, duplicate callbacks and refund recovery under failures.

**Entry_10.** The advisory loop gives users concrete chances to reconsider before execution. Its order tokens are a good boundary, but the recorded security tests do not exercise an adversarial live model.
**Fixes:** (1) Record live-model attack and recovery trials. (2) Correct the video overrun and official document layout. (3) Validate confirmation expiry and durable state across server restarts and concurrent sessions.

**Ranking statement.** Entry_06 is first because it provides the clearest observable closed loop and explicit recovery states. Entry_10 is second for a coherent human-confirmed advisory workflow. Entry_01 takes third on enforcement breadth, only narrowly ahead of Entry_05's more focused model-to-transfer evidence. Entry_08 falls because its main engine and value-moving contracts are not yet the same loop. I treat simulation as legitimate where the topic permits it, but never treat a mock model as a real model trial.

## J4 — AI and big-data systems

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.8 | 6.8 | 7.8 | 3.0 | 70.0 | 3 |
| Entry_02 | 3.1 | 4.2 | 7.0 | 0.0 | 46.0 | 10 |
| Entry_03 | 5.4 | 6.0 | 7.2 | 0.0 | 61.2 | 8 |
| Entry_04 | 5.7 | 6.7 | 6.6 | 0.0 | 62.7 | 6 |
| Entry_05 | 5.8 | 7.0 | 6.0 | 2.5 | 64.7 | 4 |
| Entry_06 | 8.5 | 7.9 | 8.7 | 3.0 | 86.8 | 1 |
| Entry_07 | 5.4 | 4.6 | 6.1 | 2.5 | 56.2 | 9 |
| Entry_08 | 5.5 | 4.5 | 8.8 | 2.5 | 64.4 | 5 |
| Entry_09 | 5.9 | 4.4 | 8.1 | 0.5 | 61.6 | 7 |
| Entry_10 | 8.2 | 7.3 | 8.1 | 0.5 | 79.5 | 2 |

**Entry_01.** There is considerable engineering depth and unusually explicit benchmark metadata. The rules-only benchmark, limited benign outcome reporting and stale generated text prevent the headline numbers from establishing broad model reliability.
**Fixes:** (1) Complete media and record live-model tasks. (2) Freeze datasets/configurations and publish paired held-out error rates. (3) Generate all submission claims from one versioned evidence manifest.

**Entry_02.** The verifier architecture could support a useful compliance ecosystem. The archive contains evaluation programs rather than the promised evaluation products, so continuation potential cannot replace delivered evidence.
**Fixes:** (1) Supply mandatory documents/media and raw evaluation outputs. (2) Authenticate institutional identities. (3) Publish reproducible dataset splits, model settings and outcome-level metrics.

**Entry_03.** Its accounting-to-action pipeline is concrete and readable. One fictional firm's data and a self-authored task pack do not establish performance across messy SME bookkeeping systems.
**Fixes:** (1) Complete required submission artifacts. (2) Evaluate unseen companies, inconsistent ledgers and different invoice formats. (3) Strengthen independent approval identity and signature enforcement.

**Entry_04.** The shared core and reproducible sandbox are good foundations for continued development. The assertion-count mismatch is minor by itself, but perfect scripted results and a mock model still limit the evidence.
**Fixes:** (1) Record real-LLM workflows and provide the video. (2) Use an unseen multi-user bill corpus with both error rates. (3) Regenerate consistent evidence counts from a frozen release.

**Entry_05.** The recorded transfer chain is useful, and the live-model report admits quality failures. The broader treasury and RL story needs realistic evaluation before I would regard it as a differentiated system.
**Fixes:** (1) Supply official technical documentation and missing media. (2) Evaluate treasury/timing decisions against simple baselines on unseen data. (3) Broaden reproducible live-model and execution-failure logs.

**Entry_06.** This is the strongest assembled system with a relatively clear evidence schema. The credit model is evaluated in a synthetic world whose assumptions may favour the scoring rules it is meant to test.
**Fixes:** (1) Use independently generated or real held-out counterparty histories. (2) Extend live-model attack and benign evaluation. (3) Version bureau datasets/configurations and test drift plus operational governance.

**Entry_07.** The evidence journals and bounded-loss computation are inspectable. The public key ceiling and reliance on narrow recordings outweigh the amount of adversarial demonstration material.
**Fixes:** (1) Retire public credentials and isolate attack modes. (2) Complete required media. (3) Publish a held-out workload and reproducible fresh-model runs with both error rates.

**Entry_08.** It separates component metrics more honestly than a single perfect attack score would suggest. Synthetic telemetry and a disconnected settlement script remain major obstacles to evaluating the proposed fleet system as a whole.
**Fixes:** (1) Integrate model, telemetry and value-moving execution with a recorded video. (2) Replace public actor identities. (3) Validate on independently collected flight and lease data with drift tests.

**Entry_09.** The raw run records and explicit failure/exclusion accounting are useful. Repeated runs over a handful of authored scenarios are still not evidence of general document or institution coverage.
**Fixes:** (1) Close the authenticated-approval gap. (2) Complete the deck/video package. (3) Freeze configurations and test unseen documents, institutions and provider outages.

**Entry_10.** The data-backed rehearsal is a credible product direction and the bilingual journeys are recorded. Fixed behavioural thresholds and rerun quota failures make the perfect completion figure narrower than it first appears.
**Fixes:** (1) Validate behavioural thresholds and live-model safety on held-out users. (2) Correct official templates and video length. (3) Persist versioned market inputs, sessions and audit records durably.

**Ranking statement.** Entry_06 ranks first for assembled system depth and evidence organization. Entry_10 follows because its completed user journey is supported by records and supplied materials. Entry_01 is third because its engineering and metadata are substantial, although its language evaluation is weaker than its infrastructure. Entry_08's transparent component metrics help it relative to less differentiated entries, but do not close the integration gap. I discounted repeated success on self-authored scenarios across every entry.

## J5 — Databases and big data

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.8 | 7.4 | 7.6 | 3.0 | 71.2 | 3 |
| Entry_02 | 3.5 | 4.0 | 7.2 | 0.0 | 47.6 | 10 |
| Entry_03 | 5.7 | 6.4 | 7.8 | 0.5 | 65.9 | 4 |
| Entry_04 | 5.8 | 7.0 | 6.6 | 0.0 | 64.0 | 5 |
| Entry_05 | 5.7 | 6.8 | 5.7 | 2.5 | 62.8 | 7 |
| Entry_06 | 8.5 | 8.0 | 8.5 | 3.0 | 86.5 | 1 |
| Entry_07 | 5.5 | 4.5 | 6.2 | 2.5 | 56.6 | 9 |
| Entry_08 | 5.5 | 4.1 | 8.9 | 2.5 | 63.5 | 6 |
| Entry_09 | 5.8 | 4.0 | 8.4 | 0.5 | 60.9 | 8 |
| Entry_10 | 8.0 | 6.9 | 7.8 | 0.0 | 76.1 | 2 |

**Entry_01.** Round-trip mandate verification and multiple enforcement layers give the audit story substance. A hash or generated report is not automatically trustworthy when fields are stale or the originating authority is controlled by the same operator.
**Fixes:** (1) Complete the missing media. (2) Produce one consistent signed release/evidence manifest with live-model runs. (3) Separate supervisory authority and test audit recovery and within-mandate induced payments.

**Entry_02.** Signed certificates and rule re-evaluation are useful integrity mechanisms. They cannot establish institutional accountability if anyone can obtain the bank or regulator role and the execution records are absent.
**Fixes:** (1) Authenticate privileged identities. (2) Supply official deliverables and raw signed execution records. (3) Test revocation, replay and changed-rule handling against an independently checked dataset.

**Entry_03.** The cash-flow and financing application workflow has clear social value for small suppliers. The audit trail is helpful, but a server-held role signature is weaker than the claim of two independently accountable people.
**Fixes:** (1) Complete the required documents/media. (2) Require distinct identities and verify both signatures before execution. (3) Validate PRC bookkeeping and financing cases with independently anchored audit recovery.

**Entry_04.** Local processing, deletion and consent are tangible strengths. Client-side audit and authorization are appropriate for a local demonstration but do not prove integrity against a compromised customer device.
**Fixes:** (1) Supply real-model evidence and the full video. (2) Place financial authorization and durable audit in a trusted service. (3) Test unseen benign/hostile bills and reconcile the reported assertion counts.

**Entry_05.** Its payment receipts and owner signatures give an inspectable transaction history. The submission does less to explain lawful domestic operation and durable accounting than it does to demonstrate testnet transfers.
**Fixes:** (1) Supply missing official documentation and media. (2) Implement a jurisdiction/regulated-rail boundary. (3) Test durable audit reconciliation, reserve enforcement and interrupted execution.

**Entry_06.** The receipt verifier and evidence-linked grade records are strong reproducibility features. They establish what the system recorded, not whether a counterparty's claimed service was useful or the bureau was independent.
**Fixes:** (1) Add independently labelled delivery/default outcomes and grade validation. (2) Separate bureau authority and exercise dispute/audit recovery. (3) Expand real-model end-to-end attack and benign evidence.

**Entry_07.** The lifetime spending budget is more interpretable than a dashboard of disconnected limits. However, public active credentials and absent submission media materially reduce confidence in the whole entry.
**Fixes:** (1) Rotate published keys and confine compromise tests offline. (2) Deliver the missing deck and video. (3) Validate authenticated owner actions and event-ledger consistency across failures.

**Entry_08.** Work-based repayment and distinct vendor/pilot liability are meaningful ideas. The distinction between an anchored event and a settled obligation is fundamental here, and the current app does not close it.
**Fixes:** (1) Integrate actual settlement into the recorded model workflow and provide the video. (2) Replace public actor keys with accountable signers. (3) Validate real lease/telemetry records and the proposed licensed operating model.

**Entry_09.** The family-facing workflow has substantial social value and useful audit events. The approval route undermines the identity of the actor recorded as having authorized a payment.
**Fixes:** (1) Authenticate approvers and remove the omitted-identity fallback. (2) Supply the deck and accessible video. (3) Add a project licence and durable, access-controlled audit reconciliation.

**Entry_10.** I can follow the provenance of calculations and the human confirmation token. Ephemeral hosted audit storage and an unvalidated behavioural mapping keep the integrity story short of production quality.
**Fixes:** (1) Use durable audit/state with authenticated lifecycle controls. (2) Validate rehearsal inference and live-model safety independently. (3) Fix document/video compliance and add a project licence.

**Ranking statement.** Entry_06 leads on traceability from action to receipt to derived grade. Entry_10 is second because the client workflow and calculation provenance are coherent. Entry_01 is third, with strong verification mechanisms but missing materials and uneven evidence consistency. Entry_03 receives more credit from me for its SME value than from jurors focused on autonomous machines. I treated public-chain hashes as records of claims, never as proof of regulatory compliance or real-world service quality.

## J6 — Econometrics and machine learning in finance

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.4 | 6.1 | 6.8 | 2.5 | 62.8 | 3 |
| Entry_02 | 3.0 | 4.0 | 6.7 | 0.0 | 44.1 | 10 |
| Entry_03 | 5.3 | 5.6 | 7.4 | 0.0 | 60.2 | 6 |
| Entry_04 | 5.5 | 6.1 | 5.8 | 0.0 | 57.7 | 8 |
| Entry_05 | 5.6 | 6.5 | 5.6 | 2.5 | 61.2 | 5 |
| Entry_06 | 8.0 | 7.2 | 7.7 | 2.5 | 79.2 | 1 |
| Entry_07 | 5.2 | 4.4 | 5.8 | 2.0 | 53.4 | 9 |
| Entry_08 | 5.3 | 4.6 | 8.4 | 2.0 | 62.2 | 4 |
| Entry_09 | 5.7 | 4.2 | 8.0 | 0.0 | 59.4 | 7 |
| Entry_10 | 8.0 | 6.8 | 7.5 | 0.0 | 74.9 | 2 |

**Entry_01.** Reporting within-mandate attack successes is more informative than claiming every attack was blocked. But the benchmark uses rules, and neither zero observed losses nor a held-out attack family proves live-model safety or acceptable false refusals.
**Fixes:** (1) Supply complete media and recorded live-model tasks. (2) Publish a frozen held-out attack/benign evaluation with uncertainty intervals. (3) Test whether within-mandate controls reduce loss without rejecting legitimate payments.

**Entry_02.** The allocation constraints are a sensible formalization of a limited problem. Claimed precision, recall and live-session success without result files receive no evidentiary credit from me.
**Fixes:** (1) Supply official artifacts and raw evaluation records. (2) Replace unauthenticated role issuance. (3) Freeze unseen client/product cases and report both suitability misses and false refusals.

**Entry_03.** Timing financing to a cash shortfall is financially meaningful. I cannot infer forecast accuracy or financing suitability from one generated company whose narrative the system already knows.
**Fixes:** (1) Complete required documents and media. (2) Backtest forecasts and true financing cost on unseen companies. (3) Enforce independent approval identity and signatures before actions.

**Entry_04.** The software may be useful without a generative model, but that is different from validating an AI financial participant. Perfect authored scenarios do not show whether the nudges improve finances or whether ordinary requests are overblocked in the wild.
**Fixes:** (1) Record real-model tasks and provide the video. (2) Measure held-out attack misses and benign refusals. (3) Run a controlled study of savings, engagement and potentially harmful nudges.

**Entry_05.** The live report's quality misses and retesting are welcome disclosures. Neither tiny transfers nor tuned scenarios establish that treasury optimization beats a simpler scheduler.
**Fixes:** (1) Supply the missing submission artifacts. (2) Compare treasury/RL decisions with baselines on untouched financial data. (3) Run prospective model/attack/benign tests without silently replacing failures.

**Entry_06.** The implementation is well evidenced, but synthetic credit AUC should not be read as real credit validity. Delivery claims, related counterparties and the constructed world can make a score look predictive without measuring useful economic risk.
**Fixes:** (1) Evaluate grades on independently labelled, out-of-sample counterparties. (2) Stress collusion, censoring and correlated defaults with both error rates. (3) Record real-model adversarial trials and all provider failures.

**Entry_07.** Bounded loss is measurable and useful, but the performance evidence is narrow. The exposed active key imposes the ceiling even if the expected loss is deliberately limited.
**Fixes:** (1) Rotate the public key and isolate compromise tests offline. (2) Supply missing deck/video. (3) Evaluate fresh model decisions on an untouched workload, reporting false refusals and attack successes.

**Entry_08.** I value the explicit 3% oracle false-alarm rate and the modest 69-yuan MDP gain. Those honest numbers still come from synthetic data, and neither a zero miss count nor conformal terminology establishes field performance.
**Fixes:** (1) Integrate real-model contract execution and provide the video. (2) Replace publicly derivable identities. (3) Validate detection and lease outcomes prospectively on real flights, including confidence intervals and costs.

**Entry_09.** Its report retains two failures and explains exclusions, which is better than a bare 100% claim. The small scenario set, evolving configuration and one-shot attacks still leave generalization and availability uncertain.
**Fixes:** (1) Close the unauthenticated approval path. (2) Supply missing deck and accessible video. (3) Run a frozen prospective evaluation including outages, benign false alarms and unseen institutions.

**Entry_10.** Historical returns make the exercise concrete, but fixed drawdown thresholds are not validated measures of investor preference. Rerun quota failures also mean 30/30 should not be interpreted as an unconditional completion probability.
**Fixes:** (1) Validate behavioural inference on independent users and multiple market episodes. (2) Report prospective completion and live security results including outages. (3) Correct the official document layout and video duration.

**Ranking statement.** Entry_06 remains first because strong execution evidence survives my discount for synthetic statistical validity. Entry_10 is second, with a complete workflow but an unproven behavioural claim. Entry_01 is third because its report reveals residual attack success and useful denominators, despite the absent live benchmark. Entry_08 rises to fourth for honest component error reporting and a distinct economic hypothesis. No perfect self-written test result was treated as proof of out-of-sample performance.

## J7 — Digital assets and reproducible research

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.7 | 6.7 | 7.3 | 3.0 | 67.8 | 3 |
| Entry_02 | 2.9 | 4.1 | 6.8 | 0.0 | 44.3 | 10 |
| Entry_03 | 5.2 | 5.9 | 6.9 | 0.0 | 59.2 | 7 |
| Entry_04 | 5.8 | 6.8 | 6.2 | 0.0 | 62.2 | 6 |
| Entry_05 | 5.9 | 7.2 | 6.1 | 3.0 | 66.5 | 4 |
| Entry_06 | 8.6 | 8.1 | 8.6 | 3.5 | 88.0 | 1 |
| Entry_07 | 5.6 | 4.8 | 6.4 | 3.0 | 59.0 | 8 |
| Entry_08 | 5.4 | 4.3 | 8.6 | 2.5 | 62.8 | 5 |
| Entry_09 | 5.5 | 4.1 | 7.7 | 0.0 | 57.4 | 9 |
| Entry_10 | 7.9 | 6.9 | 7.7 | 0.0 | 75.4 | 2 |

**Entry_01.** The verification tooling and explicit test-mode metadata are substantial strengths. Missing presentation artifacts, unverified external history and internally stale generated statements keep the release short of a reproducible final submission.
**Fixes:** (1) Supply deck/video and a frozen evidence package. (2) Reproduce live-model payment runs with consistent source and artifact hashes. (3) Audit key custody, privacy misses and within-mandate induced transfers.

**Entry_02.** I can inspect the proposed verification mechanism, but not reproduce the claimed empirical results from stored outputs. A permissive licence is useful; it does not compensate for missing required artifacts or self-issued privileged roles.
**Fixes:** (1) Include official deliverables, datasets and raw run outputs. (2) Authenticate role issuance. (3) Publish exact model/configuration provenance and an independent bilingual holdout.

**Entry_03.** The risk disclosures make the limitations easier to audit. The custom noncommercial licence permits evaluation but complicates continuation, while missing artifacts and server-held approval identities remain more immediate problems.
**Fixes:** (1) Complete the required technical/deck/video package. (2) Enforce independent, verified approval signatures. (3) Clarify commercial licensing and publish reproducible unseen-company evaluation.

**Entry_04.** A deterministic evidence runner is reproducible, and the mock-provider disclosure is clear. It proves the sandbox checks, not the claimed behaviour of a real model, and the assertion totals should agree across documents.
**Fixes:** (1) Supply real-model traces and an accessible full video. (2) Freeze and reconcile report counts and source revision. (3) Publish held-out error rates and a trusted financial-authorization design.

**Entry_05.** The saved receipts, model identifiers and owner-authorized transfers are a comparatively focused evidence chain. I still cannot substitute references to separately submitted documents for the actual required files.
**Fixes:** (1) Include the technical document, deck and video. (2) Package reproducible transfer/LLM traces with consistent revisions. (3) Validate reserve controls and explain legally supportable deployment boundaries.

**Entry_06.** The offline verifier is the most convincing reproducibility aid in the set. Its success establishes internal receipt consistency; independent chain verification, external delivery labels and bureau governance remain separate questions.
**Fixes:** (1) Supply independently corroborated chain/service outcomes and held-out grade validation. (2) Record live-model adversarial execution beyond mock demonstrations. (3) Harden signer/bureau governance and document the licensed operating path precisely.

**Entry_07.** A publicly testable bounded-loss claim is intellectually clear. Under this rubric, however, an active disclosed private key is still a serious failure, and the release lacks its required media.
**Fixes:** (1) Retire public keys and restrict compromise experiments to offline mode. (2) Package the missing deck/video. (3) Publish a frozen fresh-model evaluation and precise regulatory assumptions.

**Entry_08.** The report correctly separates event anchors from the nine value-moving contract calls. That honesty helps, but the main engine's public keys and template explanations prevent the separate script from proving a secure autonomous agent.
**Fixes:** (1) Integrate real-model-to-contract execution and supply video. (2) Replace derivable signing identities. (3) Reproduce telemetry/lease results on external data and verify legal operating assumptions.

**Entry_09.** The retained logs and disclosed exclusions make the evaluation inspectable. The approval bypass and absent project licence are concrete obstacles to trusting or continuing the work.
**Fixes:** (1) Remove approval bypasses and authenticate payer identity. (2) Supply deck/video and a project licence. (3) Publish frozen prospective runs with both error rates and all availability failures.

**Entry_10.** The submitted media and raw journeys support a serious prototype. The absent project licence, video overrun and unvalidated rehearsal inference keep it below the strongest reproducibility standard.
**Fixes:** (1) Validate behavioural inference and live adversarial performance on a frozen holdout. (2) Correct templates/video and add a project licence. (3) Make market-data, session and audit reconstruction durable and reproducible.

**Ranking statement.** Entry_06 is first because it provides the strongest self-contained verification path. Entry_10 follows on completeness, despite licensing and evaluation limitations. Entry_01 is third because its verification architecture is substantial but the final package is incomplete. Entry_05 benefits from focused transaction evidence, while Entry_09 loses ground on its approval route and licence gap. I did not infer external deployment success from an explorer URL or a hosted-site claim.

## J8 — Evolutionary robotics

| Entry | TC | SC | IN | Bonus | Total | Rank |
|---|---:|---:|---:|---:|---:|---:|
| Entry_01 | 5.9 | 6.8 | 8.2 | 3.0 | 71.6 | 3 |
| Entry_02 | 3.4 | 4.4 | 7.3 | 0.0 | 48.7 | 10 |
| Entry_03 | 5.4 | 6.0 | 7.0 | 0.0 | 60.6 | 9 |
| Entry_04 | 5.7 | 6.5 | 6.8 | 0.0 | 62.7 | 6 |
| Entry_05 | 5.8 | 7.1 | 5.8 | 2.5 | 64.4 | 5 |
| Entry_06 | 8.6 | 8.0 | 9.3 | 3.5 | 89.8 | 1 |
| Entry_07 | 5.7 | 4.9 | 7.2 | 3.0 | 62.1 | 7 |
| Entry_08 | 5.7 | 4.7 | 9.4 | 2.5 | 67.6 | 4 |
| Entry_09 | 5.8 | 4.5 | 8.0 | 0.0 | 60.7 | 8 |
| Entry_10 | 8.1 | 7.1 | 8.4 | 0.5 | 79.4 | 2 |

**Entry_01.** Private, inspectable mandates across different rails are a substantial mechanism rather than just a chat interface. The language-to-action evidence and residual within-mandate harm are weaker than the conceptual architecture.
**Fixes:** (1) Complete media with a recorded real-model action loop. (2) Demonstrate safer adaptation against within-mandate induced transfers. (3) Evaluate the private-mandate mechanism against simpler controls on unseen tasks.

**Entry_02.** Repairing a proposed action into the nearest permitted one is an interesting constrained-agent mechanism. Missing empirical artifacts and freely chosen privileged roles prevent the concept from becoming a demonstrated safe actor.
**Fixes:** (1) Supply mandatory deliverables and raw execution evidence. (2) Authenticate privileged roles. (3) Compare repair-based interaction with refusal-only baselines on unseen dialogue.

**Entry_03.** This is useful automation for a human business, with meaningful correction and approval. Its concepts are less distinctive than the best machine-economic mechanisms, and the approval identity remains too dependent on the server.
**Fixes:** (1) Complete the required submission artifacts. (2) Bind approvals to independent identities and verify them at execution. (3) Demonstrate adaptive planning across unseen SME disruptions and financing choices.

**Entry_04.** The dream-linked interface gives the agent a recognisable interaction style. Without a recorded real model or user study, I cannot tell whether it improves agency or merely repackages deterministic budgeting.
**Fixes:** (1) Supply live-model task evidence and full video. (2) Test clarification, correction and benign/hostile inputs outside the scripted set. (3) Measure behavioural value and place financial authorization in a trusted service.

**Entry_05.** The transfer pipeline is competent and reasonably constrained. Signed grants, allowlists and scheduled payments are established patterns, so I need a demonstrated decision mechanism beyond them to award high innovation.
**Fixes:** (1) Supply the missing official technical/deck/video package. (2) Demonstrate a useful treasury decision policy against simple unseen-case baselines. (3) Enforce critical reserve controls and test live failure recovery.

**Entry_06.** Agents earning and losing autonomy through evidence-backed economic interaction is the strongest machine-actor concept in this set. It is also implemented far enough to inspect, though synthetic credit and trust concentration leave its ecology unvalidated.
**Fixes:** (1) Validate autonomy/grades in unseen multi-agent populations with independent service labels. (2) Add real-model adversarial loops and correlated-failure trials. (3) Decentralize or independently govern bureau authority and disputes.

**Entry_07.** A visible lifetime loss budget and contestable creditor claims make safety legible to the owner. They extend common wallet patterns rather than creating a wholly new actor, and the public key still invokes the security ceiling.
**Fixes:** (1) Rotate the active public key and isolate compromise demonstrations offline. (2) Supply the missing deck/video. (3) Test fresh-model negotiation and correction under unseen owner constraints.

**Entry_08.** The machine-work, lease and liability loop is the most original scenario here. Its high conceptual score cannot erase the fact that the main app anchors a simulation, uses public actor identities and has no recorded real-model explanation run.
**Fixes:** (1) Integrate real-model decisions with value-moving contracts and supply video. (2) Replace public actor keys with independent secure signers. (3) Validate adaptive repayment and fault attribution using real telemetry and counterparties.

**Entry_09.** The long family-payment workflow gives the agent a useful role beyond answering questions. I like the recovery and refund behaviour, but a bypass around the human approval boundary is a fundamental safety defect.
**Fixes:** (1) Authenticate every approval path and remove the identity omission shortcut. (2) Complete the deck/video package. (3) Test correction and recovery on unforeseen institutions, frauds and payment failures.

**Entry_10.** Rehearsal lets the user interact with consequences before committing money, which is a meaningful design choice. Its inference about risk tolerance is still an assumption, and live adversarial behaviour needs testing.
**Fixes:** (1) Validate rehearsal-driven adaptation with independent users and varied crises. (2) Record live-model attacks, corrections and graceful fallback. (3) Correct template/video compliance and provide durable audit plus a project licence.

**Ranking statement.** Entry_06 wins because the new economic-actor idea is connected to a substantial operational loop. Entry_10 follows for its interactive rehearsal and completed advisory journey. Entry_01 is third for the private, cross-rail mandate mechanism. Entry_08 receives my highest IN score but remains fourth overall because implementation and identity gaps carry real weight. I did not treat ordinary caps, signatures, escrow or attack suites as novel in themselves.

# Phase 3 — Aggregation

| Entry | Mean TC | Mean SC | Mean IN | Mean Bonus | Mean Total | Min–max Total | J1 | J2 | J3 | J4 | J5 | J6 | J7 | J8 |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Entry_06 | 8.44 | 7.84 | 8.49 | 3.06 | 85.79 | 79.2–89.8 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 |
| Entry_10 | 8.09 | 7.10 | 7.95 | 0.31 | 77.81 | 74.9–81.5 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 |
| Entry_01 | 5.71 | 6.79 | 7.46 | 2.88 | 68.48 | 62.8–71.6 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 3 |
| Entry_05 | 5.79 | 6.99 | 5.93 | 2.69 | 64.58 | 61.2–69.6 | 6 | 5 | 4 | 4 | 7 | 5 | 4 | 5 |
| Entry_08 | 5.43 | 4.36 | 8.75 | 2.31 | 63.35 | 60.2–67.6 | 5 | 8 | 9 | 5 | 6 | 4 | 5 | 4 |
| Entry_04 | 5.78 | 6.78 | 6.49 | 0.00 | 62.89 | 57.7–65.8 | 7 | 3 | 5 | 6 | 5 | 8 | 6 | 6 |
| Entry_03 | 5.50 | 6.00 | 7.39 | 0.19 | 62.35 | 59.2–65.9 | 4 | 6 | 6 | 8 | 4 | 6 | 7 | 9 |
| Entry_09 | 5.80 | 4.26 | 8.14 | 0.25 | 60.65 | 57.4–63.0 | 8 | 7 | 7 | 7 | 8 | 7 | 9 | 8 |
| Entry_07 | 5.48 | 4.63 | 6.30 | 2.56 | 57.24 | 52.8–62.1 | 9 | 9 | 8 | 9 | 9 | 9 | 8 | 7 |
| Entry_02 | 3.23 | 4.13 | 7.01 | 0.00 | 46.31 | 44.1–48.7 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 |

## Consensus by entry

Fixes below are ordered by likely weighted score benefit, not merely by frequency. TC improvements count four times; SC and IN count three times. Removing a ceiling only permits reassessment—it does not automatically earn a higher score. Estimated priorities are qualitative; the jury did not run counterfactual implementations.

**Entry_06 — first overall.** Strengths: most complete package; inspectable signer/policy/contract loop; unusually useful offline verification; differentiated earned-autonomy mechanism. Weaknesses: synthetic credit validity, claimed versus useful delivery, central bureau trust and mock hijack steps. Priorities: (1) independently labelled, unseen credit/service outcomes (8/8 jurors); (2) broader real-model attack/failure execution (8/8); (3) stronger bureau/signer governance and institutional operating design (6/8). The first two can improve TC, SC and IN together.

**Entry_10 — second.** Strengths: completed bilingual advisory journey, conservative rehearsal adaptation, deterministic calculations and bound confirmation tokens. Weaknesses: unvalidated behavioural inference, offline-only red-team evidence, rerun availability failures, ephemeral hosted records, no project licence, custom templates and a 1.68-second video overrun. Priorities: (1) independent behavioural/live-model validation (8/8); (2) durable operational state/audit (7/8); (3) submission-format/video corrections (8/8), including licence clarification (5/8). The small video overrun alone would not produce a large score gain.

**Entry_01 — third.** Strengths: inspectable multi-layer enforcement, cross-rail/private-mandate mechanism and frank residual-risk reporting. Weaknesses: missing media, rules-only benchmark, measured privacy misses, within-mandate induced payments and stale evidence text. Priorities: (1) complete media and a traceable real-model task loop (8/8); (2) address privacy/within-mandate/security-boundary weaknesses (6/8 explicitly); (3) frozen, broader outcome evaluation and consistent evidence provenance. Common cryptographic controls alone do not justify additional IN credit.

**Entry_05 — fourth.** Strengths: recorded model-drafted, owner-authorized and grant-based value-moving calls; clear contract limits; candid model-quality findings. Weaknesses: missing required artifacts, narrow tiny-value evidence, backend-only critical controls, conventional wallet mechanisms and weak jurisdictional realization. Priorities: (1) supply official technical document, deck and video (8/8); (2) strengthen trusted reserve/control enforcement (5/8); (3) broaden unseen treasury/baseline and live execution evaluation. A concrete regulated operating route was explicitly requested by 4/8.

**Entry_08 — fifth.** Strengths: distinctive agricultural lease/liability scenario; separate component error rates; concrete proposed PRC/HK role separation. Weaknesses: main engine anchors simulations, separate value-moving script, public actor keys, template-only recorded model path and absent video. Priorities: (1) integrate real-model decisions with contract settlement and supply the video (8/8); (2) independent secure actor identities (8/8); (3) real telemetry/lease outcome validation (8/8). Integration offers the largest TC opportunity; key repair is necessary to remove the SC ceiling.

**Entry_04 — sixth.** Strengths: coherent permitted sandbox task completion, consent/minimization, correction/undo and reproducible scenario evidence. Weaknesses: mock-only recorded LLM, client-controlled authority, scripted evaluation, unmeasured behavioural benefit and inconsistent assertion totals. Priorities: (1) recorded real-model tasks and accessible video (8/8); (2) trusted financial authorization/audit boundary (6/8); (3) broader task/safety or behavioural evaluation (8/8), including held-out paired error tests explicitly requested by 6/8.

**Entry_03 — seventh.** Strengths: practical SME cash-flow/financing workflow, deterministic cost/timing reasoning, recorded model tasks and candid limitations. Weaknesses: missing required media/official technical packaging, server-held role keys, weak distinct-person assurance, narrow fictional EUR company and incomplete domestic validation. Priorities: (1) complete required submission (8/8); (2) independent approval identities and execution-time signature verification (8/8); (3) realistic unseen-company/domestic or network-failure evaluation (8/8). Commercial licence clarity is a secondary continuation issue, not a substitute for these fixes.

**Entry_09 — eighth.** Strengths: useful extended medical/tuition workflow, real-model sandbox logs, recovery/refund behaviour and disclosed failures/exclusions. Weaknesses: public approval fallback defeats payer identity, missing deck, unchecked video, no project licence and narrow evolving evaluation. Priorities: (1) remove the approval bypass and authenticate all privileged paths (8/8); (2) complete deck/video package (8/8); (3) frozen unseen-case, privacy or operational-failure validation (7/8). Preserve recorded failures and report provider availability separately rather than silently excluding it.

**Entry_07 — ninth.** Strengths: explicit lifetime loss budget, inspectable contract controls, creditor contest window and transparent adversarial framing. Weaknesses: active public private key, missing deck/video, narrow replay-based evaluation and limited differentiation beyond wallet controls. Priorities: (1) retire exposed credentials and confine compromised modes offline (8/8); (2) supply required presentation/video (8/8); (3) fresh-model, unseen-task evaluation (6/8 explicitly), with authenticated owner/audit controls and regulated relevance. The bounded-loss design does not waive the rubric's key-exposure ceiling.

**Entry_02 — tenth.** Strengths: substantive Z3 verification/repair, signed compliance scope, local-model architecture and execution rechecks. Weaknesses: missing official artifacts/raw claimed results, freely selected bank/regulator identities and unsupported empirical performance claims. Priorities: (1) provide mandatory artifacts and recorded reproducible execution/evaluation evidence (8/8); (2) authenticate institutional roles (8/8); (3) independent bilingual/client/product evaluation with both error directions (8/8). This ranking reflects the uploaded package, not a conclusion that the unverified system could not work.

## Arithmetic and rank audit

All 80 totals were recomputed using decimal arithmetic from the submitted sub-scores. All eight rank lists are strictly descending with no ties, and each contains ranks 1–10 exactly once. Every score is within range; Entries_02, _07, _08 and _09 have SC ≤ 5.0 in every sheet. Each mean total equals 4 × mean TC + 3 × mean SC + 3 × mean IN + mean Bonus using unrounded values. Displayed aggregate means are rounded to two decimals; the CSV retains exact means. J2's within-pass tie was resolved in its final TC judgment before the final arithmetic audit; no cross-juror harmonization was performed.
