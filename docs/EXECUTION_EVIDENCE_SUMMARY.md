# Execution evidence (official template)

Source for `docs/Zishi_Execution_Evidence.docx`, which `web/scripts/officialdocs.py` writes on the organisers' template. Every hash below is re-fetched by `pnpm verify:all`. Full tables: `docs/EXECUTION_EVIDENCE.md` (Base Sepolia) and `docs/FISCO_EVIDENCE.md` (FISCO BCOS).

## 01 Evidence Summary

### Selected topic and scenario

Topic F, Agent Wallet. Zishi is an AI wallet for an agricultural spraying drone on hire purchase. The drone earns per mu sprayed, repays its licensed lessor from every confirmed fee, fills a pilot bond, is slashed only on cryptographic proof of a rule break, and owns itself when the lease reaches zero. Four contracts (IntentLog, Bond, JobBoard, Lease) run on Base Sepolia (public, source verified) and on FISCO BCOS 3.16.3 (WeBank's consortium chain).

### What the evidence demonstrates

- The engine itself settles each job's money on the deployed contracts on FISCO BCOS in one loop, on the front running fix (IntentLogV2, BondV2): 14 contract calls plus 10 funding transfers to fresh role wallets, 24 of 24 transactions successful (fee locked in JobBoard, confirmed and split, instalments through Lease.pay, the rogue intent committed by its own agent and slashed by proof from the vendor bond, the title moved to the pilot).
- A free AI model read the job offers in that run: 5 of 5 read by the model, 5 accepted by code against the signed listings.
- One full job against the deployed contracts on public Base Sepolia: 9 of 9 contract calls with real value.
- Every intent hash is committed to the IntentLog before the policy engine decides; in one real run each intent went to Base Sepolia and FISCO BCOS in the same step with the same hash (15 of 15).
- Failure recovery on chain: a failed call is retried, a job that cannot start is cancelled by contract and the farmer gets the whole fee back.
- The agent bound IntentLogV2 stops front running on FISCO: a stranger's commit reverts, the agent's commit and the slash succeed.
- `pnpm verify:all` re-fetched every claimed receipt: see `docs/results/receipts.json`.

## 02 Logs or Transactions

### Simulated account/sandbox logs, or transaction hashes for Topic F

**Contracts on Base Sepolia (chain 84532), source verified on Sourcify.**

| Contract | Address | Deploy transaction |
|---|---|---|
| IntentLog | `0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51` | `0xb43b1cfa02f6a6978edfa682e495be9534e0295c1b08bb27598c15dcab6367e9` |
| Bond | `0x6161f6e08c8695849e7A8aF74c39a5A1056d5435` | `0x68f7117ae33a89819473d89a4ec2a70d2a5a7da8c681721dfdb68d37ecd5c578` |
| Lease | `0x0D21c8f6C1e6e6EA2ae5fF073F51fC4d57AC5ed2` | `0xeaa13a7628e427b6043ef95172856bd536cb72a749f4872a8ef54b03405d5fdb` |
| JobBoard | `0xAbE83C0dD54EAd67DB63C8f9e854f00756f29952` | `0x97227e36f9d0c8beaa5fdd3e571ac0123e21c52f1017c4a2dd1bfdb40d2f6c1e` |

**One full job on the deployed Base Sepolia contracts** (Basescan: https://sepolia.basescan.org/tx/<hash>).

| # | Call | From | Value (wei) | Transaction | Block | Status |
|---|---|---|---|---|---|---|
| 1 | Bond.postVendorBond | vendor | 20000000000 | `0xf080cce89f89919ceb7a6de20f934385d2aa597c1239509f57cc01482e80d8f6` | 48365739 | success |
| 2 | Bond.register | agent | 0 | `0x5218a1052d2868ac3e50c9f605b5f25236a1f12402737424885713b886c8c53d` | 48365741 | success |
| 3 | Lease.open | lender | 0 | `0x8a0006519d34b1fb9817032e4e0003e58dd5bef4eb535e2a434ec48057bff04d` | 48365744 | success |
| 4 | JobBoard.post | farmer | 100000000000 | `0xc1d373ee3c7ad50c3b249ddcc40fb1551b847c00e8f4fbb4d51ddfec6778d899` | 48365747 | success |
| 5 | JobBoard.start | agent | 0 | `0x3f708c8be9b57f870ef2da16fe6df7087a7fd676bd785879170eb0737dbd954f` | 48365749 | success |
| 6 | JobBoard.confirm | verifier | 0 | `0x1b3f71b8fbe7dc4a727eb1b7252df25f1634f9f5222dfbd158329ffdb29e7db6` | 48365753 | success |
| 7 | IntentLog.commit | agent | 0 | `0x05af20e0f2f4711eae00045a094406ca7b7786ece331077ffcf46e8918bac73c` | 48365760 | success |
| 8 | Bond.slashByProof | lender | 0 | `0x68606a4cb994906a253f0acc63aac5c78442ecdc49c6a393ceb672784d61d748` | 48365763 | success |
| 9 | Lease.pay | pilot | 60000000000 | `0x5440d994b3c254e6e8925e7253da7537d90e63c6c4fe3612f6557a4b2e3c3bd3` | 48365767 | success |

**Contracts on FISCO BCOS 3.16.3 (chain 20200).**

| Contract | Address | Deploy transaction |
|---|---|---|
| IntentLog | `0x9555c12c2789e44868070d0d877f9baadabe4f54` | `0xb1152d675e040beb9547ba18738874dca2ebc54cdbfd8abb57e3a935c9f8dd30` |
| Bond | `0xe3f2011697301e15e4cf829b0aeb189fab754029` | `0x2465a40fe73c4086db064c1c3682c2f4894e35cd8b42b7ad881df032bad3ff72` |
| Lease | `0x9c46a913abaf37cacd67f01f6f3b3e70f7b66601` | `0xfbc077117e1477cb70d48ffdbe514e3c2380e8e12568bba62475afade737e50b` |
| JobBoard | `0x20dc56e80b73f6066208a9d8197748f861579d37` | `0xd97cdec18ee572d25f4cbec08a2da705347e261995859c648588494d809992f2` |

**The engine's own run settling on the FISCO contracts (V2 set).**

| Moment | Call | Value (wei) | Transaction | Block | Status |
|---|---|---|---|---|---|
| vendor bond, agent, lease | BondV2.postVendorBond 5000 yuan (penalty 200, daily cap 1000) | 5000000000000 | `0x4cbb150ce77ce59fcb1f46416786a053c0d7b3f1de6f1990c572e4a1f63909e1` | 650 | success |
| vendor bond, agent, lease | BondV2.register agent (operator pilot, allowlist lender) | 0 | `0xcea5df9d7f7b11167703b093dc74ebd07c62e59e81e866d4bd4f389c0b4f6539` | 651 | success |
| vendor bond, agent, lease | Lease.open 650 yuan at 40 percent of each fee | 0 | `0x2ac6006b1e69bf56feb967a8b85b2cd7d380b7fa5dcfe4cb53fbb0de11cc6a17` | 652 | success |
| job job-202 posted | JobBoard.post job-202 fee 60 yuan locked | 60000000000 | `0x3e8eb8f5fe39b6be107dfef165094bf679cf3417ed5eddc82a39d7b715380f4a` | 654 | success |
| job job-203 posted | JobBoard.post job-203 fee 1500 yuan locked | 1500000000000 | `0xafe1456060735677c3aeb227dbec7527b3b5c9156e54d0c0f16e0544500c522f` | 657 | success |
| job job-203 started | JobBoard.start job-203 | 0 | `0xc088e8c6ba53695cf01a818403a665a152ed54962efb7c2d8a13be4c7294641f` | 659 | success |
| job job-203 confirmed | JobBoard.confirm job-203, fee split by the contract, instalment to the lender through Lease.pay | 0 | `0x98553f767728525b2663657727eb24c5fafb3354f4dbe977ba1dd3d94ade90b8` | 661 | success |
| job job-204 posted | JobBoard.post job-204 fee 250 yuan locked | 250000000000 | `0x740f4f65a629c23bf64db23049a2654215816ff0fa5a3d36cedbe8a4e23ce8ab` | 664 | success |
| job job-204 started | JobBoard.start job-204 | 0 | `0xb73e9f330d77a39c912d9980b72771701fb2db991b32e726cde7f2e6648ddad3` | 666 | success |
| rogue intent on job-203 proven | IntentLogV2.commit rogue intent 0xa38b7e12 for job-203 | 0 | `0xaa9b839d6bc369d870008888a4e220320b7d329a2c5eb291882549b859fbda32` | 669 | success |
| rogue intent on job-203 proven | BondV2.slashByProof PayeeNotAllowlisted, vendor bond pays the treasury | 0 | `0xc78373ada4fd6de20bef9a4366c23335527f552466f198e79bcfd4b03ed438ed` | 670 | success |
| job job-201 posted | JobBoard.post job-201 fee 240 yuan locked | 240000000000 | `0xa6dd514ae1dbbfb27ef3828970e4765caa1fc86e5d94d03a4d4530e157574909` | 672 | success |
| job job-201 started | JobBoard.start job-201 | 0 | `0xddfb7e912a12a8c96525e0eb26bb63dc3e32543c4333d61702266b4cbdfaf98b` | 673 | success |
| job job-201 confirmed | JobBoard.confirm job-201, fee split by the contract, instalment to the lender through Lease.pay | 0 | `0xb70eff028acc46da9f979134a10b6db958597ae7a427cc29b6e6cbe6127e8966` | 675 | success |

**Recovery drill (start reverted on chain, fee refunded by contract).**

| Moment | Call | Transaction | Block | Status |
|---|---|---|---|---|
| job job-203 started | JobBoard.start job-203 | `0xbbfd5437dc35c3f0a419d3ed356200c0fc13a97601f46352e6bd4bb2e445b271` | 495 | failed |
| job job-204 started | JobBoard.start job-204 | `0x7dc8c44a6242a44aba60d2b1efea0e59a9de57a6e0e6dbed8eb6ff200ca7eddf` | 501 | success |
| job job-201 started | JobBoard.start job-201 | `0xcd0313e0e981e80a808c670a571ff8fbb835412db03c2ab1e9cba30e1002f358` | 508 | success |
| job job-202 refund | JobBoard.cancel job-202, fee refunded to the farmer | `0x57a522e49831d532b7a5096b494a3724fc7b1b6cf79778918f9dd88abfaec2b3` | 513 | success |
| job job-203 refund | JobBoard.cancel job-203, fee refunded to the farmer | `0xbe3ab0233187898b8230f68e3e4f71e0a1afb6392e63354b200221e56a40721e` | 514 | success |
- start reverted on chain: sent > failed > sent > confirmed > sent > confirmed (ok)
- farmer got the fee back through JobBoard.cancel (wei): job-202: 60000000000 of 60000000000, job-203: 1500000000000 of 1500000000000 (ok)

**Front running fix (IntentLogV2 on FISCO).** Addresses and the demonstration steps with hashes: `contracts/deployments/fisco-v2.json`.

### Timestamp, action, result and relevant screenshot/link

| Timestamp | Action | Result | Link |
|---|---|---|---|
| 2026-10-20T12:37:47Z | Full job on the deployed Base Sepolia contracts | 9 of 9 calls successful, lender paid, vendor bond slashed, title to the pilot | https://sepolia.basescan.org/tx/0x5440d994b3c254e6e8925e7253da7537d90e63c6c4fe3612f6557a4b2e3c3bd3 |
| 2026-10-20T14:31:27.555Z | Engine fleet run settling on the V2 contracts on FISCO with the free model reading offers | 24 of 24 successful, all balance checks passed | `settled-run-2026-10-20T14-31-27-555Z.json` |
| 2026-10-20T13:53:56.737Z | Recovery drill, start reverted | fee refunded by JobBoard.cancel | `web/evidence/fisco/` |
| 2026-10-19T20:05:00Z | Contracts deployed and verified on Base Sepolia | Sourcify exact match | https://sepolia.basescan.org/address/0x093eD0DD8E4bE4b0205a6e39d0c5988f5Cd8ad51 |
| 2026-10-20 | Live demo | Public runs on FISCO BCOS, real Base Sepolia with the demo token | https://zishi-fintechathon.vercel.app |

## 03 Reproduction Guide

### Steps required for judges to reproduce or verify the evidence

1. Check any Base Sepolia hash on https://sepolia.basescan.org or with one RPC call: `curl -s https://sepolia.base.org -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["<hash>"]}'`.
2. Re-check every receipt the repository claims: `cd web && pnpm install && pnpm verify:all` (FISCO sources are skipped if no FISCO node is running).
3. Bring up FISCO BCOS, deploy and run the smoke flow: `bash contracts/script/fisco.sh` (Docker).
4. Run the engine with settlement on FISCO: `cd web && FISCO_RPC_URL=http://127.0.0.1:8545 FISCO_PRIVATE_KEY=$(cat ../contracts/.fisco/deployer.key) pnpm settle`; add `ZISHI_FAULT=start-revert` for the recovery drill.
5. Run one full job on Base Sepolia with your own funded key: `bash contracts/script/fulljob.sh base`.
6. Tests: `cd contracts && forge test` (84), `cd web && pnpm test` (52 attacks, recovery, keys, oracle, dialogue).
7. Live: open https://zishi-fintechathon.vercel.app/app/fleet and press Start; with the demo token from the submission form, open /app/live?demo=<token> once for real Base Sepolia mode.
