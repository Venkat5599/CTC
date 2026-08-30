// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVouchRegistry} from "../interfaces/IVouchRegistry.sol";
import {FactTypes} from "../core/FactTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title VouchFeeTier
/// @notice Second consumer. A DEX prices its taker fee from proven liquidity history.
///
/// @dev The point of this contract is what it does NOT have.
///
///      It has no relationship with VouchCredit. It does not know VouchCredit
///      exists, shares no storage with it, and was not deployed by it. It has no
///      privileged access to the registry either — it calls `proofCount`, the
///      same public view any third party calls. Nobody registered it anywhere.
///
///      And it reads a DIFFERENT fact than VouchCredit does. Credit prices
///      collateral from repayment history; this prices fees from supply history.
///      One registry, two facts, two unrelated applications, zero coordination.
///      That is the difference between a shared primitive and an application
///      that happens to verify proofs.
///
///      Note also what is absent: no snapshot, no merkle drop, no signature from
///      an off-chain scorer, no oracle. The eligibility check is an SLOAD.
contract VouchFeeTier {
    IVouchRegistry public immutable REGISTRY;

    // Taker fee in basis points.
    uint16 public constant FEE_STANDARD_BPS = 30; // 0.30%
    uint16 public constant FEE_PROVEN_BPS = 20; // 0.20%
    uint16 public constant FEE_DEEP_BPS = 10; // 0.10%

    /// @dev Supply events proven, not dollars supplied. Counting events rather
    ///      than value keeps the tier unmanipulable by a single large deposit.
    uint32 public constant DEEP_MIN_SUPPLIES = 5;

    event FeeQuoted(address indexed trader, uint16 feeBps);

    constructor(address registry_) {
        if (registry_ == address(0)) revert VouchErrors.ZeroAddress();
        REGISTRY = IVouchRegistry(registry_);
    }

    /// @notice The entire integration.
    function feeBpsFor(address trader) public view returns (uint16) {
        uint32 supplies = REGISTRY.proofCount(trader, FactTypes.LONG_TERM_LP);

        if (supplies >= DEEP_MIN_SUPPLIES) return FEE_DEEP_BPS;
        if (supplies > 0) return FEE_PROVEN_BPS;
        return FEE_STANDARD_BPS;
    }

    /// @notice Fee owed on a trade of `notional`.
    function feeFor(address trader, uint256 notional) external view returns (uint256) {
        return (notional * feeBpsFor(trader)) / 10_000;
    }

    /// @notice Total value the trader has proven they supplied, in source-token units.
    /// @dev Exposed for display only. Deliberately not used in pricing: value is
    ///      denominated in whatever the source event used, so summing across
    ///      reserves would be summing incompatible units.
    function provenSupplyValue(address trader) external view returns (uint256) {
        return REGISTRY.proofValue(trader, FactTypes.LONG_TERM_LP);
    }
}
