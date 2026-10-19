// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBonded} from "./IBonded.sol";

/// @title Bond
/// @notice Holds each agent's bond. Slashes on proof of a signed intent that breaks a rule the
///         contract can check itself. The proof is the full typed intent plus the agent's EIP-712
///         signature over it, so the rule is checked against fields the agent actually signed.
///         Pays part of the slash to whoever submitted the proof.
///         Only the operator key (a hardware button in the demo) can top up.
contract Bond is IBonded {
    enum Rule { PayeeNotAllowlisted, OverCap, NoCoverBound, UnconfirmedClaim, OutsideGeofence }

    uint8 public constant KIND_PAY = 0;
    uint8 public constant KIND_START_TASK = 2;
    uint8 public constant KIND_CLAIM_DONE = 3;
    uint8 public constant KIND_PAY_INSTALMENT = 4;

    struct Agent {
        address operator;      // the human's hardware key
        uint256 balance;
        uint256 minimum;
        uint256 perTxCap;
        uint256 slashAmount;
        uint256 slashes;
        mapping(address => bool) allowlist;
        mapping(bytes32 => bool) geofences;
        mapping(bytes32 => bool) spent; // intent hashes already used as proof
    }

    mapping(address => Agent) private agents;
    uint256 public constant BOUNTY_BPS = 5000; // half of the slash goes to the submitter
    address public immutable treasury;

    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant INTENT_TYPEHASH = keccak256("Intent(address agent,uint8 kind,address payee,uint256 amount,bytes32 jobId,bytes32 geofence,bool coverBound,bool confirmed,uint256 nonce,uint256 expiry)");

    event Registered(address indexed agent, address indexed operator, uint256 minimum);
    event Filled(address indexed agent, uint256 amount, uint256 balance);
    event Slashed(address indexed agent, bytes32 indexed intentHash, Rule rule, uint256 amount, address submitter, uint256 bounty);
    event TopUp(address indexed agent, uint256 amount);

    constructor(address _treasury) { treasury = _treasury; }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("JiXin Bond"), keccak256("1"), block.chainid, address(this)));
    }

    function hashIntent(Intent calldata i) public pure returns (bytes32) {
        return keccak256(abi.encode(INTENT_TYPEHASH, i.agent, i.kind, i.payee, i.amount, i.jobId, i.geofence, i.coverBound, i.confirmed, i.nonce, i.expiry));
    }

    function digestOf(Intent calldata i) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), hashIntent(i)));
    }

    /// @notice Register an agent under an operator. Either the agent itself calls, or the caller
    ///         brings the agent's signature over the terms so no one can register a wallet they
    ///         do not control.
    function register(address agent, address operator, uint256 minimum, uint256 perTxCap, uint256 slashAmount, address[] calldata allow, bytes32[] calldata fences, bytes calldata agentSig) external {
        Agent storage a = agents[agent];
        require(a.operator == address(0), "registered");
        require(operator != address(0), "no operator");
        if (msg.sender != agent) {
            bytes32 terms = keccak256(abi.encode(operator, minimum, perTxCap, slashAmount));
            bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", terms));
            require(_recover(digest, agentSig) == agent, "not the agent's signature");
        }
        a.operator = operator;
        a.minimum = minimum;
        a.perTxCap = perTxCap;
        a.slashAmount = slashAmount;
        for (uint256 i; i < allow.length; i++) a.allowlist[allow[i]] = true;
        for (uint256 i; i < fences.length; i++) a.geofences[fences[i]] = true;
        emit Registered(agent, operator, minimum);
    }

    /// @notice Fees accrue into the bond until it reaches the minimum. The bond is earned, not posted.
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

    function covers(address agent, uint256 exposure) public view override returns (bool) {
        Agent storage a = agents[agent];
        uint256 need = exposure > a.minimum ? exposure : a.minimum;
        return a.balance >= need;
    }

    /// @notice Anyone holding a signed intent that breaks a checkable rule can submit it.
    /// @param intent the full typed intent the agent signed.
    /// @param signature the agent's EIP-712 signature over the intent.
    /// @param rule which rule the intent breaks, checked against the intent's own fields.
    function slashByProof(Intent calldata intent, bytes calldata signature, uint8 rule) external override {
        Agent storage a = agents[intent.agent];
        require(a.operator != address(0), "unknown agent");
        bytes32 intentHash = hashIntent(intent);
        require(!a.spent[intentHash], "proof already used");
        require(_recover(digestOf(intent), signature) == intent.agent, "not the agent's signature");
        a.spent[intentHash] = true;
        require(_violates(a, Rule(rule), intent), "no violation");
        uint256 amount = a.slashAmount > a.balance ? a.balance : a.slashAmount;
        a.balance -= amount;
        a.slashes += 1;
        uint256 bounty = (amount * BOUNTY_BPS) / 10_000;
        (bool ok1,) = msg.sender.call{value: bounty}("");
        (bool ok2,) = treasury.call{value: amount - bounty}("");
        require(ok1 && ok2, "transfer failed");
        emit Slashed(intent.agent, intentHash, Rule(rule), amount, msg.sender, bounty);
    }

    function _violates(Agent storage a, Rule rule, Intent calldata i) internal view returns (bool) {
        bool isPayment = i.kind == KIND_PAY || i.kind == KIND_PAY_INSTALMENT;
        if (rule == Rule.PayeeNotAllowlisted) return isPayment && !a.allowlist[i.payee];
        if (rule == Rule.OverCap) return isPayment && i.amount > a.perTxCap;
        if (rule == Rule.OutsideGeofence) return i.kind == KIND_START_TASK && !a.geofences[i.geofence];
        if (rule == Rule.NoCoverBound) return i.kind == KIND_START_TASK && !i.coverBound;
        if (rule == Rule.UnconfirmedClaim) return i.kind == KIND_CLAIM_DONE && !i.confirmed;
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
