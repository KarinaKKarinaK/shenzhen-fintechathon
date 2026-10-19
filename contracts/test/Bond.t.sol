// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Bond} from "../src/Bond.sol";
import {IBonded} from "../src/IBonded.sol";

contract BondTest is Test {
    Bond bond;
    uint256 agentKey = 0xA11CE;
    uint256 strangerKey = 0xBAD;
    address agent;
    address operator = address(0xB0B);
    address treasury = address(0x7EA);
    address hunter = address(0x4A7);
    address allowed = address(0x1E4D);

    function setUp() public {
        agent = vm.addr(agentKey);
        bond = new Bond(treasury);
        address[] memory allow = new address[](1); allow[0] = allowed;
        bytes32[] memory fences = new bytes32[](1); fences[0] = keccak256("flat-4b");
        vm.prank(agent);
        bond.register(agent, operator, 40 ether, 120 ether, 15 ether, allow, fences, "");
        bond.fill{value: 50 ether}(agent);
    }

    function _intent(address payee, uint256 amount) internal view returns (IBonded.Intent memory) {
        return IBonded.Intent({ agent: agent, kind: 0, payee: payee, amount: amount, jobId: bytes32(0), geofence: bytes32(0), coverBound: false, confirmed: false, nonce: 1, expiry: block.timestamp + 1 days });
    }

    function _sign(uint256 key, IBonded.Intent memory i) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(bond.INTENT_TYPEHASH(), i.agent, i.kind, i.payee, i.amount, i.jobId, i.geofence, i.coverBound, i.confirmed, i.nonce, i.expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", bond.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function testSlashByProofPaysBounty() public {
        IBonded.Intent memory i = _intent(address(0xdead), 5 ether);
        bytes memory sig = _sign(agentKey, i);
        uint256 before = hunter.balance;
        vm.prank(hunter);
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        (uint256 bal,) = bond.bondOf(agent);
        assertEq(bal, 35 ether);
        assertEq(hunter.balance - before, 7.5 ether);
    }

    function testReplayRejected() public {
        IBonded.Intent memory i = _intent(address(0xdead), 5 ether);
        bytes memory sig = _sign(agentKey, i);
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        vm.expectRevert("proof already used");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    function testNoViolationNoSlash() public {
        IBonded.Intent memory i = _intent(allowed, 5 ether);
        bytes memory sig = _sign(agentKey, i);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    /// The hunter edits the payee after the agent signed. The signature no longer matches the fields.
    function testSlashRejectsForeignEvidence() public {
        IBonded.Intent memory i = _intent(allowed, 5 ether);
        bytes memory sig = _sign(agentKey, i);
        i.payee = address(0xdead);
        vm.expectRevert("not the agent's signature");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        (uint256 bal,) = bond.bondOf(agent);
        assertEq(bal, 50 ether);
    }

    /// A stranger signs an intent naming the agent. The recovered signer is not the agent.
    function testSlashRejectsStrangerSignature() public {
        IBonded.Intent memory i = _intent(address(0xdead), 5 ether);
        bytes memory sig = _sign(strangerKey, i);
        vm.expectRevert("not the agent's signature");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    function testRuleCheckedAgainstSignedFields() public {
        // Over cap is checked on the signed amount, not on evidence the submitter supplies.
        IBonded.Intent memory i = _intent(allowed, 500 ether);
        bytes memory sig = _sign(agentKey, i);
        bond.slashByProof(i, sig, uint8(Bond.Rule.OverCap));
        (uint256 bal,) = bond.bondOf(agent);
        assertEq(bal, 35 ether);
    }

    function testRegisterNeedsAgentConsent() public {
        address other = vm.addr(0xC0DE);
        address[] memory allow = new address[](0);
        bytes32[] memory fences = new bytes32[](0);
        vm.expectRevert("bad signature length");
        bond.register(other, operator, 1 ether, 1 ether, 1 ether, allow, fences, "");
        bytes32 terms = keccak256(abi.encode(operator, uint256(1 ether), uint256(1 ether), uint256(1 ether)));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", terms));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xC0DE, digest);
        bond.register(other, operator, 1 ether, 1 ether, 1 ether, allow, fences, abi.encodePacked(r, s, v));
        (, uint256 minimum) = bond.bondOf(other);
        assertEq(minimum, 1 ether);
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
