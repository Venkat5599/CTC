// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTestBase} from "./helpers/VouchTestBase.sol";
import {ReceiptBuilder} from "./helpers/ReceiptBuilder.sol";

import {FactTypes, EventSignatures} from "../src/core/FactTypes.sol";
import {VouchPassport} from "../src/passport/VouchPassport.sol";
import {VouchCredit} from "../src/consumers/VouchCredit.sol";
import {VouchFeeTier} from "../src/consumers/VouchFeeTier.sol";
import {VouchAccess} from "../src/consumers/VouchAccess.sol";

/// @title ConsumersTest
/// @notice The claim the whole submission rests on: several unrelated
///         applications reading one registry, none of them aware of the others.
///
/// @dev CrossCredit and Spark both demonstrate cross-chain credit. Neither is a
///      shared layer. The difference is not rhetorical and it is testable, so it
///      is tested here rather than argued in a README.
contract ConsumersTest is VouchTestBase {
    VouchPassport internal passport;
    VouchCredit internal credit;
    VouchFeeTier internal feeTier;
    VouchAccess internal accessGate;

    function setUp() public override {
        super.setUp();

        passport = new VouchPassport(address(registry));
        credit = new VouchCredit(address(registry), address(passport));
        feeTier = new VouchFeeTier(address(registry));
        accessGate = new VouchAccess(address(registry), FactTypes.AAVE_REPAYMENT, 1);
    }

    // =====================================================================
    // The thesis
    // =====================================================================

    /// @notice ONE proven repayment, THREE different benefits, from three
    ///         contracts that do not know each other exists.
    /// @dev Note what does not appear in this test: no registration step, no
    ///      approval, no call from any consumer to any other, no shared storage.
    ///      Each contract was handed the registry address at construction and
    ///      that is the entire coupling.
    function test_oneFactThreeUnrelatedConsumers() public {
        // Before: every consumer sees an unproven address.
        assertEq(credit.collateralBpsFor(ALICE), credit.COLLATERAL_BASELINE_BPS(), "150% collateral");
        assertEq(feeTier.feeBpsFor(ALICE), feeTier.FEE_STANDARD_BPS(), "0.30% fee");
        assertFalse(accessGate.isAdmitted(ALICE), "gate closed");

        // One real Aave repayment, proven once.
        _submit(_repayClaim(ALICE, 5_000e6, 25_000_000, keccak256("thesis")));

        // After: three benefits, from one SLOAD each.
        assertEq(credit.collateralBpsFor(ALICE), credit.COLLATERAL_BRONZE_BPS(), "130% collateral");
        assertTrue(accessGate.isAdmitted(ALICE), "gate open");

        // And the DEX is unmoved, because it prices a DIFFERENT fact. A registry
        // that leaked standing across fact types would fail right here.
        assertEq(feeTier.feeBpsFor(ALICE), feeTier.FEE_STANDARD_BPS(), "repayment is not liquidity");

        // Prove the liquidity fact too, and the third benefit lands.
        _submitSupply(ALICE, 20_000e6, 25_100_000, keccak256("thesis-lp"));
        assertEq(feeTier.feeBpsFor(ALICE), feeTier.FEE_PROVEN_BPS(), "0.20% fee");
    }

    /// @notice The consumers share no state and cannot influence one another.
    function test_consumersAreMutuallyIgnorant() public {
        _submit(_repayClaim(ALICE, 1_000e6, 25_200_000, keccak256("ignorant")));

        vm.prank(ALICE);
        accessGate.claim();

        assertTrue(accessGate.hasClaimed(ALICE), "gate consumed");
        assertEq(credit.collateralBpsFor(ALICE), credit.COLLATERAL_BRONZE_BPS(), "credit unaffected by the claim");
        assertTrue(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "the fact itself is untouched");
    }

    /// @notice A fourth consumer needs no permission and no registration.
    /// @dev Deployed after the fact was already proven, wired to nothing, and it
    ///      reads the same standing immediately. This is what "primitive" means
    ///      operationally: the registry does not know its consumers.
    function test_aConsumerDeployedAfterTheFactStillReadsIt() public {
        _submit(_repayClaim(BOB, 3_000e6, 25_300_000, keccak256("late")));

        VouchAccess latecomer = new VouchAccess(address(registry), FactTypes.AAVE_REPAYMENT, 1);

        assertTrue(latecomer.isAdmitted(BOB), "no registration required");
        vm.prank(BOB);
        latecomer.claim();
        assertTrue(latecomer.hasClaimed(BOB));
    }

    // =====================================================================
    // VouchCredit
    // =====================================================================

    function test_collateralFallsAsStandingRises() public {
        assertEq(credit.requiredCollateral(ALICE, 10_000e6), 15_000e6, "150% of 10k");

        _proveRepayments(ALICE, 1, 26_000_000);
        assertEq(credit.requiredCollateral(ALICE, 10_000e6), 13_000e6);

        _proveRepayments(ALICE, 4, 26_100_000);
        assertEq(credit.requiredCollateral(ALICE, 10_000e6), 11_500e6);

        _proveRepayments(ALICE, 7, 26_200_000);
        assertEq(credit.requiredCollateral(ALICE, 10_000e6), 10_000e6);
    }

    /// @dev Standing reduces collateral; it never eliminates it. Negative history
    ///      is unprovable, so the underwriting has to stay bounded no matter how
    ///      much positive history accumulates.
    function test_collateralNeverFallsBelowTheFloor() public {
        _proveRepayments(ALICE, 40, 27_000_000);

        assertEq(credit.collateralBpsFor(ALICE), credit.COLLATERAL_FLOOR_BPS(), "floors at 100%");
        assertEq(credit.requiredCollateral(ALICE, 1_000e6), 1_000e6);
    }

    function test_isEligibleReflectsTheRawPrimitive() public {
        assertFalse(credit.isEligible(ALICE));
        _submit(_repayClaim(ALICE, 1e6, 28_000_000, keccak256("elig")));
        assertTrue(credit.isEligible(ALICE));
    }

    // =====================================================================
    // VouchFeeTier
    // =====================================================================

    function test_feeFallsWithProvenSupplyHistory() public {
        assertEq(feeTier.feeFor(ALICE, 100_000e6), 300e6, "0.30%");

        _proveSupplies(ALICE, 1, 29_000_000);
        assertEq(feeTier.feeBpsFor(ALICE), feeTier.FEE_PROVEN_BPS());
        assertEq(feeTier.feeFor(ALICE, 100_000e6), 200e6, "0.20%");

        _proveSupplies(ALICE, 4, 29_100_000);
        assertEq(feeTier.feeBpsFor(ALICE), feeTier.FEE_DEEP_BPS());
        assertEq(feeTier.feeFor(ALICE, 100_000e6), 100e6, "0.10%");
    }

    /// @dev Counting events rather than value is what stops one whale deposit
    ///      buying the deepest tier.
    function test_oneLargeSupplyDoesNotBuyTheDeepestTier() public {
        _submitSupply(ALICE, 100_000_000e6, 29_200_000, keccak256("whale"));

        assertEq(feeTier.feeBpsFor(ALICE), feeTier.FEE_PROVEN_BPS(), "size alone is not history");
        assertEq(feeTier.provenSupplyValue(ALICE), 100_000_000e6, "value is still reported");
    }

    // =====================================================================
    // VouchAccess
    // =====================================================================

    function test_gateRejectsUnprovenAddress() public {
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(VouchAccess.NotAdmitted.selector, ALICE, FactTypes.AAVE_REPAYMENT)
        );
        accessGate.claim();
    }

    function test_gateCannotBeClaimedTwice() public {
        _submit(_repayClaim(ALICE, 1e6, 30_000_000, keccak256("twice")));

        vm.prank(ALICE);
        accessGate.claim();

        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(VouchAccess.AlreadyClaimed.selector, ALICE));
        accessGate.claim();
    }

    /// @dev The gate is configured, not coded. A different application is a
    ///      different constructor argument, not a different contract.
    function test_gateIsConfiguredByFactTypeAndThreshold() public {
        VouchAccess lpGate = new VouchAccess(address(registry), FactTypes.LONG_TERM_LP, 3);

        _proveSupplies(ALICE, 2, 31_000_000);
        assertFalse(lpGate.isAdmitted(ALICE), "two of three is not enough");

        _proveSupplies(ALICE, 1, 31_100_000);
        assertTrue(lpGate.isAdmitted(ALICE));

        assertFalse(lpGate.isAdmitted(BOB));
    }

    /// @dev Once admitted, always admitted — there is no de-listing path in the
    ///      registry for a gate to inherit.
    function test_admissionIsPermanent() public {
        _submit(_repayClaim(ALICE, 1e6, 32_000_000, keccak256("perm")));
        assertTrue(accessGate.isAdmitted(ALICE));

        // Retiring the source stops NEW facts; it cannot retract proven ones.
        vm.prank(ADMIN);
        registry.setSourceEnabled(FactTypes.AAVE_REPAYMENT, false);

        assertTrue(accessGate.isAdmitted(ALICE), "an admitted member cannot be de-listed");
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    function _proveRepayments(address user, uint256 count, uint64 startBlock) internal {
        for (uint256 i; i < count; ++i) {
            _submit(
                _repayClaim(user, 1e6, startBlock + uint64(i), keccak256(abi.encodePacked(startBlock, i)))
            );
        }
    }

    function _proveSupplies(address user, uint256 count, uint64 startBlock) internal {
        for (uint256 i; i < count; ++i) {
            _submitSupply(
                user, 1_000e6, startBlock + uint64(i), keccak256(abi.encodePacked("lp", startBlock, i))
            );
        }
    }

    function _submitSupply(address user, uint256 amount, uint64 blockNumber, bytes32 txHash) internal {
        bytes32[] memory topics = new bytes32[](4);
        topics[0] = EventSignatures.AAVE_SUPPLY;
        topics[1] = bytes32(uint256(uint160(USDC)));
        topics[2] = bytes32(uint256(uint160(user)));
        topics[3] = bytes32(0);

        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(ReceiptBuilder.log(AAVE_POOL, topics, abi.encode(amount, uint16(0))))
        );
        _submit(_claim(FactTypes.LONG_TERM_LP, blockNumber, txHash, 0, encoded));
    }
}
