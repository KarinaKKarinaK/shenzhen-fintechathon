// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {IBonded} from "../src/IBonded.sol";
import {JobBoard} from "../src/JobBoard.sol";
import {Lease} from "../src/Lease.sol";
import {IntentLogV2, IJobRecord} from "../src/v2/IntentLogV2.sol";
import {BondV2, IJobBoardViewV2} from "../src/v2/BondV2.sol";

/// @dev V2 log and bond on the unchanged JobBoard and Lease. Same rig and units as BaseTest.
contract V2Test is Test {
    IntentLogV2 intentLog;
    BondV2 bond;
    Lease lease;
    JobBoard board;

    uint256 constant FLOOR = 200 ether;
    uint256 constant VENDOR_BOND = 5000 ether;
    uint256 constant PENALTY = 200 ether;
    uint256 constant DAILY_CAP = 1000 ether;
    uint256 constant SLASH = 100 ether;

    uint256 agentKey = 0xA11CE;
    uint256 otherAgentKey = 0xA22CE;
    address agent;
    address otherAgent;
    address operator = address(0xB0B);
    address vendor = address(0x7E7D);
    address lender = address(0x1E7D);
    address farmer = address(0xFA12);
    address treasury = address(0x7EA);
    address rail = address(0x12A1);
    address hunter = address(0x4A7);
    address stranger = address(0x5712);
    address constant ALIEN = address(0xdead);
    bytes32 fieldSeven = keccak256("field-7");
    uint256 leaseId;
    uint256 shadowJob;
    uint256 liveJob;
    uint256 otherJob;   // a job of another registered agent

    function setUp() public {
        agent = vm.addr(agentKey);
        otherAgent = vm.addr(otherAgentKey);
        intentLog = new IntentLogV2();
        bond = new BondV2(treasury, intentLog, FLOOR);
        lease = new Lease();
        board = new JobBoard(bond, lease, rail);
        bond.setBoard(IJobBoardViewV2(address(board)));
        intentLog.setBoard(IJobRecord(address(board)));
        bond.setHunter(hunter, true);

        vm.deal(vendor, VENDOR_BOND);
        vm.prank(vendor);
        bond.postVendorBond{value: VENDOR_BOND}(PENALTY, DAILY_CAP);
        address[] memory allow = new address[](1); allow[0] = lender;
        vm.prank(agent);
        bond.register(agent, operator, vendor, 2000 ether, 1500 ether, SLASH, allow, "");
        vm.prank(otherAgent);
        bond.register(otherAgent, operator, vendor, 2000 ether, 1500 ether, SLASH, allow, "");
        vm.prank(lender);
        leaseId = lease.open(operator, agent, 55000 ether, 4000, 3000, 5000, 0);

        vm.deal(farmer, 100000 ether);
        bond.fill{value: 500 ether}(agent);
        shadowJob = _post(agent, true);
        liveJob = _post(agent, false);
        otherJob = _post(otherAgent, false);
    }

    function _post(address who, bool shadow) internal returns (uint256 id) {
        vm.prank(farmer);
        id = board.post{value: 240 ether}(who, farmer, leaseId, fieldSeven, uint64(block.timestamp), uint64(block.timestamp + 1 days), shadow);
    }

    function _pay(address payee, uint256 id, uint256 nonce) internal view returns (IBonded.Intent memory) {
        return IBonded.Intent({ agent: agent, kind: 0, payee: payee, amount: 5 ether, jobId: bytes32(id), geofence: fieldSeven, confirmed: false, nonce: nonce, expiry: block.timestamp + 1 days });
    }

    function _sign(IBonded.Intent memory i) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentKey, bond.digestOf(i));
        return abi.encodePacked(r, s, v);
    }

    function _commitAs(address who, bytes32 jobId, bytes32 h) internal {
        vm.prank(who);
        intentLog.commit(jobId, h);
    }

    function _rejects(IBonded.Intent memory i, bytes memory sig, BondV2.Rule rule, address who, string memory reason) internal {
        uint256 v0 = bond.vendorBondOf(vendor); (uint256 p0,) = bond.bondOf(agent);
        vm.prank(who);
        vm.expectRevert(bytes(reason));
        bond.slashByProof(i, sig, uint8(rule));
        (uint256 p1,) = bond.bondOf(agent);
        assertEq(bond.vendorBondOf(vendor), v0, "vendor bond moved");
        assertEq(p1, p0, "pilot bond moved");
    }

    // --- the fix ---

    function test_v2_AgentOwnCommitThenSlash() public {
        IBonded.Intent memory i = _pay(ALIEN, liveJob, 1);
        bytes32 h = bond.hashIntent(i);
        _commitAs(agent, i.jobId, h);
        assertGt(intentLog.committedAt(agent, h), 0);
        assertEq(intentLog.jobOf(agent, h), i.jobId);
        uint256 t0 = treasury.balance;
        bytes memory sig = _sign(i);
        vm.prank(lender);
        bond.slashByProof(i, sig, uint8(BondV2.Rule.PayeeNotAllowlisted));
        assertEq(treasury.balance - t0, PENALTY);
    }

    function test_v2_StrangerCannotCommitAgentHash() public {
        IBonded.Intent memory i = _pay(ALIEN, liveJob, 1);
        bytes32 h = bond.hashIntent(i);
        vm.prank(stranger);
        vm.expectRevert(bytes("not the job's agent"));
        intentLog.commit(i.jobId, h);
        assertEq(intentLog.committedAt(stranger, h), 0);
        assertEq(intentLog.committedAt(agent, h), 0);
    }

    function test_v2_CommitToUnknownJobRejected() public {
        vm.prank(agent);
        vm.expectRevert(bytes("not the job's agent"));
        intentLog.commit(bytes32(uint256(999)), keccak256("x"));
    }

    /// Another registered agent commits the real agent's hash under its own job first. That fills
    /// the other agent's slot only: the real agent still commits and the party still slashes.
    function test_v2_FrontRunByOtherAgentDoesNotBlockSlash() public {
        IBonded.Intent memory i = _pay(ALIEN, shadowJob, 1);
        bytes32 h = bond.hashIntent(i);
        _commitAs(otherAgent, bytes32(otherJob), h);
        assertGt(intentLog.committedAt(otherAgent, h), 0);
        assertEq(intentLog.committedAt(agent, h), 0);
        _commitAs(agent, i.jobId, h);
        bytes memory sig = _sign(i);
        vm.prank(hunter);
        bond.slashByProof(i, sig, uint8(BondV2.Rule.PayeeNotAllowlisted));
        assertEq(VENDOR_BOND - bond.vendorBondOf(vendor), PENALTY);
    }

    function test_v2_AgentCannotCommitTwice() public {
        bytes32 h = bond.hashIntent(_pay(ALIEN, liveJob, 1));
        _commitAs(agent, bytes32(liveJob), h);
        vm.prank(agent);
        vm.expectRevert(bytes("already committed"));
        intentLog.commit(bytes32(liveJob), h);
    }

    /// The agent skips the commit on a job it started: the board record plus its signature still slash.
    function test_v2_MissingCommitOnStartedJobStillSlashes() public {
        vm.prank(agent);
        board.start(liveJob);
        IBonded.Intent memory i = _pay(ALIEN, liveJob, 1);
        uint256 t0 = treasury.balance;
        bytes memory sig = _sign(i);
        vm.prank(lender);
        bond.slashByProof(i, sig, uint8(BondV2.Rule.PayeeNotAllowlisted));
        assertEq(treasury.balance - t0, PENALTY);
    }

    /// Same after the job is confirmed (Released): still a live record.
    function test_v2_MissingCommitOnReleasedJobStillSlashes() public {
        vm.prank(agent);
        board.start(liveJob);
        vm.prank(farmer);
        board.confirm(liveJob);
        IBonded.Intent memory i = _pay(ALIEN, liveJob, 1);
        bytes memory sig = _sign(i);
        vm.prank(lender);
        bond.slashByProof(i, sig, uint8(BondV2.Rule.PayeeNotAllowlisted));
        assertEq(VENDOR_BOND - bond.vendorBondOf(vendor), PENALTY);
    }

    // --- v1 attack cases that still hold against V2 ---

    function test_v2_attack47_NeverCommittedJobNeverStarted() public {
        IBonded.Intent memory i = _pay(ALIEN, shadowJob, 1);
        _rejects(i, _sign(i), BondV2.Rule.PayeeNotAllowlisted, hunter, "not in log");
    }

    /// The board fallback needs the job to belong to the signing agent.
    function test_v2_FallbackRejectsOtherAgentsJob() public {
        vm.prank(otherAgent);
        board.start(otherJob);
        IBonded.Intent memory i = _pay(ALIEN, otherJob, 1);
        _rejects(i, _sign(i), BondV2.Rule.PayeeNotAllowlisted, farmer, "not in log");
    }

    function test_v2_attack48_LogEntryForOtherJob() public {
        IBonded.Intent memory i = _pay(ALIEN, shadowJob, 1);
        _commitAs(agent, bytes32(liveJob), bond.hashIntent(i));
        _rejects(i, _sign(i), BondV2.Rule.PayeeNotAllowlisted, hunter, "not in log");
    }

    function test_v2_attack14_ReplayOfUsedProof() public {
        IBonded.Intent memory i = _pay(ALIEN, shadowJob, 1);
        _commitAs(agent, i.jobId, bond.hashIntent(i));
        bytes memory sig = _sign(i);
        vm.prank(hunter);
        bond.slashByProof(i, sig, uint8(BondV2.Rule.PayeeNotAllowlisted));
        _rejects(i, sig, BondV2.Rule.PayeeNotAllowlisted, hunter, "proof already used");
    }

    function test_v2_attack39_ProofWithNoViolation() public {
        IBonded.Intent memory i = _pay(lender, shadowJob, 1);
        _commitAs(agent, i.jobId, bond.hashIntent(i));
        _rejects(i, _sign(i), BondV2.Rule.OutsideGeofence, hunter, "no violation");
    }

    function test_v2_attack40_PayeeEditedAfterSigning() public {
        IBonded.Intent memory i = _pay(lender, shadowJob, 1);
        _commitAs(agent, i.jobId, bond.hashIntent(i));
        bytes memory sig = _sign(i);
        i.payee = ALIEN;
        _rejects(i, sig, BondV2.Rule.PayeeNotAllowlisted, hunter, "not the agent's signature");
    }

    function test_v2_attack49_StrangerOnLiveJob() public {
        IBonded.Intent memory i = _pay(ALIEN, liveJob, 1);
        _commitAs(agent, i.jobId, bond.hashIntent(i));
        _rejects(i, _sign(i), BondV2.Rule.PayeeNotAllowlisted, stranger, "not a party");
    }

    function test_v2_attack50_HunterOnLiveJob() public {
        IBonded.Intent memory i = _pay(ALIEN, liveJob, 1);
        _commitAs(agent, i.jobId, bond.hashIntent(i));
        _rejects(i, _sign(i), BondV2.Rule.PayeeNotAllowlisted, hunter, "not a party");
    }

    function test_v2_SetBoardOnceOwnerOnly() public {
        vm.expectRevert(bytes("board set"));
        intentLog.setBoard(IJobRecord(address(board)));
        IntentLogV2 fresh = new IntentLogV2();
        vm.prank(stranger);
        vm.expectRevert(bytes("owner only"));
        fresh.setBoard(IJobRecord(address(board)));
    }
}
