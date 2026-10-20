#!/usr/bin/env bash
# Reproduces the security scan: Slither on contracts/src (v1 and v2), pnpm audit on web,
# gitleaks on the whole git history. Writes docs/results/security-scan.json and docs/SECURITY_SCAN.md.
# Needs: uv (for uvx slither), Foundry (forge), pnpm, gitleaks (brew install gitleaks).
# Usage from the repo root: bash web/scripts/security-scan.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RAW="${SCAN_RAW_DIR:-$(mktemp -d)}"
export PATH="$HOME/.foundry/bin:$PATH"
SLITHER="${SLITHER:-uvx --from slither-analyzer==0.11.6 slither}"

echo "1/3 Slither (raw output in $RAW)"
cd "$ROOT/contracts"  # slither runs forge clean + build here (out/ is gitignored)
rm -f "$RAW/slither.json"; $SLITHER . --filter-paths "lib/|test/|script/" --json "$RAW/slither.json" >/dev/null 2>&1
$SLITHER --version > "$RAW/slither.version" 2>/dev/null

echo "2/3 pnpm audit"
cd "$ROOT/web"
pnpm audit --prod --json > "$RAW/audit-prod.json" 2>/dev/null
pnpm audit --json > "$RAW/audit-full.json" 2>/dev/null

echo "3/3 gitleaks on full git history (redacted)"
cd "$ROOT"
gitleaks git . --redact --report-format json --report-path "$RAW/gitleaks.json" >/dev/null 2>&1
git rev-list --count HEAD > "$RAW/commits.txt"

{
  echo "slither $(cat "$RAW/slither.version")"
  echo "solc 0.8.26 ($(forge --version | head -1))"
  echo "pnpm $(cd web && pnpm --version)"
  echo "gitleaks $(gitleaks version)"
} > "$RAW/versions.txt"

python3 -I "$ROOT/web/scripts/security-report.py" "$RAW" "$ROOT"
