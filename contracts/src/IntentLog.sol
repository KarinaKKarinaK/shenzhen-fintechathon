// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev What Bond reads from the log: when a hash was committed, for which job, by which agent.
interface IIntentLog {
    event Committed(bytes32 indexed jobId, bytes32 indexed intentHash, address indexed agent, uint64 at);
    function commit(bytes32 jobId, bytes32 intentHash) external;
    function committedAt(bytes32 intentHash) external view returns (uint64);
    function jobOf(bytes32 intentHash) external view returns (bytes32);
    function agentOf(bytes32 intentHash) external view returns (address);
}

/// @title IntentLog
/// @notice Append-only record of intent hashes, per job. The agent commits the hash of every
///         intent before the policy engine decides, so a blocked attempt cannot be quietly dropped.
///         Only the hash goes on chain: no amount, payee or location. The full intent is delivered
///         to the parties of the job off chain. Nobody can delete or change an entry.
contract IntentLog is IIntentLog {
    struct Entry {
        bytes32 jobId;
        address agent;
        uint64 at;
    }

    mapping(bytes32 => Entry) private entries;

    /// @notice The caller is the agent key, the same key that signs intents. `intentHash` is
    ///         `Bond.hashIntent(intent)`, the EIP-712 struct hash, not the digest.
    function commit(bytes32 jobId, bytes32 intentHash) external override {
        require(entries[intentHash].at == 0, "already committed");
        entries[intentHash] = Entry(jobId, msg.sender, uint64(block.timestamp));
        emit Committed(jobId, intentHash, msg.sender, uint64(block.timestamp));
    }

    function committedAt(bytes32 intentHash) external view override returns (uint64) { return entries[intentHash].at; }
    function jobOf(bytes32 intentHash) external view override returns (bytes32) { return entries[intentHash].jobId; }
    function agentOf(bytes32 intentHash) external view override returns (address) { return entries[intentHash].agent; }
}
