// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Bond} from "../src/Bond.sol";
import {IntentLog} from "../src/IntentLog.sol";
import {JobBoard} from "../src/JobBoard.sol";
import {Lease} from "../src/Lease.sol";

/// @dev Deploys the four contracts in dependency order and wires the board into the bond.
///      The deployer stands in for the treasury and the rail on the testnet.
///      forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $SURETY_PRIVATE_KEY --broadcast
contract Deploy is Script {
    function run() external {
        uint256 floor = 200 ether; // 200 yuan starting floor, demo units: 1 ether is 1 yuan
        vm.startBroadcast();
        address me = msg.sender;
        IntentLog log = new IntentLog();
        Bond bond = new Bond(me, log, floor);
        Lease lease = new Lease();
        JobBoard board = new JobBoard(bond, lease, me);
        bond.setBoard(board);
        vm.stopBroadcast();
        console.log("IntentLog", address(log));
        console.log("Bond     ", address(bond));
        console.log("Lease    ", address(lease));
        console.log("JobBoard ", address(board));
    }
}
