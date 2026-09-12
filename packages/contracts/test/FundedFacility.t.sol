// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTestBase} from "./helpers/VouchTestBase.sol";

import {VouchPassport} from "../src/passport/VouchPassport.sol";
import {VouchReceivablesFacility} from "../src/consumers/VouchReceivablesFacility.sol";
import {DemoUSD} from "../src/demo/DemoUSD.sol";

/// @title FundedFacilityTest
/// @notice The RWA consumer with a settlement rail wired, so the underwriting
///         decision is measured in tokens that actually move.
///
/// @dev WHY THIS SUITE EXISTS SEPARATELY FROM ReceivablesTest.
///
///      ReceivablesTest asserts the terms: an unproven supplier is quoted 70%
///      and a proven one 80%. Those are the right assertions and they were
///      always true, but a quote is a number in an event. A financier reading
///      this repo has one question the quote cannot answer -- does the cash
///      arrive -- and the only assertion that answers it is a balance.
///
///      So every test here measures `balanceOf` before and after. The headline
///      is `test_theProofIsWorthTenThousandTokens`: the same invoice, two
///      suppliers alike in every respect but one proven cross-chain fact, and a
///      difference in their wallets you can count.
contract FundedFacilityTest is VouchTestBase {
    VouchPassport internal passport;
    VouchReceivablesFacility internal facility;
    DemoUSD internal usd;

    address internal constant SUPPLIER = address(0x5011);
    address internal constant FUNDER = address(0xF00D);
    address internal constant DEBTOR_PAYER = address(0xDEB7);

    bytes32 internal constant DEBTOR = keccak256("ACME Distribution Ltd, VAT GB123456789");

    uint256 internal constant FACE_VALUE = 100_000e6; // 100,000 dUSD
    uint256 internal constant POOL = 1_000_000e6;

    uint64 internal dueDate;

    function setUp() public override {
        super.setUp();
        passport = new VouchPassport(address(registry));
        usd = new DemoUSD();
        facility = new VouchReceivablesFacility(address(registry), address(passport), address(usd));
        dueDate = uint64(block.timestamp + 60 days);

        usd.mint(FUNDER, POOL);
        vm.startPrank(FUNDER);
        usd.approve(address(facility), POOL);
        facility.fund(POOL);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------
    // The rail carries money
    // -----------------------------------------------------------------------

    function test_fundingIsVisibleAsLiquidity() public view {
        assertTrue(facility.fundedRail(), "asset wired");
        assertEq(facility.liquidity(), POOL, "pool holds what was funded");
        assertEq(usd.balanceOf(address(facility)), POOL, "and holds it as real balance");
    }

    function test_unprovenSupplierIsPaidSeventyPercent() public {
        uint256 id = _registerInvoice();

        vm.prank(SUPPLIER);
        facility.drawdown(id);

        assertEq(usd.balanceOf(SUPPLIER), 70_000e6, "70% of face value, in hand");
    }

    function test_provenSupplierIsPaidEightyPercent() public {
        _proveRepayments(1);
        uint256 id = _registerInvoice();

        vm.prank(SUPPLIER);
        facility.drawdown(id);

        assertEq(usd.balanceOf(SUPPLIER), 80_000e6, "80% of face value, in hand");
    }

    /// @notice The headline. One proven cross-chain fact, priced in tokens.
    /// @dev Two identical invoices financed by two suppliers who differ in
    ///      exactly one respect: one has a proven Aave repayment on another
    ///      chain and the other does not. The difference in what lands in their
    ///      wallets is what the proof is worth, and it is not a projection.
    function test_theProofIsWorthTenThousandTokens() public {
        address unproven = address(0x5012);

        vm.prank(unproven);
        uint256 idA = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);
        vm.prank(unproven);
        facility.drawdown(idA);

        _proveRepayments(1);
        uint256 idB = _registerInvoice();
        vm.prank(SUPPLIER);
        facility.drawdown(idB);

        uint256 worthOfTheProof = usd.balanceOf(SUPPLIER) - usd.balanceOf(unproven);
        assertEq(worthOfTheProof, 10_000e6, "the proof is worth 10,000 dUSD on a 100,000 invoice");
    }

    function test_goldTierIsPaidNinetyPercent() public {
        _proveRepayments(12);
        assertEq(passport.tierOf(SUPPLIER), 3, "gold");

        uint256 id = _registerInvoice();
        vm.prank(SUPPLIER);
        facility.drawdown(id);

        assertEq(usd.balanceOf(SUPPLIER), 90_000e6, "90%, the ceiling");
    }

    /// @dev The haircut is never removed, however much standing is proven.
    function test_theFacilityNeverAdvancesFaceValue() public {
        _proveRepayments(40);
        uint256 id = _registerInvoice();

        vm.prank(SUPPLIER);
        facility.drawdown(id);

        assertLt(usd.balanceOf(SUPPLIER), FACE_VALUE, "retention always survives");
    }

    function test_liquidityFallsByExactlyTheAdvance() public {
        uint256 available = facility.liquidity();
        uint256 id = _registerInvoice();

        vm.prank(SUPPLIER);
        (uint256 advanced,) = facility.drawdown(id);

        assertEq(facility.liquidity(), available - advanced, "pool debited by the advance, nothing else");
    }

    // -----------------------------------------------------------------------
    // The rail has limits, and they revert
    // -----------------------------------------------------------------------

    function test_drawdownRevertsWhenThePoolIsShort() public {
        DemoUSD thin = new DemoUSD();
        VouchReceivablesFacility small =
            new VouchReceivablesFacility(address(registry), address(passport), address(thin));
        thin.mint(FUNDER, 1_000e6);
        vm.startPrank(FUNDER);
        thin.approve(address(small), 1_000e6);
        small.fund(1_000e6);
        vm.stopPrank();

        vm.prank(SUPPLIER);
        uint256 id = small.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        vm.prank(SUPPLIER);
        vm.expectRevert(
            abi.encodeWithSelector(VouchReceivablesFacility.InsufficientLiquidity.selector, 70_000e6, 1_000e6)
        );
        small.drawdown(id);
    }

    /// @dev An underfunded pool must not half-pay. Either the advance lands in
    ///      full or the invoice stays undrawn and drawable later.
    function test_aFailedDrawdownLeavesTheInvoiceDrawable() public {
        DemoUSD thin = new DemoUSD();
        VouchReceivablesFacility small =
            new VouchReceivablesFacility(address(registry), address(passport), address(thin));

        vm.prank(SUPPLIER);
        uint256 id = small.registerInvoice(DEBTOR, FACE_VALUE, dueDate);

        vm.prank(SUPPLIER);
        vm.expectRevert();
        small.drawdown(id);

        thin.mint(FUNDER, POOL);
        vm.startPrank(FUNDER);
        thin.approve(address(small), POOL);
        small.fund(POOL);
        vm.stopPrank();

        vm.prank(SUPPLIER);
        small.drawdown(id);
        assertEq(thin.balanceOf(SUPPLIER), 70_000e6, "the retry pays in full");
    }

    function test_theSameInvoiceCannotBeDrawnTwice() public {
        uint256 id = _registerInvoice();

        vm.prank(SUPPLIER);
        facility.drawdown(id);

        vm.prank(SUPPLIER);
        vm.expectRevert(abi.encodeWithSelector(VouchReceivablesFacility.AlreadyDrawn.selector, id));
        facility.drawdown(id);

        assertEq(usd.balanceOf(SUPPLIER), 70_000e6, "paid once");
    }

    // -----------------------------------------------------------------------
    // Settlement costs the caller
    // -----------------------------------------------------------------------

    /// @dev `settle` stays permissionless on a funded facility, and that is only
    ///      safe because it is not free: the caller pays face value in. Anyone
    ///      may observe that a debtor paid, provided they are the one paying.
    function test_settleCollectsFaceValueFromWhoeverCallsIt() public {
        uint256 id = _registerInvoice();
        vm.prank(SUPPLIER);
        facility.drawdown(id);

        uint256 poolAfterDrawdown = facility.liquidity();

        usd.mint(DEBTOR_PAYER, FACE_VALUE);
        vm.startPrank(DEBTOR_PAYER);
        usd.approve(address(facility), FACE_VALUE);
        facility.settle(id);
        vm.stopPrank();

        assertEq(facility.liquidity(), poolAfterDrawdown + FACE_VALUE, "face value returned to the pool");
        assertEq(usd.balanceOf(DEBTOR_PAYER), 0, "the payer actually paid");
        assertTrue(facility.getInvoice(id).settled, "closed");
    }

    function test_settlingWithoutPayingIsImpossible() public {
        uint256 id = _registerInvoice();
        vm.prank(SUPPLIER);
        facility.drawdown(id);

        vm.prank(address(0xDEAD));
        vm.expectRevert();
        facility.settle(id);

        assertFalse(facility.getInvoice(id).settled, "an unpaid invoice stays open");
    }

    /// @dev The pool ends a completed cycle ahead by the retained slice. That
    ///      spread is the compensation for financing an obligation nobody can
    ///      liquidate, and it is what proven standing spends down.
    function test_aCompletedCycleReturnsThePoolWithTheRetention() public {
        uint256 id = _registerInvoice();
        vm.prank(SUPPLIER);
        facility.drawdown(id);

        usd.mint(DEBTOR_PAYER, FACE_VALUE);
        vm.startPrank(DEBTOR_PAYER);
        usd.approve(address(facility), FACE_VALUE);
        facility.settle(id);
        vm.stopPrank();

        assertEq(facility.liquidity(), POOL + 30_000e6, "pool up by the 30% retention");
    }

    // -----------------------------------------------------------------------
    // The bookkeeping mode is still a real mode
    // -----------------------------------------------------------------------

    function test_aBookkeepingFacilityQuotesTheSameRateAndMovesNothing() public {
        VouchReceivablesFacility books =
            new VouchReceivablesFacility(address(registry), address(passport), address(0));

        assertFalse(books.fundedRail(), "no rail");
        assertEq(books.liquidity(), 0, "and therefore no liquidity");

        vm.prank(SUPPLIER);
        uint256 id = books.registerInvoice(DEBTOR, FACE_VALUE, dueDate);
        vm.prank(SUPPLIER);
        (uint256 advanced, uint16 bps) = books.drawdown(id);

        assertEq(bps, facility.advanceRateBpsFor(SUPPLIER), "identical underwriting");
        assertEq(advanced, 70_000e6, "identical advance, on paper");
        assertEq(usd.balanceOf(SUPPLIER), 0, "and not a token moved");
    }

    function test_fundingABookkeepingFacilityReverts() public {
        VouchReceivablesFacility books =
            new VouchReceivablesFacility(address(registry), address(passport), address(0));

        vm.expectRevert(VouchReceivablesFacility.NoSettlementRail.selector);
        books.fund(1e6);
    }

    function test_fundingZeroReverts() public {
        vm.expectRevert(VouchReceivablesFacility.ZeroAmount.selector);
        facility.fund(0);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    function _registerInvoice() internal returns (uint256 id) {
        vm.prank(SUPPLIER);
        id = facility.registerInvoice(DEBTOR, FACE_VALUE, dueDate);
    }

    function _proveRepayments(uint256 count) internal {
        for (uint256 i; i < count; ++i) {
            _submit(_repayClaim(SUPPLIER, 1_000e6, uint64(20_000_000 + i), keccak256(abi.encodePacked("rp", i))));
        }
    }
}
