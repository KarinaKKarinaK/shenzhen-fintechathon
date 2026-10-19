// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBonded} from "./IBonded.sol";
import {ILease} from "./Lease.sol";

/// @dev What Bond reads from the board when it checks a proof. Job ids are `bytes32(uint256(id))`.
interface IJobBoardView {
    function isConfirmed(bytes32 jobId) external view returns (bool);
    function geofenceOf(bytes32 jobId) external view returns (bytes32);
    function isParty(bytes32 jobId, address who) external view returns (bool);
    function isShadow(bytes32 jobId) external view returns (bool);
    function requesterOf(bytes32 jobId) external view returns (address);
}

/// @title JobBoard
/// @notice One board for every job. A job carries a fee, a verifier, a window and a geofence.
///         The fee locks on post, the task may start only if the pilot bond plus the starting floor
///         covers the worst case and the lease is not frozen, and the fee releases only on the
///         verifier's confirmation, split by rule. No amount in the split comes from the caller.
///         Shadow jobs run the same rules but move no lease money. They exist for registered
///         hunters to attack shadow copies of the agent.
contract JobBoard is IJobBoardView {
    enum Status { Posted, Locked, Running, Released, Held, Declined, Cancelled }

    struct Job {
        address requester;
        address agent;
        address verifier;
        uint256 fee;
        bytes32 geofence;
        uint64 windowStart;
        uint64 windowEnd;
        bool shadow;
        Status status;
    }

    IBonded public immutable bond;
    ILease public immutable lease;
    address public immutable rail;
    uint256 public constant RAIL_BPS = 200;       // two percent
    uint256 public constant HOLD_BPS = 1333;      // capped hold for a flag, about an eighth of the fee
    uint256 public constant HOLD_SECONDS = 1 days;
    uint256 public constant WORST_CASE_BPS = 2500; // the bond plus floor must cover a quarter of the fee

    uint256 public nextId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public leaseOf;   // job id to lease id
    mapping(uint256 => uint256) public holdUntil;
    mapping(uint256 => uint256) public held;

    event Posted(uint256 indexed id, address indexed requester, address indexed agent, uint256 fee, bytes32 geofence, bool shadow);
    event Started(uint256 indexed id);
    event Released(uint256 indexed id, uint256 toAgent, uint256 instalment, uint256 railFee, uint256 toBond, uint256 hold);
    event Flagged(uint256 indexed id, uint256 refunded);
    event HoldReleased(uint256 indexed id, uint256 amount);
    event Cancelled(uint256 indexed id, uint256 refunded);

    constructor(IBonded _bond, ILease _lease, address _rail) { bond = _bond; lease = _lease; rail = _rail; }

    /// @param shadow true for a shadow job: same rules, no lease instalment, no bond fill.
    function post(address agent, address verifier, uint256 leaseId, bytes32 geofence, uint64 windowStart, uint64 windowEnd, bool shadow) external payable returns (uint256 id) {
        require(msg.value > 0, "fee required");
        require(verifier != agent, "agent cannot verify itself");
        id = nextId++;
        jobs[id] = Job(msg.sender, agent, verifier, msg.value, geofence, windowStart, windowEnd, shadow, Status.Locked);
        leaseOf[id] = leaseId;
        emit Posted(id, msg.sender, agent, msg.value, geofence, shadow);
    }

    /// @notice Proof of solvency is checked here: the pilot bond plus the starting floor must cover
    ///         a quarter of the fee. A zero bond can start a job up to four times the floor.
    ///         Frozen lease, no task.
    function start(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.agent, "agent only");
        require(j.status == Status.Locked, "not locked");
        require(!lease.isFrozen(leaseOf[id]), "lease frozen");
        require(bond.covers(j.agent, (j.fee * WORST_CASE_BPS) / 10_000), "bond does not cover the worst case");
        require(block.timestamp >= j.windowStart && block.timestamp <= j.windowEnd, "outside the window");
        j.status = Status.Running;
        emit Started(id);
    }

    /// @notice Only the verifier releases. The split is by rule: rail, hold, instalment from the lease
    ///         terms, bond gap from the bond contract, the rest to the agent. Shadow jobs skip the
    ///         lease and the bond.
    function confirm(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.verifier, "verifier only");
        require(j.status == Status.Running, "not running");
        j.status = Status.Released;
        uint256 railFee = (j.fee * RAIL_BPS) / 10_000;
        uint256 hold = (j.fee * HOLD_BPS) / 10_000;
        uint256 rest = j.fee - railFee - hold;
        uint256 instalment;
        uint256 toBond;
        if (!j.shadow) {
            instalment = lease.instalmentFor(leaseOf[id], j.fee);
            if (instalment > rest) instalment = rest;
            rest -= instalment;
            uint256 bondGap;
            {
                (uint256 balance, uint256 minimum) = bond.bondOf(j.agent);
                bondGap = balance >= minimum ? 0 : minimum - balance;
            }
            toBond = bondGap < rest / 2 ? bondGap : rest / 2;
            rest -= toBond;
        }
        held[id] = hold;
        holdUntil[id] = block.timestamp + HOLD_SECONDS;
        _pay(rail, railFee);
        if (instalment > 0) lease.pay{value: instalment}(leaseOf[id]);
        if (toBond > 0) bond.fill{value: toBond}(j.agent);
        _pay(j.agent, rest);
        emit Released(id, rest, instalment, railFee, toBond, hold);
    }

    /// @notice The requester can flag within the hold window. The hold is refunded and a human arbiter decides the rest.
    function flag(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.requester, "requester only");
        require(j.status == Status.Released, "not released");
        require(block.timestamp <= holdUntil[id], "hold window over");
        uint256 h = held[id]; held[id] = 0; j.status = Status.Held;
        _pay(j.requester, h);
        emit Flagged(id, h);
    }

    function releaseHold(uint256 id) external {
        Job storage j = jobs[id];
        require(block.timestamp > holdUntil[id] && j.status == Status.Released, "hold still open");
        uint256 h = held[id]; held[id] = 0;
        _pay(j.agent, h);
        emit HoldReleased(id, h);
    }

    /// @notice A job that never started can be cancelled by the requester once its window has passed.
    ///         The locked fee goes back to the requester.
    function cancel(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.requester, "requester only");
        require(j.status == Status.Locked, "not locked");
        require(block.timestamp > j.windowEnd, "window still open");
        j.status = Status.Cancelled;
        uint256 fee = j.fee;
        _pay(j.requester, fee);
        emit Cancelled(id, fee);
    }

    // Views for Bond. Every fact a proof needs about a job is read here, never from the reporter.

    function isConfirmed(bytes32 jobId) external view override returns (bool) {
        Status s = jobs[uint256(jobId)].status;
        return s == Status.Released || s == Status.Held;
    }

    function geofenceOf(bytes32 jobId) external view override returns (bytes32) { return jobs[uint256(jobId)].geofence; }

    function isShadow(bytes32 jobId) external view override returns (bool) { return jobs[uint256(jobId)].shadow; }

    function requesterOf(bytes32 jobId) external view override returns (address) { return jobs[uint256(jobId)].requester; }

    /// @dev The parties of a job: requester, verifier, the agent's operator, the lender of its lease
    ///      and the vendor of the agent. Only they receive the full intents and only they can report.
    function isParty(bytes32 jobId, address who) external view override returns (bool) {
        uint256 id = uint256(jobId);
        Job storage j = jobs[id];
        if (j.requester == address(0) || who == address(0)) return false;
        if (who == j.requester || who == j.verifier) return true;
        if (who == bond.operatorOf(j.agent) || who == bond.vendorOf(j.agent)) return true;
        return who == lease.lenderOf(leaseOf[id]);
    }

    function _pay(address to, uint256 amount) internal { if (amount == 0) return; (bool ok,) = to.call{value: amount}(""); require(ok, "transfer failed"); }
}
