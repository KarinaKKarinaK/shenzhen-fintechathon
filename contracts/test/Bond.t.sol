// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Bond} from "../src/Bond.sol";

contract BondTest is Test {
    Bond bond;
    uint256 agentKey = 0xA11CE;
    address agent;
    address operator = address(0xB0B);
    address treasury = address(0x7EA);
    address hunter = address(0x4A7);

    function setUp() public {
        agent = vm.addr(agentKey);
        bond = new Bond(treasury);
        address[] memory allow = new address[](1); allow[0] = address(0x1E4D);
        bytes32[] memory fences = new bytes32[](1); fences[0] = keccak256("flat-4b");
        vm.prank(operator);
        bond.register(agent, 40 ether, 120 ether, 15 ether, allow, fences);
        bond.fill{value: 50 ether}(agent);
    }

    function _sign(bytes32 h) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", h));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function testSlashByProofPaysBounty() public {
        bytes32 intent = keccak256("pay 5 to 0xdead");
        bytes memory sig = _sign(intent);
        bytes memory evidence = abi.encode(address(0xdead), uint256(5 ether));
        uint256 before = hunter.balance;
        vm.prank(hunter);
        bond.slashByProof(agent, intent, sig, uint8(Bond.Rule.PayeeNotAllowlisted), evidence);
        (uint256 bal,) = bond.bondOf(agent);
        assertEq(bal, 35 ether);
        assertEq(hunter.balance - before, 7.5 ether);
    }

    function testProofCannotBeReplayed() public {
        bytes32 intent = keccak256("pay 5 to 0xdead");
        bytes memory sig = _sign(intent);
        bytes memory evidence = abi.encode(address(0xdead), uint256(5 ether));
        bond.slashByProof(agent, intent, sig, uint8(Bond.Rule.PayeeNotAllowlisted), evidence);
        vm.expectRevert("proof already used");
        bond.slashByProof(agent, intent, sig, uint8(Bond.Rule.PayeeNotAllowlisted), evidence);
    }

    function testNoViolationNoSlash() public {
        bytes32 intent = keccak256("pay 5 to allowlisted");
        bytes memory sig = _sign(intent);
        bytes memory evidence = abi.encode(address(0x1E4D), uint256(5 ether));
        vm.expectRevert("no violation");
        bond.slashByProof(agent, intent, sig, uint8(Bond.Rule.PayeeNotAllowlisted), evidence);
    }

    function testOnlyOperatorTopsUp() public {
        vm.expectRevert("operator only");
        bond.topUp{value: 1 ether}(agent);
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        bond.topUp{value: 1 ether}(agent);
        (uint256 bal,) = bond.bondOf(agent);
        assertEq(bal, 51 ether);
    }

    function testCoversWorstCase() public view {
        assertTrue(bond.covers(agent, 30 ether));
        assertFalse(bond.covers(agent, 60 ether));
    }
}
