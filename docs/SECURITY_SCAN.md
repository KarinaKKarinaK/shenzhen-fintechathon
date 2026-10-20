# Security scan

Generated 2026-10-20T13:46:13Z by `bash web/scripts/security-scan.sh`. Raw data: `docs/results/security-scan.json`.

## Tools

- slither 0.11.6
- solc 0.8.26 (forge Version: 1.8.5)
- pnpm 10.27.0
- gitleaks 8.30.1

## Summary

| Check | Result |
|---|---|
| Slither, contracts/src V1 and V2 | 42 findings (2 high, 5 medium, 21 low, 14 informational). 0 true issues of medium or higher. 6 false positive, 36 accepted with reason |
| pnpm audit, production deps (190) | 0 vulnerabilities |
| pnpm audit, all deps | 0 critical, 1 high, 0 moderate, 0 low after fixes (was 0 critical, 2 high, 1 moderate) |
| gitleaks, full git history (128 commits) | 0 secrets found |
| Contract tests | forge test: 84 of 84 pass (default profile and FOUNDRY_PROFILE=fisco) |

## Slither triage

V1 contracts (`contracts/src/*.sol`) are deployed and source verified, so they are not changed. V1 notes give the mitigation. V2 is in `contracts/src/v2`.

| Severity | Set | Check | Location | Verdict | Reason |
|---|---|---|---|---|---|
| High | V1 | arbitrary-send-eth | contracts/src/JobBoard.sol#L175 | false positive | Recipients are the rail (fixed in the constructor) and the job's agent (fixed when the job is posted). The caller cannot choose them. |
| High | V1 | reentrancy-eth | contracts/src/Lease.sol#L60-L74 | accepted | V1 Lease.pay. The balance is cut before the call to the lender, and the title step is guarded by the `owned` flag, so a re-entering lender can only pay more into its own lease. No funds can be taken. Mitigation: lenders are known parties set when the lease is created; Lease is not redeployed, so the fix is operational. |
| Medium | V1 | incorrect-equality | contracts/src/IntentLog.sol#L29-L33 | false positive | `at == 0` checks that an intent was not committed yet. No balance or timing value is compared. |
| Medium | V1 | uninitialized-local | contracts/src/JobBoard.sol#L96 | false positive | Zero is the intended default: shadow jobs pay no instalment and no bond top up. |
| Medium | V1 | uninitialized-local | contracts/src/JobBoard.sol#L97 | false positive | Zero is the intended default: shadow jobs pay no instalment and no bond top up. |
| Medium | V2 | unused-return | contracts/src/v2/IntentLogV2.sol#L58-L67 | false positive | Tuple destructuring of the board's `jobs()` getter. Only the agent and status fields are needed; the others are skipped on purpose. |
| Medium | V2 | unused-return | contracts/src/v2/BondV2.sol#L248-L251 | false positive | Tuple destructuring of the board's `jobs()` getter. Only the agent and status fields are needed; the others are skipped on purpose. |
| Low | V1 | missing-zero-check | contracts/src/JobBoard.sol#L59 | accepted | Constructor arguments set once by the deployer. Deployed values are checked against the deployment files and the source verified contracts. |
| Low | V1 | missing-zero-check | contracts/src/Bond.sol#L76 | accepted | Constructor arguments set once by the deployer. Deployed values are checked against the deployment files and the source verified contracts. |
| Low | V1 | reentrancy-benign | contracts/src/Lease.sol#L60-L74 | accepted | State is written before the external call. Only the lease's own title step runs after it and it is idempotent. |
| Low | V1 | reentrancy-events | contracts/src/Bond.sol#L189-L225 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V1 | reentrancy-events | contracts/src/JobBoard.sol#L140-L149 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V1 | reentrancy-events | contracts/src/JobBoard.sol#L120-L128 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V1 | reentrancy-events | contracts/src/JobBoard.sol#L130-L136 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V1 | reentrancy-events | contracts/src/JobBoard.sol#L88-L117 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V1 | reentrancy-events | contracts/src/Lease.sol#L60-L74 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V1 | timestamp | contracts/src/JobBoard.sol#L130-L136 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V1 | timestamp | contracts/src/IntentLog.sol#L29-L33 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V1 | timestamp | contracts/src/JobBoard.sol#L140-L149 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V1 | timestamp | contracts/src/Bond.sol#L123-L140 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V1 | timestamp | contracts/src/Bond.sol#L189-L225 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V1 | timestamp | contracts/src/JobBoard.sol#L120-L128 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V1 | timestamp | contracts/src/JobBoard.sol#L74-L83 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V2 | missing-zero-check | contracts/src/v2/BondV2.sol#L82 | accepted | Constructor arguments set once by the deployer. Deployed values are checked against the deployment files and the source verified contracts. |
| Low | V2 | reentrancy-events | contracts/src/v2/BondV2.sol#L205-L241 | accepted | Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic. |
| Low | V2 | timestamp | contracts/src/v2/BondV2.sol#L205-L241 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V2 | timestamp | contracts/src/v2/IntentLogV2.sol#L58-L67 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Low | V2 | timestamp | contracts/src/v2/BondV2.sol#L129-L146 | accepted | Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome. |
| Informational | V1 | assembly | contracts/src/Bond.sol#L243-L256 | accepted | Reads r, s, v from calldata for ecrecover. Length is checked to be 65, high s is rejected (no malleability) and the zero address is rejected. |
| Informational | V1 | low-level-calls | contracts/src/Bond.sol#L189-L225 | accepted | Plain value transfer with the success flag checked and a revert on failure. |
| Informational | V1 | low-level-calls | contracts/src/Lease.sol#L60-L74 | accepted | Plain value transfer with the success flag checked and a revert on failure. |
| Informational | V1 | low-level-calls | contracts/src/JobBoard.sol#L175 | accepted | Plain value transfer with the success flag checked and a revert on failure. |
| Informational | V1 | naming-convention | contracts/src/Bond.sol#L97-L99 | accepted | `DOMAIN_SEPARATOR` is the EIP-712 standard name; leading underscore on parameters is a style choice. |
| Informational | V1 | naming-convention | contracts/src/Bond.sol#L84 | accepted | `DOMAIN_SEPARATOR` is the EIP-712 standard name; leading underscore on parameters is a style choice. |
| Informational | V1 | unindexed-event-address | contracts/src/Bond.sol#L73 | accepted | `BoardSet` fires once per deployment; indexing it adds nothing. |
| Informational | V2 | assembly | contracts/src/v2/BondV2.sol#L269-L282 | accepted | Reads r, s, v from calldata for ecrecover. Length is checked to be 65, high s is rejected (no malleability) and the zero address is rejected. |
| Informational | V2 | low-level-calls | contracts/src/v2/BondV2.sol#L205-L241 | accepted | Plain value transfer with the success flag checked and a revert on failure. |
| Informational | V2 | naming-convention | contracts/src/v2/BondV2.sol#L90 | accepted | `DOMAIN_SEPARATOR` is the EIP-712 standard name; leading underscore on parameters is a style choice. |
| Informational | V2 | naming-convention | contracts/src/v2/BondV2.sol#L103-L105 | accepted | `DOMAIN_SEPARATOR` is the EIP-712 standard name; leading underscore on parameters is a style choice. |
| Informational | V2 | naming-convention | contracts/src/v2/IntentLogV2.sol#L49 | accepted | `DOMAIN_SEPARATOR` is the EIP-712 standard name; leading underscore on parameters is a style choice. |
| Informational | V2 | unindexed-event-address | contracts/src/v2/IntentLogV2.sol#L45 | accepted | `BoardSet` fires once per deployment; indexing it adds nothing. |
| Informational | V2 | unindexed-event-address | contracts/src/v2/BondV2.sol#L79 | accepted | `BoardSet` fires once per deployment; indexing it adds nothing. |

## Dependencies

Fixed by upgrade (build, test and lint pass after the change):

- playwright 1.48.2 to 1.56.1: GHSA-7mvr-c777-76hp (high): browser download without TLS check. Dev only (screenshot script).
- tsx 4.19.2 to 4.20.6: Pulls esbuild 0.25.x, closing GHSA-67mh-4wv8-2f99 (moderate): dev server readable cross origin.

Remaining:

- braces (high, https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): accepted. Dev only, reached through eslint-config-next (lint). No patched version is published (patched range is empty). Input is our own lint globs, not user data, and it is not in the deployed app.

The production dependency tree, which is what runs on Vercel, has no known vulnerabilities.

## Secrets

gitleaks scanned all 128 commits with redaction on: 0 findings.
Local only files that hold keys (`web/.env.local`, `contracts/.fulljob/*/keys.env`, the local FISCO node keys under `contracts/.fisco/`) are gitignored and were never committed. A working tree scan finds them, as expected, and `git check-ignore` confirms each one is ignored.

## Reproduce

```
bash web/scripts/security-scan.sh
```

Needs uv, Foundry, pnpm and gitleaks. Slither runs through `uvx --from slither-analyzer==0.11.6`.
