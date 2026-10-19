// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev What the job board needs from the lease: the instalment for a fee, whether it is frozen,
///      who the lender is, and a way to pay.
interface ILease {
    function instalmentFor(uint256 id, uint256 fee) external view returns (uint256);
    function isFrozen(uint256 id) external view returns (bool);
    function lenderOf(uint256 id) external view returns (address);
    function pay(uint256 id) external payable;
}

/// @title Lease
/// @notice Hire purchase for a machine. Instalments arrive from the job board per unit of work,
///         the balance ticks down, and the title (an ERC-721 style token id) moves to the operator at zero.
contract Lease is ILease {
    struct Terms {
        address lender;
        address operator;
        address agent;
        uint256 total;
        uint256 balance;
        uint16 rateBps;        // instalment share of each fee, inside a band the operator signed
        uint16 bandLoBps;
        uint16 bandHiBps;
        uint256 monthlyMinimum;
        bool frozen;
        bool owned;
    }

    mapping(uint256 => Terms) public leases;
    mapping(uint256 => address) public titleOf; // machine id to current owner
    uint256 public nextId = 1;

    event Opened(uint256 indexed id, address lender, address operator, address agent, uint256 total, uint16 rateBps);
    event Instalment(uint256 indexed id, uint256 amount, uint256 balance);
    event Frozen(uint256 indexed id, string reason);
    event Unfrozen(uint256 indexed id);
    event TitleTransferred(uint256 indexed id, address from, address to);

    function open(address operator, address agent, uint256 total, uint16 rateBps, uint16 bandLoBps, uint16 bandHiBps, uint256 monthlyMinimum) external returns (uint256 id) {
        require(rateBps >= bandLoBps && rateBps <= bandHiBps, "rate outside band");
        id = nextId++;
        leases[id] = Terms(msg.sender, operator, agent, total, total, rateBps, bandLoBps, bandHiBps, monthlyMinimum, false, false);
        titleOf[id] = msg.sender;
        emit Opened(id, msg.sender, operator, agent, total, rateBps);
    }

    function instalmentFor(uint256 id, uint256 fee) public view override returns (uint256) {
        Terms storage t = leases[id];
        uint256 inst = (fee * t.rateBps) / 10_000;
        return inst > t.balance ? t.balance : inst;
    }

    function isFrozen(uint256 id) external view override returns (bool) { return leases[id].frozen; }

    function lenderOf(uint256 id) external view override returns (address) { return leases[id].lender; }

    /// @notice Called with value from the job board on every released fee.
    function pay(uint256 id) external payable override {
        Terms storage t = leases[id];
        require(!t.frozen, "frozen");
        require(msg.value <= t.balance, "over balance");
        t.balance -= msg.value;
        (bool ok,) = t.lender.call{value: msg.value}("");
        require(ok, "transfer failed");
        emit Instalment(id, msg.value, t.balance);
        if (t.balance == 0 && !t.owned) {
            t.owned = true;
            address from = titleOf[id];
            titleOf[id] = t.operator;
            emit TitleTransferred(id, from, t.operator);
        }
    }

    /// @notice The lender freezes on tampered data or a slash it read from the bond contract.
    function freeze(uint256 id, string calldata reason) external { Terms storage t = leases[id]; require(msg.sender == t.lender, "lender only"); t.frozen = true; emit Frozen(id, reason); }
    function unfreeze(uint256 id) external { Terms storage t = leases[id]; require(msg.sender == t.lender, "lender only"); t.frozen = false; emit Unfrozen(id); }

    /// @notice Only the operator's hardware key can move the rate inside the band.
    function setRate(uint256 id, uint16 rateBps) external {
        Terms storage t = leases[id];
        require(msg.sender == t.operator, "operator only");
        require(rateBps >= t.bandLoBps && rateBps <= t.bandHiBps, "outside band");
        t.rateBps = rateBps;
    }
}
