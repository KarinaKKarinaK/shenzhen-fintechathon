# The competition

Name: 2026 Shenzhen International FinTech Competition (FinTechathon), 8th edition, International Track. This is the first year the International Track exists. It is timed to line up with the APEC summit in Shenzhen in November 2026.

Official site: https://fintechathon.g-ican.com/#/en

Wording for the deck, the README and the app header: "2026 Shenzhen International FinTech Competition (FinTechathon), International Track, Topic F". Not "Shenzhen FinTechathon 2026, Topic F".

Deployment: the app must be re-pointed before submission. jixin-fintechathon.vercel.app returned DEPLOYMENT_NOT_FOUND on 19 Oct. Put the working URL in the README and on the submission form only after it loads.

Theme: "AI as a Financial Participant", described by the organizers as balancing cutting edge innovation with inclusiveness. Teams build an AI agent that completes real tasks in a financial scenario.

## Who runs it

Sources disagree, so treat both as real until the organizers say otherwise.

- IEEE CIS Singapore and IEEE CIS Shenzhen pages: Strategic guidance from Shenzhen University and WeBank. Host is the Shenzhen University WeBank Institute of Financial Technology. Technical guidance from the CCF Digital Finance Chapter, the Institute for Fintech Research at Tsinghua (THUIFR), and the two IEEE CIS chapters.
- Aggregator listings and the rules appendix we were sent: Tsinghua PBC School of Finance with WeBank.

Academic advisory board named on the IEEE pages: Shouyang Wang, Qiang Yang, Wen Jung Li, Jianqing Li, Yunpeng Chai, Dacheng Xiu, Wolfgang Karl Haerdle, Joshua Bongard.

