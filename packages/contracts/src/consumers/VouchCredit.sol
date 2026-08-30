// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVouchRegistry} from "../interfaces/IVouchRegistry.sol";
import {IVouchPassport} from "../interfaces/IVouchPassport.sol";
import {FactTypes} from "../core/FactTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title VouchCredit
/// @notice Reference consumer. Prices collateral from proven standing.
///
///         User -> VouchRegistry -> verified facts -> risk tier -> loan terms
///
/// @dev This contract is deliberately NOT the product. It exists to prove that
///      an application can consume Vouch and grant a real benefit, in about
///      twenty lines of integration. It holds no privileged relationship with
///      the registry: it calls the same public view functions any third party
///      would call.
///
///      Ship at least one more consumer alongside this one (a fee tier, an
///      access gate). One consumer makes Vouch look like a lending app that
///      happens to use Attestcoin. Several consumers reading the same registry
///      is the entire thesis: Attestcoin proves the fact, Vouch makes the fact
///      reusable, applications decide what the fact is worth.
///
///      Caps are hard and low on purpose. This is a demo pool, not a market.
contract VouchCredit {
    IVouchRegistry public immutable REGISTRY;
    IVouchPassport public immutable PASSPORT;

    // Collateral requirements in basis points.
    uint16 public constant COLLATERAL_BASELINE_BPS = 15_000; // 150%, unproven
    uint16 public constant COLLATERAL_BRONZE_BPS = 13_000; // 130%
    uint16 public constant COLLATERAL_SILVER_BPS = 11_500; // 115%
    uint16 public constant COLLATERAL_GOLD_BPS = 10_000; // 100%

    /// @dev Floors at 100%. Standing REDUCES collateral; it never eliminates it.
    ///      Negative history is unprovable (absence is not enumerable), so the
    ///      underwriting stays optimistic-but-bounded by construction.
    uint16 public constant COLLATERAL_FLOOR_BPS = 10_000;

    event TermsQuoted(address indexed user, uint8 tier, uint16 collateralBps);

    constructor(address registry_, address passport_) {
        if (registry_ == address(0) || passport_ == address(0)) revert VouchErrors.ZeroAddress();
        REGISTRY = IVouchRegistry(registry_);
        PASSPORT = IVouchPassport(passport_);
    }

    /// @notice The whole integration, in one call.
    function collateralBpsFor(address user) public view returns (uint16) {
        uint8 tier = PASSPORT.tierOf(user);

        if (tier == 3) return COLLATERAL_GOLD_BPS;
        if (tier == 2) return COLLATERAL_SILVER_BPS;
        if (tier == 1) return COLLATERAL_BRONZE_BPS;
        return COLLATERAL_BASELINE_BPS;
    }

    /// @notice Minimum collateral required to borrow `amount`.
    function requiredCollateral(address user, uint256 amount) external view returns (uint256) {
        return (amount * collateralBpsFor(user)) / 10_000;
    }

    /// @notice Illustrates the raw primitive, without the passport abstraction.
    /// @dev This is the twenty-line integration a third party writes:
    ///
    ///        if (IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)) {
    ///            // grant the benefit
    ///        }
    function isEligible(address user) external view returns (bool) {
        return REGISTRY.hasProof(user, FactTypes.AAVE_REPAYMENT);
    }
}
