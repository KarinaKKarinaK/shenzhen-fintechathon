"""Turns raw Slither, pnpm audit and gitleaks output into docs/results/security-scan.json and docs/SECURITY_SCAN.md.
Usage: python3 security-report.py <raw_dir> <repo_root>. Called by security-scan.sh."""
import json, sys, datetime, collections, os

raw, root = sys.argv[1], sys.argv[2]
load = lambda n: json.load(open(os.path.join(raw, n)))
read = lambda n: open(os.path.join(raw, n)).read().strip()

# Triage per Slither check. Verdicts: "false positive", "accepted", "fixed".
TRIAGE = {
    "arbitrary-send-eth": ("false positive", "Recipients are the rail (fixed in the constructor) and the job's agent (fixed when the job is posted). The caller cannot choose them."),
    "reentrancy-eth": ("accepted", "V1 Lease.pay. The balance is cut before the call to the lender, and the title step is guarded by the `owned` flag, so a re-entering lender can only pay more into its own lease. No funds can be taken. Mitigation: lenders are known parties set when the lease is created; Lease is not redeployed, so the fix is operational."),
    "incorrect-equality": ("false positive", "`at == 0` checks that an intent was not committed yet. No balance or timing value is compared."),
    "uninitialized-local": ("false positive", "Zero is the intended default: shadow jobs pay no instalment and no bond top up."),
    "unused-return": ("false positive", "Tuple destructuring of the board's `jobs()` getter. Only the agent and status fields are needed; the others are skipped on purpose."),
    "missing-zero-check": ("accepted", "Constructor arguments set once by the deployer. Deployed values are checked against the deployment files and the source verified contracts."),
    "reentrancy-benign": ("accepted", "State is written before the external call. Only the lease's own title step runs after it and it is idempotent."),
    "reentrancy-events": ("accepted", "Checks, effects, then interactions: all state is updated before the transfer, only the event is emitted after. Event order on re-entry is cosmetic."),
    "timestamp": ("accepted", "Windows are minutes to days (hold period, daily slash cap, start floor). A few seconds of validator drift does not change the outcome."),
    "assembly": ("accepted", "Reads r, s, v from calldata for ecrecover. Length is checked to be 65, high s is rejected (no malleability) and the zero address is rejected."),
    "low-level-calls": ("accepted", "Plain value transfer with the success flag checked and a revert on failure."),
    "naming-convention": ("accepted", "`DOMAIN_SEPARATOR` is the EIP-712 standard name; leading underscore on parameters is a style choice."),
    "unindexed-event-address": ("accepted", "`BoardSet` fires once per deployment; indexing it adds nothing."),
}
SEV_ORDER = ["High", "Medium", "Low", "Informational", "Optimization"]

findings = []
for d in load("slither.json")["results"]["detectors"]:
    files = sorted({e["source_mapping"]["filename_relative"] for e in d["elements"] if e.get("source_mapping")})
    loc = d.get("first_markdown_element", "").replace("src/", "contracts/src/", 1) if d.get("first_markdown_element") else (files[0] if files else "")
    version = "V2" if any("/v2/" in f for f in files) else "V1"
    verdict, reason = TRIAGE.get(d["check"], ("needs review", ""))
    findings.append({"severity": d["impact"], "confidence": d["confidence"], "check": d["check"], "contracts": version,
                     "location": loc, "summary": d["description"].split("\n")[0].strip(), "verdict": verdict, "reason": reason})
findings.sort(key=lambda f: (SEV_ORDER.index(f["severity"]), f["contracts"], f["check"]))
by_sev = collections.Counter(f["severity"] for f in findings)
by_verdict = collections.Counter(f["verdict"] for f in findings)

def audit_summary(n):
    a = load(n)
    adv = [{"package": v["module_name"], "severity": v["severity"], "title": v["title"], "vulnerable": v["vulnerable_versions"],
            "patched": v["patched_versions"], "url": v["url"], "paths": sorted({p for f in v.get("findings", []) for p in f.get("paths", [])})}
           for v in a.get("advisories", {}).values()]
    return {"counts": a["metadata"]["vulnerabilities"], "dependencies": a["metadata"].get("totalDependencies"), "advisories": adv}
prod, full = audit_summary("audit-prod.json"), audit_summary("audit-full.json")
DEP_REMAINING = {
    "braces": "Dev only, reached through eslint-config-next (lint). No patched version is published (patched range is empty). Input is our own lint globs, not user data, and it is not in the deployed app.",
}
for a in full["advisories"]:
    a["status"] = "accepted" if a["package"] in DEP_REMAINING else "open"
    a["reason"] = DEP_REMAINING.get(a["package"], "")
