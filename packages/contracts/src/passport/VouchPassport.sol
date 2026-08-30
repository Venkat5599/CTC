// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVouchRegistry} from "../interfaces/IVouchRegistry.sol";
import {IVouchPassport} from "../interfaces/IVouchPassport.sol";
import {VouchTypes} from "../core/VouchTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";
import {FactTypes} from "../core/FactTypes.sol";

/// @title VouchPassport
/// @notice Human-facing aggregation over VouchRegistry.
///
/// @dev The registry is the protocol; the passport is the user experience.
///      This contract holds NO state of its own. It is a pure function of the
///      registry, which is why monotonicity is structural rather than a
///      convention someone has to remember:
///
///        - the registry is append-only (no fact is ever removed or decremented)
///        - the passport reads only the registry
///        - therefore no sequence of operations can lower a tier
///
///      THE HONEST LIMITATION. Inclusion proofs prove POSITIVE facts only.
///      Vouch can prove "this address repaid". It cannot prove "this address
///      was never liquidated", because absence of an event is not enumerable.
///      So an unproven address is UNKNOWN, never CLEAN, and a consumer must
///      never read a low tier as evidence of bad behaviour. This is a
///      correctness property of the whole design, not a disclaimer.
contract VouchPassport is IVouchPassport {
    IVouchRegistry public immutable REGISTRY;

    // Tier thresholds, expressed in proven repayment count.
    // Deliberately simple: every input must be auditable by a judge reading
    // the source. Sophistication here would be a liability.
    uint32 public constant BRONZE_MIN_PROOFS = 1;
    uint32 public constant SILVER_MIN_PROOFS = 5;
    uint32 public constant GOLD_MIN_PROOFS = 12;

    uint8 public constant TIER_NONE = 0;
    uint8 public constant TIER_BRONZE = 1;
    uint8 public constant TIER_SILVER = 2;
    uint8 public constant TIER_GOLD = 3;

    constructor(address registry_) {
        if (registry_ == address(0)) revert VouchErrors.ZeroAddress();
        REGISTRY = IVouchRegistry(registry_);
    }

    function passportOf(address user) external view override returns (VouchTypes.Passport memory) {
        return VouchTypes.Passport({
            totalProofs: REGISTRY.totalProofs(user),
            earliestFact: REGISTRY.firstSeen(user),
            latestFact: REGISTRY.lastSeen(user),
            tier: tierOf(user)
        });
    }

    /// @notice Tier derived from proven facts only.
    /// @dev Monotonic: proofCount can only rise, so tier can only rise.
    function tierOf(address user) public view override returns (uint8) {
        uint32 repayments = REGISTRY.proofCount(user, FactTypes.AAVE_REPAYMENT);

        if (repayments >= GOLD_MIN_PROOFS) return TIER_GOLD;
        if (repayments >= SILVER_MIN_PROOFS) return TIER_SILVER;
        if (repayments >= BRONZE_MIN_PROOFS) return TIER_BRONZE;
        return TIER_NONE;
    }

    /// @notice Tenure in source-chain blocks between the earliest and latest proven fact.
    /// @dev Zero when fewer than two facts are proven. Not a claim about account
    ///      age, only about the span Vouch can actually prove.
    function provenTenureBlocks(address user) external view returns (uint64) {
        uint64 first = REGISTRY.firstSeen(user);
        uint64 last = REGISTRY.lastSeen(user);
        if (first == 0 || last <= first) return 0;
        return last - first;
    }
}
