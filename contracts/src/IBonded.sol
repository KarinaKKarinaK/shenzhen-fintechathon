// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IBonded, the bonded wallet standard.
/// @notice Any agent wallet that implements this can be lent to and listed on a task board.
///         Lenders and boards only deal with wallets that implement it.
interface IBonded {
    function bondOf(address agent) external view returns (uint256 balance, uint256 minimum);
    function worstCase(address agent) external view returns (uint256);
    function covers(address agent, uint256 exposure) external view returns (bool);
    function slashByProof(address agent, bytes32 intentHash, bytes calldata signature, uint8 rule, bytes calldata evidence) external;
    function topUp(address agent) external payable;
}
