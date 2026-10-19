// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {Bond} from "../src/Bond.sol";
import {IBonded} from "../src/IBonded.sol";

contract BondTest is BaseTest {
    uint256 id;

    function setUp() public override {
        super.setUp();
        id = _post(500 ether, false); // 100 mu at 5 yuan
    }

    function _slash(IBonded.Intent memory i, address who, Bond.Rule rule) internal {
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(who);
        bond.slashByProof(i, sig, uint8(rule));
    }

    // Parties and the log

    /// B.7 test 3: a stranger, neither a party nor a hunter.
    function testStrangerIsNotAParty() public {
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(stranger);
        vm.expectRevert("not a party");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    /// B.7 test 4: the lender can submit proof. A vendor rule on a live job pays the treasury
    /// only, never the submitter and never the pilot.
    function testLenderCanSubmitProofVendorPenaltyGoesToTreasury() public {
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        uint256 lenderBefore = lender.balance;
        uint256 pilotBefore = operator.balance;
        uint256 treasuryBefore = treasury.balance;
        _slash(i, lender, Bond.Rule.PayeeNotAllowlisted);
        assertEq(lender.balance, lenderBefore);
        assertEq(operator.balance, pilotBefore);
        assertEq(treasury.balance - treasuryBefore, PENALTY);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - PENALTY);
    }

    /// The collusion hole: the pilot feeds the agent a fake scam, the policy engine blocks it,
    /// the pilot reports the signed intent. The vendor still pays the penalty, but the pilot
    /// earns nothing from it, so there is no reason to stage one.
    function testPilotReportingVendorRuleEarnsNothing() public {
        uint256 pilotBefore = operator.balance;
        uint256 treasuryBefore = treasury.balance;
        _slash(_pay(address(0xdead), 50 ether, id, 1), operator, Bond.Rule.PayeeNotAllowlisted);
        _slash(_pay(address(0xdead), 50 ether, id, 2), operator, Bond.Rule.PayeeNotAllowlisted);
        assertEq(operator.balance, pilotBefore);
        assertEq(treasury.balance - treasuryBefore, 2 * PENALTY);
    }

    function testEveryPartyCanSubmit() public {
        _slash(_pay(address(0xdead), 50 ether, id, 1), farmer, Bond.Rule.PayeeNotAllowlisted);
        _slash(_pay(address(0xdead), 50 ether, id, 2), operator, Bond.Rule.PayeeNotAllowlisted);
        _slash(_pay(address(0xdead), 50 ether, id, 3), vendor, Bond.Rule.PayeeNotAllowlisted);
        _slash(_pay(address(0xdead), 50 ether, id, 4), lender, Bond.Rule.PayeeNotAllowlisted);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - 4 * PENALTY);
    }

    function testHunterCannotTouchLiveJob() public {
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(hunter);
        vm.expectRevert("not a party");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    /// Bounties exist only for registered hunters on shadow jobs.
    function testHunterEarnsBountyOnShadowJobOnly() public {
        uint256 shadow = _post(500 ether, true);
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, shadow, 1);
        uint256 before = hunter.balance;
        _slash(i, hunter, Bond.Rule.PayeeNotAllowlisted);
        assertEq(hunter.balance - before, PENALTY / 2);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - PENALTY);

        IBonded.Intent memory j = _pay(address(0xdead), 50 ether, shadow, 2);
        bytes memory sig = _sign(agentKey, j);
        _commit(j);
        vm.prank(stranger);
        vm.expectRevert("not a party");
        bond.slashByProof(j, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    // Two bonds

    /// B.7 test 5: vendor rules slash the vendor bond, the pilot bond is unchanged.
    function testPayeeNotAllowlistedSlashesVendorBond() public {
        bond.fill{value: 300 ether}(agent);
        _slash(_pay(address(0xdead), 50 ether, id, 1), farmer, Bond.Rule.PayeeNotAllowlisted);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - PENALTY);
        assertEq(_pilotBond(), 300 ether);
    }

    function testOverCapSlashesVendorBond() public {
        bond.fill{value: 300 ether}(agent);
        _slash(_pay(lender, PER_TX_CAP + 1, id, 1), farmer, Bond.Rule.OverCap);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - PENALTY);
        assertEq(_pilotBond(), 300 ether);
    }

    /// B.7 test 6: pilot rules slash the pilot bond, the vendor bond is unchanged. On a live job
    /// the payout goes to the requester (the farmer) and the treasury.
    function testFalseConfirmationSlashesPilotBond() public {
        bond.fill{value: 300 ether}(agent);
        IBonded.Intent memory i = _intent(3, address(0), 0, _jobId(id), fieldSeven, true, 1);
        uint256 farmerBefore = farmer.balance;
        _slash(i, lender, Bond.Rule.FalseConfirmation);
        assertEq(_pilotBond(), 300 ether - SLASH);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND);
        assertEq(farmer.balance - farmerBefore, SLASH / 2);
    }

    function testOutsideGeofenceSlashesPilotBond() public {
        bond.fill{value: 300 ether}(agent);
        IBonded.Intent memory i = _intent(2, address(0), 0, _jobId(id), keccak256("someone-else's-field"), false, 1);
        _slash(i, farmer, Bond.Rule.OutsideGeofence);
        assertEq(_pilotBond(), 300 ether - SLASH);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND);
    }

    function testPilotSlashCappedAtBalance() public {
        bond.fill{value: 40 ether}(agent);
        IBonded.Intent memory i = _intent(2, address(0), 0, _jobId(id), keccak256("elsewhere"), false, 1);
        _slash(i, farmer, Bond.Rule.OutsideGeofence);
        assertEq(_pilotBond(), 0);
    }

    // Facts come from the board, not from the reporter

    /// B.7 test 7: the farmer's attack. The job is confirmed on the board, so a claim is no violation.
    function testFalseConfirmationOnConfirmedJobIsNoViolation() public {
        vm.prank(agent);
        board.start(id);
        vm.prank(farmer);
        board.confirm(id);
        IBonded.Intent memory i = _intent(3, address(0), 0, _jobId(id), fieldSeven, true, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(farmer);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.FalseConfirmation));
    }

    /// A claim that does not assert confirmation is not a false confirmation.
    function testClaimWithoutAssertionIsNoViolation() public {
        IBonded.Intent memory i = _intent(3, address(0), 0, _jobId(id), fieldSeven, false, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(farmer);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.FalseConfirmation));
    }

    /// B.7 test 8: the intent's geofence equals the job's geofence.
    function testInsideGeofenceIsNoViolation() public {
        IBonded.Intent memory i = _intent(2, address(0), 0, _jobId(id), fieldSeven, false, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(farmer);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.OutsideGeofence));
    }

    // Daily cap

    /// B.7 test 9: vendor penalties stop at the daily cap and resume the next day.
    function testVendorPenaltiesStopAtDailyCapAndResumeNextDay() public {
        uint256 perDay = DAILY_CAP / PENALTY; // 5
        for (uint256 n = 1; n <= perDay; n++) {
            _slash(_pay(address(0xdead), 50 ether, id, n), farmer, Bond.Rule.PayeeNotAllowlisted);
        }
        IBonded.Intent memory extra = _pay(address(0xdead), 50 ether, id, perDay + 1);
        bytes memory sig = _sign(agentKey, extra);
        _commit(extra);
        vm.prank(farmer);
        vm.expectRevert("daily cap reached");
        bond.slashByProof(extra, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - DAILY_CAP);

        vm.warp(block.timestamp + 1 days);
        extra.expiry = block.timestamp + 1 days;
        sig = _sign(agentKey, extra);
        _commit(extra);
        vm.prank(farmer);
        bond.slashByProof(extra, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - DAILY_CAP - PENALTY);
    }

    // Kept from the previous round (B.7 test 10)

    function testReplayRejected() public {
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(farmer);
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        vm.prank(farmer);
        vm.expectRevert("proof already used");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    function testNoViolationNoSlash() public {
        IBonded.Intent memory i = _pay(lender, 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(farmer);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND);
    }

    /// Fuzz: a payment to an allowlisted payee inside the cap is never a violation, whatever the amount.
    function testFuzzInsideCapNeverSlashes(uint256 amount, uint8 nonce) public {
        amount = bound(amount, 1, PER_TX_CAP);
        IBonded.Intent memory i = _pay(lender, amount, id, uint256(nonce) + 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        vm.prank(farmer);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.OverCap));
        vm.prank(farmer);
        vm.expectRevert("no violation");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND);
    }

    /// Fuzz: any amount over the cap slashes the vendor bond by exactly the fixed penalty, once.
    function testFuzzOverCapSlashesExactlyPenalty(uint256 amount) public {
        amount = bound(amount, PER_TX_CAP + 1, 1e30);
        bond.fill{value: 300 ether}(agent);
        _slash(_pay(lender, amount, id, 1), farmer, Bond.Rule.OverCap);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - PENALTY);
        assertEq(_pilotBond(), 300 ether);
    }

    /// Fuzz: no address outside the allowlist can be paid without the vendor bond paying for it.
    function testFuzzUnknownPayeeAlwaysSlashes(address payee) public {
        vm.assume(payee != lender && payee != address(0));
        bond.fill{value: 300 ether}(agent);
        _slash(_pay(payee, 50 ether, id, 1), farmer, Bond.Rule.PayeeNotAllowlisted);
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND - PENALTY);
    }

    /// The reporter edits the payee after the agent signed. The signature no longer matches the fields.
    function testSlashRejectsForeignEvidence() public {
        IBonded.Intent memory i = _pay(lender, 50 ether, id, 1);
        bytes memory sig = _sign(agentKey, i);
        _commit(i);
        i.payee = address(0xdead);
        vm.prank(farmer);
        vm.expectRevert("not the agent's signature");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
        assertEq(bond.vendorBondOf(vendor), VENDOR_BOND);
    }

    /// A stranger signs an intent naming the agent. The recovered signer is not the agent.
    function testSlashRejectsStrangerSignature() public {
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        bytes memory sig = _sign(strangerKey, i);
        _commit(i);
        vm.prank(farmer);
        vm.expectRevert("not the agent's signature");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    function testUnknownAgentRejected() public {
        IBonded.Intent memory i = _pay(address(0xdead), 50 ether, id, 1);
        i.agent = stranger;
        bytes memory sig = _sign(strangerKey, i);
        vm.prank(farmer);
        vm.expectRevert("unknown agent");
        bond.slashByProof(i, sig, uint8(Bond.Rule.PayeeNotAllowlisted));
    }

    function testRegisterNeedsAgentConsent() public {
        address other = vm.addr(0xC0DE);
        address[] memory allow = new address[](0);
        vm.expectRevert("bad signature length");
        bond.register(other, operator, vendor, 1 ether, 1 ether, 1 ether, allow, "");
        bytes32 terms = keccak256(abi.encode(operator, vendor, uint256(1 ether), uint256(1 ether), uint256(1 ether)));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", terms));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xC0DE, digest);
        bond.register(other, operator, vendor, 1 ether, 1 ether, 1 ether, allow, abi.encodePacked(r, s, v));
        (, uint256 minimum) = bond.bondOf(other);
        assertEq(minimum, 1 ether);
        assertEq(bond.vendorOf(other), vendor);
    }

    function testRegisterNeedsAVendorWithABond() public {
        address other = vm.addr(0xC0DE);
        address[] memory allow = new address[](0);
        vm.prank(other);
        vm.expectRevert("unknown vendor");
        bond.register(other, operator, stranger, 1 ether, 1 ether, 1 ether, allow, "");
    }

    function testOnlyOperatorTopsUp() public {
        vm.expectRevert("operator only");
        bond.topUp{value: 1 ether}(agent);
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        bond.topUp{value: 1 ether}(agent);
        assertEq(_pilotBond(), 1 ether);
    }

    function testOnlyOwnerSetsBoardAndHunters() public {
        vm.prank(stranger);
        vm.expectRevert("owner only");
        bond.setHunter(stranger, true);
        vm.expectRevert("board set");
        bond.setBoard(board);
    }

    /// Covers uses the pilot bond plus the floor and ignores the minimum.
    function testCoversUsesFloorNotMinimum() public {
        assertTrue(bond.covers(agent, FLOOR));
        assertFalse(bond.covers(agent, FLOOR + 1));
        bond.fill{value: 100 ether}(agent);
        assertTrue(bond.covers(agent, FLOOR + 100 ether));
        assertFalse(bond.covers(agent, MINIMUM));
    }
}
