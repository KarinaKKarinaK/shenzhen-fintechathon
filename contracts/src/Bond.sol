// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBonded} from "./IBonded.sol";
import {IIntentLog} from "./IntentLog.sol";
import {IJobBoardView} from "./JobBoard.sol";

/// @title Bond
/// @notice Two bonds per agent. The pilot bond is earned from fees and slashed only for the
///         pilot's own cheating. The vendor bond is posted by whoever built the agent and slashed
///         only for the agent's mistakes. The broken rule decides which bond pays; the contract
///         never judges intent or fault.
///
///         A proof is the full typed intent plus the agent's EIP-712 signature over it. Every fact
///         comes from the signed intent, this contract or the job board. The reporter only points.
///         A proof is accepted only if the intent was committed to the log for the same job, and
///         only from a party of the job. Shadow jobs also accept proof from registered hunters.
///
///         Who gets paid. On a live job the slash pays the harmed party and the treasury: pilot
///         rules pay the job's requester, vendor rules pay the agent's operator. Nobody earns a
///         bounty for compromising a live wallet. Bounties exist only for registered hunters on
///         shadow jobs, paid from the vendor bond under the daily cap.
contract Bond is IBonded {
    enum Rule { PayeeNotAllowlisted, OverCap, FalseConfirmation, OutsideGeofence }
    enum BondKind { Pilot, Vendor }

    uint8 public constant KIND_PAY = 0;
    uint8 public constant KIND_START_TASK = 2;
    uint8 public constant KIND_CLAIM_DONE = 3;
    uint8 public constant KIND_PAY_INSTALMENT = 4;

    struct Agent {
        address operator;      // the pilot's hardware key
        uint256 balance;       // the pilot bond
        uint256 minimum;       // a reward threshold (rate, listing), not a start condition
        uint256 perTxCap;
        uint256 slashAmount;   // fixed slash per proven pilot violation
        uint256 slashes;
        mapping(address => bool) allowlist;
        mapping(bytes32 => bool) spent; // intent hashes already used as proof
    }

    struct Vendor {
        uint256 balance;
        uint256 penalty;        // fixed slash per proven agent violation
        uint256 dailyCap;       // max total slashed from this vendor per day
        uint256 slashedToday;
        uint64 day;             // block.timestamp / 1 days of the last slash
    }

    mapping(address => Agent) private agents;
    mapping(address => Vendor) private vendors;          // vendor address to vendor bond
    mapping(address => address) private vendorOfAgent;   // agent to vendor
    mapping(address => bool) public isHunter;            // hunters attack shadow jobs only

    uint256 public constant BOUNTY_BPS = 5000; // half of the slash goes to the payee, half to the treasury
    address public immutable treasury;
    address public immutable owner;            // the deployer: sets the board once, registers hunters
    IIntentLog public immutable log;
    IJobBoardView public board;                // set once after deploy, the board needs this address first
    uint256 public immutable startFloor;       // 200 yuan in demo units

    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant INTENT_TYPEHASH = keccak256("Intent(address agent,uint8 kind,address payee,uint256 amount,bytes32 jobId,bytes32 geofence,bool confirmed,uint256 nonce,uint256 expiry)");

    event Registered(address indexed agent, address indexed operator, address indexed vendor, uint256 minimum);
    event Filled(address indexed agent, uint256 amount, uint256 balance);
    event TopUp(address indexed agent, uint256 amount);
    event VendorBondPosted(address indexed vendor, uint256 amount, uint256 balance, uint256 penalty, uint256 dailyCap);
    event HunterSet(address indexed hunter, bool registered);
    event BoardSet(address board);
    event Slashed(address indexed agent, bytes32 indexed intentHash, Rule rule, BondKind bondKind, uint256 amount, address submitter, address paidTo, uint256 paid);

    constructor(address _treasury, IIntentLog _log, uint256 _startFloor) {
        treasury = _treasury;
        owner = msg.sender;
        log = _log;
        startFloor = _startFloor;
    }

    /// @notice The board is deployed with this contract's address, so it is wired here once after.
    function setBoard(IJobBoardView _board) external {
        require(msg.sender == owner, "owner only");
        require(address(board) == address(0), "board set");
        board = _board;
        emit BoardSet(address(_board));
    }

    function setHunter(address hunter, bool registered) external {
        require(msg.sender == owner, "owner only");
        isHunter[hunter] = registered;
        emit HunterSet(hunter, registered);
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("JiXin Bond"), keccak256("1"), block.chainid, address(this)));
    }

    function hashIntent(Intent calldata i) public pure returns (bytes32) {
        return keccak256(abi.encode(INTENT_TYPEHASH, i.agent, i.kind, i.payee, i.amount, i.jobId, i.geofence, i.confirmed, i.nonce, i.expiry));
    }

    function digestOf(Intent calldata i) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), hashIntent(i)));
    }

    /// @notice A vendor posts or tops up its bond and sets the penalty per proven agent violation
    ///         and the cap on penalties per day.
    function postVendorBond(uint256 penalty, uint256 dailyCap) external payable {
        require(penalty > 0 && dailyCap >= penalty, "bad penalty");
        Vendor storage v = vendors[msg.sender];
        v.balance += msg.value;
        v.penalty = penalty;
        v.dailyCap = dailyCap;
        emit VendorBondPosted(msg.sender, msg.value, v.balance, penalty, dailyCap);
    }

    /// @notice Register an agent under an operator (the pilot) and a vendor. Either the agent itself
    ///         calls, or the caller brings the agent's signature over the terms so no one can
    ///         register a wallet they do not control. The vendor must have posted a bond.
    function register(address agent, address operator, address vendor, uint256 minimum, uint256 perTxCap, uint256 slashAmount, address[] calldata allow, bytes calldata agentSig) external {
        Agent storage a = agents[agent];
        require(a.operator == address(0), "registered");
        require(operator != address(0), "no operator");
        require(vendors[vendor].penalty != 0, "unknown vendor");
        if (msg.sender != agent) {
            bytes32 terms = keccak256(abi.encode(operator, vendor, minimum, perTxCap, slashAmount));
            bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", terms));
            require(_recover(digest, agentSig) == agent, "not the agent's signature");
        }
        a.operator = operator;
        a.minimum = minimum;
        a.perTxCap = perTxCap;
        a.slashAmount = slashAmount;
        for (uint256 i; i < allow.length; i++) a.allowlist[allow[i]] = true;
        vendorOfAgent[agent] = vendor;
        emit Registered(agent, operator, vendor, minimum);
    }

    /// @notice Fees accrue into the pilot bond until it reaches the minimum. The bond is earned, not posted.
    function fill(address agent) external payable override {
        Agent storage a = agents[agent];
        require(a.operator != address(0), "unknown agent");
        a.balance += msg.value;
        emit Filled(agent, msg.value, a.balance);
    }

    function topUp(address agent) external payable override {
        Agent storage a = agents[agent];
        require(msg.sender == a.operator, "operator only");
        a.balance += msg.value;
        emit TopUp(agent, msg.value);
    }

    function bondOf(address agent) external view override returns (uint256, uint256) {
        Agent storage a = agents[agent];
        return (a.balance, a.minimum);
    }

    function worstCase(address agent) public view override returns (uint256) {
        return agents[agent].perTxCap;
    }

    /// @notice The pilot bond plus the starting floor must cover the exposure. The minimum is not
    ///         checked here, so a new machine with a zero bond can start small jobs.
    function covers(address agent, uint256 exposure) public view override returns (bool) {
        return agents[agent].balance + startFloor >= exposure;
    }

    function vendorBondOf(address vendor) external view override returns (uint256) { return vendors[vendor].balance; }
    function vendorOf(address agent) external view override returns (address) { return vendorOfAgent[agent]; }
    function operatorOf(address agent) external view override returns (address) { return agents[agent].operator; }

    function vendorTerms(address vendor) external view returns (uint256 balance, uint256 penalty, uint256 dailyCap, uint256 slashedToday, uint64 day) {
        Vendor storage v = vendors[vendor];
        return (v.balance, v.penalty, v.dailyCap, v.slashedToday, v.day);
    }

    function isAllowlisted(address agent, address payee) external view returns (bool) { return agents[agent].allowlist[payee]; }

    /// @notice A party of the job (or a registered hunter on a shadow job) submits a signed intent
    ///         that breaks a rule. The contract checks every fact itself and slashes the bond the
    ///         rule is tagged with.
    /// @param intent the full typed intent the agent signed.
    /// @param signature the agent's EIP-712 signature over the intent.
    /// @param rule which rule the intent breaks.
    function slashByProof(Intent calldata intent, bytes calldata signature, uint8 rule) external override {
        Agent storage a = agents[intent.agent];
        require(a.operator != address(0), "unknown agent");
        bytes32 intentHash = hashIntent(intent);
        require(!a.spent[intentHash], "proof already used");
        require(_recover(digestOf(intent), signature) == intent.agent, "not the agent's signature");
        require(log.committedAt(intentHash) != 0 && log.jobOf(intentHash) == intent.jobId && log.agentOf(intentHash) == intent.agent, "not in log");
        bool shadow = board.isShadow(intent.jobId);
        require(board.isParty(intent.jobId, msg.sender) || (shadow && isHunter[msg.sender]), "not a party");
        Rule r = Rule(rule);
        require(_violates(a, r, intent), "no violation");

        a.spent[intentHash] = true;
        BondKind kind = _bondOf(r);
        uint256 amount;
        address paidTo;
        if (kind == BondKind.Vendor) {
            Vendor storage v = vendors[vendorOfAgent[intent.agent]];
            uint64 today = uint64(block.timestamp / 1 days);
            if (v.day != today) { v.day = today; v.slashedToday = 0; }
            require(v.slashedToday + v.penalty <= v.dailyCap, "daily cap reached");
            v.slashedToday += v.penalty;
            amount = v.penalty > v.balance ? v.balance : v.penalty;
            v.balance -= amount;
            paidTo = shadow ? msg.sender : a.operator;
        } else {
            amount = a.slashAmount > a.balance ? a.balance : a.slashAmount;
            a.balance -= amount;
            paidTo = shadow ? msg.sender : board.requesterOf(intent.jobId);
        }
        a.slashes += 1;
        uint256 paid = (amount * BOUNTY_BPS) / 10_000;
        (bool ok1,) = paidTo.call{value: paid}("");
        (bool ok2,) = treasury.call{value: amount - paid}("");
        require(ok1 && ok2, "transfer failed");
        emit Slashed(intent.agent, intentHash, r, kind, amount, msg.sender, paidTo, paid);
    }

    /// @dev Each rule is tagged with the bond it slashes. No rule touches both.
    function _bondOf(Rule r) internal pure returns (BondKind) {
        if (r == Rule.PayeeNotAllowlisted || r == Rule.OverCap) return BondKind.Vendor;
        return BondKind.Pilot;
    }

    /// @dev Every fact is read from the signed intent, this contract or the board. Never from the caller.
    function _violates(Agent storage a, Rule rule, Intent calldata i) internal view returns (bool) {
        bool isPayment = i.kind == KIND_PAY || i.kind == KIND_PAY_INSTALMENT;
        if (rule == Rule.PayeeNotAllowlisted) return isPayment && !a.allowlist[i.payee];
        if (rule == Rule.OverCap) return isPayment && i.amount > a.perTxCap;
        if (rule == Rule.FalseConfirmation) return i.kind == KIND_CLAIM_DONE && i.confirmed && !board.isConfirmed(i.jobId);
        if (rule == Rule.OutsideGeofence) return i.kind == KIND_START_TASK && i.geofence != board.geofenceOf(i.jobId);
        return false;
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "bad signature length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "bad s");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "bad signature");
        return signer;
    }
}
