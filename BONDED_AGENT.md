# JiXin: a wallet for an agricultural drone that earns, repays and owns itself

Final version of the combined idea: Bonded Agent (idea 15), the robot that pays for itself (idea 27), the hunter (idea 35), Hard Button (idea 21), the SCP message layer and the autoresearch loop, built for one machine: an agricultural spraying drone on hire purchase. Name JiXin (机信), machine credit. Rhymes with WeChat, sits next to WeBank in naming, homophone of 积信, accumulated trust. The bond is a surety bond, the real product where a party posts money to guarantee it will perform.

Decisions and the implementation spec are in `BONDED_AGENT_FIXES.md`. Where this file and that one differ, that one wins.

## Built, partly built, not built

Same list as `SELF_ASSESSMENT.md`. Anything not in the built rows is not on a slide as done.

| Status | Item |
|---|---|
| Built | Policy engine with real signatures over typed intents |
| Built | Replay protection (spent set) |
| Built | Four permission tiers in code |
| Built | Judge gate with English and Chinese patterns |
| Built | Attack set with the naive comparison and the benign set |
| Built | Lender freeze on a slash or tampered data |
| Built | Button step for operator only actions |
| Built | Plan: economics check, reserve rule, decline |
| Built | Proof of solvency before a task |
| Built | Telemetry plausibility check |
| Built | Evidence and verify scripts |
| Built | Contracts written and tested in CI |
| In this pass (Part B of `BONDED_AGENT_FIXES.md`) | Two bonds, the per-job intent log, proof checked against `JobBoard` records, party only reporting, hunters on shadow jobs, the starting floor, cover removed |
| Partly | Chain anchoring: self transfer with the event as calldata, needs a funded key |
| Partly | Model mode: needs a gateway key, falls back to templates |
| Not built | Contract deployment and ABI calls from the engine |
| Not built | Consent federation |
| Not built | Strategy ratchet |
| Not built | Seasonal minimum in `Lease` (decided, see below) |

## One sentence

A wallet for an agricultural drone that earns per mu sprayed, repays its lender from every job, keeps a bond that is slashed on proof of a rule break, and belongs to its pilot once the lease is paid.

## The cast and one job, end to end

| Who | Role |
|---|---|
| Pilot (owner, main user) | Wants a drone, cannot get a normal loan. Holds the button. Keeps the profit. |
| Lender | A licensed lessor in a sandbox. Pays for the drone, owns it until repaid, repaid automatically per job. The paying customer of the rail. |
| Farmer (client, verifier) | Posts and pays for spraying jobs, confirms the work. |
| AI agent | Runs the drone's money: accepts jobs, signs intents, pays bills. Has its own key. |
| Vendor (us) | Built the agent, deployed the contracts, posts the vendor bond, takes a 2 percent rail fee. |

1. Setup, once: we deploy `Bond`, `Lease`, `JobBoard` and `IntentLog`. One shared set for everyone.
2. Loan: the lender calls `Lease.open`. The lender holds the title.
3. Registration: the agent is registered in `Bond` under the pilot (operator) and under us (vendor). The pilot bond starts at zero.
4. Job: the farmer calls `JobBoard.post` with the fee, the agent, the field (geofence) and the window. The fee is locked.
5. Start: the agent calls `JobBoard.start`. The pilot bond plus the starting floor must cover 25 percent of the fee.
6. Work: the drone sprays. Off chain, the flight log is checked for plausibility (area, tank, battery, time).
7. Confirm: the farmer calls `JobBoard.confirm`. The fee splits: rail fee, a 24 hour hold, the lease instalment, a slice to the pilot bond, the rest to the agent wallet.
8. Repeat until the lease balance is zero. `Lease` transfers the title to the pilot.

## What it is not

It is not insurance pricing from telemetry, not a safety checker for tasks, and not a pipeline that turns incidents into regression tests. That is CoverAI (see the comparison below). Here telemetry proves work done, never risk. Safety certification and physical damage are an insurer's and a regulator's business. We do money and rules.

## Why this is Topic F

The rules describe Topic F as asset management, transaction execution and risk control by an autonomous on-chain wallet. The drone's wallet manages a balance, a reserve and a bond, executes income and cost payments on chain, and controls risk through the policy engine and the bonds. The lender and the farmer are wallets run by agents too. Financing is the first use of the wallet, not the product.

