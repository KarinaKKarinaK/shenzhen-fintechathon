# Contracts

Three contracts and one interface. The web engine (`web/src/engine/contracts.ts`) mirrors their rules so the demo runs without a chain.

| File | What | Status |
|---|---|---|
| `IBonded.sol` | The bonded wallet standard: bond balance and minimum, worst case, covers, slash by proof, top up | Written, compiled in CI, not deployed |
| `Bond.sol` | Holds bonds, slashes on proof, pays half to the submitter, operator only top up | Written, compiled and tested in CI, not deployed |
| `JobBoard.sol` | One board for both sides: fee locks on post, start needs cover and a covering bond, release only on the verifier's confirmation, split by rule, capped 24 hour hold | Written, compiled in CI, not deployed |
| `Lease.sol` | Hire purchase: instalment per released fee, freeze by the lender, title at zero, rate changes by the operator inside the band | Written, compiled in CI, not deployed |

## Changes this round

- `slashByProof` takes a typed intent struct instead of a bare hash. The hash is EIP-712 over a JiXin domain, so a signature from another app or chain is not proof here. The evidence the rule is checked on is bound to the signed hash: the contract hashes the struct fields itself, so a submitter cannot pair a real signature with invented evidence. The spent set stays: one proof slashes once.
- `JobBoard.confirm` takes the instalment from `Lease.instalmentFor` and pays it with `Lease.pay`, instead of trusting a number from the caller. The `topUp{value: 0}` placeholder is gone; the bond gap is filled through `Bond.fill`. The verifier must not be the agent. A frozen lease rejects the release.
- `Bond.register` requires the agent address and records the operator as `msg.sender`; an unregistered agent cannot be slashed or topped up.
- `SkippedInstalment` is out of the `Rule` enum. The lease contract proves a skipped instalment itself; the bond no longer carries a rule it cannot check.

## Known gaps

- No withdraw at title transfer. The bond is returned at title transfer in the idea; the contract has no path for it yet.
- Bounty and treasury are push payments inside `slashByProof`. A reverting receiver blocks the slash. Pull payments are the fix.
- `Bond.worstCase()` returns `perTxCap`, while `JobBoard.start` checks `fee * 25 percent`. One definition should win.
- No cancel path. A posted job that never starts holds the fee forever.

## Run the tests

```
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts && forge install foundry-rs/forge-std && forge test
```

CI runs the same command. To deploy: `forge create` to Base Sepolia, verify on the explorer, and put the addresses in `web/.env`. The engine's chain adapter currently anchors events as self transfers with calldata; ABI calls against deployed addresses are the next step.
