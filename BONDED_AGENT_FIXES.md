# JiXin (Bonded Agent): design fixes

Problems found in the JiXin design (`BONDED_AGENT.md`) and the contracts (`contracts/`), what we decided, and exactly what to change in code.

Checked against commit `7abd4ef` (contracts) on 20 October 2026.

## How to read this

| You are | Read |
|---|---|
| Reviewing the ideas | The summary, the cast, the status table and Part A. About ten minutes. |
| Implementing (a person or a coding agent) | The status table, then Part B. Part B is self-contained: interfaces, rules, edge cases, tests and the order of work. Part A explains why. |
| Working on the pitch | Part A.5 (the scenario and the closing statement) and Part C (open problems). |

Words used throughout:

| Word | Meaning |
|---|---|
| Intent | A typed, structured action the AI agent wants to take ("pay 160 to 0xBANK for job 12"), signed by the agent under EIP-712. The agent signs every intent before the policy engine decides. |
| Policy engine | Deterministic code between the agent and its wallet. Allows, blocks or escalates each intent. Not the model. |
| Bond | Money held in `Bond.sol` that is slashed when a violation is proven. |
| Slash | Taking a fixed amount from a bond as a penalty, paid partly to whoever proved the violation. |
| Proof | A signed intent plus the rule it breaks, submitted to `Bond.slashByProof`. |
| Verifier | The party whose confirmation releases a job's fee. In the demo, the farmer. |
| Lender / lessor | The licensed institution that financed the machine. Owns it until the lease is paid. |
| Vendor | Whoever built and runs the AI agent. In the demo, us. |

## Summary

1. Scenario: the agricultural drone pilot only. A pilot with nothing to pledge gets a drone financed by a lender. Farmers pay the drone per mu sprayed. Each fee repays the lease and fills a bond. At zero the drone belongs to the pilot. Delivery drones, robot arms, robotaxis and humanoids are one closing statement, not part of the build.
2. Two bonds. The pilot bond (earned from fees) is slashed only for the pilot's own cheating. The vendor bond (posted by us up front) is slashed for the AI agent's mistakes. The pilot never pays for the AI.
3. Proof is checked against records, never against the reporter's word. Every fact in a slash comes from the signed intent, `Bond`, `JobBoard` or `Lease`.
4. Every intent is committed to a per-job log on chain (hash only) before the policy engine decides, and delivered to every party of that job. Only those parties can report. Hunters attack shadow copies only.
5. A new machine can start: no minimum in the start check, a starting floor of 200 yuan, and the minimum becomes a reward (better rate, board listing). Insurance is out of the build.

## The cast and one job, end to end

| Who | Role |
|---|---|
| Pilot (owner, main user) | Wants a drone, cannot get a normal loan. Keeps the profit. |
| Lender | Pays for the drone, owns it until repaid, repaid automatically per job. The paying customer of the rail. |
| Farmer (client, verifier) | Posts and pays for spraying jobs, confirms the work. |
| AI agent | Runs the drone's money: accepts jobs, signs intents, pays bills. Has its own key. |
| Vendor (us) | Built the agent, deployed the contracts, posts the vendor bond, takes a 2 percent rail fee. |

1. Setup, once: we deploy `Bond`, `Lease`, `JobBoard` (and the new `IntentLog`). One shared set for everyone.
2. Loan: the lender calls `Lease.open`. The lender holds the title.
3. Registration: the agent is registered in `Bond` under the pilot (operator) and under us (vendor). Pilot bond starts at zero.
4. Job: the farmer calls `JobBoard.post` with the fee, the agent, the field (geofence) and the window. The fee is locked.
5. Start: the agent calls `JobBoard.start`. The bond (plus the starting floor) must cover the job.
6. Work: the drone sprays. Off chain, the flight log is checked for plausibility (area, tank, battery, time).
7. Confirm: the farmer calls `JobBoard.confirm`. The fee splits: rail fee, a 24 hour hold, the lease instalment, a slice to the pilot bond, the rest to the agent wallet.
8. Repeat until the lease balance is zero. `Lease` transfers the title to the pilot.

## Status at a glance

"Decided" is our decision. "In code" is whether `contracts/` already does it.

