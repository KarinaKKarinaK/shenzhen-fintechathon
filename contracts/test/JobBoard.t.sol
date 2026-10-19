// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {JobBoard} from "../src/JobBoard.sol";

contract JobBoardTest is BaseTest {
    function _status(uint256 id) internal view returns (JobBoard.Status s) {
        (,,,,,,,, s) = board.jobs(id);
    }

    function _leaseBalance() internal view returns (uint256 balance) {
        (,,,, balance,,,,,,) = lease.leases(leaseId);
    }

    // Start and floor

    /// B.7 test 11: a zero bond starts a job up to four times the floor and no bigger.
    function testZeroBondStartsUpToFourTimesTheFloor() public {
        uint256 small = _post(4 * FLOOR, false);   // 800 yuan
        uint256 big = _post(1000 ether, false);
        vm.prank(agent);
        board.start(small);
        assertEq(uint8(_status(small)), uint8(JobBoard.Status.Running));
        vm.prank(agent);
        vm.expectRevert("bond does not cover the worst case");
        board.start(big);
    }

    /// B.7 test 12: confirmed jobs fill the bond and unlock a bigger job.
    function testConfirmedJobsUnlockBiggerJobs() public {
        uint256 big = _post(1200 ether, false);
        vm.prank(agent);
        vm.expectRevert("bond does not cover the worst case");
        board.start(big);

        uint256 first = _post(800 ether, false);
        vm.prank(agent);
        board.start(first);
        vm.prank(farmer);
        board.confirm(first);
        assertGt(_pilotBond(), 0);

        vm.prank(agent);
        board.start(big);
        assertEq(uint8(_status(big)), uint8(JobBoard.Status.Running));
    }

    /// B.7 test 13: the minimum has no effect on start.
    function testMinimumDoesNotBlockStart() public {
        uint256 otherKey = 0xC0DE;
        address other = vm.addr(otherKey);
        address[] memory allow = new address[](0);
        vm.prank(other);
        bond.register(other, operator, vendor, 1_000_000 ether, PER_TX_CAP, SLASH, allow, "");
        vm.prank(lender);
        uint256 otherLease = lease.open(operator, other, DRONE, 4000, 3000, 5000, 0);
        vm.prank(farmer);
        uint256 id = board.post{value: 800 ether}(other, farmer, otherLease, fieldSeven, uint64(block.timestamp), uint64(block.timestamp + 1 days), false);
        vm.prank(other);
        board.start(id);
        assertEq(uint8(_status(id)), uint8(JobBoard.Status.Running));
    }

    /// B.7 test 14: no cover functions remain, start succeeds with no cover call.
    function testStartNeedsNoCover() public {
        uint256 id = _post(500 ether, false);
        vm.prank(agent);
        board.start(id);
        assertEq(uint8(_status(id)), uint8(JobBoard.Status.Running));
    }

    function testFrozenLeaseBlocksStart() public {
        uint256 id = _post(500 ether, false);
        vm.prank(lender);
        lease.freeze(leaseId, "tampered log");
        vm.prank(agent);
        vm.expectRevert("lease frozen");
        board.start(id);
    }

    // Confirm and the split

    function testConfirmPaysInstalmentAndFillsBond() public {
        uint256 id = _post(500 ether, false);
        vm.prank(agent);
        board.start(id);
        uint256 lenderBefore = lender.balance;
        uint256 agentBefore = agent.balance;
        vm.prank(farmer);
        board.confirm(id);
        uint256 railFee = 500 ether * 200 / 10_000;
        uint256 hold = 500 ether * 1333 / 10_000;
        uint256 instalment = 500 ether * 4000 / 10_000;
        uint256 rest = 500 ether - railFee - hold - instalment;
        uint256 toBond = rest / 2;
        assertEq(lender.balance - lenderBefore, instalment);
        assertEq(_leaseBalance(), DRONE - instalment);
        assertEq(_pilotBond(), toBond);
        assertEq(agent.balance - agentBefore, rest - toBond);
        assertEq(rail.balance, railFee);
        assertEq(board.held(id), hold);
    }

    function testOnlyVerifierConfirms() public {
        uint256 id = _post(500 ether, false);
        vm.prank(agent);
        board.start(id);
        vm.prank(agent);
        vm.expectRevert("verifier only");
        board.confirm(id);
    }

    /// B.7 test 16: shadow jobs never call Lease.pay and never fill the pilot bond.
    function testShadowJobMovesNoLeaseMoney() public {
        uint256 id = _post(500 ether, true);
        vm.prank(agent);
        board.start(id);
        uint256 lenderBefore = lender.balance;
        vm.prank(farmer);
        board.confirm(id);
        assertEq(lender.balance, lenderBefore);
        assertEq(_leaseBalance(), DRONE);
        assertEq(_pilotBond(), 0);
        assertTrue(board.isShadow(_jobId(id)));
        assertTrue(board.isConfirmed(_jobId(id)));
    }

    // Cancel

    /// B.7 test 15: a never-started job can be cancelled after its window, the fee returns.
    function testCancelAfterWindowRefundsFee() public {
        uint256 id = _post(500 ether, false);
        uint256 before = farmer.balance;
        vm.prank(farmer);
        vm.expectRevert("window still open");
        board.cancel(id);
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(stranger);
        vm.expectRevert("requester only");
        board.cancel(id);
        vm.prank(farmer);
        board.cancel(id);
        assertEq(farmer.balance - before, 500 ether);
        assertEq(uint8(_status(id)), uint8(JobBoard.Status.Cancelled));
    }

    function testCannotCancelARunningJob() public {
        uint256 id = _post(500 ether, false);
        vm.prank(agent);
        board.start(id);
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(farmer);
        vm.expectRevert("not locked");
        board.cancel(id);
    }

    // Views used by Bond

    function testPartiesOfAJob() public {
        uint256 id = _post(500 ether, false);
        bytes32 jobId = _jobId(id);
        assertTrue(board.isParty(jobId, farmer));
        assertTrue(board.isParty(jobId, operator));
        assertTrue(board.isParty(jobId, vendor));
        assertTrue(board.isParty(jobId, lender));
        assertFalse(board.isParty(jobId, hunter));
        assertFalse(board.isParty(jobId, stranger));
        assertFalse(board.isParty(jobId, address(0)));
        assertFalse(board.isParty(bytes32(uint256(999)), farmer));
        assertEq(board.geofenceOf(jobId), fieldSeven);
        assertEq(board.requesterOf(jobId), farmer);
        assertFalse(board.isConfirmed(jobId));
    }
}
