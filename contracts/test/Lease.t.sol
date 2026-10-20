// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Lease} from "../src/Lease.sol";

contract LeaseTest is Test {
    Lease lease;
    address lender = address(0x1E7D);
    address operator = address(0xB0B);
    address agent = address(0xA6E7);
    uint256 constant TOTAL = 1000 ether;
    uint256 id;

    function setUp() public {
        lease = new Lease();
        vm.prank(lender);
        id = lease.open(operator, agent, TOTAL, 4000, 3000, 5000, 100 ether);
        vm.deal(address(this), 10000 ether);
    }

    function _balance() internal view returns (uint256 b) { (,,,, b,,,,,,) = lease.leases(id); }
    function _rate() internal view returns (uint16 r) { (,,,,, r,,,,,) = lease.leases(id); }

    function testOpenSetsTermsAndTitle() public view {
        (address l, address o, address a, uint256 total, uint256 balance, uint16 rate, uint16 lo, uint16 hi, uint256 monthly, bool frozen, bool owned) = lease.leases(id);
        assertEq(l, lender); assertEq(o, operator); assertEq(a, agent);
        assertEq(total, TOTAL); assertEq(balance, TOTAL);
        assertEq(rate, 4000); assertEq(lo, 3000); assertEq(hi, 5000); assertEq(monthly, 100 ether);
        assertFalse(frozen); assertFalse(owned);
        assertEq(lease.titleOf(id), lender);
        assertEq(lease.lenderOf(id), lender);
        assertEq(lease.nextId(), id + 1);
    }

    function testOpenRejectsRateOutsideBand() public {
        vm.expectRevert("rate outside band");
        lease.open(operator, agent, TOTAL, 2999, 3000, 5000, 0);
        vm.expectRevert("rate outside band");
        lease.open(operator, agent, TOTAL, 5001, 3000, 5000, 0);
    }

    function testPayMovesValueToLender() public {
        uint256 before = lender.balance;
        lease.pay{value: 100 ether}(id);
        assertEq(lender.balance - before, 100 ether);
        assertEq(_balance(), TOTAL - 100 ether);
        assertEq(lease.titleOf(id), lender);
    }

    function testPayOverBalanceReverts() public {
        vm.expectRevert("over balance");
        lease.pay{value: TOTAL + 1}(id);
    }

    function testInstalmentForUsesRateAndCapsAtBalance() public {
        assertEq(lease.instalmentFor(id, 500 ether), 200 ether);
        lease.pay{value: TOTAL - 50 ether}(id);
        assertEq(lease.instalmentFor(id, 500 ether), 50 ether);
    }

    function testTitleTransfersToOperatorAtZero() public {
        lease.pay{value: 400 ether}(id);
        assertEq(lease.titleOf(id), lender);
        vm.expectEmit(true, false, false, true);
        emit Lease.TitleTransferred(id, lender, operator);
        lease.pay{value: 600 ether}(id);
        assertEq(_balance(), 0);
        assertEq(lease.titleOf(id), operator);
        (,,,,,,,,,, bool owned) = lease.leases(id);
        assertTrue(owned);
        assertEq(lease.instalmentFor(id, 500 ether), 0);
    }

    function testFreezeBlocksPayAndUnfreezeRestores() public {
        vm.prank(lender);
        lease.freeze(id, "tampered telemetry");
        assertTrue(lease.isFrozen(id));
        vm.expectRevert("frozen");
        lease.pay{value: 1 ether}(id);
        vm.prank(lender);
        lease.unfreeze(id);
        assertFalse(lease.isFrozen(id));
        lease.pay{value: 1 ether}(id);
        assertEq(_balance(), TOTAL - 1 ether);
    }

    function testOnlyLenderFreezes() public {
        vm.prank(operator);
        vm.expectRevert("lender only");
        lease.freeze(id, "no");
        vm.prank(lender);
        lease.freeze(id, "yes");
        vm.prank(operator);
        vm.expectRevert("lender only");
        lease.unfreeze(id);
    }

    function testSetRateOnlyOperatorInsideBand() public {
        vm.prank(lender);
        vm.expectRevert("operator only");
        lease.setRate(id, 3500);
        vm.prank(operator);
        vm.expectRevert("outside band");
        lease.setRate(id, 5001);
        vm.prank(operator);
        vm.expectRevert("outside band");
        lease.setRate(id, 2999);
        vm.prank(operator);
        lease.setRate(id, 3000);
        assertEq(_rate(), 3000);
        assertEq(lease.instalmentFor(id, 500 ether), 150 ether);
    }
}