| # | Problem | Decided | In code |
|---|---|---|---|
| 1 | The pilot pays for the AI's mistakes | Two bonds: pilot bond for pilot cheating, vendor bond for agent mistakes | No. One bond per agent |
| 2 | Nobody but the pilot ever holds the evidence, so nothing is ever slashed | Per-job intent log: hash on chain before the policy engine decides, full intent delivered to every party, only parties report | No |
| 3 | The bond starts at zero | Limits scale with the bond, a starting floor, the vendor bond covers the start (with 11) | Partly. Job size scales with the bond (25 percent of the fee) |
| 4 | Where insurance fits | Not in the build. Bonds first, insurance only above them, in the pitch | No. `bindCover` and `NoCoverBound` still exist |
| 5 | Too many scenarios | Agricultural drone pilot only, other machines as a closing statement | Contracts are scenario neutral. `BONDED_AGENT.md` still has two sides |
| 10 | The contract believed the reporter | Every fact read from the signed intent and the contracts' own records | Half. Evidence is now bound to the signed fields. Confirmation and geofence are still taken from fields the agent signed instead of from `JobBoard` |
| 11 | A new machine can never start | No minimum in `covers`, a starting floor | No. `covers` still requires the minimum |
| 6 | Market section argues for insurance | Open | |
| 7 | Seasonal income vs a fixed monthly minimum | Open | `Lease.monthlyMinimum` is fixed |
| 8 | Scope | Open | |
| 9 | Claims that can backfire | Open | |

Already done in code (credit to the team, commit `7abd4ef`):

- Intents are EIP-712 typed structs, and `slashByProof` hashes the fields itself, so a real signature cannot be paired with invented evidence.
- `JobBoard.confirm` computes the instalment from `Lease.instalmentFor` and pays through `Lease.pay`. No amount comes from the caller.
- `Bond.register` needs the agent's own signature, so nobody can register someone else's agent.
- The verifier cannot be the agent. A frozen lease blocks start and release.

# Part A: the decisions explained

## A.1 Two bonds (problem 1)

Problem. The drone is not a legal person. Its wallet is a ring-fenced sub-account of the pilot's business, and the bond is built from the pilot's earnings and returned to the pilot. Slashing it for anything the agent does wrong means the pilot pays when the AI is tricked by a scammer: a flaw in software someone else built.

Decision. Two bonds, each covering what its owner controls.

| | Pilot bond | Vendor bond |
|---|---|---|
| Funded by | A slice of each fee, earned | The vendor, posted up front |
| Covers | The pilot's own cheating | The AI agent's mistakes |
| Slashed for | Work and repayment rules: claiming a confirmation that does not exist, working outside the job's field | Signing rules: a payee not on the allowlist, an amount over the cap |
| Returned | To the pilot at title transfer | To the vendor when it stops operating the agent and no claims are open |

Each rule is tagged with the bond it hits, so the contract never judges intent or fault. The broken rule decides.

What a hallucination costs. Numbers come from tools, not the model. Code validates every action before the agent signs it, so made-up actions never become intents. The policy engine and the contracts block any bad intent, so no money moves. A blocked bad intent costs the vendor bond one small fixed penalty. The pilot bond is never touched.

Answer to the judge's question "who is liable if the AI gets it wrong": the company that made the AI, from its own bond.

Open questions (not blocking the build):

- Collusion. A pilot could feed the agent a fake scam on purpose to drain the vendor bond. Mitigations: penalties go to the reporter only as a capped bounty, never to an address the pilot controls; a daily cap on penalties; instructions from the pilot's own channel count as the pilot's.
- The Hard Button. Proposal: anything the pilot approved on the button is the pilot's responsibility.
- Compensation for an actual loss (money that really left the wallet) needs someone to establish the loss, which a contract cannot see. Out of the hackathon build; the policy engine blocks before money moves, so the demo only needs penalties.

## A.2 The per-job intent log (problem 2)

Problem. Slashing needs someone to hold a signed intent that breaks a rule. The agent signs inside the pilot's system and the policy engine drops blocked intents, so only the pilot ever holds the evidence, and the pilot will not report against their own bond. As written, nothing is ever slashed.

Decision. Every intent is committed before the policy engine decides.

