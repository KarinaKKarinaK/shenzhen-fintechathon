// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev The one job fact the V2 log and Bond read from JobBoard: the public `jobs` getter. JobBoard v1
///      already exposes it, so V2 runs on the unchanged JobBoard code. `status` is JobBoard.Status:
///      0 Posted, 1 Locked, 2 Running, 3 Released, 4 Held, 5 Declined, 6 Cancelled.
interface IJobRecord {
    function jobs(uint256 id) external view returns (
        address requester, address agent, address verifier, uint256 fee, bytes32 geofence,
        uint64 windowStart, uint64 windowEnd, bool shadow, uint8 status);
}

/// @dev What BondV2 reads from the log. Every lookup is keyed by (agent, intentHash).
interface IIntentLogV2 {
    event Committed(bytes32 indexed jobId, bytes32 indexed intentHash, address indexed agent, uint64 at);
    function commit(bytes32 jobId, bytes32 intentHash) external;
    function committedAt(address agent, bytes32 intentHash) external view returns (uint64);
    function jobOf(address agent, bytes32 intentHash) external view returns (bytes32);
}

/// @title IntentLogV2
/// @notice Append-only record of intent hashes, per job, fixing the v1 front-running hole.
///
///         The v1 hole: v1 `commit` was open to anyone and the first writer of a hash won, with the
///         caller stored as its agent. Anyone who saw the agent's hash in the mempool could commit
///         it first, and `Bond.slashByProof` then failed "not in log" for the real proof.
///
///         The fix has two parts. (1) Only the agent of the job may commit: `msg.sender` must equal
///         `JobBoard.jobs(jobId).agent`. (2) Entries are keyed by (agent, intentHash), not by the hash
///         alone, so even another registered agent committing the same hash under one of its own jobs
///         fills its own slot and never the real agent's. A third party can no longer occupy the slot.
///
///         A missing commit is handled in BondV2, not here: see `BondV2.slashByProof`.
contract IntentLogV2 is IIntentLogV2 {
    struct Entry {
        bytes32 jobId;
        uint64 at;
    }

    address public immutable owner;
    IJobRecord public board;   // set once after deploy: the board needs Bond, Bond needs this log

    mapping(address => mapping(bytes32 => Entry)) private entries;

    event BoardSet(address board);

    constructor() { owner = msg.sender; }

    function setBoard(IJobRecord _board) external {
        require(msg.sender == owner, "owner only");
        require(address(board) == address(0), "board set");
        board = _board;
        emit BoardSet(address(_board));
    }

    /// @notice The caller must be the agent of job `jobId` on the board, the same key that signs
    ///         intents. `intentHash` is `BondV2.hashIntent(intent)`, the EIP-712 struct hash.
    function commit(bytes32 jobId, bytes32 intentHash) external override {
        require(address(board) != address(0), "board not set");
        (, address jobAgent,,,,,,,) = board.jobs(uint256(jobId));
        require(jobAgent != address(0) && msg.sender == jobAgent, "not the job's agent");
        Entry storage e = entries[msg.sender][intentHash];
        require(e.at == 0, "already committed");
        e.jobId = jobId;
        e.at = uint64(block.timestamp);
        emit Committed(jobId, intentHash, msg.sender, uint64(block.timestamp));
    }

    function committedAt(address agent, bytes32 intentHash) external view override returns (uint64) { return entries[agent][intentHash].at; }
    function jobOf(address agent, bytes32 intentHash) external view override returns (bytes32) { return entries[agent][intentHash].jobId; }
}