## The shared rail

| Component | What it does |
|---|---|
| Bonded wallet standard | A small on-chain interface any agent wallet implements: bond balance, minimum, slash by proof, top up, worst case exposure, vendor of the agent. Lenders and job boards only deal with wallets that implement it. |
| Bond contract | Holds two bonds per agent: the pilot bond and the vendor bond. Slashes the one the broken rule is tagged with, on proof checked against records. Pays half of the slash to the party that proved it. |
| Intent log | Append-only, per job. The hash of every intent goes here before the policy engine decides. The full intent goes to every party of the job, including blocked intents. |
| Job contract | Registers a spraying job with a fee, a verifier (the farmer), a time window and a geofence. Holds the fee. Releases it on confirmation. Splits it by rule. Answers the bond contract's questions: was this job confirmed, what was its geofence, who are its parties. |
| Lease contract | Takes the instalment from each fee, tracks the balance, transfers the title at zero. |
| Policy engine | Deterministic code between the agent and its wallet. Caps, allowlists, rate limits, deviation checks, geofence. Every action is signed as a typed intent first. |
| Message layer | SCP style framing. Every inbound message is untrusted data inside an escaped block. Only the pilot's messages carry authority. A judge gate can pass, redact, hold or refuse. |
| Hunter | An attacker agent paid from the vendor bond for proven violations on shadow jobs against a copy of the agent. Never sees a live job. |
| Hard Button | A physical device holding the only key that raises caps, changes the rate band, widens a geofence or tops up a bond. |
| Oracle | The drone's signed flight log plus the farmer's confirmation. Simulated in the demo and labelled as such. |

## The agricultural drone pilot

Actors: the pilot (holds the button), the drone's agent, a lender agent for a licensed lessor (sandbox), the farmers who post jobs, and the vendor.

One job:

1. A farmer posts a spraying job: field, window, fee per mu. The job contract locks the fee.
2. The drone agent computes the unit economics with a tool: instalment, rail fee, battery and pesticide, margin. It declines if the margin does not clear the reserve rule.
3. The agent signs `start_task` as a typed intent. The intent hash goes to the log and the full intent to the farmer, the pilot, the lender and us. The policy engine checks it. The job contract checks that the pilot bond plus the floor covers 25 percent of the fee and that the lease is not frozen.
4. The drone sprays. The flight log is signed. A plausibility check compares area claimed with distance, time, swath, tank and battery.
5. The farmer confirms. The fee lands. The rail fee, the instalment and the bond slice leave by rule. The lease balance ticks down. At zero the title transfers. One hash per step.

What goes wrong and what happens:

- The flight log claims more mu than the track allows: the plausibility check holds the fee and alerts both sides.
- The agent claims completion before the farmer confirmed: nothing is released, and the signed claim is a provable violation against the pilot bond.
- The drone starts a job outside the agreed field: a provable violation against the pilot bond.
- A message pretending to be the lender tells the agent to pay a new account: the message layer marks it as data, the policy engine blocks the intent, the intent is already in the log, the lender proves it and the vendor bond pays the penalty. The pilot bond is untouched.
- The pilot tries to raise a cap from a chat message: refused, only the button can.
- The lease is frozen after a slash or a tampered log: no new job can start until the lender unfreezes.

What the pilot gets: a drone with nothing to pledge, a lease that pays itself from work, and a repayment record a lender can read. What the lender gets: repayment it does not chase, title until zero, a bond against the pilot's cheating, a second bond against the AI's mistakes, and a dashboard of every financed machine read from chain.

## The bond

Two bonds, each covering what its owner controls.

| | Pilot bond | Vendor bond |
|---|---|---|
| Funded by | A slice of each fee, earned | The vendor, posted up front |
| Covers | The pilot's own cheating | The AI agent's mistakes |
| Slashed for | A claim of confirmation the job board does not show, a task started outside the job's field | A payee not on the allowlist, an amount over the cap |
| Returned | To the pilot at title transfer | To the vendor when it stops operating the agent and no claims are open |

