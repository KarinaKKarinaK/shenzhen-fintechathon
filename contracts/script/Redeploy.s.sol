// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Bond} from "../src/Bond.sol";
import {IIntentLog} from "../src/IntentLog.sol";
import {JobBoard} from "../src/JobBoard.sol";
import {ILease} from "../src/Lease.sol";

/// @dev Redeploys Bond and JobBoard against the IntentLog and Lease already on chain, after a
///      change to Bond. JobBoard takes the bond address in its constructor, so it moves with it.
///      INTENT_LOG=0x... LEASE=0x... forge script script/Redeploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $SURETY_PRIVATE_KEY --broadcast
contract Redeploy is Script {
    function run() external {
        IIntentLog log = IIntentLog(vm.envAddress("INTENT_LOG"));
        ILease lease = ILease(vm.envAddress("LEASE"));
        uint256 floor = 200 ether;
        vm.startBroadcast();
        address me = msg.sender;
        Bond bond = new Bond(me, log, floor);
        JobBoard board = new JobBoard(bond, lease, me);
        bond.setBoard(board);
        vm.stopBroadcast();
        console.log("Bond     ", address(bond));
        console.log("JobBoard ", address(board));
    }
}