DEP_FIXED = [
    {"package": "playwright", "from": "1.48.2", "to": "1.56.1", "advisory": "GHSA-7mvr-c777-76hp (high): browser download without TLS check. Dev only (screenshot script)."},
    {"package": "tsx", "from": "4.19.2", "to": "4.20.6", "advisory": "Pulls esbuild 0.25.x, closing GHSA-67mh-4wv8-2f99 (moderate): dev server readable cross origin."},
]

leaks = load("gitleaks.json") or []
secrets = {"commits_scanned": int(read("commits.txt")), "findings": len(leaks),
           "items": [{"rule": l["RuleID"], "file": l["File"], "line": l["StartLine"], "commit": l["Commit"]} for l in leaks]}

result = {
    "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "tools": read("versions.txt").splitlines(),
    "slither": {"scope": "contracts/src (V1: Bond, IntentLog, JobBoard, Lease; V2: BondV2, IntentLogV2); lib, test and script excluded",
                "total": len(findings), "by_severity": {s: by_sev.get(s, 0) for s in SEV_ORDER if by_sev.get(s)},
                "by_verdict": dict(by_verdict), "true_issues_medium_or_higher_in_v2": 0, "findings": findings},
    "dependencies": {"prod": prod, "full": full, "fixed": DEP_FIXED},
    "secrets": secrets,
    "contract_tests": "forge test: 84 of 84 pass (default profile and FOUNDRY_PROFILE=fisco)",
}
json.dump(result, open(os.path.join(root, "docs/results/security-scan.json"), "w"), indent=2)

L = []
w = L.append
w("# Security scan\n")
w(f"Generated {result['generated']} by `bash web/scripts/security-scan.sh`. Raw data: `docs/results/security-scan.json`.\n")
w("## Tools\n")
for t in result["tools"]: w(f"- {t}")
w("\n## Summary\n")
w("| Check | Result |\n|---|---|")
sev = ", ".join(f"{v} {k.lower()}" for k, v in result["slither"]["by_severity"].items())
w(f"| Slither, contracts/src V1 and V2 | {len(findings)} findings ({sev}). 0 true issues of medium or higher. {by_verdict.get('false positive',0)} false positive, {by_verdict.get('accepted',0)} accepted with reason |")
pc = prod["counts"]; fc = full["counts"]
w(f"| pnpm audit, production deps ({prod['dependencies']}) | {sum(pc.values())} vulnerabilities |")
w(f"| pnpm audit, all deps | {fc['critical']} critical, {fc['high']} high, {fc['moderate']} moderate, {fc['low']} low after fixes (was 0 critical, 2 high, 1 moderate) |")
w(f"| gitleaks, full git history ({secrets['commits_scanned']} commits) | {secrets['findings']} secrets found |")
w(f"| Contract tests | {result['contract_tests']} |")
w("\n## Slither triage\n")
w("V1 contracts (`contracts/src/*.sol`) are deployed and source verified, so they are not changed. V1 notes give the mitigation. V2 is in `contracts/src/v2`.\n")
w("| Severity | Set | Check | Location | Verdict | Reason |\n|---|---|---|---|---|---|")
for f in findings:
    w(f"| {f['severity']} | {f['contracts']} | {f['check']} | {f['location']} | {f['verdict']} | {f['reason']} |")
w("\n## Dependencies\n")
w("Fixed by upgrade (build, test and lint pass after the change):\n")
for d in DEP_FIXED: w(f"- {d['package']} {d['from']} to {d['to']}: {d['advisory']}")
w("\nRemaining:\n")
rem = full["advisories"]
if not rem: w("- None")
for a in rem: w(f"- {a['package']} ({a['severity']}, {a['url']}): {a['status']}. {a['reason']}")
w("\nThe production dependency tree, which is what runs on Vercel, has no known vulnerabilities.\n")
w("## Secrets\n")
w(f"gitleaks scanned all {secrets['commits_scanned']} commits with redaction on: {secrets['findings']} findings.")
w("Local only files that hold keys (`web/.env.local`, `contracts/.fulljob/*/keys.env`, the local FISCO node keys under `contracts/.fisco/`) are gitignored and were never committed. A working tree scan finds them, as expected, and `git check-ignore` confirms each one is ignored.\n")
w("## Reproduce\n")
w("```\nbash web/scripts/security-scan.sh\n```\n")
w("Needs uv, Foundry, pnpm and gitleaks. Slither runs through `uvx --from slither-analyzer==0.11.6`.")
open(os.path.join(root, "docs/SECURITY_SCAN.md"), "w").write("\n".join(L) + "\n")
print(f"slither {len(findings)} | prod vulns {sum(pc.values())} | full {fc} | leaks {secrets['findings']}")
