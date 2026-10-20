#!/usr/bin/env bash
# Deploy the V2 set (IntentLogV2, BondV2, Lease, JobBoard) to the local FISCO BCOS chain and run the
# front-running demonstration against it. Every receipt is fetched back.
# Usage: bash contracts/script/fisco_v2.sh   (FISCO node from script/fisco.sh must be running)
# Role keys live in contracts/.fulljob/fisco-v2/keys.env (gitignored). Output: deployments/fisco-v2.json
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
RPC=${FISCO_RPC_URL:-http://127.0.0.1:8545}; DKEY=$(cat .fisco/deployer.key); ME=$(cast wallet address "$DKEY")
DIR=$PWD/.fulljob/fisco-v2; mkdir -p "$DIR"; chmod 700 "$PWD/.fulljob" "$DIR"
OUT=deployments/fisco-v2.json; GP=0; UNIT=1000   # FISCO: no gas price, block.timestamp in ms
FLOOR=200000000000000000000
STEPS=$DIR/steps.tsv; : >"$STEPS"; DEPS=$DIR/deploys.tsv; : >"$DEPS"

# 1. deploy, paris EVM
FOUNDRY_PROFILE=fisco forge build >/dev/null
create() { local name=$1 path=$2; shift 2; local out
  out=$(FOUNDRY_PROFILE=fisco forge create "$path:$name" --rpc-url "$RPC" --private-key "$DKEY" --legacy --gas-price 0 --gas-limit 8000000 --broadcast --json "$@")
  local addr tx; addr=$(printf '%s' "$out" | python3 -c "import json,sys;print(json.load(sys.stdin)['deployedTo'])")
  tx=$(printf '%s' "$out" | python3 -c "import json,sys;print(json.load(sys.stdin)['transactionHash'])")
  printf '%s\t%s\t%s\n' "$name" "$addr" "$tx" >>"$DEPS"; echo "$addr"; }
LOG=$(create IntentLogV2 src/v2/IntentLogV2.sol)
BOND=$(create BondV2 src/v2/BondV2.sol --constructor-args "$ME" "$LOG" "$FLOOR")
LEASE=$(create Lease src/Lease.sol)
BOARD=$(create JobBoard src/JobBoard.sol --constructor-args "$BOND" "$LEASE" "$ME")
echo "log $LOG bond $BOND lease $LEASE board $BOARD"

# send <step> <contract> <function> <role> <value> <key> <gas> <to> <sig> [args...]
send() {
  local step=$1 con=$2 fn=$3 role=$4 val=$5 key=$6 gas=$7; shift 7
  local out h
  out=$(cast send --rpc-url "$RPC" --private-key "$key" --legacy --gas-price "$GP" --gas-limit "$gas" --value "$val" --json "$@" 2>&1) || true
  h=$(printf '%s' "$out" | python3 -c "import json,sys
try: print(json.loads(sys.stdin.read())['transactionHash'])
except Exception: print('')")
  [ -n "$h" ] || h=$(printf '%s' "$out" | grep -oE '0x[0-9a-fA-F]{64}' | head -1 || true)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$step" "$con" "$fn" "$role" "$val" "${h:-none}" "$(printf '%s' "$out" | tr '\n\t' '  ' | cut -c1-300)" >>"$STEPS"
  echo "$step $con.$fn -> ${h:-FAILED}"
}
send "wire 1" BondV2 setBoard deployer 0 "$DKEY" 100000 "$BOND" "setBoard(address)" "$BOARD"
send "wire 2" IntentLogV2 setBoard deployer 0 "$DKEY" 100000 "$LOG" "setBoard(address)" "$BOARD"

# 2. fresh role keys, funded from the deployer
if [ ! -f "$DIR/keys.env" ]; then
  umask 077
  for r in VENDOR AGENT OTHER LENDER FARMER STRANGER; do
    k=$(cast wallet new --json | python3 -c "import json,sys;d=json.load(sys.stdin);d=d.get('data',d) if isinstance(d,dict) else d;print(d[0]['private_key'])")
    echo "${r}_KEY=$k"
  done >"$DIR/keys.env"
fi
. "$DIR/keys.env"
VENDOR=$(cast wallet address "$VENDOR_KEY"); AGENT=$(cast wallet address "$AGENT_KEY"); OTHER=$(cast wallet address "$OTHER_KEY")
LENDER=$(cast wallet address "$LENDER_KEY"); FARMER=$(cast wallet address "$FARMER_KEY"); STRANGER=$(cast wallet address "$STRANGER_KEY")
VB=20000000000; PENALTY=10000000000; DCAP=20000000000; FEE=100000000000
for r in VENDOR AGENT OTHER LENDER FARMER STRANGER; do k=${r}_KEY; amt=1000000000
  [ $r = VENDOR ] && amt=$(( VB + 1000000000 )); [ $r = FARMER ] && amt=$(( 2 * FEE + 1000000000 ))
  send "fund $r" EOA transfer deployer "$amt" "$DKEY" 21000 "$(cast wallet address "${!k}")"; done

# 3. setup: vendor bond, two agents registered, lease, one job per agent
send "setup 1" BondV2 postVendorBond vendor "$VB" "$VENDOR_KEY" 150000 "$BOND" "postVendorBond(uint256,uint256)" "$PENALTY" "$DCAP"
send "setup 2" BondV2 register agent 0 "$AGENT_KEY" 250000 "$BOND" "register(address,address,address,uint256,uint256,uint256,address[],bytes)" "$AGENT" "$ME" "$VENDOR" 10000000000 50000000000 1000000000 "[$LENDER]" 0x
send "setup 3" BondV2 register "other agent" 0 "$OTHER_KEY" 250000 "$BOND" "register(address,address,address,uint256,uint256,uint256,address[],bytes)" "$OTHER" "$ME" "$VENDOR" 10000000000 50000000000 1000000000 "[$LENDER]" 0x
LID=$(cast call "$LEASE" "nextId()(uint256)" --rpc-url "$RPC" | cut -d' ' -f1)
send "setup 4" Lease open lender 0 "$LENDER_KEY" 250000 "$LEASE" "open(address,address,uint256,uint16,uint16,uint16,uint256)" "$ME" "$AGENT" 100000000000 4000 3000 5000 0
NOW=$(cast block latest -f timestamp --rpc-url "$RPC"); WEND=$(( (NOW + 3600) * UNIT )); EXPIRY=$(( (NOW + 86400) * UNIT ))   # the RPC shows seconds, the EVM sees ms
GEO=$(cast keccak "field-7")
JID=$(cast call "$BOARD" "nextId()(uint256)" --rpc-url "$RPC" | cut -d' ' -f1)
send "setup 5" JobBoard post farmer "$FEE" "$FARMER_KEY" 250000 "$BOARD" "post(address,address,uint256,bytes32,uint64,uint64,bool)" "$AGENT" "$FARMER" "$LID" "$GEO" 0 "$WEND" false
OJID=$(( JID + 1 ))
send "setup 6" JobBoard post farmer "$FEE" "$FARMER_KEY" 250000 "$BOARD" "post(address,address,uint256,bytes32,uint64,uint64,bool)" "$OTHER" "$FARMER" "$LID" "$GEO" 0 "$WEND" false

# 4. the demonstration
JB=$(cast to-uint256 "$JID"); OJB=$(cast to-uint256 "$OJID")
T='(address,uint8,address,uint256,bytes32,bytes32,bool,uint256,uint256)'
INTENT="($AGENT,0,0x000000000000000000000000000000000000dEaD,1000000000,$JB,$GEO,false,1,$EXPIRY)"
IH=$(cast call "$BOND" "hashIntent($T)(bytes32)" "$INTENT" --rpc-url "$RPC")
SIG=$(cast wallet sign --no-hash --private-key "$AGENT_KEY" "$(cast call "$BOND" "digestOf($T)(bytes32)" "$INTENT" --rpc-url "$RPC")")
send "demo 1" IntentLogV2 commit "stranger (front-run, agent's job id)" 0 "$STRANGER_KEY" 150000 "$LOG" "commit(bytes32,bytes32)" "$JB" "$IH"
send "demo 2" IntentLogV2 commit "other registered agent (front-run, its own job id)" 0 "$OTHER_KEY" 150000 "$LOG" "commit(bytes32,bytes32)" "$OJB" "$IH"
send "demo 3" IntentLogV2 commit agent 0 "$AGENT_KEY" 150000 "$LOG" "commit(bytes32,bytes32)" "$JB" "$IH"
V0=$(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1)
send "demo 4" BondV2 slashByProof "lender (party)" 0 "$LENDER_KEY" 300000 "$BOND" "slashByProof($T,bytes,uint8)" "$INTENT" "$SIG" 0
V1=$(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1)
# missing commit: the agent starts the job and never commits a second rogue intent; the slash still lands
INTENT2="($AGENT,0,0x000000000000000000000000000000000000dEaD,1000000000,$JB,$GEO,false,2,$EXPIRY)"
SIG2=$(cast wallet sign --no-hash --private-key "$AGENT_KEY" "$(cast call "$BOND" "digestOf($T)(bytes32)" "$INTENT2" --rpc-url "$RPC")")
send "demo 5" JobBoard start agent 0 "$AGENT_KEY" 150000 "$BOARD" "start(uint256)" "$JID"
send "demo 6" BondV2 slashByProof "lender (party), intent never committed" 0 "$LENDER_KEY" 300000 "$BOND" "slashByProof($T,bytes,uint8)" "$INTENT2" "$SIG2" 0
V2=$(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1)

export RPC STEPS DEPS OUT ME VENDOR AGENT OTHER LENDER FARMER STRANGER IH JID OJID V0 V1 V2 LOG
export C_STRANGER=$(cast call "$LOG" "committedAt(address,bytes32)(uint64)" "$STRANGER" "$IH" --rpc-url "$RPC" | cut -d' ' -f1)
export C_OTHER=$(cast call "$LOG" "committedAt(address,bytes32)(uint64)" "$OTHER" "$IH" --rpc-url "$RPC" | cut -d' ' -f1)
export C_AGENT=$(cast call "$LOG" "committedAt(address,bytes32)(uint64)" "$AGENT" "$IH" --rpc-url "$RPC" | cut -d' ' -f1)
python3 - <<'PY'
import json, os, subprocess, datetime
e = os.environ
def receipt(h):
    try: return json.loads(subprocess.check_output(["cast", "receipt", h, "--rpc-url", e["RPC"], "--json"], stderr=subprocess.DEVNULL))
    except Exception: return None
contracts = {}
for line in open(e["DEPS"]):
    name, addr, tx = line.rstrip("\n").split("\t")
    r = receipt(tx)
    contracts[name] = {"address": addr, "deployTx": tx, "block": int(r["blockNumber"], 16) if r else None,
                       "status": ("success" if r and r["status"] == "0x1" else "failed")}
steps = []
for line in open(e["STEPS"]):
    step, con, fn, role, val, h, raw = (line.rstrip("\n").split("\t") + [""])[:7]
    r = receipt(h) if h.startswith("0x") else None
    row = {"step": step, "contract": con, "function": fn, "from": role, "valueWei": val, "tx": h}
    if r: row.update(block=int(r["blockNumber"], 16), gasUsed=int(r["gasUsed"], 16), status="success" if r["status"] == "0x1" else "reverted")
    else: row.update(status="not mined", error=raw)
    steps.append(row)
expected = {"demo 1": "reverted"}
for s in steps: s["expected"] = expected.get(s["step"], "success")
out = {
  "network": "FISCO BCOS (local)", "chainId": int(subprocess.check_output(["cast", "chain-id", "--rpc-url", e["RPC"]]).strip()),
  "ranAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "script": "contracts/script/fisco_v2.sh", "evmVersion": "paris",
  "contracts": contracts,
  "roles": {"deployer (treasury, rail, operator)": e["ME"], "vendor": e["VENDOR"], "agent": e["AGENT"], "other registered agent": e["OTHER"],
            "lender (party)": e["LENDER"], "farmer (requester and verifier)": e["FARMER"], "stranger": e["STRANGER"]},
  "agentJobId": int(e["JID"]), "otherAgentJobId": int(e["OJID"]), "rogueIntentHash": e["IH"],
  "steps": steps,
  "checks": [
    {"check": "log slot (stranger, hash) committedAt", "value": e["C_STRANGER"]},
    {"check": "log slot (other agent, hash) committedAt", "value": e["C_OTHER"]},
    {"check": "log slot (agent, hash) committedAt", "value": e["C_AGENT"]},
    {"check": "vendor bond slashed by demo 4 (wei)", "value": str(int(e["V0"]) - int(e["V1"]))},
    {"check": "vendor bond slashed by demo 6, never committed (wei)", "value": str(int(e["V1"]) - int(e["V2"]))},
  ],
  "note": ("V2 front-running demonstration. In v1 IntentLog anyone could commit the agent's intent hash first, the slot was taken "
    "with the wrong agent and Bond.slashByProof failed 'not in log'. Here: demo 1, a stranger commits the agent's hash under the "
    "agent's job and the chain rejects it ('not the job's agent', reverted on purpose). Demo 2, another registered agent commits the "
    "same hash under its own job: it succeeds but only fills that agent's own (agent, hash) slot. Demo 3, the real agent commits into "
    "its own slot, and demo 4 the lender, a party of the job, slashes by proof: the vendor bond pays the penalty to the treasury. "
    "Demo 5 and 6 show the missing commit case: the agent starts the job and never commits a second rogue intent, and the slash still "
    "lands because BondV2 accepts the agent's signature plus the JobBoard record that this agent's job went live. "
    "The v1 contracts in fisco-bcos.json are untouched. FISCO charges no gas price; block.timestamp is in milliseconds."),
}
bad = [s["step"] for s in steps if s["status"] != s["expected"]]
if bad: out["unexpected"] = bad
json.dump(out, open(e["OUT"], "w"), indent=2); open(e["OUT"], "a").write("\n")
print(json.dumps([(s["step"], s["function"], s["from"], s["tx"], s.get("block"), s["status"]) for s in steps], indent=0))
print("checks", out["checks"], "unexpected", bad)
PY