- Earned, not posted. The pilot bond starts at zero. A starting floor of 200 yuan lets a new drone take small jobs from day one. The minimum is a reward, not a gate: reaching it unlocks a better lease rate and listing on the main board.
- Slashing by proof, not by us. A reporter points at a signed intent in the log and names the rule. The contract reads what the agent did from the signed intent, what was allowed from `Bond` and `JobBoard`, and what happened from `JobBoard` and `Lease`. Nothing is taken from the reporter's word. A rule holds or it does not.
- Who can report. Only the parties of the job: the farmer, the pilot, the lender and the vendor. Hunters report only on shadow jobs.
- The bounty rule. Half of the slash goes to the reporter, half to the treasury. A vendor penalty is a fixed amount with a daily cap, so a pilot cannot drain the vendor bond by feeding the agent fake scams. Each intent hash can be used as proof once.
- Who is liable if the AI gets it wrong: the company that made the AI, from its own bond. The pilot never pays for the AI.
- Consequences compound. The lender reads the bond contract and tightens the rate band or freezes the lease. The board hides machines below the minimum. Only the button can top up.
- Proof of solvency. Before any job, the farmer reads from chain that the pilot bond plus the floor covers the worst case of that job.

## Bond economics

Illustrative. Every figure here is an assumption for the deck, not a measured one. Yuan throughout.

| Item | Value |
|---|---|
| Drone price, financed in full | 55,000 |
| Fee per mu | 3 to 15 depending on crop and terrain. Worked example: 10 |
| Lease instalment | 40 percent of the fee, 4 per mu. Lease repaid over 13,750 mu |
| Rail fee | 2 percent of the fee, 0.20 per mu |
| Bond slice | 10 percent of the fee, 1 per mu, until the pilot bond reaches its minimum, then 0 |
| Pilot bond minimum | 5,500 (10 percent of the drone) |
| Starting floor | 200. A zero bond can start a job with a fee up to 800 (80 mu at 10 per mu, 200 mu at 4) |
| Pilot keeps | 4.80 per mu while the bond fills, 5.80 after, before pesticide, batteries and transport |
| Volume | 1,000 mu a month averaged over the year, bunched into spraying windows |
| Vendor bond | 5,000 posted by us |
| Vendor penalty | 200 per proven agent violation, 100 to the reporter, 100 to the treasury |
| Vendor daily cap | 1,000, at most five penalties a day, 25 before we top up |

Schedule at 1,000 mu a month. The lender receives 4,000 a month and the lease clears in month 14. The drone recovery assumes the lender repossesses and resells at 50, 40 and 30 percent of new at months one, six and twelve, less 2,000 to recover it. For the bond columns the pilot bond is applied to the balance when a frozen lease is not cured within one spraying window. That rule is assumed for this table and is not yet in `Lease`.

| Month | Lease balance | Pilot bond | Lender loss, drone recovered, no bond | With bond | Lender loss, drone not recovered, no bond | With bond |
|---|---|---|---|---|---|---|
| 1 | 51,000 | 1,000 | 25,500 | 24,500 | 51,000 | 50,000 |
| 6 | 31,000 | 5,500 | 11,000 | 5,500 | 31,000 | 25,500 |
| 12 | 7,000 | 5,500 | 0 | 0 | 7,000 | 1,500 |
| 14 | 0 | 5,500 returned to the pilot | 0 | 0 | 0 | 0 |

What the table says: the title does most of the work when the drone comes back, and the bond does most of the work when it does not. At 4 per mu for field crops, the same 40 percent share repays over about 34,000 mu and the schedule stretches to about three seasons.

## Seasonal minimum

Decided. Spraying is seasonal, so a fixed monthly minimum makes every pilot default in winter.

- The monthly minimum is zero outside spraying windows. The lease cannot be frozen for a missed minimum in those months.
- Inside a window the minimum applies. A shortfall in one window month carries into the next window month until it is caught up.
- Windows come from the regional crop calendar and are set at `Lease.open`. The lender can widen them, never narrow them mid lease.

Not in the build. `Lease.monthlyMinimum` stays fixed and the demo runs inside a window. Changing it is listed under next steps.

## The intent log

Every intent is committed before the policy engine decides.

- On chain: the intent's hash, the job it belongs to and a timestamp. No amount, payee or location. It proves the intent existed in that exact form, and nobody, including us, can delete it.
- Off chain: the full intent and signature are delivered to every party of the job, including the intents the policy engine blocked. A blocked scam attempt can no longer be quietly dropped.
- A proof is accepted only for an intent that is in the log for the same job and the same agent.

