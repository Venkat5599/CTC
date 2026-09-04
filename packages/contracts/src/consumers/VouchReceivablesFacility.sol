// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVouchRegistry} from "../interfaces/IVouchRegistry.sol";
import {IVouchPassport} from "../interfaces/IVouchPassport.sol";
import {FactTypes} from "../core/FactTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title VouchReceivablesFacility
/// @notice Invoice financing against a real-world receivable, priced by proven
///         cross-chain repayment history.
///
///         A supplier holds an unpaid invoice: an off-chain obligation owed to
///         them by a third-party debtor, with a face value and a due date. They
///         want cash now rather than on the due date. The facility advances a
///         FRACTION of face value -- the advance rate -- and collects from the
///         debtor at maturity.
///
///         The advance rate is the underwriting decision, and it is set by
///         `IVouchRegistry.hasProof`.
///
/// @dev WHY THIS IS AN RWA PRIMITIVE AND NOT A DEFI ONE.
///
///      The other consumers in this repo (VouchCredit, VouchFeeTier,
///      VouchAccess) are DeFi shapes: they discount a service to an address
///      that has posted, or could post, on-chain capital. This one is not.
///
///      In over-collateralised DeFi lending, borrower history is close to
///      worthless. The collateral does the underwriting -- if the position
///      sours you liquidate it, and whether the borrower has ever repaid
///      anything before changes little. History is a discount lever.
///
///      Receivables financing has NO LIQUIDATION PATH. The asset is a claim on
///      a cash flow that exists off chain, in a jurisdiction, owed by a company
///      that is not the borrower. If the invoice is not paid, the facility eats
///      the loss. There is nothing on chain to seize.
///
///      That inverts the value of history. With nothing to liquidate, proven
///      repayment behaviour stops being a discount lever and becomes the
///      PRIMARY underwriting input. It is the only hard evidence the facility
///      has about a counterparty it cannot otherwise see.
///
///      This is why Vouch is structurally an RWA primitive. The claim is
///      checkable rather than rhetorical: remove liquidation from a lending
///      market and verified history is all that is left.
///
/// @dev WHAT THIS CONTRACT DOES NOT DO.
///
///      It is a reference consumer, not a financing product. It does not custody
///      funds, transfer tokens, verify that a registered invoice corresponds to
///      a real obligation, or handle default. Invoice authenticity is an
///      off-chain onboarding problem (KYB, document verification, debtor
///      confirmation) that Vouch does not solve and does not claim to -- see the
///      PRD non-goal NG8. What it demonstrates is the single view call that
///      turns a proven cross-chain fact into a real-world credit decision.
contract VouchReceivablesFacility {
    IVouchRegistry public immutable REGISTRY;
    IVouchPassport public immutable PASSPORT;

    // --- Advance rates, in basis points of invoice face value ---

    /// @dev An unproven supplier. Not "bad" -- unknown. Absence of proof is not
    ///      evidence of default, because absence of an event is not enumerable,
    ///      so this is the conservative opening rate rather than a penalty.
    uint16 public constant ADVANCE_UNPROVEN_BPS = 7_000; // 70%
    uint16 public constant ADVANCE_BRONZE_BPS = 8_000; // 80%
    uint16 public constant ADVANCE_SILVER_BPS = 8_500; // 85%
    uint16 public constant ADVANCE_GOLD_BPS = 9_000; // 90%

    /// @dev Caps at 90%. The facility never advances face value: the retained
    ///      slice is what absorbs dilution, disputes and late payment. Standing
    ///      RAISES the advance rate; it never removes the haircut.
    uint16 public constant ADVANCE_CEILING_BPS = 9_000;

    struct Invoice {
        address supplier; // who is financed
        bytes32 debtorRef; // hash of the off-chain debtor identity
        uint256 faceValue; // amount the debtor owes, in the facility's unit of account
        uint64 dueDate; // unix seconds
        uint256 advanced; // amount drawn, 0 until drawdown
        bool settled;
    }

    uint256 public nextInvoiceId = 1;
    mapping(uint256 => Invoice) public invoices;

    event InvoiceRegistered(
        uint256 indexed invoiceId,
        address indexed supplier,
        bytes32 indexed debtorRef,
        uint256 faceValue,
        uint64 dueDate
    );
    event Drawdown(uint256 indexed invoiceId, address indexed supplier, uint256 advanced, uint16 advanceRateBps);
    event Settled(uint256 indexed invoiceId, uint256 faceValue);

    error InvoiceNotFound(uint256 invoiceId);
    error NotTheSupplier(address caller, address supplier);
    error AlreadyDrawn(uint256 invoiceId);
    error AlreadySettled(uint256 invoiceId);
    error InvoiceNotDrawn(uint256 invoiceId);
    error DueDateInThePast(uint64 dueDate, uint64 nowTs);
    error ZeroFaceValue();

    constructor(address registry_, address passport_) {
        if (registry_ == address(0) || passport_ == address(0)) revert VouchErrors.ZeroAddress();
        REGISTRY = IVouchRegistry(registry_);
        PASSPORT = IVouchPassport(passport_);
    }

    // -----------------------------------------------------------------------
    // The integration: one view call
    // -----------------------------------------------------------------------

    /// @notice The underwriting decision, in one call.
    /// @dev This is the whole integration. Everything else in this contract is
    ///      invoice bookkeeping that any financier already has.
    function advanceRateBpsFor(address supplier) public view returns (uint16) {
        uint8 tier = PASSPORT.tierOf(supplier);

        if (tier >= 3) return ADVANCE_GOLD_BPS;
        if (tier == 2) return ADVANCE_SILVER_BPS;
        if (tier == 1) return ADVANCE_BRONZE_BPS;
        return ADVANCE_UNPROVEN_BPS;
    }

    /// @notice The raw primitive, without the passport abstraction.
    /// @dev A financier who wants a binary gate rather than a rate curve writes
    ///      exactly this:
    ///
    ///        if (IVouchRegistry(VOUCH).hasProof(supplier, FactTypes.AAVE_REPAYMENT)) {
    ///            // widen the facility
    ///        }
    function hasProvenRepaymentHistory(address supplier) external view returns (bool) {
        return REGISTRY.hasProof(supplier, FactTypes.AAVE_REPAYMENT);
    }

    /// @notice Cash the supplier would receive today against `faceValue`.
    function advanceFor(address supplier, uint256 faceValue) public view returns (uint256) {
        return (faceValue * advanceRateBpsFor(supplier)) / 10_000;
    }

    /// @notice The retained slice: face value minus the advance.
    /// @dev What absorbs dilution, disputes and late payment. Never zero.
    function retentionFor(address supplier, uint256 faceValue) external view returns (uint256) {
        return faceValue - advanceFor(supplier, faceValue);
    }

    // -----------------------------------------------------------------------
    // Invoice lifecycle
    // -----------------------------------------------------------------------

    /// @notice Register a receivable. `debtorRef` is a hash of the off-chain
    ///         debtor identity, not an on-chain address -- the obligor is a
    ///         company, not a wallet, which is what makes this a real-world asset.
    function registerInvoice(bytes32 debtorRef, uint256 faceValue, uint64 dueDate)
        external
        returns (uint256 invoiceId)
    {
        if (faceValue == 0) revert ZeroFaceValue();
        if (dueDate <= block.timestamp) revert DueDateInThePast(dueDate, uint64(block.timestamp));

        invoiceId = nextInvoiceId++;
        invoices[invoiceId] = Invoice({
            supplier: msg.sender,
            debtorRef: debtorRef,
            faceValue: faceValue,
            dueDate: dueDate,
            advanced: 0,
            settled: false
        });

        emit InvoiceRegistered(invoiceId, msg.sender, debtorRef, faceValue, dueDate);
    }

    /// @notice Draw the advance. The rate is read from Vouch at drawdown time,
    ///         so a supplier who proves history between registration and
    ///         drawdown draws more.
    /// @dev Records the advance; it does not move funds. Settlement rails are
    ///      the financier's, not the registry's.
    function drawdown(uint256 invoiceId) external returns (uint256 advanced, uint16 advanceRateBps) {
        Invoice storage inv = invoices[invoiceId];
        if (inv.supplier == address(0)) revert InvoiceNotFound(invoiceId);
        if (msg.sender != inv.supplier) revert NotTheSupplier(msg.sender, inv.supplier);
        if (inv.settled) revert AlreadySettled(invoiceId);
        if (inv.advanced != 0) revert AlreadyDrawn(invoiceId);

        advanceRateBps = advanceRateBpsFor(inv.supplier);
        advanced = (inv.faceValue * advanceRateBps) / 10_000;
        inv.advanced = advanced;

        emit Drawdown(invoiceId, inv.supplier, advanced, advanceRateBps);
    }

    /// @notice The debtor paid. Closes the invoice.
    /// @dev Permissionless on purpose: settlement is an observation of an
    ///      off-chain event, and gating it behind an operator would reintroduce
    ///      exactly the trusted party this protocol argues against. A production
    ///      facility proves this payment too -- which is the next fact type.
    function settle(uint256 invoiceId) external {
        Invoice storage inv = invoices[invoiceId];
        if (inv.supplier == address(0)) revert InvoiceNotFound(invoiceId);
        if (inv.settled) revert AlreadySettled(invoiceId);
        if (inv.advanced == 0) revert InvoiceNotDrawn(invoiceId);

        inv.settled = true;
        emit Settled(invoiceId, inv.faceValue);
    }

    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }
}
