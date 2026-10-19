// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBonded} from "./IBonded.sol";

/// @title Bond
/// @notice Holds each agent's bond. Slashes on proof of a signed intent that breaks a rule the
///         contract can check itself. Pays part of the slash to whoever submitted the proof.
///         Only the operator key (a hardware button in the demo) can raise the minimum or top up.
contract Bond is IBonded {
    enum Rule { PayeeNotAllowlisted, OverCap, NoCoverBound, UnconfirmedClaim, SkippedInstalment, OutsideGeofence }

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

    event Registered(address indexed agent, address indexed operator, uint256 minimum);
    event Filled(address indexed agent, uint256 amount, uint256 balance);
    event Slashed(address indexed agent, bytes32 indexed intentHash, Rule rule, uint256 amount, address submitter, uint256 bounty);
    event TopUp(address indexed agent, uint256 amount);

    constructor(address _treasury) { treasury = _treasury; }

    function register(address agent, uint256 minimum, uint256 perTxCap, uint256 slashAmount, address[] calldata allow, bytes32[] calldata fences) external {
        Agent storage a = agents[agent];
        require(a.operator == address(0), "registered");
        a.operator = msg.sender;
        a.minimum = minimum;
        a.perTxCap = perTxCap;
        a.slashAmount = slashAmount;
        for (uint256 i; i < allow.length; i++) a.allowlist[allow[i]] = true;
        for (uint256 i; i < fences.length; i++) a.geofences[fences[i]] = true;
        emit Registered(agent, msg.sender, minimum);
    }

    /// @notice Fees accrue into the bond until it reaches the minimum. The bond is earned, not posted.
    function fill(address agent) external payable {
        Agent storage a = agents[agent];
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
    /// @param intentHash keccak256 of the typed intent the agent signed.
    /// @param signature the agent's signature over intentHash.
    /// @param rule which rule the intent breaks.
    /// @param evidence abi encoded fields the rule needs: (payee, amount) or (geofence) or (jobId, confirmed).
    function slashByProof(address agent, bytes32 intentHash, bytes calldata signature, uint8 rule, bytes calldata evidence) external override {
        Agent storage a = agents[agent];
        require(a.operator != address(0), "unknown agent");
        require(!a.spent[intentHash], "proof already used");
        require(_recover(intentHash, signature) == agent, "not the agent's signature");
        require(_violates(a, Rule(rule), evidence), "no violation");
        a.spent[intentHash] = true;
        uint256 amount = a.slashAmount > a.balance ? a.balance : a.slashAmount;
        a.balance -= amount;
        a.slashes += 1;
        uint256 bounty = (amount * BOUNTY_BPS) / 10_000;
        (bool ok1,) = msg.sender.call{value: bounty}("");
        (bool ok2,) = treasury.call{value: amount - bounty}("");
        require(ok1 && ok2, "transfer failed");
        emit Slashed(agent, intentHash, Rule(rule), amount, msg.sender, bounty);
    }

    function _violates(Agent storage a, Rule rule, bytes calldata evidence) internal view returns (bool) {
        if (rule == Rule.PayeeNotAllowlisted) {
            (address payee,) = abi.decode(evidence, (address, uint256));
            return !a.allowlist[payee];
        }
        if (rule == Rule.OverCap) {
            (, uint256 amount) = abi.decode(evidence, (address, uint256));
            return amount > a.perTxCap;
        }
        if (rule == Rule.OutsideGeofence) {
            bytes32 fence = abi.decode(evidence, (bytes32));
            return !a.geofences[fence];
        }
        if (rule == Rule.UnconfirmedClaim) {
            (, bool confirmed) = abi.decode(evidence, (bytes32, bool));
            return !confirmed;
        }
        if (rule == Rule.NoCoverBound) {
            (, bool cover) = abi.decode(evidence, (bytes32, bool));
            return !cover;
        }
        return false; // SkippedInstalment is proven by the Lease contract and reported through it
    }

    function _recover(bytes32 h, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "bad signature length");
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := calldataload(sig.offset) s := calldataload(add(sig.offset, 32)) v := byte(0, calldataload(add(sig.offset, 64))) }
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h));
        return ecrecover(digest, v, r, s);
    }
}
