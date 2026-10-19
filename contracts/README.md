# Contracts

Three contracts and one interface. The web engine mirrors their rules exactly so the demo runs without a chain and switches to Base Sepolia with a funded key.

- `IBonded.sol`: the bonded wallet standard. Lenders and task boards only deal with wallets that implement it.
- `Bond.sol`: holds bonds, slashes on proof of a signed intent that breaks a checkable rule, pays half to the submitter, only the operator key can top up.
- `JobBoard.sol`: one contract for both sides. Fee locks on post, task starts only with cover bound and a bond that covers the worst case, fee releases only on the verifier's confirmation, split by rule, with a capped 24 hour hold for a flag.
- `Lease.sol`: hire purchase. Instalments per unit of work, freeze on tampered data, title transfer at zero, rate changes only by the operator inside the signed band.

## Status

Written, not yet compiled. Foundry is not installed on the build machine. To run:

```
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts && forge install foundry-rs/forge-std && forge test
```

Deploy with `forge create` to Base Sepolia, verify on the explorer, and put the addresses and a funded key in `web/.env`. The engine's chain adapter then mines real transactions.

Known gap: `JobBoard.confirm` fills the bond through a low level call to `Bond.fill`. Replace the placeholder `topUp{value: 0}` line with nothing before deploying; it is there to show the call shape and will revert because the board is not the operator.
