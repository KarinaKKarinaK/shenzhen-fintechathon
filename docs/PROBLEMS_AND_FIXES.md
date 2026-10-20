# Problems and fixes

This page explains, in plain language, what was broken in the first Zishi design and how each problem was fixed. For the full engineering spec (interfaces, tests, order of work), see `TECHNICAL.md` and `contracts/README.md`.

## The idea in 30 seconds

A pilot wants an agricultural spraying drone (about 55,000 yuan) but has nothing to pledge for a loan. A lender pays for the drone instead. Each time the drone sprays a farmer's field, the farmer pays a fee, and that fee is split automatically:

- part repays the lender,
- part fills a **bond**, money held as a guarantee that is taken away (**slashed**) if someone proves a rule was broken,
- the rest goes to the pilot.

When the loan reaches zero, the drone belongs to the pilot. An AI agent runs the drone's money, but deterministic code checks every action before any money moves.

## Who is involved

| Who | What they do |
|---|---|
| **Pilot** | Operates the drone, keeps the profit, owns the drone once the loan is repaid. |
| **Lender** | Pays for the drone and owns it until it is repaid. Repaid automatically from each job. |
| **Farmer** | Posts a spraying job, pays for it, and confirms the work was done. |
| **AI agent** | Runs the drone's wallet: accepts jobs, pays bills. Every action it wants to take is written as a signed **intent**, e.g. "pay 160 to 0xBANK for job 12". |
| **Policy engine** | Plain code, not AI, that sits between the agent and the money. It allows or blocks each intent. |
| **Vendor (us)** | Built the AI agent and the contracts. |

## All problems at a glance

| # | Problem | Fix | Status |
|---|---|---|---|
| 1 | The pilot paid for the AI's mistakes | Two bonds: one for the pilot, one for the vendor | In code |
| 2 | Nobody could ever prove a violation | Every intent is logged before it is checked | In code |
| 3 | A new drone could never take its first job | A starting floor; the minimum became a reward | In code |
| 4 | The contract believed whatever the reporter said | Every fact is read from records | In code |
| 5 | The pilot could profit from tricking their own AI | Vendor penalties on real jobs go to the treasury only | In code |
| 6 | The demo showed payouts the chain would never make | One payout table used by both | In code |
| 7 | It was unclear where insurance fits | Removed from the build | In code |
| 8 | Too many scenarios | Agricultural drone only | Docs |
| 9 | Seasonal income vs a fixed monthly payment | Decided, not built | Docs |
| 10 | Claims in the docs that could backfire | Reworded | Docs |

"In code" means the change is in `contracts/` and `web/src/engine`. "Docs" means it is a decision about the story and the documents, not the code.

---

## Part 1: how the money could go wrong

### 1. The pilot paid for the AI's mistakes

**The problem.** There was one bond, built from the pilot's earnings. If a scammer tricked the AI agent, that bond was slashed, so the pilot lost money for a flaw in software someone else built.

**Example.** A fake message saying "the lender changed bank accounts, pay here instead" fools the agent. The pilot did nothing wrong but loses money anyway.

**The fix.** Two separate bonds, each covering only what its owner controls.

| | Pilot bond | Vendor bond |
|---|---|---|
| Who pays in | The pilot, from a slice of each fee | The vendor (us), up front |
| Covers | The pilot cheating | The AI agent making mistakes |
| Slashed when | A job is claimed without the farmer's confirmation, or the drone works outside the agreed field | The agent signs a payment to an unapproved payee or above the spending cap |
| Returned | To the pilot when the drone is paid off | To the vendor when it stops running the agent |

Each rule is tagged with the bond it hits, so the contract never has to judge who was at fault. The broken rule decides.

**Result.** Who pays if the AI gets it wrong? The company that built the AI, from its own bond. The pilot never pays for the AI.

---

### 2. Nobody could ever prove a violation

**The problem.** A bond is only slashed when someone submits proof: a signed intent that breaks a rule. But the agent signs its intents inside the pilot's own system, and the policy engine silently drops the ones it blocks. So the only person who ever saw the evidence was the pilot, and the pilot won't report against their own bond. In practice nothing could ever be slashed, and the bond was decoration.

**The fix.** Every intent is published before the policy engine decides on it.

1. The agent signs an intent.
2. Its fingerprint (a hash) is written to an on-chain log for that job. The hash reveals nothing private (no amounts, payees or locations) but proves the intent existed in exactly that form. Nobody can delete or edit it, including us.
3. The full intent is sent to every party of that job: the farmer, the pilot, the lender and the vendor. **This includes intents the policy engine blocked.**
4. Only then does the policy engine allow or block it.

