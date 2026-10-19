// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBonded} from "./IBonded.sol";

/// @title JobBoard
/// @notice One contract serves both sides. A job carries a fee, a verifier, a window and a geofence.
///         The fee locks on post, the task may start only if the agent's bond covers the worst case and
///         cover is bound, and the fee releases only on the verifier's confirmation, split by rule.
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
    address public immutable lease;
    address public immutable rail;
    uint256 public constant RAIL_BPS = 200;       // two percent
    uint256 public constant HOLD_BPS = 1333;      // capped hold for a flag, about an eighth of the fee
    uint256 public constant HOLD_SECONDS = 1 days;

    uint256 public nextId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public holdUntil;
    mapping(uint256 => uint256) public held;

    event Posted(uint256 indexed id, address indexed requester, address indexed agent, uint256 fee, bytes32 geofence);
    event Started(uint256 indexed id);
    event Released(uint256 indexed id, uint256 toAgent, uint256 instalment, uint256 railFee, uint256 toBond, uint256 hold);
    event Flagged(uint256 indexed id, uint256 refunded);
    event HoldReleased(uint256 indexed id, uint256 amount);

    constructor(IBonded _bond, address _lease, address _rail) { bond = _bond; lease = _lease; rail = _rail; }

    function post(address agent, address verifier, bytes32 geofence, uint64 windowStart, uint64 windowEnd) external payable returns (uint256 id) {
        require(msg.value > 0, "fee required");
        id = nextId++;
        jobs[id] = Job(msg.sender, agent, verifier, msg.value, geofence, windowStart, windowEnd, false, Status.Locked);
        emit Posted(id, msg.sender, agent, msg.value, geofence);
    }

    function bindCover(uint256 id) external { Job storage j = jobs[id]; require(msg.sender == j.agent, "agent only"); j.coverBound = true; }

    /// @notice Proof of solvency and cover are checked here. No bond, no task.
    function start(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.agent, "agent only");
        require(j.status == Status.Locked, "not locked");
        require(j.coverBound, "no cover bound");
        require(bond.covers(j.agent, (j.fee * 25) / 100), "bond does not cover the worst case");
        require(block.timestamp >= j.windowStart && block.timestamp <= j.windowEnd, "outside the window");
        j.status = Status.Running;
        emit Started(id);
    }

    /// @notice Only the verifier releases. The split is by rule: instalment, rail, bond gap, owner.
    function confirm(uint256 id, uint256 instalment, uint256 bondGap) external {
        Job storage j = jobs[id];
        require(msg.sender == j.verifier, "verifier only");
        require(j.status == Status.Running, "not running");
        j.status = Status.Released;
        uint256 railFee = (j.fee * RAIL_BPS) / 10_000;
        uint256 hold = (j.fee * HOLD_BPS) / 10_000;
        uint256 rest = j.fee - railFee - hold;
        require(instalment <= rest, "instalment over fee");
        rest -= instalment;
        uint256 toBond = bondGap < rest / 2 ? bondGap : rest / 2;
        rest -= toBond;
        held[id] = hold;
        holdUntil[id] = block.timestamp + HOLD_SECONDS;
        _pay(rail, railFee);
        _pay(lease, instalment);
        if (toBond > 0) bond.topUp{value: 0}(j.agent); // placeholder call shape; the demo engine fills through Bond.fill
        if (toBond > 0) (bool okb,) = address(bond).call{value: toBond}(abi.encodeWithSignature("fill(address)", j.agent));
        _pay(j.agent, rest);
        emit Released(id, rest, instalment, railFee, toBond, hold);
    }

    /// @notice The requester can flag within the hold window. The hold is refunded and a human arbiter decides the rest.
    function flag(uint256 id) external {
        Job storage j = jobs[id];
        require(msg.sender == j.requester, "requester only");
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
