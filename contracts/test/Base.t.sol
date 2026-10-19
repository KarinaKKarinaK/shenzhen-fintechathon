// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Bond} from "../src/Bond.sol";
import {IBonded} from "../src/IBonded.sol";
import {IntentLog} from "../src/IntentLog.sol";
import {JobBoard} from "../src/JobBoard.sol";
import {Lease} from "../src/Lease.sol";

/// @dev Shared setup. Demo units: 1 ether is 1 yuan. A 55,000 yuan drone, a 200 yuan starting
///      floor, a 5,000 yuan vendor bond with a 200 yuan penalty and a 1,000 yuan daily cap.
///      Jobs of 20 to 150 mu at 3 to 15 yuan per mu, so fees of 60 to 2,250 yuan.
abstract contract BaseTest is Test {
    IntentLog log;
    Bond bond;
    Lease lease;
    JobBoard board;

    uint256 constant FLOOR = 200 ether;
    uint256 constant VENDOR_BOND = 5000 ether;
    uint256 constant PENALTY = 200 ether;
    uint256 constant DAILY_CAP = 1000 ether;
    uint256 constant MINIMUM = 2000 ether;
    uint256 constant PER_TX_CAP = 1500 ether;
    uint256 constant SLASH = 100 ether;
    uint256 constant DRONE = 55000 ether;

    uint256 agentKey = 0xA11CE;
    uint256 strangerKey = 0xBAD;
    address agent;
    address operator = address(0xB0B);     // the pilot
    address vendor = address(0x7E7D);
    address lender = address(0x1E7D);
    address farmer = address(0xFA12);      // requester and verifier
    address treasury = address(0x7EA);
    address rail = address(0x12A1);
    address hunter = address(0x4A7);
    address stranger = address(0x5712);
    bytes32 fieldSeven = keccak256("field-7");
    uint256 leaseId;

    function setUp() public virtual {
        agent = vm.addr(agentKey);
        log = new IntentLog();
        bond = new Bond(treasury, log, FLOOR);
        lease = new Lease();
        board = new JobBoard(bond, lease, rail);
        bond.setBoard(board);
        bond.setHunter(hunter, true);

        vm.deal(vendor, VENDOR_BOND);
        vm.prank(vendor);
        bond.postVendorBond{value: VENDOR_BOND}(PENALTY, DAILY_CAP);

        address[] memory allow = new address[](1); allow[0] = lender;
        vm.prank(agent);
        bond.register(agent, operator, vendor, MINIMUM, PER_TX_CAP, SLASH, allow, "");

        vm.prank(lender);
        leaseId = lease.open(operator, agent, DRONE, 4000, 3000, 5000, 0);

        vm.deal(farmer, 100000 ether);
    }

    function _post(uint256 fee, bool shadow) internal returns (uint256 id) {
        vm.prank(farmer);
        id = board.post{value: fee}(agent, farmer, leaseId, fieldSeven, uint64(block.timestamp), uint64(block.timestamp + 1 days), shadow);
    }

    function _jobId(uint256 id) internal pure returns (bytes32) { return bytes32(id); }

    function _intent(uint8 kind, address payee, uint256 amount, bytes32 jobId, bytes32 geofence, bool confirmed, uint256 nonce) internal view returns (IBonded.Intent memory) {
        return IBonded.Intent({ agent: agent, kind: kind, payee: payee, amount: amount, jobId: jobId, geofence: geofence, confirmed: confirmed, nonce: nonce, expiry: block.timestamp + 1 days });
    }

    function _pay(address payee, uint256 amount, uint256 id, uint256 nonce) internal view returns (IBonded.Intent memory) {
        return _intent(0, payee, amount, _jobId(id), fieldSeven, false, nonce);
    }

    function _hash(IBonded.Intent memory i) internal view returns (bytes32) {
        return keccak256(abi.encode(bond.INTENT_TYPEHASH(), i.agent, i.kind, i.payee, i.amount, i.jobId, i.geofence, i.confirmed, i.nonce, i.expiry));
    }

    function _sign(uint256 key, IBonded.Intent memory i) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", bond.DOMAIN_SEPARATOR(), _hash(i)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _commit(IBonded.Intent memory i) internal {
        vm.prank(agent);
        log.commit(i.jobId, _hash(i));
    }

    function _pilotBond() internal view returns (uint256 bal) { (bal,) = bond.bondOf(agent); }
}
