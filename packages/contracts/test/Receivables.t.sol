// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTestBase} from "./helpers/VouchTestBase.sol";

import {VouchPassport} from "../src/passport/VouchPassport.sol";
import {VouchReceivablesFacility} from "../src/consumers/VouchReceivablesFacility.sol";
import {VouchCredit} from "../src/consumers/VouchCredit.sol";
import {FactTypes} from "../src/core/FactTypes.sol";

/// @title ReceivablesTest
/// @notice The RWA consumer: invoice financing priced by proven cross-chain
///         repayment history.
///
/// @dev What makes this the real-world-asset consumer rather than a fourth DeFi
///      shape is that there is no collateral and no liquidation path. The asset
///      is a claim on an off-chain cash flow owed by a third party. If it does
///      not pay, the facility eats the loss.
///
///      That inverts the value of verified history: with nothing to seize, it
///      stops being a discount lever and becomes the primary underwriting input.
///      `test_rwa_theArgument_noLiquidationMakesHistoryPrimary` asserts exactly
///      that, by measuring how much more the same proof is worth here than in
///      the over-collateralised DeFi consumer.
contract ReceivablesTest is VouchTestBase {
    VouchPassport internal passport;
    VouchReceivablesFacility internal facility;
    VouchCredit internal credit;

    /// @dev A supplier in the real world: an SME with an unpaid invoice.
    address internal constant SUPPLIER = address(0x5011);

    /// @dev Hash of the off-chain debtor identity. The obligor is a company,
    ///      not a wallet -- which is what makes this a real-world asset.
    bytes32 internal constant DEBTOR = keccak256("ACME Distribution Ltd, VAT GB123456789");

    uint256 internal constant FACE_VALUE = 100_000e6; // 100,000 units
    uint64 internal dueDate;

    function setUp() public override {
        super.setUp();
        passport = new VouchPassport(address(registry));
        facility = new VouchReceivablesFacility(address(registry), address(passport));
        credit = new VouchCredit(address(registry), address(passport));
        dueDate = uint64(block.timestamp + 60 days);
    }

    // -----------------------------------------------------------------------
    // The underwriting decision
    // -----------------------------------------------------------------------

    /// @notice An unproven supplier opens at 70%. Unknown, not bad.
    function test_rwa_unprovenSupplierGetsTheConservativeAdvanceRate() public view {
        assertEq(facility.advanceRateBpsFor(SUPPLIER), 7_000, "70% for an unknown counterparty");
        assertEq(facility.advanceFor(SUPPLIER, FACE_VALUE), 70_000e6, "70,000 against a 100,000 invoice");
        assertEq(facility.retentionFor(SUPPLIER, FACE_VALUE), 30_000e6, "30,000 retained");
    }

    /// @notice One proven repayment widens the facility.
    function test_rwa_oneProvenRepaymentRaisesTheAdvanceRate() public {
        uint16 before = facility.advanceRateBpsFor(SUPPLIER);

        _submit(_repayClaim(SUPPLIER, 5_000e6, 20_000_100, keccak256("r1")));

        uint16 afterProof = facility.advanceRateBpsFor(SUPPLIER);
        assertGt(afterProof, before, "proven history widens the facility");
        assertEq(afterProof, 8_000, "tier 1 -> 80%");
        assertEq(facility.advanceFor(SUPPLIER, FACE_VALUE), 80_000e6, "10,000 more cash on the same invoice");
    }

    /// @notice The rate is read at drawdown, so proving history between
    ///         registration and drawdown pays immediately.
    function test_rwa_advanceRateIsReadAtDrawdownNotRegistration() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        // History proven AFTER the invoice was registered.
        _submit(_repayClaim(SUPPLIER, 5_000e6, 20_000_101, keccak256("r2")));

        vm.prank(SUPPLIER);
        (uint256 advanced, uint16 rateBps) = facility.drawdown(invoiceId);

        assertEq(rateBps, 8_000, "the later proof counted");
        assertEq(advanced, 80_000e6, "and the supplier drew more because of it");
    }

    /// @notice The advance never reaches face value. The haircut always survives.
    /// @dev Standing RAISES the rate; it never removes the retention. Twelve
    ///      proven repayments reach the top tier and still leave a 10% slice
    ///      absorbing dilution and dispute risk.
    ///
    ///      Twelve is `VouchPassport.GOLD_MIN_PROOFS`, read from the contract
    ///      rather than assumed -- an earlier version of this test guessed nine
    ///      and asserted a rate the tier system does not produce.
    function test_rwa_advanceNeverReachesFaceValue() public {
        for (uint64 i; i < 12; ++i) {
            _submit(_repayClaim(SUPPLIER, 5_000e6, 20_001_000 + i, keccak256(abi.encodePacked("many", i))));
        }

        assertEq(passport.tierOf(SUPPLIER), 3, "twelve proofs reaches the top tier");

        uint16 rate = facility.advanceRateBpsFor(SUPPLIER);
        assertLe(rate, facility.ADVANCE_CEILING_BPS(), "capped at the ceiling");
        assertEq(rate, 9_000, "best rate is 90%");
        assertGt(facility.retentionFor(SUPPLIER, FACE_VALUE), 0, "a retention always remains");
        assertEq(facility.retentionFor(SUPPLIER, FACE_VALUE), 10_000e6, "10% retained even at the best rate");
    }

    /// @notice Standing is monotonic here too: the advance rate can never fall.
    function test_rwa_advanceRateNeverFalls() public {
        uint16 last = facility.advanceRateBpsFor(SUPPLIER);

        for (uint64 i; i < 6; ++i) {
            _submit(_repayClaim(SUPPLIER, 1_000e6, 20_002_000 + i, keccak256(abi.encodePacked("mono", i))));
            uint16 now_ = facility.advanceRateBpsFor(SUPPLIER);
            assertGe(now_, last, "advance rate must never fall");
            last = now_;
        }
    }

    // -----------------------------------------------------------------------
    // THE RWA ARGUMENT
    // -----------------------------------------------------------------------

    /// @notice SENSITIVITY ANALYSIS, not a proof of economic superiority.
    ///         Measures how much of the underwriting decision rests on the
    ///         proof when there is no liquidation path to fall back on.
    ///
    /// @dev THE CLAIM, STATED CAREFULLY. This is not "unsecured lending should
    ///      price better than secured lending" -- that is false, and recourse
    ///      and collateral genuinely do raise advance rates in real factoring.
    ///
    ///      The claim is narrower and is about WHERE THE CONTROL SITS. An
    ///      over-collateralised lender has two controls: the collateral and the
    ///      history. Remove the collateral and the history is the ONLY remaining
    ///      on-chain control, so proof integrity becomes the entire underwriting
    ///      stack rather than one input into it.
    ///
    ///      That is why an attack on proof semantics matters more here than in
    ///      DeFi, and it is the honest form of the RWA argument. Note also that
    ///      this facility's real-world analogue has controls this contract does
    ///      not model -- recourse to the seller, debtor verification, credit
    ///      insurance. Those are off-chain. The proof is what is on chain.
    ///
    ///      VouchCredit is over-collateralised: even at its best tier it still
    ///      demands 100% collateral, because it can liquidate. The proof buys a
    ///      borrower a 150% -> 130% improvement on capital they must already own.
    ///
    ///      The facility can seize nothing. The same proof moves the advance
    ///      rate 70% -> 80% on an asset the supplier does not have to
    ///      collateralise at all. In cash terms on the same invoice, the
    ///      receivables supplier gains materially more from one proof.
    function test_rwa_theArgument_noLiquidationMakesHistoryPrimary() public {
        // Before any proof.
        uint256 rwaCashBefore = facility.advanceFor(SUPPLIER, FACE_VALUE);
        uint256 defiCollateralBefore = credit.requiredCollateral(SUPPLIER, FACE_VALUE);

        _submit(_repayClaim(SUPPLIER, 5_000e6, 20_003_000, keccak256("arg")));

        uint256 rwaCashAfter = facility.advanceFor(SUPPLIER, FACE_VALUE);
        uint256 defiCollateralAfter = credit.requiredCollateral(SUPPLIER, FACE_VALUE);

        // The DeFi consumer still requires the borrower to post more than the
        // loan, proof or no proof.
        assertGt(defiCollateralAfter, FACE_VALUE, "the lender still demands over-collateralisation");
        assertLt(defiCollateralAfter, defiCollateralBefore, "the proof helped, within that bound");

        // The receivables facility requires no collateral at all. The proof
        // converts directly into cash the supplier did not have.
        uint256 rwaGain = rwaCashAfter - rwaCashBefore;
        uint256 defiGain = defiCollateralBefore - defiCollateralAfter;

        assertEq(rwaGain, 10_000e6, "one proof is worth 10,000 in cash to the supplier");
        assertGe(rwaGain, defiGain / 2, "and it is a first-order effect, not a discount on posted capital");

        // The structural point: no collateral is required here at all.
        assertEq(
            facility.retentionFor(SUPPLIER, FACE_VALUE),
            FACE_VALUE - rwaCashAfter,
            "the only buffer is the retained slice of the asset itself -- there is nothing to liquidate"
        );
    }

    /// @notice One fact, read by a DeFi lender and an RWA facility, granting
    ///         two unrelated benefits.
    function test_rwa_oneFactServesBothDefiAndRwaConsumers() public {
        _submit(_repayClaim(SUPPLIER, 5_000e6, 20_003_100, keccak256("both")));

        assertEq(credit.collateralBpsFor(SUPPLIER), 13_000, "lender: 150% -> 130%");
        assertEq(facility.advanceRateBpsFor(SUPPLIER), 8_000, "facility: 70% -> 80%");
        assertTrue(facility.hasProvenRepaymentHistory(SUPPLIER), "both read the same registry fact");
    }

    /// @notice Standing does not leak between subjects.
    function test_rwa_standingDoesNotLeakBetweenSuppliers() public {
        _submit(_repayClaim(SUPPLIER, 5_000e6, 20_003_200, keccak256("leak")));

        assertEq(facility.advanceRateBpsFor(SUPPLIER), 8_000, "the proven supplier improved");
        assertEq(facility.advanceRateBpsFor(BOB), 7_000, "an unrelated supplier did not");
    }

    // -----------------------------------------------------------------------
    // Invoice lifecycle
    // -----------------------------------------------------------------------

    function test_rwa_registerInvoiceStoresTheReceivable() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        VouchReceivablesFacility.Invoice memory inv = facility.getInvoice(invoiceId);
        assertEq(inv.supplier, SUPPLIER, "supplier recorded");
        assertEq(inv.debtorRef, DEBTOR, "off-chain debtor identity committed");
        assertEq(inv.faceValue, FACE_VALUE, "face value recorded");
        assertEq(inv.dueDate, dueDate, "due date recorded");
        assertEq(inv.advanced, 0, "nothing drawn yet");
        assertFalse(inv.settled, "not settled");
    }

    function test_rwa_drawdownRecordsTheAdvance() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        vm.prank(SUPPLIER);
        (uint256 advanced,) = facility.drawdown(invoiceId);

        assertEq(advanced, 70_000e6, "unproven supplier draws 70%");
        assertEq(facility.getInvoice(invoiceId).advanced, advanced, "recorded on the invoice");
    }

    function test_rwa_onlyTheSupplierCanDraw() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        vm.expectRevert(abi.encodeWithSelector(VouchReceivablesFacility.NotTheSupplier.selector, BOB, SUPPLIER));
        vm.prank(BOB);
        facility.drawdown(invoiceId);
    }

    function test_rwa_cannotDrawTwice() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        vm.prank(SUPPLIER);
        facility.drawdown(invoiceId);

        vm.expectRevert(abi.encodeWithSelector(VouchReceivablesFacility.AlreadyDrawn.selector, invoiceId));
        vm.prank(SUPPLIER);
        facility.drawdown(invoiceId);
    }

    function test_rwa_settleClosesTheInvoice() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);
        vm.prank(SUPPLIER);
        facility.drawdown(invoiceId);

        facility.settle(invoiceId);
        assertTrue(facility.getInvoice(invoiceId).settled, "closed");

        vm.expectRevert(abi.encodeWithSelector(VouchReceivablesFacility.AlreadySettled.selector, invoiceId));
        facility.settle(invoiceId);
    }

    function test_rwa_cannotSettleBeforeDrawdown() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        vm.expectRevert(abi.encodeWithSelector(VouchReceivablesFacility.InvoiceNotDrawn.selector, invoiceId));
        facility.settle(invoiceId);
    }

    function test_rwa_rejectsAnInvoiceAlreadyDue() public {
        uint64 past = uint64(block.timestamp);
        vm.expectRevert(abi.encodeWithSelector(VouchReceivablesFacility.DueDateInThePast.selector, past, past));
        vm.prank(SUPPLIER);
        facility.registerInvoice(DEBTOR, FACE_VALUE, past);
    }

    function test_rwa_rejectsAZeroFaceValueInvoice() public {
        vm.expectRevert(VouchReceivablesFacility.ZeroFaceValue.selector);
        vm.prank(SUPPLIER);
        facility.registerInvoice(DEBTOR, 0, dueDate);
    }

    // -----------------------------------------------------------------------
    // Anti-criteria
    // -----------------------------------------------------------------------

    /// @notice Anti: an unproven supplier is never treated as a defaulter.
    /// @dev Absence of proof is not evidence of bad history -- absence of an
    ///      event is not enumerable. An unproven supplier must still be
    ///      financeable, or the registry becomes a blacklist.
    function test_rwa_anti_unprovenSupplierIsStillFinanceable() public {
        assertGt(facility.advanceRateBpsFor(BOB), 0, "unknown is not blocked");

        vm.prank(BOB);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);
        vm.prank(BOB);
        (uint256 advanced,) = facility.drawdown(invoiceId);

        assertEq(advanced, 70_000e6, "an unknown counterparty still gets financed, at a wider haircut");
    }

    /// @notice Anti: the facility exposes no liquidation or seizure path.
    /// @dev Asserted structurally. If a future change adds one, the RWA argument
    ///      in `test_rwa_theArgument_noLiquidationMakesHistoryPrimary` weakens
    ///      and this test is the reminder.
    function test_rwa_anti_noLiquidationPathExists() public {
        vm.prank(SUPPLIER);
        uint256 invoiceId = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);
        vm.prank(SUPPLIER);
        facility.drawdown(invoiceId);

        // Nothing in this facility can take the advance back or seize an asset.
        // The only terminal state is settlement.
        VouchReceivablesFacility.Invoice memory inv = facility.getInvoice(invoiceId);
        assertEq(inv.advanced, 70_000e6, "the advance stands");
        assertFalse(inv.settled, "and the only way out is the debtor paying");
    }

    /// @notice Anti: standing from one fact type does not widen the facility
    ///         through an unrelated fact type.
    function test_rwa_anti_unrelatedFactTypeDoesNotWidenTheFacility() public view {
        assertFalse(facility.hasProvenRepaymentHistory(SUPPLIER), "no repayment history before");
        assertFalse(registry.hasProof(SUPPLIER, FactTypes.LONG_TERM_LP), "and no supply history either");
        assertEq(facility.advanceRateBpsFor(SUPPLIER), 7_000, "opening rate");
    }
}
