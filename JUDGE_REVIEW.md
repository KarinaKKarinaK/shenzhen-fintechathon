# Judge review of all twelve ideas

19 October 2026, 00:30 Beijing time. Three simulated judges scored all twelve ideas from IDEAS.md blind and independently. All three put Hidden Coverage (idea 10) first and Second Opinion (idea 12) second. Our current pick, Huaqiangbei Escrow, comes about sixth, mainly because its mechanism is already done by a top 3 entry.

## Method

- Three judge personas, each working alone: a WeBank product and risk executive, a university professor in AI and quantitative finance, and a security and compliance lead for AI agents in finance.
- Each judge got the same brief: the official scoring (40 / 30 / 30 plus the 0 to 5 bonus for F), the deliverables, our situation (2 to 4 people, nothing built, about 44 hours left), and the field context from COMPETITION.md.
- The ideas were renamed I1 to I12, shuffled, and nobody was told which ones came from which teammate. All ideas used the text from IDEAS.md at similar length. The judges were told not to reward longer write-ups.
- Each judge scored task completion, security and innovation twice: "potential" if delivered well, and "expected" if we build it from zero in the time left. Plus differentiation against the field and fit for a WeBank and academic panel.
- Limits: simulated judges, not the real panel. Treat the ranking as a structured second opinion, not a forecast.

## Results (average of three judges, 0 to 100)

| Rank | Idea | Topic | Expected | Potential | Differentiation (0 to 10) | Jury fit (0 to 10) | Ranks by judge |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 Hidden Coverage | D | 75.0 | 89.0 | 8.5 | 7.5 | 1, 1, 1 |
| 2 | 12 Second Opinion | D | 73.5 | 84.7 | 8.0 | 7.2 | 2, 2, 2 |
| 3 | 6 Hui Agent | F | 70.5 | 84.3 | 8.8 | 6.2 | 3, 3, 4 |
| 4 | 3 Guardian Wallet | A or F | 69.3 | 81.5 | 3.2 | 8.5 | 4, 5, 3 |
| 5 | 2 Machine Wallet | F | 67.3 | 86.7 | 8.2 | 5.5 | 5, 6, 6 |
| 6 | 1 Huaqiangbei Escrow | F | 66.7 | 81.7 | 4.0 | 6.0 | 8, 7, 5 |
| 7 | 8 RiderShield | D | 65.8 | 78.7 | 6.7 | 8.2 | 6, 9, 7 |
| 8 | 11 Self-Insure | D | 65.3 | 79.3 | 7.8 | 5.7 | 7, 4, 10 |
| 9 | 4 Mandate Wallet | F | 63.8 | 77.5 | 1.5 | 5.3 | 11, 8, 9 |
| 10 | 7 Seller Cashflow Copilot | E | 63.7 | 73.3 | 2.3 | 7.3 | 10, 10, 8 |
| 11 | 9 Bridge Advisor | B | 62.3 | 74.0 | 3.3 | 6.2 | 9, 11, 12 |
| 12 | 5 Landing Day | C | 61.5 | 70.3 | 2.0 | 5.0 | 12, 12, 11 |

Judge order in the last column: WeBank industry, academic, security and compliance. Expected scores include the expected F bonus where it applies.

## What the judges agree on

- No idea reaches the high 80s expected score that the current top 12 of the field already have. From zero in 44 hours, the realistic range is about 63 to 76. The most realistic prize is Best Innovation, not first place.
- Hidden Coverage wins on all three views: Topic D is almost empty (two entries at about 61), it has real agent actions (checkout guard, claim split, sandbox filing), and its key rule, never claim more than the loss, is law in Germany and China and can be tested in code. Its risk is scope. Cut it to one persona, 4 to 5 real public policy wordings, three cited claim order rules and two real actions.
- Second Opinion is narrower and safer, with the strongest single demo moment, but it is mostly analysis. Two judges suggest taking its "no source, no flag" rule into Hidden Coverage instead of building both.
- Ideas whose core mechanism strong entries already ship lose innovation points however well they are built: Huaqiangbei Escrow, Guardian Wallet, Mandate Wallet, Seller Cashflow Copilot, Landing Day.
- Extra points have to come from what most entries lack: logged live LLM runs, a small planted test set with measured accuracy, a README that claims only what is tested, and a finished deck and video.

## Comments on Huaqiangbei Escrow (current pick)

- Agent to agent payment, escrow and milestone release are already done by entries at about 94, 79 and 54. Only the Huaqiangbei framing and the bilingual haggling are new.
- A vision check on a photo the supplier uploads is a weak oracle.
- Crypto settlement with mainland suppliers is not realistic under PBoC rules, and a wallet or escrow holding other people's money needs a payment licence. Judges from a licensed bank will notice.
- Still very demoable: bilingual negotiation, escrow hash on the explorer, an injected "release everything" blocked on screen.

## Regulatory red lines flagged by the security and compliance judge

- Hui Agent: winning bids work as hidden interest; pooling money from the public risks being treated as illegal deposit taking; crypto payments are banned for mainland users.
- Huaqiangbei Escrow, Machine Wallet, Mandate Wallet: crypto payments by mainland users; a wallet or escrow for other people's money needs a payment licence.
- Bridge Advisor: personal product suggestions are licensed investment advice; Wealth Management Connect limits cross-border marketing.
- Self-Insure, and partly Hidden Coverage and Second Opinion: steering someone to cancel a policy is a regulated activity in Hong Kong (Insurance Ordinance, Cap. 41), so the user must make the decision. Hidden Coverage already keeps cancellation as a user decision with a harm check.
- Second Opinion: recording a conversation needs consent (Hong Kong PDPO, PIPL); covert recording is a crime in Germany (§ 201 StGB).
- Hidden Coverage, Guardian Wallet, RiderShield: health data and telling a trusted contact need separate consent under PIPL.
- Before citing it on a slide, check the exact article of the NFRA sales conduct measures that bans pre-ticked add-ons against the official text (we have Art. 23 from a law firm commentary).

## Recommendation from the review

Build Hidden Coverage, cut hard: a coverage map from real public policy wordings, the checkout guard, and the claim split after a loss with the no double recovery rule in fixed code, filed in a sandbox behind one L3 approval. Take "no source, no flag" from Second Opinion. Keep SECURITY.md as it is; most of it carries over. Spend the saved time on live LLM logs, a planted test set, the deck and the video.
