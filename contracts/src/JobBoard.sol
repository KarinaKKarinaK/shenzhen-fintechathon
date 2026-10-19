// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBonded} from "./IBonded.sol";
import {ILease} from "./Lease.sol";

/// @title JobBoard
/// @notice One contract serves both sides. A job carries a fee, a verifier, a window and a geofence.
///         The fee locks on post, the task may start only if the agent's bond covers the worst case,
///         cover is bound and the lease is not frozen, and the fee releases only on the verifier's
///         confirmation, split by rule. No amount in the split comes from the caller.
contract JobBoard {
    enum Status { Posted, Locked, Running, Released, Held, Declined }

    struct Job {
        address requester;
        address agent;
        address verifier;
        uint256 fee;
        bytes32 geofence;
        uint64 windowStart;
        uint64 windowEnd;
        bool coverBound;
        Status status;
    }

    IBonded public immutable bond;
    ILease public immutable lease;
    address public immutable rail;
    uint256 public constant RAIL_BPS = 200;       // two percent
    uint256 public constant HOLD_BPS = 1333;      // capped hold for a flag, about an eighth of the fee
    uint256 public constant HOLD_SECONDS = 1 days;

    uint256 public nextId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public leaseOf;   // job id to lease id
    mapping(uint256 => uint256) public holdUntil;
    mapping(uint256 => uint256) public held;

    event Posted(uint256 indexed id, address indexed requester, address indexed agent, uint256 fee, bytes32 geofence);
    event Started(uint256 indexed id);
    event Released(uint256 indexed id, uint256 toAgent, uint256 instalment, uint256 railFee, uint256 toBond, uint256 hold);
    event Flagged(uint256 indexed id, uint256 refunded);
    event HoldReleased(uint256 indexed id, uint256 amount);

    constructor(IBonded _bond, ILease _lease, address _rail) { bond = _bond; lease = _lease; rail = _rail; }

    function post(address agent, address verifier, uint256 leaseId, bytes32 geofence, uint64 windowStart, uint64 windowEnd) external payable returns (uint256 id) {
        require(msg.value > 0, "fee required");
        require(verifier != agent, "agent cannot verify itself");
        id = nextId++;
        jobs[id] = Job(msg.sender, agent, verifier, msg.value, geofence, windowStart, windowEnd, false, Status.Locked);
        leaseOf[id] = leaseId;
        emit Posted(id, msg.sender, agent, msg.value, geofence);
    }

    function bindCover(uint256 id) external { Job storage j = jobs[id]; require(msg.sender == j.agent, "agent only"); j.coverBound = true; }

    /// @notice Proof of solvency and cover are checked here. No bond, no task. Frozen lease, no task.
    function start(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.agent, "agent only");
        require(j.status == Status.Locked, "not locked");
        require(j.coverBound, "no cover bound");
        require(!lease.isFrozen(leaseOf[id]), "lease frozen");
        require(bond.covers(j.agent, (j.fee * 25) / 100), "bond does not cover the worst case");
        require(block.timestamp >= j.windowStart && block.timestamp <= j.windowEnd, "outside the window");
        j.status = Status.Running;
        emit Started(id);
    }

    /// @notice Only the verifier releases. The split is by rule: rail, hold, instalment from the lease
    ///         terms, bond gap from the bond contract, the rest to the agent.
    function confirm(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.verifier, "verifier only");
        require(j.status == Status.Running, "not running");
        j.status = Status.Released;
        uint256 railFee = (j.fee * RAIL_BPS) / 10_000;
        uint256 hold = (j.fee * HOLD_BPS) / 10_000;
        uint256 rest = j.fee - railFee - hold;
        uint256 instalment = lease.instalmentFor(leaseOf[id], j.fee);
        if (instalment > rest) instalment = rest;
        rest -= instalment;
        uint256 bondGap;
        {
            (uint256 balance, uint256 minimum) = bond.bondOf(j.agent);
            bondGap = balance >= minimum ? 0 : minimum - balance;
        }
        uint256 toBond = bondGap < rest / 2 ? bondGap : rest / 2;
        rest -= toBond;
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

    function _pay(address to, uint256 amount) internal { if (amount == 0) return; (bool ok,) = to.call{value: amount}(""); require(ok, "transfer failed"); }
}
