#!/usr/bin/env bash
# Anchors the FATE credit model's fingerprint (sha256 in fate/model.json) in the FISCO IntentLog
# under jobId keccak256("fate-model"), reads it back and records it as "fateModel" in
# deployments/fisco-bcos.json. Run after fisco.sh (which calls it).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
RPC=${FISCO_RPC_URL:-http://127.0.0.1:8545}
KEY=$(cat .fisco/deployer.key)
OUT=deployments/fisco-bcos.json
[ -f ../fate/model.json ] || { echo "no fate/model.json, skipping"; exit 0; }
LOG=$(python3 -c "import json;print(json.load(open('$OUT'))['contracts']['IntentLog']['address'])")
HASH=0x$(python3 -c "import json;print(json.load(open('../fate/model.json'))['sha256'])")
JOB=$(cast keccak "fate-model")
if [ "$(cast call "$LOG" "committedAt(bytes32)(uint64)" "$HASH" --rpc-url "$RPC")" = 0 ]; then
  TX=$(cast send "$LOG" "commit(bytes32,bytes32)" "$JOB" "$HASH" --rpc-url "$RPC" --private-key "$KEY" --legacy --json | python3 -c "import json,sys;print(json.load(sys.stdin)['transactionHash'])")
else
  TX=$(python3 -c "import json;print(json.load(open('$OUT')).get('fateModel',{}).get('tx',''))")
fi
RECEIPT=$(cast receipt "$TX" --rpc-url "$RPC" --json)
AT=$(cast call "$LOG" "committedAt(bytes32)(uint64)" "$HASH" --rpc-url "$RPC" | cut -d' ' -f1)
GOTJOB=$(cast call "$LOG" "jobOf(bytes32)(bytes32)" "$HASH" --rpc-url "$RPC")
AGENT=$(cast call "$LOG" "agentOf(bytes32)(address)" "$HASH" --rpc-url "$RPC")
OUT=$OUT TX=$TX HASH=$HASH JOB=$JOB AT=$AT GOTJOB=$GOTJOB AGENT=$AGENT RECEIPT=$RECEIPT python3 - <<'PY'
import json, os
e = os.environ
r = json.loads(e["RECEIPT"])
d = json.load(open(e["OUT"]))
me = d["deployer"].lower()
ok = r["status"] == "0x1" and int(e["AT"]) > 0 and e["GOTJOB"].lower() == e["JOB"].lower() and e["AGENT"].lower() == me
d["fateModel"] = {
    "source": "fate/model.json sha256", "sha256": e["HASH"], "jobId": e["JOB"], "jobIdPreimage": "fate-model",
    "tx": r["transactionHash"], "block": int(r["blockNumber"], 16), "gasUsed": int(r["gasUsed"], 16),
    "status": "success" if r["status"] == "0x1" else "failed", "committedAt": int(e["AT"]), "readBack": ok,
}
json.dump(d, open(e["OUT"], "w"), indent=2)
open(e["OUT"], "a").write("\n")
print(f"FATE model {e['HASH']} on FISCO in tx {r['transactionHash']}, block {int(r['blockNumber'], 16)}, read back {'ok' if ok else 'MISMATCH'}")
if not ok: raise SystemExit(1)
PY
