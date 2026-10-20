#!/usr/bin/env bash
# One complete Zishi job against the already deployed contracts, every step a real contract call
# that moves value where the contract does. Fresh keys per role, funded from the deployer.
# Usage: bash contracts/script/fulljob.sh fisco|base
#   fisco: deployer key in contracts/.fisco/deployer.key, RPC http://127.0.0.1:8545
#   base:  SURETY_PRIVATE_KEY and BASE_SEPOLIA_RPC from web/.env.local
# Role keys live in contracts/.fulljob/<chain>/keys.env (gitignored). Output:
# contracts/deployments/<fisco|base-sepolia>-fulljob.json, built from receipts fetched back.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
CHAIN=${1:?fisco or base}
DIR=$PWD/.fulljob/$CHAIN; mkdir -p "$DIR"; chmod 700 "$PWD/.fulljob" "$DIR"

if [ "$CHAIN" = fisco ]; then
  RPC=${FISCO_RPC_URL:-http://127.0.0.1:8545}; DKEY=$(cat .fisco/deployer.key)
  DEP=deployments/fisco-bcos.json; OUT=deployments/fisco-fulljob.json
  GP=0; UNIT=1000                     # FISCO block.timestamp is in milliseconds
  FUND_GAS=0; MARGIN=0
else
  set -a; . ../web/.env.local; set +a
  RPC=${BASE_SEPOLIA_RPC:-https://sepolia.base.org}; DKEY=$SURETY_PRIVATE_KEY
  DEP=deployments/base-sepolia.json; OUT=deployments/base-sepolia-fulljob.json
  GP=$(( $(cast gas-price --rpc-url "$RPC") * 12 / 10 )); UNIT=1
  MARGIN=200000000000                 # 2e11 wei per role for the L1 data fee
fi
ME=$(cast wallet address "$DKEY")
a() { python3 -c "import json;print(json.load(open('$DEP'))['contracts']['$1']['address'])"; }
LOG=$(a IntentLog); BOND=$(a Bond); LEASE=$(a Lease); BOARD=$(a JobBoard)

# Amounts in wei, tiny on purpose
VB=20000000000; PENALTY=10000000000; DCAP=20000000000          # vendor bond 2e10, penalty 1e10
MINIMUM=10000000000; PERTX=50000000000; SLASH=1000000000        # pilot bond terms
TOTAL=100000000000; RATE=4000; LO=3000; HI=5000                # lease 1e11 at 40 percent of each fee
FEE=100000000000                                               # job fee 1e11
ROGUE=1000000000                                               # the rogue payment 1e9

# Gas limits per step (explicit: FISCO estimateGas ignores the sender)
G_VB=150000; G_REG=250000; G_OPEN=250000; G_POST=250000; G_START=150000; G_CONFIRM=350000
G_COMMIT=150000; G_SLASH=250000; G_PAY=150000; G_HOLD=120000; G_XFER=21000

# 1. fresh role keys
if [ ! -f "$DIR/keys.env" ]; then
  umask 077
  for r in VENDOR AGENT PILOT LENDER FARMER VERIFIER; do
    k=$(cast wallet new --json | python3 -c "import json,sys;d=json.load(sys.stdin);d=d.get('data',d) if isinstance(d,dict) else d;print(d[0]['private_key'])")
    echo "${r}_KEY=$k"
  done >"$DIR/keys.env"
fi
. "$DIR/keys.env"
VENDOR=$(cast wallet address "$VENDOR_KEY"); AGENT=$(cast wallet address "$AGENT_KEY"); PILOT=$(cast wallet address "$PILOT_KEY")
LENDER=$(cast wallet address "$LENDER_KEY"); FARMER=$(cast wallet address "$FARMER_KEY"); VERIFIER=$(cast wallet address "$VERIFIER_KEY")

STEPS=$DIR/steps.tsv; : >"$STEPS"; CHECKS=$DIR/checks.tsv; : >"$CHECKS"
bal() { cast balance "$1" --rpc-url "$RPC"; }
check() { printf '%s\t%s\n' "$1" "$2" >>"$CHECKS"; }
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

# 2. fund the roles from the deployer: gas for each role's calls plus the value it moves
fund() { local who=$1 role=$2 gas=$3 val=$4; local amt=$(( gas * GP + MARGIN + val + G_XFER * GP )); [ "$CHAIN" = fisco ] && amt=$(( val + 1000000000 ))
  send "fund $role" EOA transfer deployer "$amt" "$DKEY" "$G_XFER" "$who"; }
if [ "$CHAIN" = base ]; then
  EST=$(( (G_VB+G_REG+G_OPEN+G_POST+G_START+G_CONFIRM+G_COMMIT+G_SLASH+G_PAY + 12*G_XFER) * GP + 18*MARGIN/10 ))
  echo "gas price used $GP wei, worst case gas cost $EST wei"
  [ "$EST" -le 22000000000000 ] || { echo "estimate over 0.000022 ETH, stopping"; exit 1; }
fi
fund "$VENDOR" vendor "$G_VB" "$VB"
fund "$AGENT" agent $(( G_REG + G_START + G_COMMIT + G_HOLD )) 0
fund "$LENDER" lender $(( G_OPEN + G_SLASH )) 0
fund "$FARMER" farmer "$G_POST" "$FEE"
fund "$VERIFIER" verifier "$G_CONFIRM" 0
fund "$PILOT" pilot "$G_PAY" $(( TOTAL - TOTAL * RATE / 10000 ))

NOW=$(cast block latest -f timestamp --rpc-url "$RPC")
WEND=$(( (NOW + 3600) * UNIT )); EXPIRY=$(( (NOW + 86400) * UNIT ))
GEO=$(cast keccak "field-7")

# 3. vendor bond, agent registered, lease opened
VB0=$(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1)
send "1" Bond postVendorBond vendor "$VB" "$VENDOR_KEY" "$G_VB" "$BOND" "postVendorBond(uint256,uint256)" "$PENALTY" "$DCAP"
check "vendor bond after post (wei)" "$(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1) (before $VB0)"
send "2" Bond register agent 0 "$AGENT_KEY" "$G_REG" "$BOND" "register(address,address,address,uint256,uint256,uint256,address[],bytes)" "$AGENT" "$PILOT" "$VENDOR" "$MINIMUM" "$PERTX" "$SLASH" "[$LENDER]" 0x
check "operatorOf(agent) is pilot" "$(cast call "$BOND" "operatorOf(address)(address)" "$AGENT" --rpc-url "$RPC")"
LID=$(cast call "$LEASE" "nextId()(uint256)" --rpc-url "$RPC" | cut -d' ' -f1)
send "3" Lease open lender 0 "$LENDER_KEY" "$G_OPEN" "$LEASE" "open(address,address,uint256,uint16,uint16,uint16,uint256)" "$PILOT" "$AGENT" "$TOTAL" "$RATE" "$LO" "$HI" 0
check "lease id" "$LID"
check "title owner after open (lender)" "$(cast call "$LEASE" "titleOf(uint256)(address)" "$LID" --rpc-url "$RPC")"

# 4. farmer posts the job with the fee locked, agent starts, verifier confirms
JID=$(cast call "$BOARD" "nextId()(uint256)" --rpc-url "$RPC" | cut -d' ' -f1)
B0=$(bal "$BOARD")
send "4" JobBoard post farmer "$FEE" "$FARMER_KEY" "$G_POST" "$BOARD" "post(address,address,uint256,bytes32,uint64,uint64,bool)" "$AGENT" "$VERIFIER" "$LID" "$GEO" 0 "$WEND" false
check "job id" "$JID"
check "JobBoard balance delta after post (fee locked)" "$(( $(bal "$BOARD") - B0 ))"
send "5" JobBoard start agent 0 "$AGENT_KEY" "$G_START" "$BOARD" "start(uint256)" "$JID"

L0=$(bal "$LENDER"); AG0=$(bal "$AGENT"); R0=$(bal "$ME"); PB0=$(cast call "$BOND" "bondOf(address)(uint256,uint256)" "$AGENT" --rpc-url "$RPC" | head -1 | cut -d' ' -f1); B0=$(bal "$BOARD")
send "6" JobBoard confirm verifier 0 "$VERIFIER_KEY" "$G_CONFIRM" "$BOARD" "confirm(uint256)" "$JID"
check "lender received instalment via Lease.pay (wei)" "$(( $(bal "$LENDER") - L0 ))"
check "agent received rest (wei)" "$(( $(bal "$AGENT") - AG0 ))"
[ "$CHAIN" = fisco ] && check "rail (deployer) received rail fee (wei)" "$(( $(bal "$ME") - R0 ))"
check "pilot bond filled (wei)" "$(( $(cast call "$BOND" "bondOf(address)(uint256,uint256)" "$AGENT" --rpc-url "$RPC" | head -1 | cut -d' ' -f1) - PB0 ))"
check "hold kept in JobBoard (wei)" "$(cast call "$BOARD" "held(uint256)(uint256)" "$JID" --rpc-url "$RPC" | cut -d' ' -f1)"
check "lease balance after confirm (wei)" "$(cast call "$LEASE" "leases(uint256)(address,address,address,uint256,uint256,uint16,uint16,uint16,uint256,bool,bool)" "$LID" --rpc-url "$RPC" | sed -n 5p | cut -d' ' -f1)"

# 5. the rogue intent: the agent signs a payment to a payee not on its allowlist, commits it,
# the lender (a party of the job) proves it, the vendor bond pays the treasury
JB=$(cast to-uint256 "$JID")
INTENT="($AGENT,0,0x000000000000000000000000000000000000dEaD,$ROGUE,$JB,$GEO,false,1,$EXPIRY)"
T='(address,uint8,address,uint256,bytes32,bytes32,bool,uint256,uint256)'
IH=$(cast call "$BOND" "hashIntent($T)(bytes32)" "$INTENT" --rpc-url "$RPC")
DG=$(cast call "$BOND" "digestOf($T)(bytes32)" "$INTENT" --rpc-url "$RPC")
SIG=$(cast wallet sign --no-hash --private-key "$AGENT_KEY" "$DG")
check "rogue intent hash" "$IH"
check "rogue intent signer recovered off chain" "$(cast wallet verify --address "$AGENT" --no-hash "$DG" "$SIG" >/dev/null 2>&1 && echo agent || cast wallet recover --no-hash "$DG" "$SIG" 2>/dev/null || echo unknown)"
send "7" IntentLog commit agent 0 "$AGENT_KEY" "$G_COMMIT" "$LOG" "commit(bytes32,bytes32)" "$JB" "$IH"
V0=$(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1); T0=$(bal "$ME")
send "8" Bond slashByProof lender 0 "$LENDER_KEY" "$G_SLASH" "$BOND" "slashByProof($T,bytes,uint8)" "$INTENT" "$SIG" 0
check "vendor bond decreased by (wei)" "$(( V0 - $(cast call "$BOND" "vendorBondOf(address)(uint256)" "$VENDOR" --rpc-url "$RPC" | cut -d' ' -f1) ))"
check "treasury (deployer) received penalty (wei)" "$(( $(bal "$ME") - T0 ))"

# 6. the pilot pays the rest of the lease, the title moves to the pilot
REM=$(cast call "$LEASE" "leases(uint256)(address,address,address,uint256,uint256,uint16,uint16,uint16,uint256,bool,bool)" "$LID" --rpc-url "$RPC" | sed -n 5p | cut -d' ' -f1)
L0=$(bal "$LENDER")
send "9" Lease pay pilot "$REM" "$PILOT_KEY" "$G_PAY" "$LEASE" "pay(uint256)" "$LID"
check "lender received remaining lease (wei)" "$(( $(bal "$LENDER") - L0 ))"
check "lease balance after final payment (wei)" "$(cast call "$LEASE" "leases(uint256)(address,address,address,uint256,uint256,uint16,uint16,uint16,uint256,bool,bool)" "$LID" --rpc-url "$RPC" | sed -n 5p | cut -d' ' -f1)"
check "title owner after zero balance" "$(cast call "$LEASE" "titleOf(uint256)(address)" "$LID" --rpc-url "$RPC")"

# 7. hold release: HOLD_SECONDS is 86400 time units. On FISCO that is 86.4 s of milliseconds.
if [ "$CHAIN" = fisco ]; then
  HU=$(cast call "$BOARD" "holdUntil(uint256)(uint256)" "$JID" --rpc-url "$RPC" | cut -d' ' -f1)
  # FISCO packs blocks on demand, so wait on the wall clock; the releaseHold block is stamped now
  while [ $(( $(date +%s) * 1000 )) -le $(( HU + 3000 )) ]; do sleep 5; done
  AG0=$(bal "$AGENT")
  send "10" JobBoard releaseHold agent 0 "$AGENT_KEY" "$G_HOLD" "$BOARD" "releaseHold(uint256)" "$JID"
  check "hold released to agent (wei)" "$(( $(bal "$AGENT") - AG0 ))"
else
  check "hold" "releaseHold callable after holdUntil=$(cast call "$BOARD" "holdUntil(uint256)(uint256)" "$JID" --rpc-url "$RPC" | cut -d' ' -f1) (one day after confirm), not called in this run"
fi

# 8. Base only: sweep what is left in the role wallets back to the deployer
if [ "$CHAIN" = base ]; then
  for r in VENDOR AGENT PILOT LENDER FARMER VERIFIER; do
    k=${r}_KEY; who=$(cast wallet address "${!k}"); b=$(bal "$who"); amt=$(( b - G_XFER * GP - MARGIN / 2 ))
    [ "$amt" -gt 0 ] && send "sweep $r" EOA transfer "$(echo "$r" | tr A-Z a-z)" "$amt" "${!k}" "$G_XFER" "$ME"
  done
fi

export RPC STEPS CHECKS OUT CHAIN ME VENDOR AGENT PILOT LENDER FARMER VERIFIER LOG BOND LEASE BOARD GP
python3 - <<'PY'
import json, os, subprocess, datetime
e = os.environ
def receipt(h):
    try: return json.loads(subprocess.check_output(["cast", "receipt", h, "--rpc-url", e["RPC"], "--json"], stderr=subprocess.DEVNULL))
    except Exception: return None
steps, total_fee = [], 0
for line in open(e["STEPS"]):
    step, con, fn, role, val, h, raw = (line.rstrip("\n").split("\t") + [""])[:7]
    r = receipt(h) if h.startswith("0x") else None
    row = {"step": step, "contract": con, "function": fn, "from": role, "valueWei": val, "tx": h}
    if r:
        row.update(block=int(r["blockNumber"], 16), gasUsed=int(r["gasUsed"], 16), status="success" if r["status"] == "0x1" else "failed")
        fee = int(r.get("effectiveGasPrice", "0x0"), 16) * int(r["gasUsed"], 16) + int(r.get("l1Fee", "0x0") or "0x0", 16)
        if e["CHAIN"] == "base": row["feeWei"] = fee; total_fee += fee
    else:
        row.update(status="failed", error=raw)
    steps.append(row)
checks = [dict(zip(("check", "value"), l.rstrip("\n").split("\t", 1))) for l in open(e["CHECKS"])]
fisco = e["CHAIN"] == "fisco"
out = {
    "network": "FISCO BCOS (local)" if fisco else "Base Sepolia",
    "chainId": int(subprocess.check_output(["cast", "chain-id", "--rpc-url", e["RPC"]]).strip()),
    "ranAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "script": "contracts/script/fulljob.sh " + e["CHAIN"],
    "contracts": {"IntentLog": e["LOG"], "Bond": e["BOND"], "Lease": e["LEASE"], "JobBoard": e["BOARD"]},
    "roles": {"deployer (treasury and rail)": e["ME"], "vendor": e["VENDOR"], "agent": e["AGENT"], "pilot": e["PILOT"],
              "lender": e["LENDER"], "farmer (requester)": e["FARMER"], "verifier": e["VERIFIER"]},
    "steps": steps, "checks": checks,
}
if not fisco: out["totalGasCostWei"] = total_fee
out["note"] = ("One full job on the deployed contracts, every row a real transaction with its receipt fetched back. "
    "Fresh keys per role, funded from the deployer. Value moves where the contract moves it: the vendor bond into Bond, "
    "the fee locked in JobBoard, on confirm the rail fee to the rail, the instalment to the lender through Lease.pay, the bond gap "
    "into the pilot bond and the rest to the agent, the hold kept in JobBoard. The rogue intent is a signed payment to 0xdEaD "
    "(not on the allowlist), committed to IntentLog by the agent and proven by the lender with Bond.slashByProof (rule "
    "PayeeNotAllowlisted): the vendor bond pays the penalty to the treasury. The pilot then pays the remaining lease and the title "
    "moves to the pilot. " + ("FISCO block.timestamp is in milliseconds, so the one day hold is 86.4 s and releaseHold was called. "
    "FISCO charges no gas price." if fisco else "The hold is one day on Base, so releaseHold was not called in this run. "
    "Leftover gas money in the role wallets was swept back to the deployer."))
failed = [s["step"] for s in steps if s["status"] != "success"]
if failed: out["failedSteps"] = failed
json.dump(out, open(e["OUT"], "w"), indent=2); open(e["OUT"], "a").write("\n")
print(json.dumps({"steps": [(s["step"], s["function"], s["valueWei"], s["tx"], s["status"]) for s in steps], "checks": checks, "totalGasCostWei": out.get("totalGasCostWei")}, indent=1))
PY