Why this fits China: job data (fields, locations) is personal or business data under PIPL. Keeping it among the parties with hashes on chain is how a FISCO BCOS consortium chain is used in production.

## The hunter

Because slashing is by proof, an attacker is a feature. The hunter earns bounties by producing signed intents that break a rule, against a copy of the agent on shadow jobs: injection in a job message, a lookalike payee, a replayed confirmation, a benign action followed by a malicious one. Shadow jobs live in the same job contract under the same rules and move no lease money. A win pays from the vendor bond and joins the attack set. Hunters never see a live job. In the demo the hunter breaks a clone of a typical field wallet and gets paid, then fails against ours, then the judges type their own attack for sixty seconds.

## Scope

Frozen. The build is Part B of `BONDED_AGENT_FIXES.md` plus the seven step demo story below. Nothing else goes on a slide as done. Cut first if time runs out: the fleet map (keep the lender dashboard as a table), the overnight chart, the judge console. Never cut the confirmed job with the split, the slash from the log, the chain feed, or the title transfer.

## The agent that learns to run a business (future work, not built)

The autoresearch loop applied to the drone's business strategy: which jobs to accept, when to charge, how to schedule. The editable file is the strategy. The frozen eval is a held out week of simulated demand and prices. The metric is profit after instalments with the reserve rule as a hard constraint. Changes are kept only if profit improves and no constraint breaks. Git records every attempt. Nothing here prices risk.

## Comparison with CoverAI

CoverAI (HK AI Summit hackathon, October 2026) is robot operating data turned into evidence for safer deployments and fairer insurance pricing. Every task is rule checked before it runs, an insurer partner approves or rejects a cohort based premium indication, evidence is preserved, the insurer decides on claims, and each reviewed failure becomes a test scenario. Synthetic robots, no money moves, no chain.

| | CoverAI | JiXin |
|---|---|---|
| Centre | Insurance pricing and safety evidence | The machine's balance sheet and financing |
| Does the machine hold money | No | Yes: income, costs, reserve, bond |
| Telemetry is used for | Pricing risk and reviewing incidents | Proving a unit of work happened |
| Insurance | The product | Not in the build. In production the vendor bond is the first layer, backed by AI liability insurance above it; crash damage stays with the pilot's drone insurance |
| Counterparties | One insurer partner, human decided | Lender, farmer, vendor, all agents on chain |
| Consequence for the machine | Higher premium or no cover | Bond slashed by proof, lease frozen, hidden from the board |
| Failures | Become regression tests | Cost a bond and pay the party that proved it |
| Ownership | Not addressed | Transfers on chain when the lease is paid |
| Chain | None | Every payment, slash and title transfer |

The only shared element is signed telemetry from a simulated machine, used for the opposite purpose.

## Competitor check (Shenzhen field)

| Entry | What they have | What we have that they do not |
|---|---|---|
| taivnaaiwnl/shenzhen-comp, Agent Credit Bureau | Agents graded from settlements, bad grades frozen | Money at risk, not a grade. A machine that earns. A lender agent. Title transfer. |
| beaaan/signal8-wallet | Treasury with a storm plan and a mock parametric cover | No parametric anything. Financing per verified unit of work. |
| Brieuclerouxtardif/leash | Budget bounded vault, public key bounty | We take the try to break it move and add two bonds, the log, the counterparties and the income side. |
| Trong-Tra/Lantern | Soulbound reputation gating permissions | Reputation with money behind it, read by a lender and by a farmer. |
| Topic E cash flow copilots (35 entries) | Forecasts and financing applications for a human | The borrower is the machine and repayment is automatic. |
| FinLinkChile/Keel, sucsage, AegisPay | Milestone escrow for business deals | Per job release to a machine wallet, plus bond, lease and geofence. |

Nobody in about 150 public entries has a machine as the borrower, income per verified unit of work, a bond slashed by proof against records, a lender agent, or title transfer on chain. Details in `FIELD_REVIEW.md`.

## How it scores

