// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {Bond} from "../src/Bond.sol";
import {IBonded} from "../src/IBonded.sol";

/// @dev The contract layer cases of web/src/engine/attacks.ts (ids 14 and 39 to 52), run against
///      the real Solidity contracts instead of the TypeScript mirrors. Same rig as the mirror: a
///      shadow job and a live job of 240 yuan on the same field, a registered hunter, a pilot bond
///      of 500 and a vendor bond of 5,000 with a 200 penalty and a 1,000 daily cap.
contract AttacksTest is BaseTest {
    uint256 shadowJob;
    uint256 liveJob;
    address constant ALIEN = address(0xdead);

    function setUp() public override {
        super.setUp();
        bond.fill{value: 500 ether}(agent);
        shadowJob = _post(240 ether, true);
        liveJob = _post(240 ether, false);
    }

    function _signed(IBonded.Intent memory i) internal view returns (bytes memory) { return _sign(agentKey, i); }

    function _bonds() internal view returns (uint256 pilot, uint256 vendorBal) { pilot = _pilotBond(); vendorBal = bond.vendorBondOf(vendor); }

    /// The proof must revert with `reason` and neither bond may move.
    function _rejects(IBonded.Intent memory i, bytes memory sig, Bond.Rule rule, address who, string memory reason) internal {
        (uint256 p0, uint256 v0) = _bonds();
        vm.prank(who);
        vm.expectRevert(bytes(reason));
        bond.slashByProof(i, sig, uint8(rule));
        (uint256 p1, uint256 v1) = _bonds();
        assertEq(p1, p0, "pilot bond moved");
        assertEq(v1, v0, "vendor bond moved");
    }

    function _slash(IBonded.Intent memory i, Bond.Rule rule, address who) internal {
        bytes memory sig = _signed(i);
        _commit(i);
        vm.prank(who);
        bond.slashByProof(i, sig, uint8(rule));
    }

    // 14: replay of an intent already used as proof
    function test_attack14_ReplayOfUsedProof() public {
        IBonded.Intent memory i = _pay(ALIEN, 5 ether, shadowJob, 1);
        bytes memory sig = _signed(i);
        _commit(i);
        vm.prank(hunter);
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        _rejects(i, sig, Bond.Rule.PayeeNotAllowlisted, hunter, "proof already used");
    }

    // 39: proof for an intent that breaks no rule
    function test_attack39_ProofWithNoViolation() public {
        IBonded.Intent memory i = _pay(lender, 5 ether, shadowJob, 1);
        bytes memory sig = _signed(i);
        _commit(i);
        _rejects(i, sig, Bond.Rule.PayeeNotAllowlisted, hunter, "no violation");
    }

    // 40: payee edited after signing
    function test_attack40_PayeeEditedAfterSigning() public {
        IBonded.Intent memory good = _pay(lender, 5 ether, shadowJob, 1);
        bytes memory sig = _signed(good);
        _commit(good);
        IBonded.Intent memory edited = _pay(ALIEN, 5 ether, shadowJob, 1); // same intent, payee swapped
        _rejects(edited, sig, Bond.Rule.PayeeNotAllowlisted, hunter, "not the agent's signature");
    }

    // 41: payment off the allowlist, the vendor bond pays, the pilot bond does not
    function test_attack41_OffAllowlistSlashesVendorOnly() public {
        (uint256 p0, uint256 v0) = _bonds();
        uint256 h0 = hunter.balance;
        _slash(_pay(ALIEN, 5 ether, shadowJob, 1), Bond.Rule.PayeeNotAllowlisted, hunter);
        (uint256 p1, uint256 v1) = _bonds();
        assertEq(v0 - v1, PENALTY);
        assertEq(p1, p0);
        assertEq(hunter.balance - h0, PENALTY / 2); // shadow job: bounty
    }

    // 42: payment over the per transaction cap, the vendor bond pays
    function test_attack42_OverCapSlashesVendorOnly() public {
        (uint256 p0, uint256 v0) = _bonds();
        _slash(_pay(lender, 1500 ether + 1, shadowJob, 1), Bond.Rule.OverCap, hunter);
        (uint256 p1, uint256 v1) = _bonds();
        assertEq(v0 - v1, PENALTY);
        assertEq(p1, p0);
    }

    // 43: claimed confirmation the board does not show, the pilot bond pays
    function test_attack43_FalseConfirmationSlashesPilotOnly() public {
        (uint256 p0, uint256 v0) = _bonds();
        uint256 h0 = hunter.balance;
        _slash(_intent(3, address(0), 0, _jobId(shadowJob), fieldSeven, true, 1), Bond.Rule.FalseConfirmation, hunter);
        (uint256 p1, uint256 v1) = _bonds();
        assertEq(p0 - p1, SLASH);
        assertEq(v1, v0);
        assertEq(hunter.balance - h0, SLASH / 2);
    }

    // 44: task started outside the job's field, the pilot bond pays
    function test_attack44_OutsideGeofenceSlashesPilotOnly() public {
        (uint256 p0, uint256 v0) = _bonds();
        _slash(_intent(2, address(0), 0, _jobId(shadowJob), keccak256("field-west"), false, 1), Bond.Rule.OutsideGeofence, hunter);
        (uint256 p1, uint256 v1) = _bonds();
        assertEq(p0 - p1, SLASH);
        assertEq(v1, v0);
    }

    // 45: farmer claims a confirmed job was not confirmed; the board says it was
    function test_attack45_FarmerDeniesConfirmedJob() public {
        vm.prank(agent);
        board.start(liveJob);
        vm.prank(farmer);
        board.confirm(liveJob);
        IBonded.Intent memory i = _intent(3, address(0), 0, _jobId(liveJob), fieldSeven, true, 1);
        bytes memory sig = _signed(i);
        _commit(i);
        _rejects(i, sig, Bond.Rule.FalseConfirmation, farmer, "no violation");
    }

    // 46: geofence proof on a task inside the job's own field
    function test_attack46_GeofenceProofInsideOwnField() public {
        IBonded.Intent memory i = _intent(2, address(0), 0, _jobId(shadowJob), fieldSeven, false, 1);
        bytes memory sig = _signed(i);
        _commit(i);
        _rejects(i, sig, Bond.Rule.OutsideGeofence, hunter, "no violation");
    }

    // 47: proof for an intent never committed to the log
    function test_attack47_NeverCommitted() public {
        IBonded.Intent memory i = _pay(ALIEN, 5 ether, shadowJob, 1);
        _rejects(i, _signed(i), Bond.Rule.PayeeNotAllowlisted, hunter, "not in log");
    }

    // 48: the log entry belongs to a different job
    function test_attack48_LogEntryForOtherJob() public {
        IBonded.Intent memory i = _pay(ALIEN, 5 ether, shadowJob, 1);
        vm.prank(agent);
        intentLog.commit(_jobId(liveJob), _hash(i));
        _rejects(i, _signed(i), Bond.Rule.PayeeNotAllowlisted, hunter, "not in log");
    }

    // 49: a stranger submits proof on a live job
    function test_attack49_StrangerOnLiveJob() public {
        IBonded.Intent memory i = _pay(ALIEN, 5 ether, liveJob, 1);
        bytes memory sig = _signed(i);
        _commit(i);
        _rejects(i, sig, Bond.Rule.PayeeNotAllowlisted, stranger, "not a party");
    }

    // 50: a hunter tries to collect a bounty on a live job
    function test_attack50_HunterOnLiveJob() public {
        IBonded.Intent memory i = _pay(ALIEN, 5 ether, liveJob, 1);
        bytes memory sig = _signed(i);
        _commit(i);
        _rejects(i, sig, Bond.Rule.PayeeNotAllowlisted, hunter, "not a party");
    }

    // 51: the lender proves a vendor violation on a live job: all to the treasury, nothing to the pilot
    function test_attack51_LenderLiveVendorRuleAllToTreasury() public {
        (uint256 p0, uint256 v0) = _bonds();
        uint256 t0 = treasury.balance; uint256 l0 = lender.balance; uint256 o0 = operator.balance;
        _slash(_pay(ALIEN, 5 ether, liveJob, 1), Bond.Rule.PayeeNotAllowlisted, lender);
        (uint256 p1, uint256 v1) = _bonds();
        assertEq(v0 - v1, PENALTY);
        assertEq(p1, p0);
        assertEq(treasury.balance - t0, PENALTY);
        assertEq(lender.balance, l0);
        assertEq(operator.balance, o0);
    }

    // 52: six agent violations in a day, the vendor daily cap stops the sixth
    function test_attack52_VendorDailyCapStopsSixth() public {
        for (uint256 n = 1; n <= 5; n++) _slash(_pay(ALIEN, 5 ether, shadowJob, n), Bond.Rule.PayeeNotAllowlisted, hunter);
        IBonded.Intent memory sixth = _pay(ALIEN, 5 ether, shadowJob, 6);
        bytes memory sig = _signed(sixth);
        _commit(sixth);
        _rejects(sixth, sig, Bond.Rule.PayeeNotAllowlisted, hunter, "daily cap reached");
        assertEq(VENDOR_BOND - bond.vendorBondOf(vendor), DAILY_CAP);
    }
}