WeBank is the constant. WeBank is a Shenzhen digital bank backed by Tencent. Its open source stack is FISCO BCOS (consortium blockchain) and FATE (federated learning, Qiang Yang's field). Its public mission is inclusive finance. Its flagship SME product is Weiyedai (microbusiness loans).

## Contacts

- fintechathon@ican-x.com (registration address on the IEEE pages; subject line format below)
- wangyr@pbcsf.tsinghua.edu.cn (submission contact named in the PBCSF rules appendix)

Email both tonight. Ask two things: does an exchange student registered under a non-Chinese home university qualify, and which address receives the final submission.

Registration email subject line: `International Track Registration - [Lead Country] - [Team Name] - [Team Leader's Full Name]`

Organizers confirm receipt within 48 hours.

## Timeline (Beijing time, UTC+8)

| Date | What |
|---|---|
| 31 Aug 2026 | Registration opened |
| 20 Oct 2026, 23:59 | Registration and submission deadline. Organizers say they may close early without notice. |
| 21 to 22 Oct | Compliance screening |
| 23 to 28 Oct | Online review |
| 31 Oct | Finalists announced, visa invitation letters issued |
| 20 Nov | Check in and WeBank headquarters visit, Shenzhen |
| 21 to 23 Nov | Grand Final and awards in Shenzhen |

Some older IEEE pages list a 2 November close and a 2 to 10 November review window. The rules appendix and the current listings say 20 October. Plan for 20 October.

The final is described as a 48 hour on site project optimization followed by a roadshow style defense.

## Eligibility

- Full time students (bachelor, master, PhD, any discipline) at universities outside Mainland China, Hong Kong SAR, Macao SAR, and Chinese Taipei. One IEEE page says simply "outside China".
- All nationalities may apply. English is the official language. No Chinese needed.
- Team size 2 to 5.
- At least 60 percent of members must be non-Chinese nationals. In a team of 2 that means both.
- One team per person. Joining two teams voids every team that person is on, in both tracks.
- Required documents: the official registration form plus a passport bio page copy per member.
- No registration fee.

Our situation: Karina is a full time VU Amsterdam student on exchange at HKUST. Register under VU Amsterdam. HKUST degree students are not eligible. Any teammate from the Hong Kong hackathon crew must also be an exchange student from an eligible university.

## Topics (pick one)

| Topic | Name | Scope |
|---|---|---|
| A | Personal Finance Assistant | Budgeting, bill analysis, spending insights |
| B | Wealth Advisory Agent | Product comparison, risk profiling, advisory dialogue |
| C | Cross-border and Student Finance Assistant | Pain points of international students |
| D | Insurance Assistant | Policy Q&A, coverage analysis, claims guidance |
| E | SME Finance Copilot | Financing and cash flow support for small businesses |
| F | Agent Wallet / Autonomous On-chain Wallet | An AI that owns a wallet and executes real on-chain transactions. Carried over from earlier years. Ambitious solutions get extra consideration and a 0 to 5 point challenge bonus. |

All six topics are equal in status and share the same core capability standards and scoring dimensions.

## Scoring

From the PBCSF rules appendix (not published on the public pages, confirmed by two other teams' public repos):

- Task completion: 40 percent
- Security and compliance: 30 percent
- Innovation and interaction: 30 percent
- On-chain challenge bonus: 0 to 5 points (Topic F)

Seventy percent of the score is "does it work and is it safe". A flashy half built concept loses to a narrow scope that runs end to end.

The Domestic Track spells out the capability standards the International Track shares. Treat these as mandatory:

- Permission hierarchy mechanisms
- Hallucination prevention and injection defense
- Intent understanding
- Task planning

## Deliverables

From the rules appendix. Confirm the exact list against the PDF before submitting.

1. Technical documentation: architecture, core algorithm, security design.
2. Pitch deck, 10 minutes or less.
3. Video, 5 minutes or less (optional, but make it; it is insurance if the live demo breaks).
4. Source code with README, GitHub link, deployment instructions, and test cases.
5. Security self-assessment covering permission tiers and known risks.
6. Execution evidence. Topic F: real on-chain transaction hashes. Other topics: sandbox operation logs and a demo video.

## Prizes (International Track, RMB 250,000 of a 750,000 pool, pre-tax)

- First: RMB 100,000 and certificate
- Second: RMB 80,000 and certificate
- Third: RMB 50,000 and certificate
- Best Creativity: RMB 20,000 and certificate
- Excellence awards: certificates
- Finalists: travel and accommodation in Shenzhen covered, WeBank HQ visit, invitation letters for visas.
- Outstanding teams: WeBank fast track interviews, mentorship, incubation resources.

## Who judges and what they want

The panel is WeBank industry people plus university scholars. At last year's ceremony WeBank's chief AI advisor Qiang Yang said the next stage of fintech is technology innovation combined with real scenario deployment and value creation, and restated WeBank's inclusive finance mission.

What that means for us:

- Real scenario, real execution. Show a transaction hash, not a mock.
- Inclusion as a mission. Who is the underserved user and what does the agent change for them.
- Speak their stack. A FISCO BCOS deployment next to a public testnet deployment costs an afternoon and shows we did the homework.
- Security is a feature, not a slide. Demo an attack being blocked live.

## Industry context to cite in the deck

Verify each with a link before it goes on a slide.

- Alipay launched an AI wallet for individual users in 2025. Ant International published an agent payment protocol for purchases made through AI agents.
- Google published the Agent Payments Protocol (AP2) in September 2025 with verifiable intent and cart mandates. Coinbase's x402 lets agents pay for HTTP resources with stablecoins. Agent payments are the live frontier.
- Hong Kong's Stablecoins Ordinance took effect 1 August 2025 and the HKMA is licensing issuers. Shenzhen is an e-CNY pilot city. mBridge connects central bank digital currencies across the border.
- Shenzhen is China's low altitude economy hub. Meituan runs commercial drone delivery routes in the city. BYD is headquartered in Shenzhen and the city's taxi and bus fleets are fully electric.
- Huaqiangbei is the world's largest electronics market. Yantian is one of the busiest container ports in the world. Shenzhen hosts a large share of China's cross-border e-commerce sellers.

## Additions from the official rules document (19 Oct)

The official "International Track: Topics & Rules" document confirms the scoring and answers some of the open questions below.

- Scoring is stated in the rules document itself: task completion 40 percent, security and compliance 30 percent, innovation and interaction 30 percent, on-chain challenge bonus 0 to 5 points. All six topics share the same core requirements; choosing the on-chain topic does not change the scoring except for the bonus.
- Submissions may be updated any time before the deadline. The latest version received counts. No changes after the deadline.
- A bilingual email reminder goes out 24 hours before the deadline.
- General contact in the rules: info@ican-x.com.
- "Overseas universities" means institutions outside China, including Hong Kong, Macao and Taiwan, with their own accreditation and the right to award degrees. The Organizing Committee assigns the track based on members' nationalities and institutions.
- At least one member of each finalist team must attend the Grand Final in person. An unexcused absence forfeits award eligibility. The number of invited members per team is stated in the invitation.
- Prize naming differs: the rules say "Best Innovation Award", the IEEE page says "Best Creativity Award". Same RMB 20,000 prize.
- IP stays with the team. The hosts may use entries and team information for non-commercial promotion. Third party data, code and open source components must be properly licensed.
- The topic briefs in the rules are a little fuller than the public pages. A: actionable recommendations from income and expenses. B: compliant and explainable asset allocation suggestions. C: remittances, tuition payments, credit building, multi-currency management. D: also helping users understand and manage their insurance portfolios. E: cash flow management and alerts. F: asset management, transaction execution and risk control.

## Competitive intel (updated 19 Oct)

The earlier note (B and E crowded, F less crowded) is out of date. A full scan on 18 Oct found 113 real public entries: A 17, B 10, C 28, D 2, E 35, F 21. Each was code reviewed against the official rubric. Twelve already score 85 or more of 100, and prizes are awarded across topics. Topic F is not less crowded at the top: its leaders already ship agent to agent payments with escrow, on-chain mandates, session key wallets and real testnet hashes, and three entries are called Guardian Wallet. Topic D is the thinnest and weakest: two US health insurance entries at about 61. Details, the top 15 and the overlap for each of our ideas are in docs/research/COMPETITION.md; the blind review of our twelve ideas is in docs/research/JUDGE_REVIEW.md.

## Open questions for the organizers

1. Exchange student eligibility under the home university.
2. Which email receives the final submission and in what format (zip, link, form).
3. Whether a public testnet counts as "real on-chain" for the Topic F bonus, or whether they want mainnet or FISCO BCOS.
4. Whether submissions can be updated before the deadline. Answered: yes, the latest version received counts (official rules document).
