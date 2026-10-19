# Judge review

Updated 19 Oct. This replaces the earlier review of ideas 1 to 12.

This is a simulation, not real scores. Assumption: the eight mentors on site are also the jury. Each mentor was simulated separately with a persona built from their public profile, and all eight used the official rubric. They scored the ten strongest public entries on GitHub as they stood on 18 Oct, and 22 of our ideas (the twelve from this file's earlier version plus ten new ones) by their potential, meaning delivered as described. Use the numbers to compare ideas with each other, not as a forecast of the final result. Ideas 13 to 25 in IDEAS.md (North Claim to Agent Auditor) were added later and are not part of this review yet. Some overlap with reviewed ideas: Renqing Ledger (24) with the relationship ledger, Agent Auditor (25) with agent liability insurance.

## Scoring criteria

| Criterion | Weight | What moves the score |
|---|---|---|
| Task completion | 40 % | The core action really runs (not mocked). Evidence: sandbox logs and video for A to E, real on-chain transaction hashes for F. Depth of the scenario, tests, live LLM runs. |
| Security and compliance | 30 % | Permission tiers enforced in code, injection and hallucination defence, security self-assessment with measured attack tests, fit with CN and HK regulation. |
| Innovation and interaction | 30 % | A mechanism the field does not have yet, plus usability and a demo that lands. |
| Topic F bonus | 0 to 5 points | Topic F only. |

Score used below: 4 × TC + 3 × SC + 3 × IN + bonus, each criterion 0 to 10, so at most 105.

Core requirements for every topic: permission hierarchy, hallucination prevention and injection defence, intent understanding, task planning. Deliverables: technical documentation, deck (at most 10 minutes), demo video (at most 5 minutes), source code with README and tests, security self-assessment, execution evidence. Prizes are awarded across all topics, not per topic: 1st (100k RMB), 2nd (80k), 3rd (50k), Best Innovation (20k), plus Excellence certificates.

What the field already ships, and therefore earns no innovation points on its own: a deterministic policy engine outside the LLM, approvals bound to the exact action, hash-chained audit logs, red-team suites, spending mandates, escrow, agent-to-agent payments, session keys.

## The jury

| Mentor | Background | Looks for | Would champion |
|---|---|---|---|
| Wang Shouyang | CAS, systems science, economic forecasting | Economic mechanism, real economy, SME finance, regulatory realism | Robot pays for itself |
| Qiang Yang | WeBank Chief AI Adviser, HKUST, federated learning | Deployable in a regulated bank, privacy, real actions for underserved users; punishes name-dropping | Federated price defence |
| Li Wenrong | CityU HK, robotics, MEMS, cyber-physical systems | Closed loop from sensor to actuator, validated, defined failure behaviour | Robot pays for itself |
| Li Jianqiang | SZU, Dean of AI, big-data systems | Data engineering, measured evaluation on realistic data, Shenzhen ecosystem | Robot pays for itself |
| Chai Yunpeng | Renmin University, databases and big data | Data integrity, audit trail, PRC regulation, social value | Digital Qiaopi |
| Dacheng Xiu | Chicago Booth, econometrics and ML in finance | Out-of-sample evaluation, correct finance theory, honest error rates | Own the robot that replaces you |
| Wolfgang Karl Härdle | Humboldt-Universität, digital assets, reproducible research | Reproducible code and data, sound statistics, correct legal citations | Own the robot that replaces you |
| Joshua Bongard | University of Vermont, evolutionary robotics | Genuinely new concepts, machines as economic actors, safety from design | Robot pays for itself |

## The field: the ten strongest public entries (as they stand on 18 Oct)

| # | Entry | Topic | Score | TC | SC | IN | What it is |
|---|---|---|---|---|---|---|---|
| 1 | shenzhen-comp | F | 89.2 | 8.9 | 8.4 | 8.0 | Agent Credit Bureau: pays other AI agents by recomputable on-chain credit grades, autonomy tiers earned and lost |
| 2 | leash | F | 83.2 | 7.7 | 8.8 | 7.3 | LLM proposes, policy engine decides, vault contract enforces; agent key published as a challenge |
| 3 | carrypay | C | 80.7 | 8.5 | 8.5 | 7.1 | Live agent paying hospital and university bills abroad, cited FX rule packs, passkey approvals |
| 4 | YINGLONG | F | 77.7 | 6.7 | 8.2 | 7.4 | Mandates compiled into ERC-7710 delegations, 14 enforcers, Base Sepolia and FISCO BCOS |
| 5 | keel | B | 75.6 | 7.9 | 7.0 | 7.6 | Wealth advisor with "crash rehearsal" suitability and enforced risk classes |
| 6 | runway | E | 73.4 | 7.9 | 7.9 | 5.9 | SME finance officer: 13-week forecast, T0 to T4 rules engine, signed two-person approvals |
| 7 | fintechaton_signet | B | 73.0 | 6.1 | 8.3 | 7.9 | Advice drafts must pass a rule and Z3 verifier citing NFRA and HK rules |
| 8 | AgentWallet | F | 65.2 | 6.2 | 7.1 | 5.4 | Treasury wallet with owner approvals verified on chain |
| 9 | fundbun | A | 63.8 | 6.6 | 6.7 | 5.8 | Budgeting agent with a 5-tier policy engine |
| 10 | DuitDuit | E | 63.4 | 6.1 | 7.4 | 5.7 | SME back office for a Malaysian importer |

All eight mentors put the same five entries in their top five (shenzhen-comp, leash, carrypay, YINGLONG, keel; Qiang Yang swapped YINGLONG for runway). Entries per topic: A 17, B 10, C 28, D 2, E 35, F 21 (113 in total).

## Our ideas: potential if delivered as described

| Idea | Topic | Potential | TC | SC | IN | Rank among the ten above |
|---|---|---|---|---|---|---|
| Digital Qiaopi (idea 26) | C | **83.1** | 7.9 | 8.4 | 8.8 | 3rd |
| Robot pays for itself (idea 27) | F (E story) | **81.9** | 7.8 | 7.5 | 8.7 | 3rd |
| Hidden Coverage (ideas 10 and 29) | D | **81.4** | 8.1 | 8.2 | 8.1 | 3rd |
| Guardian Wallet (ideas 3 and 28) | A / F | 79.3 | 8.1 | 8.7 | 6.6 | 4th |
| Huaqiangbei Escrow | F | 79.1 | 7.8 | 7.6 | 7.1 | 4th |
| Own the robot that replaces you | B | 78.2 | 7.3 | 7.9 | 8.4 | 4th |
| Federated price defence | F / A | 77.9 | 6.9 | 7.8 | 8.6 | 4th |
| Second Opinion (idea 12) | D | 77.7 | 7.6 | 8.1 | 7.7 | 4th (tie) |
| Agent liability insurance | D | 77.2 | 6.9 | 7.8 | 8.8 | 5th |
| Machine Wallet | F | 75.7 | 7.1 | 7.1 | 7.5 | 5th |
| Odysseus wallet | A | 74.9 | 7.8 | 8.3 | 6.3 | 6th |
| Self-Insure (idea 11) | D | 73.6 | 7.2 | 7.8 | 7.1 | 6th |
| Mandate Wallet | F | 72.8 | 7.6 | 8.2 | 4.7 | 8th |
| Relationship ledger (人情账) | A | 72.6 | 7.2 | 7.0 | 7.6 | 8th |
| Evidence notary | D | 71.6 | 7.1 | 7.8 | 6.6 | 8th |
| Hui Agent | F / A | 71.3 | 7.4 | 6.5 | 6.2 | 8th |
| RiderShield | D | 71.3 | 7.4 | 7.8 | 6.2 | 8th |
| Dye-pack wallet | F | 69.2 | 6.1 | 6.1 | 8.2 | 8th |
| Pension circle | B | 67.2 | 6.7 | 6.1 | 7.4 | 8th |
| Seller Cashflow Copilot | E | 66.2 | 7.6 | 7.3 | 4.7 | 8th |
| Bridge Advisor | B | 65.8 | 6.9 | 8.1 | 4.6 | 8th |
| Landing Day | C | 63.5 | 7.1 | 7.1 | 4.6 | 10th |

How to read this. The built entries are scored as they are; our ideas as they would be if fully delivered. When the jury also scored a realistic rough version, with the core action partly mocked and evaluation thin, the top four ideas lost 13 to 18 points each, almost all of it in task completion. So the ranking shows which idea has the most room, and the gap shows where the points are won: a real core action, measured results, real evidence.

Where we are strong: innovation. The new ideas score 8.4 to 8.8 there, higher than every built entry (the best has 8.0). Where we are weak: everything a judge can verify in the repository.

## The shortlist and what to improve

Full write-ups with the jury's points are in IDEAS.md, ideas 26 to 29.

**Digital Qiaopi (26).** Highest potential, top 3 for six of eight mentors. Improve: make the last mile (agent point, handover) real software instead of a story; refusal with call-back through the channel; licensing and SAFE limits on an early slide; voice consent under PIPL.

**Robot pays for itself (27).** Strongest support in deliberation (four champions). Improve: measured plausibility model with held-out data and false-alarm rate; one economics slide; a visible LLM role (invoices, incident explanation, rate negotiation); register under F with real hashes; a physical counter as the mechatronics differentiator.

**Hidden Coverage (29, revising 10).** Most balanced scores, Topic D almost empty. Improve: precision and recall of extraction on held-out policy wordings; rule packs as tested data, presented as cited sample rules; verify the NFRA citation; checkout guard against a real page; sandbox-only claim filing stated clearly.

**Guardian Wallet (28, revising 3).** Safest delivery and top security score, but low innovation. Improve: detection and false-alarm rates on held-out benign payments; a legitimate urgent payment passing in the demo; real Mandarin voice; consent authored by the elder; a new name; combine with Qiaopi as its whitelist.

## Improvement levers for the other ideas

- **Huaqiangbei Escrow.** The escrow itself is already in shenzhen-comp and YINGLONG. The contribution is the bilingual negotiation and the supplier-side injection red team; prove that the two negotiating agents are not one model prompted to agree. Keep the evidence check real, or a human clicking "received" closes the loop. Mainland suppliers cannot receive public tokens: frame settlement as a consortium chain or fiat.
- **Own the robot that replaces you.** Academically the cleanest (lifecycle portfolio theory). Source the automation-exposure index from a cited public dataset and show whether "automation winners" are really negatively correlated with the user's labour income. It advises without acting, so the explained allocation and suitability gate must carry the demo.
- **Federated price defence.** Only worth it if the federated part is a real secure-aggregation implementation on synthetic data. Handle confounding (time, location, device, demand) or the detector proves nothing. Never mention FATE unless it runs.
- **Second Opinion.** Evaluation is built in: precision of flags against held-out HK product brochures. Make the cooling-off cancellation and refund tracking real actions, or it stays an analyser.
- **Agent liability insurance.** The most systems-minded idea. Call the premium a rating, since there is no loss data. Argue the Topic D fit early or switch the framing.
- **Machine Wallet.** Needs a settlement-cost-per-delivery number, otherwise it is a map with scrolling hashes. The robot idea (27) is the stronger version of the same thought.
- **Odysseus wallet.** The invariant "the agent can only delay, never spend more" is liked by everyone. Differentiate through user-written rules compiled into the policy engine and measure the cancellation rate of held purchases.
- **Self-Insure.** Only with sourced per-peril loss frequencies and published sensitivity, otherwise advice to drop cover is harmful. Works as a module on Hidden Coverage.
- **Mandate Wallet.** Already shipped three times in the field with more depth. Use only as an internal component.
- **Relationship ledger.** Source the regional norm table, drop the "relational credit record" extension (reads as social scoring), handle third-party data.
- **Evidence notary.** Device attestation is the whole point and cannot be shown convincingly in a browser. Use as a module inside an insurance idea.
- **RiderShield.** Make the draft claim and the buffer sweep real actions and measure citation accuracy.
- **Seller Cashflow Copilot, Landing Day, Bridge Advisor.** The strongest built entries already do this in crowded topics. Not worth pursuing.
- **Hui Agent, pension circle, dye-pack wallet.** Drop. Mentors read them as informal lending, an unlicensed annuity and entrapment respectively.

## What all eight mentors repeated

1. Hold out test cases, report both error rates, commit the logs. A demo that catches the one attack the team wrote proves nothing (Xiu, Härdle, Li Jianqiang).
2. Two real actions beat four mocked ones. Mocked core actions cost task completion, the 40 percent criterion.
3. Licensing. The agent services, measures or coordinates; a licensed institution lends, insures or pays out. Say "sandbox" in the self-assessment.
4. No public crypto for mainland users. Testnet hashes for the demo, consortium chain (FISCO BCOS) or fiat rail in the story.
5. Do not name WeBank's stack (FATE, FISCO BCOS) unless it actually runs (Qiang Yang).
6. Mechanisms the field already ships earn no innovation points, however well they are written up.
7. Topic D has two entries. An insurance idea faces the least competition.

## Deliberation, in short

- **Wang Shouyang:** Scores mechanisms, not demonstrations. Ranks shenzhen-comp first for its economic feedback loop. Champions the robot: real-economy credit for collateral-poor factories, and a team that can build the machine. Calls the hui, pension pool and honeypot regulatory naivety.
- **Qiang Yang:** Scores what runs. A USDC wallet on a public chain is no product a mainland user can hold. Advises Qiaopi or Guardian Wallet: a security model an elderly parent understands, minimal data, real refusals. Would push federated price defence only if the federation really runs.
- **Li Wenrong:** Scores systems, not stories. The team cannot out-engineer the top entries, so it must win with an idea nobody has. Pushes the robot: build the plausibility check for real, mock the rest honestly, measure it.
- **Li Jianqiang:** Scores evidence. Champions the robot: machine telemetry as collateral for Shenzhen's small factories, a measurable plausibility model, something SZU and WeBank could continue after the final.
- **Chai Yunpeng:** Scores what can be verified. The team's advantage is social value with a clean audit trail. Ranks Qiaopi first, then Guardian Wallet and Second Opinion.
- **Dacheng Xiu:** Scores evidence, penalises in-sample benchmarks. The field lacks financial economics; champions Own the robot that replaces you. "Hold out test cases, report both error rates, commit the logs."
- **Wolfgang Karl Härdle:** Scores what can be rerun. Champions Own the robot that replaces you for being fully recomputable from public data. Notes that Hidden Coverage cites § 78 VVG correctly.
- **Joshua Bongard:** Champions the robot: the only idea where the AI is a financial participant rather than an assistant. Sees agent liability insurance and federated price defence as candidates for Best Innovation.