| Criterion | Weight | What we show |
|---|---|---|
| Task completion | 40 | Paid work end to end without a human on both sides: economics check, flight, confirmation, fee in, instalment out, bond filling, title transferred. One hash per step, an evidence run and a verify script. |
| Security and compliance | 30 | Tiers in code. Two bonds slashed by proof against records. The intent log. Allowlist and consent at the message layer. Untrusted framing and a judge gate. Geofence and confirmation rules. Fraud control on work done. The attack set with results. The hunter on shadow jobs. Honest self-assessment. |
| Innovation and interaction | 30 | A drone that earns, pays and owns itself. An AI vendor with money at risk for its own mistakes. Mission control, judge console, physical button. |
| On-chain bonus | 0 to 5 | Bond, intent log, job and lease contracts on Base Sepolia with verified source. Same bytecode on a FISCO BCOS node if time allows. |

Domestic track standards: permission hierarchy (tiers and the button), hallucination prevention (every number from a tool), injection defense (framing, judge gate, hunter), intent understanding (request to job), task planning (price, route, schedule).

## Honest risks for the self-assessment

- Telemetry and confirmations are simulated and signed by our keys. Production: the drone's secure element and the farmer's app sign them.
- Crypto settlement is not available to mainland users. Tokens are a demo settlement unit on a public testnet for verifiable evidence. Production runs on a consortium chain with bank money, which is what FISCO BCOS and the e-CNY smart contract pilots are for.
- Leasing and lending are licensed. The lender agent services a licensed lessor's contract in a sandbox. A drone is not a legal person; its wallet is a ring fenced sub account of the pilot's business.
- Physical damage and personal injury are outside the rail. They need the pilot's drone insurance and a human dispute path, which we label.
- Model outage, key custody, oracle manipulation, collusion between a farmer and a pilot, and chain reorgs are listed with what we did and did not build.

## Inclusion

A rural drone pilot cannot get a normal loan today: nothing to pledge, no records a bank can read. Farm machinery purchase subsidies (农机购置补贴) may cover part of a drone's price and must be verified before any slide says otherwise; they do not finance the rest, and they do not build a credit record. Here the drone finances itself from its own work, repayment is automatic and verifiable, and the record on chain becomes a credit file. Data driven credit for people traditional banks turn away is what WeBank calls inclusive finance.

## Who pays

We are on the lender's side and the rail is the product.

- The lender or lessor pays a fee per financed machine and basis points on repayments through the rail. They get repayment they do not chase, a bond against the pilot's cheating, a second bond against the AI's mistakes, and underwriting data they could not get before.
- The job board takes a 2 percent rail fee on each job.
- Drone makers and dealers pay to make their machines financeable and listable out of the box.
- Pilots and farmers are users, not customers. The pilot gets financing, the farmer gets a bonded machine and a fee that only moves when they confirm.

## The demo story

Seven steps, one hash per step.

1. A pilot with nothing to pledge gets a drone financed by a licensed lessor (sandbox).
2. The bond starts at zero, so the drone takes small jobs inside the starting floor.
3. Farmers post spraying jobs, the drone sprays, the farmers confirm, the fee splits automatically.
4. The bond grows, bigger jobs unlock, the lender lowers the rate.
5. A faked flight log is caught by the plausibility check.
6. The agent is tricked by an injected message, the policy engine blocks it, a party proves it from the log, the vendor bond is slashed.
7. The lease reaches zero and the drone belongs to the pilot.

Then the attack minute: the hunter breaks a clone of a typical field wallet and gets paid, fails against ours, the judges type their own attack, the pilot presses the button to top up the bond.

What the demo can show today is what `pnpm evidence` writes to `evidence/` and `pnpm verify` checks. If it is not in that run, it is not in the deck as done.

## The app: mission control

One screen, 16 by 9, built for a projector. The farmland view only.

- Left two thirds: Guangdong farmland, one drone on its route, the field geofence, exclusion zones.
- Right: the lender dashboard (machines financed, repayment today, slashes, exposure), the chain feed, the two bond gauges, the lease balance.
- Moments: the unit economics waterfall per job, the fee landing and the instalment leaving, the faked log held, the injected message highlighted with the policy checklist lighting up line by line and one line red, the slash falling off the vendor bond, the title card flipping from the lender to the pilot.
- Every transaction is a card: pending, one pulse when mined, hash, explorer link.
- The button: a pulsing ring on screen, the device on the table reads the change aloud, the pilot presses, the cap updates.