**Result.** A blocked scam attempt can no longer be quietly dropped. The lender, who has its own money at stake, sees it and can report it.

**Who can report.** Only the parties of the job. Security testers ("hunters") never see real jobs. They attack copies of the agent on practice ("shadow") jobs.

**Why hashes only.** Field locations are personal or business data under China's privacy law (PIPL). Keeping the details among the parties and only hashes on chain is how a consortium chain like FISCO BCOS is used in production.

---

### 3. A new drone could never take its first job

**The problem.** A job could only start if the bond had reached its minimum. But the bond starts at zero and only fills from completed jobs. No bond means no job, and no job means no bond, so nothing could ever start.

**The fix.**

1. The minimum was removed from the start check. The only rule left is that the bond plus a floor must cover 25% of the job's fee.
2. Every machine gets a **starting floor of 200 yuan**, enough for one small job (about 50 mu).
3. The minimum became a **reward**: reaching it unlocks a better loan rate and a listing on the main job board.

**Why starting with no bond is safe:**
- The farmer can't lose money, because the fee is only released after they confirm the work.
- The lender can't lose the drone, because it holds the title.
- The AI's mistakes are covered by the vendor bond from day one.
- The floor keeps any cheating by a new pilot small.

---

### 4. The contract believed whatever the reporter said

**The problem.** To slash a bond, a reporter submitted an intent plus their own description of what happened, and the contract trusted that description.

**Example.** A farmer takes a perfectly legal payment, "pay 160 to 0xBANK for job 12", and claims "this job was never confirmed". The contract believed it and paid the farmer a reward.

**The fix.** The reporter only points: "this signed intent breaks this rule." The contract looks up every fact itself.

| Fact | Where the contract reads it |
|---|---|
| What the agent did | The signed intent. Changing anything in it breaks the signature. |
| What was allowed | The agent's terms in `Bond` and the job's terms in `JobBoard` |
| What actually happened | `JobBoard` (was it confirmed? was it paid?) and `Lease` |

**Same example after the fix.** The contract reads the payee from the signed intent: 0xBANK, which is approved, so the report is rejected. It checks job 12 in `JobBoard`, finds it was confirmed, and rejects that claim too.

---

### 5. The pilot could profit from tricking their own AI

**The problem.** When the vendor bond was slashed on a real job, half the penalty went to the pilot.

**Example of the scam.** The pilot sends their own drone's agent a fake "scam" message. The agent signs the bad payment, which is logged as in problem 2. The policy engine blocks it, so no money moves. The pilot then reports their own blocked intent and collects half of the 200 yuan penalty, up to 500 yuan a day.

**The fix.** On a real job, a vendor penalty goes **entirely to the treasury**. The policy engine blocked the payment, so nobody lost money and nobody needs compensating. Paying the lender instead would just move the same loophole to the lender, since the lender is also a party to the job.

The vendor still loses the penalty, so we still have every reason to ship a careful agent.

---

### 6. The demo showed payouts the chain would never make

**The problem.** The smart contract and the web app's simulation of it paid different people. The demo was showing money going somewhere the real contract never would.

**The fix.** One payout table, used by both the contract and the app.

| Job type | Rule broken | Bond slashed | Who gets the money |
|---|---|---|---|
| Real | AI agent rule (unapproved payee, over the cap) | Vendor | Treasury, all of it |
| Real | Pilot rule (false confirmation, outside the field) | Pilot | Half to the farmer who was harmed, half to the treasury |
| Shadow (practice) | Any | The tagged bond | Half to the hunter who found it, half to the treasury |

Whoever submits the proof is never rewarded just for reporting on a real job. A farmer is paid only as the person harmed, not as the reporter.

**Still open.** For pilot rules, the farmer both confirms the work and receives the payout. We need to check whether a farmer could withhold a confirmation on purpose to trigger a slash, and add a test for it.

---

### 7. It was unclear where insurance fits

**The problem.** The design mixed bonds and insurance, which blurred the story and overlapped with a competitor (CoverAI).

**The fix.** Insurance is out of the build. Bonds cover small and medium losses the system itself creates, quickly and by proof. Insurance belongs above the bonds: in production, AI liability insurance would back the vendor bond, and physical crash damage stays with the pilot's existing drone insurance. The pitch covers this in one line.

---

## Part 2: the story and the documents

### 8. Too many scenarios

