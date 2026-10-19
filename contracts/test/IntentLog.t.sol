// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {Bond} from "../src/Bond.sol";
import {IBonded} from "../src/IBonded.sol";

contract IntentLogTest is BaseTest {
    function testCommitRecordsJobAgentAndTime() public {
        uint256 id = _post(500 ether, false);
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        vm.warp(1234);
        _commit(i);
        bytes32 h = _hash(i);
        assertEq(log.committedAt(h), 1234);
        assertEq(log.jobOf(h), _jobId(id));
        assertEq(log.agentOf(h), agent);
    }

    function testCommitTwiceReverts() public {
        uint256 id = _post(500 ether, false);
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        _commit(i);
        vm.expectRevert("already committed");
        _commit(i);
    }

    /// B.7 test 1: a proof for an intent never committed to the log.
    function testProofNotInLogReverts() public {
        uint256 id = _post(500 ether, false);
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        vm.prank(farmer);
        vm.expectRevert("not in log");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    /// B.7 test 2: the log entry belongs to a different job.
    function testProofLoggedUnderOtherJobReverts() public {
        uint256 one = _post(500 ether, false);
        uint256 two = _post(500 ether, false);
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, one, 1);
        bytes memory sig = _sign(agentKey, i);
        vm.prank(agent);
        log.commit(_jobId(two), _hash(i));
        vm.prank(farmer);
        vm.expectRevert("not in log");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    /// A log entry committed by someone other than the agent is not the agent's commitment.
    function testProofLoggedByStrangerReverts() public {
        uint256 id = _post(500 ether, false);
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        vm.prank(stranger);
        log.commit(_jobId(id), _hash(i));
        vm.prank(farmer);
        vm.expectRevert("not in log");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }
}
