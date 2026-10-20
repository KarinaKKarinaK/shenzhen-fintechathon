#!/usr/bin/env bash
# One FISCO BCOS 3.x node in Docker, the four contracts deployed on it, a smoke flow, and
# contracts/deployments/fisco-bcos.json written from the receipts.
# Usage: bash contracts/script/fisco.sh        (needs docker, forge and cast, python3)
# Chain config, certs and the throwaway deployer key live in contracts/.fisco (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
VER=v3.16.3                     # 3.16.4 rejects web3 txs from zero balance senders
DIR=$PWD/.fisco
NODE=$DIR/nodes/127.0.0.1/node0
RPC=${FISCO_RPC_URL:-http://127.0.0.1:8545}
mkdir -p "$DIR"

# 1. chain config (build_chain.sh does not run on macOS, so run it in a Linux container)
if [ ! -f "$NODE/config.ini" ]; then
  arch=$(uname -m); [ "$arch" = arm64 ] && arch=aarch64
  curl -sL "https://github.com/FISCO-BCOS/FISCO-BCOS/releases/download/$VER/fisco-bcos-linux-$arch.tar.gz" | tar xz -C "$DIR"
  curl -sL -o "$DIR/build_chain.sh" "https://raw.githubusercontent.com/FISCO-BCOS/FISCO-BCOS/$VER/tools/BcosAirBuilder/build_chain.sh"
  docker run --rm -v "$DIR:/w" -w /w ubuntu:24.04 bash -c \
    "apt-get update -qq >/dev/null && apt-get install -y -qq openssl curl uuid-runtime >/dev/null && bash build_chain.sh -e ./fisco-bcos -l 127.0.0.1:1 -p 30300,20200 -o nodes"
  sed -i.bak '/^\[web3_rpc\]/,/^\[/ s/enable=false/enable=true/' "$NODE/config.ini"
fi

# 2. node plus the JSON-RPC shim (script/fisco_rpc_proxy.py) on $RPC
docker network inspect zishi-fisco >/dev/null 2>&1 || docker network create zishi-fisco >/dev/null
docker ps -q -f name='^zishi-fisco$' | grep -q . || { docker rm -f zishi-fisco >/dev/null 2>&1 || true
  docker run -d --name zishi-fisco --network zishi-fisco -v "$DIR/fisco-bcos:/usr/local/bin/fisco-bcos:ro" \
    -v "$NODE:/data" -w /data ubuntu:24.04 fisco-bcos -c config.ini -g config.genesis >/dev/null; }
docker ps -q -f name='^zishi-fisco-rpc$' | grep -q . || { docker rm -f zishi-fisco-rpc >/dev/null 2>&1 || true
  docker run -d --name zishi-fisco-rpc --network zishi-fisco -p 127.0.0.1:8545:8545 \
    -v "$PWD/script/fisco_rpc_proxy.py:/p.py:ro" python:3.12-alpine python3 /p.py 8545 http://zishi-fisco:8545 >/dev/null; }
until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do sleep 1; done

# 3. throwaway deployer key, never committed
[ -f "$DIR/deployer.key" ] || cast wallet new --json | python3 -c "import json,sys;d=json.load(sys.stdin);d=d.get('data',d) if isinstance(d,dict) else d;print(d[0]['private_key'])" > "$DIR/deployer.key"
KEY=$(cat "$DIR/deployer.key"); ME=$(cast wallet address "$KEY")

# 4. deploy with the same script as Base Sepolia, paris EVM (no PUSH0)
FOUNDRY_PROFILE=fisco forge script script/Deploy.s.sol --rpc-url "$RPC" --private-key "$KEY" --broadcast --legacy --slow >"$DIR/deploy.log"
RUN=broadcast/Deploy.s.sol/$(cast chain-id --rpc-url "$RPC")/run-latest.json
addr() { python3 -c "import json;print([t['contractAddress'] for t in json.load(open('$RUN'))['transactions'] if t.get('contractName')=='$1'][-1])"; }
LOG=$(addr IntentLog); BOND=$(addr Bond); LEASE=$(addr Lease); BOARD=$(addr JobBoard)

# 5. smoke flow, every receipt fetched back
: >"$DIR/smoke.tsv"
send() { local fn=$1; shift; local h; h=$(cast send --rpc-url "$RPC" --private-key "$KEY" --legacy --json "$@" | python3 -c "import json,sys;print(json.load(sys.stdin)['transactionHash'])")
  printf '%s\t%s\n' "$fn" "$(cast receipt "$h" --rpc-url "$RPC" --json)" >>"$DIR/smoke.tsv"; }
JOB=$(cast keccak "zishi-fisco-smoke-job-$(date +%s)"); INTENT=$(cast keccak "zishi-fisco-smoke-intent-$(date +%s)")
send "IntentLog.commit" "$LOG" "commit(bytes32,bytes32)" "$JOB" "$INTENT"
send "Bond.postVendorBond" "$BOND" "postVendorBond(uint256,uint256)" 1ether 2ether
send "Bond.register" "$BOND" "register(address,address,address,uint256,uint256,uint256,address[],bytes)" "$ME" "$ME" "$ME" 200ether 50ether 1ether "[]" 0x
send "Lease.open" "$LEASE" "open(address,address,uint256,uint16,uint16,uint16,uint256)" "$ME" "$ME" 10000ether 500 300 800 100ether
[ "$(cast call "$LOG" "agentOf(bytes32)(address)" "$INTENT" --rpc-url "$RPC")" = "$ME" ] || { echo "IntentLog read back failed"; exit 1; }

# 6. deployments/fisco-bcos.json from the broadcast and the smoke receipts
export VERSION=$(docker exec zishi-fisco fisco-bcos -v | sed -n 's/.*Version : //p') ME RUN DIR RPC
python3 - <<'PY'
import json, os, datetime
e = os.environ
run = json.load(open(e["RUN"]))
rec = {r["transactionHash"]: r for r in run["receipts"]}
contracts, set_board = {}, None
for t in run["transactions"]:
    r = rec[t["hash"]]
    if r["status"] != "0x1":
        raise SystemExit(f"deploy tx {t['hash']} failed")
    if t["transactionType"] == "CREATE":
        contracts[t["contractName"]] = {"address": t["contractAddress"], "tx": t["hash"], "gasUsed": int(r["gasUsed"], 16), "block": int(r["blockNumber"], 16)}
    else:
        set_board = t["hash"]
smoke = []
for line in open(f"{e['DIR']}/smoke.tsv"):
    fn, raw = line.rstrip("\n").split("\t", 1)
    r = json.loads(raw)
    smoke.append({"function": fn, "tx": r["transactionHash"], "block": int(r["blockNumber"], 16), "gasUsed": int(r["gasUsed"], 16), "status": "success" if r["status"] == "0x1" else "failed"})
me = e["ME"]
contracts["Bond"]["args"] = {"treasury": me, "log": contracts["IntentLog"]["address"], "startFloor": "200 ether"}
contracts["JobBoard"]["args"] = {"bond": contracts["Bond"]["address"], "lease": contracts["Lease"]["address"], "rail": me}
out = {
    "chainId": run["chain"], "network": "FISCO BCOS (local)", "group": "group0", "chain": "chain0",
    "nodeVersion": e["VERSION"], "evmVersion": "paris", "solc": "0.8.26", "rpc": e["RPC"],
    "deployer": me, "deployedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "contracts": contracts, "setBoardTx": set_board, "smoke": smoke,
    "note": "Local single node FISCO BCOS chain in Docker, Web3 JSON-RPC on, reached through script/fisco_rpc_proxy.py. "
            "Reproduce with bash contracts/script/fisco.sh. The deployer is a throwaway key made for this chain. "
            "FISCO charges no gas price and meters gas differently from Ethereum, so gasUsed is not comparable with Base Sepolia.",
}
if any(s["status"] != "success" for s in smoke):
    raise SystemExit("smoke tx failed")
json.dump(out, open("deployments/fisco-bcos.json", "w"), indent=2)
open("deployments/fisco-bcos.json", "a").write("\n")
PY
bash script/fisco_fate.sh
echo "FISCO BCOS $VERSION at $RPC: IntentLog $LOG, Bond $BOND, Lease $LEASE, JobBoard $BOARD"