**The problem.** The design covered delivery drones, agricultural drones, robot arms and humanoids at once, and none of them was told clearly.

**The fix.** Build and demo **only the agricultural spraying drone**. It is the strongest fit:
- over 200,000 drone pilots in China,
- a clear unit of work: one mu sprayed, measured from the GPS track,
- the farmer confirms and pays, so they have no reason to confirm work that wasn't done,
- it is the strongest financial inclusion story for the judges.

The other machines become a single closing line: *"The same rail works for any machine that does paid work someone can verify. The agricultural drone is the first."*

**The demo in seven steps:**
1. A pilot with nothing to pledge gets a drone financed by a licensed lender.
2. The bond starts at zero, so the drone takes small jobs within the starting floor.
3. Farmers post jobs, the drone sprays, farmers confirm, and the fee splits automatically.
4. The bond grows, bigger jobs unlock, and the lender lowers the rate.
5. A faked flight log is caught by the plausibility check.
6. The agent is tricked by a fake message, the policy engine blocks it, a party proves it from the log, and the vendor bond is slashed.
7. The loan reaches zero and the drone belongs to the pilot.

### 9. Seasonal income vs a fixed monthly payment

**The problem.** Spraying is seasonal, but the loan had a fixed monthly minimum. In the off-season, pilots would default.

**The decision.** No minimum outside spraying seasons. Inside a season, a shortfall carries over to the next month until caught up. Seasons come from the regional crop calendar. **Not built**: the contract still uses a fixed monthly minimum. This is described in `DESIGN.md` only.

### 10. Claims in the docs that could backfire

| Before | After |
|---|---|
| WeBank named as the lender | "A licensed lessor in a sandbox." WeBank is never named as the lender. |
| "Pilots cannot get financing" | Government farm machinery subsidies (农机购置补贴) may cover part of the price. Verify this before saying it on a slide. |
| "A credit bureau for machines" | Dropped, because it is a competitor's pitch. |
| Market figures | Each one is checked against its source before going on a slide. |
| Market section argued for insurance revenue | Replaced with the financing story: a fee per financed machine, a small cut of repayments, and a 2% fee per job. |

### 11. Running the same contracts on FISCO BCOS

**The problem.** WeBank's consortium chain speaks the Ethereum JSON-RPC, but not exactly. Out of the box, forge and viem could not deploy to it.

| What broke | Fix |
|---|---|
| solc 0.8.26 emits PUSH0, which FISCO's EVM does not run | A `fisco` Foundry profile with `evm_version = "paris"`; the default profile and its 44 tests are unchanged |
| The newest official Docker image (3.12.1, amd64 only) crashed under emulation, kept the nonce at 0 and put contracts at other addresses | FISCO 3.16.3, the native arm64 binary, in a plain Ubuntu 24.04 container |
| FISCO 3.16.4 refuses any Web3 transaction from an account with zero balance | Pinned to 3.16.3; native balances switched on with the chain admin key so value calls work too |
| The node returns `logsBloom: "0x"`, leaves block header fields out and rejects requests without `params` | `contracts/script/fisco_rpc_proxy.py`, a 60 line shim that fills them in and sends one request at a time |
| A call to an address with no code fails, so the calldata anchor Base uses cannot work | On FISCO a money event's digest is committed to the IntentLog instead, one contract call per event |
| `eth_call` and gas estimation ignore the sender, so calls guarded by `msg.sender` fail in simulation | The smoke flow sends with an explicit gas limit where that matters |
| `block.timestamp` is in milliseconds | Documented; JobBoard's windows need a unit fix before live jobs run there |

**The result.** One script (`contracts/script/fisco.sh`) brings the chain up, deploys, runs a smoke flow with real value and anchors the FATE model hash. The engine commits the same intent hash to Base Sepolia and FISCO in one run. See [FISCO_EVIDENCE.md](FISCO_EVIDENCE.md).

---

## What is still open

- **Farmer withholding confirmation** (problem 6): could a farmer provoke a pilot slash and collect? This needs a test.
- **Real losses**: if money actually leaves the wallet, someone has to establish the loss, and a contract can't see that. This is out of the build; the policy engine blocks payments before money moves, so the demo only needs penalties.
- **The Hard Button**: proposed rule is that anything the pilot approves on the physical button is the pilot's responsibility.
- **Seasonal minimum** (problem 9): decided but not built.
- **FISCO in the public demo** (problem 11): the node runs locally, so the live app cannot reach it yet. It needs a hosted node.