- On chain: only the intent's hash, the job it belongs to and a timestamp. It reveals nothing (no amount, payee or location) but proves the intent existed in that exact form. Nobody, including us, can delete or change it.
- Off chain: the full intent is delivered to every party of that job: the farmer, the pilot, the lender and the vendor. Including the intents the policy engine blocked. That delivery is the point: a blocked scam attempt can no longer be quietly dropped.
- Who can report: only the parties of the job. The lender matters most: it has its own money at stake and does not depend on the farmer checking.
- Hunters never see live jobs. They attack shadow copies of the agent on shadow jobs, and their bounties come from the vendor bond.

The log does not let anyone claim "this never happened". It is a permanent record of what the agent did. Reporters point at an entry and say "this broke a rule"; the contract checks for itself (A.6). "This work never happened" is a different problem, solved by the farmer's confirmation: no confirmation, no money.

Why this fits China: job data (fields, locations) is personal or business data under PIPL. Keeping it among the parties with hashes on chain is how a FISCO BCOS consortium chain is used in production.

## A.3 Starting from zero (problems 3 and 11)

Problem. The pilot bond starts at zero and only fills from confirmed jobs. `JobBoard.start` refuses a job until `Bond.covers` is true, and `covers` requires the minimum. So nothing ever starts.

Decision.

1. Drop the minimum from the start check. Only the size rule stays: bond plus floor must cover 25 percent of the fee.
2. A starting floor of 200 yuan (about 50 mu, one small job) for every machine.
3. The minimum becomes a reward: reaching it unlocks a better lease rate and listing on the main board.

Why a zero bond is safe for small first jobs: the farmer cannot lose money (the fee releases only on their confirmation), the lender cannot lose the drone (it holds the title), the agent's mistakes are covered by the vendor bond from day one, and the floor keeps the pilot's possible cheating small.

## A.4 Insurance (problem 4)

Bonds cover small and medium losses the system itself creates, fast and by proof. Insurance covers what is bigger than the bonds: the agent failing across many wallets at once, or physical crash damage to crops or people, which pilots already insure today.

Decision: no insurance in the build. Drop cover binding from `JobBoard` and the `NoCoverBound` rule. In the pitch, one line: the vendor bond is the first layer, backed in production by AI liability insurance; physical damage stays with the pilot's drone insurance. This also keeps us clear of CoverAI.

## A.5 One scenario: the agricultural drone pilot (problem 5)

Decision: build and demo only the agricultural drone pilot.

Why: over 200,000 agricultural drone pilots in China, 3 to 5 yuan per mu for most field crops, a drone of about 55,000 yuan; a clean unit of work (a mu sprayed, from the GPS track, confirmed by the farmer, who pays and so has no reason to confirm work not done); the strongest inclusion story for a WeBank panel; the web app already shows farmland. Delivery drones in Shenzhen belong to Meituan, and humanoids are a speculative market with privacy and safety questions.

Demo story:

1. A pilot with nothing to pledge gets a drone financed by a licensed lessor (sandbox).
2. The bond starts at zero, so the drone takes small jobs inside the starting floor.
3. Farmers post spraying jobs, the drone sprays, the farmers confirm, the fee splits automatically.
4. The bond grows, bigger jobs unlock, the lender lowers the rate.
5. A faked flight log is caught by the plausibility check.
6. The agent is tricked by an injected message, the policy engine blocks it, a party proves it from the log, the vendor bond is slashed.
7. The lease reaches zero and the drone belongs to the pilot.

Closing statement, for the last slide and the end of the video:

> The same rail works for any machine that does paid work someone can verify. Delivery drones paid per drop. Robot arms paid per part. Robotaxis paid per trip. Port vehicles paid per container move. And one day the humanoid in your building, paid per errand for your neighbour. Every one of them can earn, pay its own way, post a bond and pay off its own financing. The agricultural drone is the first.

Changes to `BONDED_AGENT.md` (owner of that file): Side B moves to the closing statement and a short "next" section; Side A becomes the agricultural drone only (spraying per mu, farmer confirmation, no delivery flow); the three-act demo becomes the story above; mission control keeps only the farmland view.

## A.6 Proof is checked against records (problem 10)

