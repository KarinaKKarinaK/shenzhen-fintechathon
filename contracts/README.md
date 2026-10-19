# Contracts

Four contracts and two interfaces. The web engine (`web/src/engine/contracts.ts`) mirrors their rules so the demo runs without a chain. Amounts are in yuan (demo units: 1 ether is 1 yuan in the tests).

| File | What | Status |
|---|---|---|
| `IBonded.sol` | The bonded wallet standard: pilot bond and minimum, covers with the floor, slash by proof, top up, vendor bond views | Written per `BONDED_AGENT_FIXES.md` B.2, compiled in CI, not deployed |
| `IntentLog.sol` | Append-only per-job record of intent hashes. The agent commits every intent before the policy engine decides | Written per B.1, compiled and tested in CI, not deployed |
| `Bond.sol` | Two bonds: pilot bond slashed only for pilot rules, vendor bond slashed only for agent rules with a fixed penalty and a daily cap. Proof checked against the log, the board and the signed intent. Parties only on live jobs, hunters on shadow jobs | Written per B.3, compiled and tested in CI, not deployed |
| `JobBoard.sol` | One board: fee locks on post, start needs the bond plus floor to cover a quarter of the fee, release only on the verifier's confirmation, split by rule, capped 24 hour hold, cancel after the window, shadow jobs, views for `Bond` | Written per B.4, compiled and tested in CI, not deployed |
| `Lease.sol` | Hire purchase: instalment per released fee, freeze by the lender, title at zero, rate changes by the operator inside the band. Gained `lenderOf` | Written, compiled in CI, not deployed |

## Rules and bonds

| Rule | Bond | Violation when | Read from |
|---|---|---|---|
| `PayeeNotAllowlisted` (0) | Vendor | pay or pay_instalment to a payee not on the agent's allowlist | intent, `Bond` |
| `OverCap` (1) | Vendor | pay or pay_instalment with amount over `perTxCap` | intent, `Bond` |
| `FalseConfirmation` (2) | Pilot | claim_done asserting `confirmed` while `JobBoard.isConfirmed` is false | intent, `JobBoard` |
| `OutsideGeofence` (3) | Pilot | start_task with a geofence different from `JobBoard.geofenceOf` | intent, `JobBoard` |

`slashByProof` checks in this order and reverts with: `unknown agent`, `proof already used`, `not the agent's signature`, `not in log`, `not a party`, `no violation`, `daily cap reached` (vendor rules only).

Who gets paid. On a live job the slash pays the harmed party and the treasury, half each: pilot rules pay the job's requester, vendor rules pay the agent's operator. The submitter never earns a bounty on a live job, so compromising a live wallet pays nothing. Bounties exist only for registered hunters (`setHunter`) on shadow jobs, half to the hunter and half to the treasury.

Demo numbers: drone 55,000 yuan; starting floor 200 yuan, so a zero bond starts jobs up to 800 yuan in fee; vendor bond 5,000 yuan, penalty 200 yuan per proven agent violation, daily cap 1,000 yuan; pilot slash 100 yuan; jobs of 20 to 150 mu at 3 to 15 yuan per mu.

## Changes this round

- New `IntentLog`. `commit(jobId, intentHash)` records the hash, the job and `msg.sender` (the agent key). A proof is accepted only if the hash is in the log for the same job and agent.
- Two bonds. `postVendorBond(penalty, dailyCap)` posts or tops up a vendor bond. `register` takes a `vendor` and requires it to have a bond. Each rule is tagged with the bond it slashes; no rule touches both.
- `covers(agent, exposure)` is `balance + startFloor >= exposure`. The minimum is no longer a start condition. It stays in `bondOf` for the lender and the board.
- `FalseConfirmation` replaces `UnconfirmedClaim` and reads the confirmation from `JobBoard`. `OutsideGeofence` reads the job's geofence from `JobBoard`; the per-agent geofence list is gone from `register`.
- `NoCoverBound`, `bindCover` and `coverBound` are removed. `Intent` lost the `coverBound` field, so the EIP-712 type string changed.
- `JobBoard.post` takes a `shadow` flag. Shadow jobs run the same rules but call neither `Lease.pay` nor `Bond.fill`.
- `JobBoard.cancel`: the requester can cancel a never-started job after its window and the fee is refunded. New status `Cancelled`.
- `JobBoard` implements `IJobBoardView` (`isConfirmed`, `geofenceOf`, `isParty`, `isShadow`, `requesterOf`). Parties are the requester, the verifier, the agent's operator, the lender of the job's lease and the agent's vendor.
- `Bond` needs the board address and the board needs the bond address, so `Bond.setBoard` is called once by the deployer after both are deployed. Deploy order: `IntentLog`, `Bond(treasury, log, floor)`, `Lease`, `JobBoard(bond, lease, rail)`, then `bond.setBoard(board)`.

Engine mirror (`web/src/engine/contracts.ts`) still has to follow: the rule set and indices, the two bonds, the floor in `covers`, the log check, the party check and the payout rule.

## Known gaps

- No withdraw at title transfer, and no vendor bond withdraw. The pilot bond is returned at title transfer in the idea; the contract has no path for it yet.
- Payouts in `slashByProof` are push payments. A reverting receiver blocks the slash. Pull payments are the fix.
- `Bond.worstCase()` returns `perTxCap`, while `JobBoard.start` checks a quarter of the fee. One definition should win.
- Compensation for money that really left a wallet is out of scope. The policy engine blocks before money moves, so the chain only needs penalties.
- Collusion (a pilot feeding the agent fake scams to drain the vendor bond) is limited by the daily cap only. The Hard Button rule from `BONDED_AGENT_FIXES.md` A.1 is not built.
- `IntentLog` keys entries by hash alone. Someone who sees an agent's commit in the mempool could commit the same hash first; the proof then fails `not in log` and the agent cannot re-commit. Not an issue on a consortium chain; on a public chain, key entries by agent and hash.

## Run the tests

```
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts && forge install foundry-rs/forge-std && forge test
```

CI runs the same command. To deploy: `forge create` to Base Sepolia in the order above, verify on the explorer, and put the addresses in `web/.env`. The engine's chain adapter currently anchors events as self transfers with calldata; ABI calls against deployed addresses are the next step.
