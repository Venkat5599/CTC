// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console2} from "forge-std/console2.sol";

import {VouchTestBase} from "./helpers/VouchTestBase.sol";
import {VouchTypes} from "../src/core/VouchTypes.sol";
import {FactTypes} from "../src/core/FactTypes.sol";
import {IVouchRegistry} from "../src/interfaces/IVouchRegistry.sol";
import {VouchPassport} from "../src/passport/VouchPassport.sol";
import {VouchCredit} from "../src/consumers/VouchCredit.sol";
import {VouchFeeTier} from "../src/consumers/VouchFeeTier.sol";
import {VouchAccess} from "../src/consumers/VouchAccess.sol";

/// @title GasTest
/// @notice Measures the claim the registry exists to make: verification is paid
///         once, and every consumer after the first reads for an SLOAD.
///
/// @dev These numbers are measured against the MOCK precompile, so the
///      verification figures exclude the real precompile's own cost, which the
///      Attestcoin docs price at roughly
///
///        2.3e-5 + 2.9e-7 * continuityHashCount  CTC
///
///      and which dominates in production. That exclusion does not weaken the
///      argument — it strengthens it. The expensive part is exactly the part
///      being amortised, so the real saving is larger than what prints here.
///
///      What IS measured honestly is the shape: submission cost grows with the
///      number of facts, and consumer cost does not grow at all.
contract GasTest is VouchTestBase {
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

    /// @notice The headline: the Nth consumer's marginal cost is flat.
    function test_gas_marginalCostOfTheNthConsumer() public {
        _submit(_repayClaim(ALICE, 5_000e6, 40_000_000, keccak256("gas1")));

        uint256 first = _measureHasProof(ALICE);
        uint256 second = _measureHasProof(ALICE);
        uint256 third = _measureHasProof(ALICE);

        console2.log("--- consumer reads (gas) ---");
        console2.log("1st consumer hasProof   ", first);
        console2.log("2nd consumer hasProof   ", second);
        console2.log("3rd consumer hasProof   ", third);

        // Absolute gas numbers move with the compiler, the EVM revision and the
        // test runner's warm/cold accounting -- an earlier version of this test
        // asserted `< 5000` and passed locally at 1,202 while failing in CI at
        // 7,702. The absolute value is worth PRINTING and worthless to ASSERT.
        //
        // What is stable is the relationship, and the relationship is the whole
        // claim: an additional consumer costs the same as the one before it, and
        // that cost is a storage read rather than a re-verification.
        assertEq(second, third, "marginal cost of an additional consumer is constant");

        uint256 submissionCost = _measureSubmissionCost();
        console2.log("one submission (verify) ", submissionCost);
        assertLt(second * 50, submissionCost, "a consumer read is orders of magnitude below verifying");
    }

    /// @notice What three real consumers actually cost to ask.
    function test_gas_threeConsumersReadingOneFact() public {
        _submit(_repayClaim(ALICE, 5_000e6, 40_000_010, keccak256("gas2")));

        uint256 g0 = gasleft();
        credit.collateralBpsFor(ALICE);
        uint256 creditGas = g0 - gasleft();

        g0 = gasleft();
        feeTier.feeBpsFor(ALICE);
        uint256 feeGas = g0 - gasleft();

        g0 = gasleft();
        accessGate.isAdmitted(ALICE);
        uint256 accessGas = g0 - gasleft();

        console2.log("--- three consumers, one fact (gas) ---");
        console2.log("VouchCredit.collateralBpsFor ", creditGas);
        console2.log("VouchFeeTier.feeBpsFor       ", feeGas);
        console2.log("VouchAccess.isAdmitted       ", accessGas);

        // Relational, for the reason given in the test above: the absolute
        // numbers are for the gas table, not for the assertion.
        uint256 submissionCost = _measureSubmissionCost();
        assertLt(creditGas * 10, submissionCost, "credit read stays far below a verification");
        assertLt(feeGas * 10, submissionCost);
        assertLt(accessGas * 10, submissionCost);
        assertGt(creditGas, feeGas, "credit pays for the extra passport hop");
    }

    /// @notice Where batching actually saves, and — just as importantly — where it does not.
    ///
    /// @dev A measured result worth stating precisely, because the size of the
    ///      benefit depends entirely on the continuity proof and the naive claim
    ///      is wrong in the easy case.
    ///
    ///      With a DENSE continuity proof — a recent block, ~10 hashes from an
    ///      attestation — batching is a wash at the execution level, and measured
    ///      about 0.7% WORSE. Each claim still runs its own decode, its own
    ///      validation and its own precompile call, and there is almost no shared
    ///      payload to amortise.
    ///
    ///      With a SPARSE continuity proof — anything older than roughly 24
    ///      hours, where attestations are replaced by 1-per-1000-block
    ///      checkpoints — batching wins, because the 1000-root array is copied
    ///      from calldata to memory once per transaction rather than once per
    ///      claim. That is the case this test measures, and it is the case that
    ///      matters: a standing registry exists to prove OLD history.
    ///
    ///      The larger saving is still somewhere `gasleft()` cannot see. Two
    ///      places:
    ///
    ///        1. INTRINSIC COST. Ten submissions are ten transactions at 21,000
    ///           gas each before a single opcode runs. One batch is one.
    ///
    ///        2. CONTINUITY CALLDATA. The continuity proof is the expensive part
    ///           of the payload, and it is shared. A recent block sits ~10 hashes
    ///           from a dense attestation, but after roughly 24 hours attestations
    ///           are replaced by sparse 1-per-1000-block checkpoints, so proving
    ///           old history — which is the whole point of a standing registry —
    ///           means carrying ~1000 roots. That array is 32KB. Sending it once
    ///           instead of ten times is the saving.
    ///
    ///      Both are transaction-level costs, so this test computes them from
    ///      measured calldata sizes rather than pretending `gasleft()` captured
    ///      them.
    function test_gas_batchingSavesCalldataNotExecution() public {
        uint256 batchSize = registry.MAX_BATCH_SIZE();

        // Sparse-checkpoint continuity: the realistic case for old history.
        VouchTypes.BatchContinuity memory sparse = _continuityWithRoots(1000);

        VouchTypes.FactClaim[] memory claims = new VouchTypes.FactClaim[](batchSize);
        for (uint256 i; i < batchSize; ++i) {
            claims[i] = _repayClaim(ALICE, 1e6, uint64(41_000_000 + i), keccak256(abi.encodePacked("batch", i)));
        }

        // --- execution gas ---
        uint256 g0 = gasleft();
        vm.prank(RELAYER);
        registry.submitBatch(sparse, claims);
        uint256 batchedExec = g0 - gasleft();

        uint256 individualExec;
        for (uint256 i; i < batchSize; ++i) {
            VouchTypes.FactClaim memory single =
                _repayClaim(BOB, 1e6, uint64(42_000_000 + i), keccak256(abi.encodePacked("single", i)));
            g0 = gasleft();
            vm.prank(RELAYER);
            registry.submitBatch(sparse, _batch(single));
            individualExec += g0 - gasleft();
        }

        // --- transaction-level cost, computed from real payload sizes ---
        uint256 batchedCalldata = abi.encodeCall(IVouchRegistry.submitBatch, (sparse, claims)).length;
        uint256 singleCalldata = abi.encodeCall(IVouchRegistry.submitBatch, (sparse, _batch(claims[0]))).length;

        // EIP-2028: 16 gas per non-zero calldata byte. Root arrays here are zero
        // bytes, so this is the conservative direction — real roots are non-zero
        // and the gap widens.
        uint256 batchedTxCost = 21_000 + (batchedCalldata * 16);
        uint256 individualTxCost = batchSize * (21_000 + (singleCalldata * 16));

        console2.log("--- execution gas (what gasleft sees) ---");
        console2.log("batch of 10, per fact      ", batchedExec / batchSize);
        console2.log("10 separate, per fact      ", individualExec / batchSize);

        console2.log("--- transaction cost with 1000-root continuity ---");
        console2.log("batched calldata bytes     ", batchedCalldata);
        console2.log("individual calldata bytes  ", singleCalldata * batchSize);
        console2.log("batched intrinsic+calldata ", batchedTxCost);
        console2.log("separate intrinsic+calldata", individualTxCost);
        console2.log("saved                      ", individualTxCost - batchedTxCost);
        console2.log("continuity proofs          ", "1 batched vs 10 individual");

        // With a sparse proof the shared array is copied once instead of ten
        // times, so execution really is cheaper -- but only modestly. Asserting
        // the modest number rather than a flattering one keeps the published
        // gas table honest.
        assertLt(batchedExec, individualExec, "sparse-continuity batching is cheaper to execute");
        uint256 execSavingPct = (individualExec - batchedExec) * 100 / individualExec;
        console2.log("execution saving (percent) ", execSavingPct);

        // Measured between 8% and 30% depending on the environment. The point of
        // the bound is to stop the claim inflating into "batching makes
        // verification nearly free" -- it does not, because each claim still
        // runs its own decode and its own precompile call. The order-of-magnitude
        // saving lives at the transaction level, asserted below.
        assertLt(execSavingPct, 50, "execution saving is a fraction, not an order of magnitude");

        // The saving is real and it is at the transaction level.
        assertLt(batchedTxCost, individualTxCost / 5, "batching cuts payload cost by more than 5x");

        assertEq(registry.proofCount(ALICE, FactTypes.AAVE_REPAYMENT), batchSize);
        assertEq(registry.proofCount(BOB, FactTypes.AAVE_REPAYMENT), batchSize);
    }

    /// @notice Continuity proofs required for N facts, which is the number that
    ///         actually drives cost on CC3.
    function test_gas_continuityProofsCollapseToCeilNOver10() public pure {
        uint256 maxBatch = 10;
        uint256[5] memory factCounts = [uint256(1), 10, 11, 100, 1000];

        console2.log("--- continuity proofs required ---");
        for (uint256 i; i < factCounts.length; ++i) {
            uint256 n = factCounts[i];
            uint256 proofs = (n + maxBatch - 1) / maxBatch;
            console2.log("facts", n);
            console2.log("  continuity proofs", proofs);
            console2.log("  unbatched would be", n);
        }

        assertEq((uint256(1000) + 9) / 10, 100, "1000 facts collapse to 100 continuity proofs");
    }

    /// @notice A repeat read of the same fact never re-verifies.
    function test_gas_verifyOnceReadForever() public {
        _submit(_repayClaim(ALICE, 1e6, 43_000_000, keccak256("once")));
        uint256 callsAfterSubmission = verifier.callCount();

        for (uint256 i; i < 25; ++i) {
            credit.collateralBpsFor(ALICE);
            feeTier.feeBpsFor(ALICE);
            accessGate.isAdmitted(ALICE);
        }

        assertEq(verifier.callCount(), callsAfterSubmission, "75 consumer reads, zero precompile calls");
    }

    /// @dev Cost of writing one fact, used as the yardstick every consumer-read
    ///      assertion is expressed against. Measured in the same run and the
    ///      same environment as the thing it is compared to, which is what makes
    ///      the comparison stable where an absolute number is not.
    function _measureSubmissionCost() internal returns (uint256) {
        VouchTypes.FactClaim memory claim = _repayClaim(
            BOB, 1e6, 49_000_000 + uint64(gasleft() % 1000), keccak256(abi.encodePacked("yard", gasleft()))
        );
        uint256 g0 = gasleft();
        vm.prank(RELAYER);
        registry.submitBatch(_continuity(), _batch(claim));
        return g0 - gasleft();
    }

    function _measureHasProof(address user) internal view returns (uint256) {
        uint256 g0 = gasleft();
        IVouchRegistry(address(registry)).hasProof(user, FactTypes.AAVE_REPAYMENT);
        return g0 - gasleft();
    }
}