Problem. The first version of `slashByProof` took a hash plus an `evidence` blob typed in by the reporter and believed the blob. A farmer could take a perfectly legal signed payment, claim "the job was not confirmed", and collect a bounty. The current code fixes half of this: the rule is now checked against the signed fields. The other half: for confirmation and location, the contract still trusts a field the agent signed (`confirmed`, `geofence`) instead of asking `JobBoard` what really happened and what the job allowed.

Decision. The reporter only points: "this signed intent breaks this rule". Every fact comes from a source the reporter cannot control.

| Fact | Source |
|---|---|
| What the agent did | The signed intent (EIP-712, sealed by the agent's signature) |
| What was allowed | The agent's terms in `Bond` and the job's terms in `JobBoard` |
| What happened | `JobBoard` (confirmed, released) and `Lease` |

Example after the fix: the farmer submits the legal "pay 160 to 0xBANK for job 12" and claims the payee was not approved. The contract reads the payee from the signed intent: 0xBANK, approved, rejected. Editing the intent to say 0xSCAMMER breaks the signature. Claiming job 12 was not confirmed is checked against `JobBoard`, which shows it was. Rejected.

## A.7 How real-world work is proven (context, no change)

No single source proves a field was sprayed, so the design layers them: the farmer's confirmation (primary, and the farmer pays so has no reason to lie), the drone's signed flight log with plausibility checks (production: signed by a secure element in the drone; demo: signed by our keys, labelled as such), and a 24 hour hold where the farmer can flag bad work for a human arbiter. State this honestly in the security self-assessment.

# Part B: implementation spec

Written so a person or a coding agent can implement it directly. Contracts are in `contracts/src`, tests in `contracts/test`, the web engine mirror is `web/src/engine/contracts.ts` and must keep the same rules.

## B.0 Invariants (hold these everywhere)

1. Never take a fact from the caller when a contract can read it. Amounts, confirmations, geofences, parties and bond balances are read from contract state or from the signed intent.
2. The pilot bond is slashed only by pilot rules, the vendor bond only by vendor rules. No rule touches both.
3. A proof is accepted only if the intent was committed to `IntentLog` for the same job before the slash.
4. Each intent hash can be used as proof once.
5. Only parties of the job can submit proof for a live job. Shadow jobs accept proof from registered hunters.
6. No path lets the policy engine or the model decide a slash. The contract decides from records.

## B.1 New contract: `IntentLog.sol`

Purpose: an append-only, per-job record of intent hashes.

```solidity
interface IIntentLog {
    event Committed(bytes32 indexed jobId, bytes32 indexed intentHash, address indexed agent, uint64 at);
    function commit(bytes32 jobId, bytes32 intentHash) external;          // msg.sender must be the agent
    function committedAt(bytes32 intentHash) external view returns (uint64); // 0 if never committed
    function jobOf(bytes32 intentHash) external view returns (bytes32);
    function agentOf(bytes32 intentHash) external view returns (address);
}
```

Rules:

- `commit` stores `committedAt`, `jobOf` and `agentOf` for the hash. Reverts if the hash was already committed.
- The caller is the agent key (the same key that signs intents). No one else can commit for that agent.
- `intentHash` is `Bond.hashIntent(intent)` (the EIP-712 struct hash, not the digest).
- The agent runtime commits every intent before the policy engine decides (B.6).

## B.2 Changes to `IBonded.sol`

- Keep the `Intent` struct as is, with two changes:
  - `jobId` is `bytes32(uint256(jobBoardId))` so it maps one to one to `JobBoard` job ids. Document this in the struct comment.
  - `coverBound` is removed (A.4). `confirmed` stays: on a `claim_done` intent it is what the agent asserts.
- `slashByProof(Intent calldata intent, bytes calldata signature, uint8 rule)` keeps its signature.
- Add `function covers(address agent, uint256 exposure) external view returns (bool);` semantics change (B.3).
- Add vendor bond views: `vendorBondOf(address vendor) returns (uint256 balance)` and `vendorOf(address agent) returns (address)`.

## B.3 Changes to `Bond.sol`

State:

```solidity
struct Vendor {
    uint256 balance;
    uint256 penalty;        // fixed slash per proven agent violation
    uint256 dailyCap;       // max total slashed from this vendor per day
    uint256 slashedToday;
    uint64  day;            // block.timestamp / 1 days of the last slash
}
mapping(address => Vendor) vendors;          // vendor address to vendor bond
mapping(address => address) vendorOfAgent;   // agent to vendor

IIntentLog public immutable log;
IJobBoardView public immutable board;        // read-only view of JobBoard, B.4
uint256 public immutable startFloor;         // 200 yuan in demo units
```

Functions to add:

- `postVendorBond(uint256 penalty, uint256 dailyCap) payable`: msg.sender becomes or tops up a vendor.
- `register(...)` gains `address vendor`. The vendor must exist. Store `vendorOfAgent[agent] = vendor`.

`covers` (problems 3 and 11):

```solidity
function covers(address agent, uint256 exposure) public view returns (bool) {
    return agents[agent].balance + startFloor >= exposure;   // no minimum here
}
```

`minimum` stays in storage and in `bondOf`, read by the lender and the board for rate and listing, not by `start`.

Rules, each tagged with the bond it slashes:

| Rule | Bond | Violation when | Read from |
|---|---|---|---|
| `PayeeNotAllowlisted` | Vendor | `kind` is pay or pay_instalment and `payee` is not on the agent's allowlist | intent, `Bond` |
| `OverCap` | Vendor | `kind` is pay or pay_instalment and `amount > perTxCap` | intent, `Bond` |
| `FalseConfirmation` (replaces `UnconfirmedClaim`) | Pilot | `kind` is claim_done, the intent asserts `confirmed == true`, and `board.isConfirmed(jobId)` is false | intent, `JobBoard` |
| `OutsideGeofence` | Pilot | `kind` is start_task and `geofence != board.geofenceOf(jobId)` | intent, `JobBoard` |

Remove `NoCoverBound` (A.4).

`slashByProof` checks, in this order, and reverts with these messages:

1. `"unknown agent"`: the agent is registered.
2. `"proof already used"`: the intent hash is not in `spent`.
3. `"not the agent's signature"`: EIP-712 recovery equals `intent.agent`. (Already implemented.)
4. `"not in log"`: `log.committedAt(hash) != 0`, `log.jobOf(hash) == intent.jobId` and `log.agentOf(hash) == intent.agent`.
5. `"not a party"`: msg.sender is a party of the job (`board.isParty(jobId, msg.sender)`, B.4), or the job is a shadow job and msg.sender is a registered hunter.
6. `"no violation"`: the rule holds, per the table above.
7. Vendor rules only: `"daily cap reached"` if `slashedToday + penalty > dailyCap` (reset `slashedToday` when the day changes).

Then mark `spent`, slash the tagged bond (pilot: `slashAmount` capped at the pilot balance; vendor: `penalty` capped at the vendor balance), pay half to msg.sender as a bounty and half to the treasury. Emit `Slashed(agent, intentHash, rule, bondKind, amount, submitter, bounty)`.

Known gap kept from `contracts/README.md`: switch bounty and treasury payouts to pull payments, so a reverting receiver cannot block a slash.

## B.4 Changes to `JobBoard.sol`

- Remove `bindCover`, `coverBound` and the cover check in `start` (A.4).
- Add a shadow flag to jobs: `post(..., bool shadow)`. Shadow jobs move no lease money and exist only for hunters. Keep them in the same contract so the rules are identical.
- Add read-only views for `Bond` (define `IJobBoardView`):

```solidity
interface IJobBoardView {
    function isConfirmed(bytes32 jobId) external view returns (bool);   // status is Released or Held
    function geofenceOf(bytes32 jobId) external view returns (bytes32);
    function isParty(bytes32 jobId, address who) external view returns (bool); // requester, verifier, agent's operator, lender of leaseOf[id], vendor of the agent
    function isShadow(bytes32 jobId) external view returns (bool);
}
```

- `start` keeps `bond.covers(agent, fee * 25 / 100)`. With the new `covers`, a zero bond can start jobs up to `4 * startFloor` in fee.
- Add the cancel path listed as a known gap: the requester can cancel a job that never started after `windowEnd`, and the fee is refunded.

## B.5 Changes to `Lease.sol`

- No change needed for problems 1 to 11.
- Recommended, not yet decided: `setRate` should be callable by the lender inside the band (the lender is the party that rewards a bond reaching the minimum), not only by the operator.
- Problem 7 (seasonality) will change `monthlyMinimum`. Do not build until decided.

## B.6 Agent runtime (`web/src/engine`)

For every action the agent takes:

1. Compute numbers with tools. The model may explain them, never produce them.
2. Validate the action against the schema and the tool outputs. Discard anything malformed. Discarded actions are never signed.
3. Build the typed intent (B.2 fields) and sign it with the agent key under the JiXin EIP-712 domain. The engine currently signs a canonical string with `recoverMessageAddress`; switch to EIP-712 so the same signature verifies on chain.
4. Commit `hashIntent(intent)` to `IntentLog` for its job.
5. Deliver the full intent and signature to every party of the job (farmer, pilot, lender, vendor).
6. Only then run the policy engine. Blocked intents stay committed and delivered.

Mirror every contract rule change in `web/src/engine/contracts.ts` (`violates`, `slashByProof`, `covers`) so the offline demo and the chain agree.

## B.7 Tests (acceptance criteria)

Add to `contracts/test`. Each is one Foundry test.

Bond and log:

1. A proof for an intent never committed to `IntentLog` reverts `"not in log"`.
2. A proof whose log entry belongs to a different job reverts `"not in log"`.
3. A stranger (not a party, not a hunter) reverts `"not a party"`.
4. The lender of the job can submit proof and receives the bounty.
5. `PayeeNotAllowlisted` and `OverCap` slash the vendor bond; the pilot bond is unchanged.
6. `FalseConfirmation` and `OutsideGeofence` slash the pilot bond; the vendor bond is unchanged.
7. `FalseConfirmation` on a job `JobBoard` shows as confirmed reverts `"no violation"` (the farmer's attack).
8. `OutsideGeofence` with an intent geofence equal to the job's geofence reverts `"no violation"`.
9. Vendor penalties stop at `dailyCap` within a day and resume the next day.
10. Keep the existing tests: replay rejected, foreign evidence rejected, stranger signature rejected, register needs agent consent, operator-only top up.

Start and floor:

11. A newly registered agent with a zero bond can start a job with fee up to `4 * startFloor` and cannot start a bigger one.
12. After confirmed jobs fill the bond, a bigger job can start.
13. `minimum` has no effect on `start`.

JobBoard:

14. No cover functions remain; `start` succeeds without any cover call.
15. A never-started job can be cancelled after its window and the fee returns to the requester.
16. Shadow jobs never call `Lease.pay`.

## B.8 Order of work

1. `IntentLog.sol` and its tests (1, 2).
2. `JobBoard`: views, remove cover, shadow flag, cancel (14 to 16).
3. `Bond`: new `covers` and floor (11 to 13), then the rule table with `JobBoard` reads (7, 8), then two bonds and the daily cap (5, 6, 9), then the log and party checks (1 to 4).
4. Engine: EIP-712 signing, commit to the log, delivery to parties, mirror rules.
5. Deploy to Base Sepolia and record one transaction hash per demo step.

# Part C: still open

| # | Problem | Notes |
|---|---|---|
| 6 | The market section of `BONDED_AGENT.md` still lists insurance pricing, agent liability insurance and "a take rate on every task and cover bound" as revenue, which A.4 rules out | Replace with the financing story: number of pilots, drone cost, the gap between subsidies and credit, fees per financed machine and on repayments |
| 7 | Spraying is seasonal; `Lease.monthlyMinimum` is fixed, so pilots default in the off-season | Next to decide. Likely a seasonal minimum or zero outside spraying windows |
| 8 | Scope is far bigger than the time left | Freeze the build to Part B plus the demo story in A.5 |
| 9 | Claims that can backfire | WeBank named as lender in `BONDED_AGENT.md` (use "a licensed lessor, sandbox"); farm drone purchase subsidies (农机购置补贴) may exist, verify before saying pilots cannot get financing; "a credit bureau for machines" is shenzhen-comp's pitch; verify the market sources before they go on a slide |
