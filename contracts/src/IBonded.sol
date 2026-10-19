// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IBonded, the bonded wallet standard.
/// @notice Any agent wallet that implements this can be lent to and listed on a task board.
///         Lenders and boards only deal with wallets that implement it.
interface IBonded {
    /// @dev The typed intent an agent signs under EIP-712. The contract checks the rule
    ///      against these fields, so the proof cannot carry evidence the agent never signed.
    struct Intent {
        address agent;
        uint8 kind;        // 0 pay, 1 accept_job, 2 start_task, 3 claim_done, 4 pay_instalment, 5 set_cap, 6 top_up
        address payee;
        uint256 amount;
        bytes32 jobId;
        bytes32 geofence;
        bool coverBound;
        bool confirmed;
        uint256 nonce;
        uint256 expiry;
    }

    function bondOf(address agent) external view returns (uint256 balance, uint256 minimum);
    function worstCase(address agent) external view returns (uint256);
    function covers(address agent, uint256 exposure) external view returns (bool);
    function slashByProof(Intent calldata intent, bytes calldata signature, uint8 rule) external;
    function topUp(address agent) external payable;
    function fill(address agent) external payable;
}