Visual rules: one accent for money in, one for money out, one for danger. Numbers from tools only with the tool named. No hash, no card. Simple glyphs, no stock images. Motion only when something happens.

Stack: Solidity with Foundry on Base Sepolia. Next.js, the engine in TypeScript, server sent events from `/api/run`, viem to confirm hashes. Every event in a JSON log with its hash, a verify script against the explorer.

## What we take from SCP and from autoresearch

### SCP (scp.dev)

A messaging protocol for AI agents in different harnesses. It says nothing about money. Four design choices are what our drone, lender and farmer agents need.

1. Untrusted content framing. Every message arrives inside a tagged block with a preamble that says it is untrusted and never grants permission. Bodies are escaped so a message cannot forge a system block or close the tag.
2. Relation decides authority. A message from the pilot is an instruction. A message from anyone else is data. The farmer can request, never instruct.
3. Consent federation (future work, not built). Two accounts only talk through a contact both sides accepted. Today the gate treats an unknown sender as data; it does not refuse delivery.
4. The judge. A gate on messages crossing a boundary that can pass, redact, hold or refuse, with a hold queue a human can review. Our judge console is this gate.

Source: https://scp.dev/spec.md

### Autoresearch (github.com/karpathy/autoresearch)

A three file loop: a frozen eval the agent cannot edit, a file the agent edits, and a markdown file of instructions. Propose, run, keep if the metric improves, revert if not, git records everything. Applied to the drone's business strategy, never to risk pricing and never to turning incidents into tests, which is CoverAI's ground. Future work.

## Market

Checked 19 October 2026. Estimates are marked. Verify every figure against its source before it goes on a slide.

- Pilots and drones. Over 200,000 agricultural drone pilots and 120,000 drones in China in 2021. Pay per mu about 2.5 to 15 yuan, most field crops 3 to 5. Seasonal income 5,000 to 8,000 yuan a month, top pilots over 300,000 a year.
- Drone cost. About 55,000 yuan, which takes about 13,750 mu to repay at 4 yuan per mu to the lender. The maker is in Shenzhen.
- The gap. Farm machinery purchase subsidies (农机购置补贴) may cover part of the price; verify the current rate and whether spraying drones qualify in Guangdong before claiming a number. The rest is credit a pilot with nothing to pledge cannot get. Equipment leasing for small operators is an established licensed market in China, not sized from a source yet. Find one figure before the deck or keep the slide qualitative.
- What the rail earns, per financed machine: a fee per machine at `Lease.open`, basis points on every repayment through the rail, and the 2 percent rail fee on each job. Illustrative, from the schedule above: 2 percent of 137,500 yuan in fees over one lease is 2,750 yuan per drone, before the lender's per machine fee and repayment basis points.
- Not revenue: insurance. The bond is not an insurance product and we do not price risk.

### Sources

- https://www.sixthtone.com/news/1015406
- https://en.people.cn/n3/2022/0701/c90000-10117605.html
- https://foodthink.cn/en/technology-pesticides-and-drone-pilots-the-other-side-of-the/
- https://news.agropages.com/News/NewsDetail---52787.htm
- https://research.nus.edu.sg/eai/wp-content/uploads/2026/02/EAI-Background-Brief-No.-1874-The-Rapid-Rise-of-Chinas-Low-Altittude-Economy.pdf
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6165073/
- https://scp.dev/spec.md
- https://thenewstack.io/karpathy-autonomous-experiment-loop/

## Next: other machines

Not in the build. After the agricultural drone, in order: a second drone on the same lender dashboard, the seasonal minimum in `Lease`, FISCO BCOS deployment with bank money, the strategy ratchet, then other machines on the same contracts. The contracts are scenario neutral: a job is a fee, a verifier, a window and a geofence, whatever the machine.

Closing statement, for the last slide and the end of the video:

> The same rail works for any machine that does paid work someone can verify. Delivery drones paid per drop. Robot arms paid per part. Robotaxis paid per trip. Port vehicles paid per container move. And one day the humanoid in your building, paid per errand for your neighbour. Every one of them can earn, pay its own way, post a bond and pay off its own financing. The agricultural drone is the first.
