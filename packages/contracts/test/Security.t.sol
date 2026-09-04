// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTestBase} from "./helpers/VouchTestBase.sol";
import {ReceiptBuilder} from "./helpers/ReceiptBuilder.sol";

import {VouchTypes} from "../src/core/VouchTypes.sol";
import {VouchErrors} from "../src/core/VouchErrors.sol";
import {FactTypes, EventSignatures} from "../src/core/FactTypes.sol";
import {ProofValidator} from "../src/verification/ProofValidator.sol";

/// @title SecurityTest
/// @notice The three protocol-specific failure modes an Attestcoin integration
///         must survive, each one written as the attack rather than as the check.
///
/// @dev Every test in this file constructs a proof the Block Prover Precompile
///      would genuinely accept. The mock returns true throughout, because that
///      is what the real precompile does in each of these scenarios — inclusion
///      really is proven. What is on trial is whether Vouch draws the right
///      conclusion from a true proof.
contract SecurityTest is VouchTestBase {
    // =====================================================================
    // S1 — the precompile proves inclusion, not success
    // =====================================================================

    /// @notice A reverted transaction is still in the block and still provable.
    /// @dev The attack costs an attacker one failed transaction. They call
    ///      `repay` with no allowance, it reverts, the logs are still written to
    ///      the receipt, and the inclusion proof is completely valid. Without the
    ///      status check the registry credits a repayment that never happened,
    ///      and it does so silently — nothing reverts, the precompile is happy.
    function test_S1_revertedTransactionIsRejected() public {
        bytes memory encoded = ReceiptBuilder.reverted(
            ReceiptBuilder.one(ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, ALICE, 5_000e6))
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 20_000_000, keccak256("s1"), 0, encoded);

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.TransactionReverted.selector, keccak256("s1")));
        _submit(claim);

        assertFalse(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "reverted tx must not mint standing");
    }

    /// @notice The mock genuinely accepted the proof — S1 is Vouch's rejection, not the precompile's.
    function test_S1_precompileAcceptedTheProofAnyway() public {
        bytes memory encoded = ReceiptBuilder.reverted(
            ReceiptBuilder.one(ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, ALICE, 1e6))
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 20_000_001, keccak256("s1b"), 0, encoded);

        assertTrue(verifier.shouldVerify(), "precompile mock is in accepting mode");
        vm.expectRevert();
        _submit(claim);
    }

    // =====================================================================
    // S2 — a valid proof of a lookalike event is still a valid proof
    // =====================================================================

    /// @notice An attacker-deployed contract emitting a byte-identical Repay.
    /// @dev Nothing is forged here. The attacker really did deploy a mainnet
    ///      contract, it really did emit `Repay(address,address,address,uint256,bool)`
    ///      naming themselves, and the transaction really succeeded. The proof is
    ///      sound. Only the pinned emitter address separates a real Aave
    ///      repayment from a self-issued one.
    function test_S2_spoofedEmitterIsRejected() public {
        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(ReceiptBuilder.repayLog(IMPOSTOR, EventSignatures.AAVE_REPAY, USDC, ALICE, 1_000_000e6))
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 20_000_010, keccak256("s2"), 0, encoded);

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, AAVE_POOL, IMPOSTOR));
        _submit(claim);

        assertFalse(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "self-issued history must not count");
    }

    /// @notice Burying the spoofed log among real ones does not help.
    /// @dev The earlier scan-for-first-match implementation would pick whichever
    ///      qualifying log came first. Naming the index closes that door: the log
    ///      at the named position must itself be from the pinned emitter.
    function test_S2_spoofedEmitterRejectedEvenWhenMixedWithRealLogs() public {
        ReceiptBuilder.Log[] memory logs = ReceiptBuilder.two(
            ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, BOB, 100e6),
            ReceiptBuilder.repayLog(IMPOSTOR, EventSignatures.AAVE_REPAY, USDC, ALICE, 999_999e6)
        );
        bytes memory encoded = ReceiptBuilder.successful(logs);

        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 20_000_011, keccak256("s2b"), 1, encoded);

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, AAVE_POOL, IMPOSTOR));
        _submit(claim);
    }

    /// @notice A log from the right contract but the wrong event is rejected.
    function test_S2_wrongTopicIsRejected() public {
        bytes32[] memory topics = new bytes32[](4);
        topics[0] = EventSignatures.AAVE_SUPPLY;
        topics[1] = bytes32(uint256(uint160(USDC)));
        topics[2] = bytes32(uint256(uint160(ALICE)));
        topics[3] = bytes32(0);

        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(ReceiptBuilder.log(AAVE_POOL, topics, abi.encode(uint256(1e6), false)))
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 20_000_012, keccak256("s2c"), 0, encoded);

        vm.expectRevert(
            abi.encodeWithSelector(
                VouchErrors.TopicMismatch.selector, EventSignatures.AAVE_REPAY, EventSignatures.AAVE_SUPPLY
            )
        );
        _submit(claim);
    }

    // =====================================================================
    // S3 — one log, one fact, forever
    // =====================================================================

    /// @notice The same proof submitted twice mints standing once.
    /// @dev Proofs are public data. Anyone watching the mempool can copy a
    ///      submitted proof and replay it. Without the guard, standing is
    ///      farmable from a single real repayment.
    ///
    ///      The replay is SKIPPED rather than reverted -- `verifiedCount` says
    ///      nothing was written. The security property under test is that a
    ///      replay cannot mint standing, and that is asserted directly on the
    ///      count. Whether the call reverts is an API choice; whether standing
    ///      moves is the invariant, and it does not.
    function test_S3_replayIsRejected() public {
        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 2_500e6, 20_000_020, keccak256("s3"));

        assertEq(_submit(claim), 1, "first submission writes the fact");
        assertEq(registry.proofCount(ALICE, FactTypes.AAVE_REPAYMENT), 1, "first submission counts");

        assertEq(_submit(claim), 0, "replay writes nothing");

        assertEq(registry.proofCount(ALICE, FactTypes.AAVE_REPAYMENT), 1, "replay must not increment");
        assertEq(registry.factIdsOf(ALICE).length, 1, "and must not duplicate the factId");
    }

    /// @notice Replay by a different submitter is still a replay.
    /// @dev The guard is keyed on the source log, not on msg.sender, which is
    ///      what makes a permissionless `submitBatch` safe.
    function test_S3_replayByDifferentSubmitterIsRejected() public {
        VouchTypes.FactClaim memory claim = _repayClaim(BOB, 400e6, 20_000_021, keccak256("s3b"));
        _submit(claim);

        vm.prank(IMPOSTOR);
        uint256 written = registry.submitBatch(_continuity(), _batch(claim));

        assertEq(written, 0, "a different submitter replaying gains nothing");
        assertEq(registry.proofCount(BOB, FactTypes.AAVE_REPAYMENT), 1, "and BOB's standing is unchanged");
    }

    /// @notice One already-recorded claim must not discard the rest of a batch.
    /// @dev The bug this test exists for: `_consume` reverted on a duplicate,
    ///      which unwound the WHOLE batch. Submission is permissionless, so two
    ///      relayers racing the same log is ordinary traffic -- and losing nine
    ///      valid proofs plus their gas to one duplicate makes batching, the
    ///      entire economic argument for this registry, unusable in production.
    function test_S3_duplicateInABatchDoesNotDiscardTheOthers() public {
        VouchTypes.FactClaim memory first = _repayClaim(ALICE, 100e6, 20_000_030, keccak256("dup-a"));
        VouchTypes.FactClaim memory second = _repayClaim(BOB, 200e6, 20_000_031, keccak256("dup-b"));

        // Someone else lands `first` before our batch arrives.
        assertEq(_submit(first), 1, "the racing submitter wins that one");

        uint256 written = registry.submitBatch(_continuity(), _batch(first, second));

        assertEq(written, 1, "the duplicate is skipped, the fresh claim is written");
        assertEq(registry.proofCount(ALICE, FactTypes.AAVE_REPAYMENT), 1, "no double count");
        assertEq(registry.proofCount(BOB, FactTypes.AAVE_REPAYMENT), 1, "and BOB's proof survived the batch");
    }

    /// @notice A real failure anywhere in a batch still reverts all of it.
    /// @dev The skip is narrow, and deliberately so. A duplicate is ordinary
    ///      traffic; a spoofed emitter is an attack. Silently skipping the
    ///      second would let an attacker slip a forged claim into an otherwise
    ///      valid batch and have it ignored rather than surfaced.
    function test_S3_skippingDuplicatesDoesNotSoftenRealFailures() public {
        VouchTypes.FactClaim memory good = _repayClaim(ALICE, 100e6, 20_000_040, keccak256("mix-good"));

        ReceiptBuilder.Log[] memory spoofed = ReceiptBuilder.one(
            ReceiptBuilder.repayLog(IMPOSTOR, EventSignatures.AAVE_REPAY, USDC, IMPOSTOR, 1_000_000e6)
        );
        VouchTypes.FactClaim memory forged = _claim(
            FactTypes.AAVE_REPAYMENT, 20_000_041, keccak256("mix-forged"), 0, ReceiptBuilder.successful(spoofed)
        );

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, AAVE_POOL, IMPOSTOR));
        registry.submitBatch(_continuity(), _batch(good, forged));

        assertFalse(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "the whole batch unwound");
    }

    /// @notice Two distinct logs in the same transaction are two distinct facts.
    /// @dev The regression the index fix exists for. A wallet repaying two
    ///      positions in one transaction emits two qualifying logs; both are
    ///      real, and the replay guard must separate them rather than swallow
    ///      the second.
    function test_S3_twoLogsInOneTransactionAreTwoFacts() public {
        ReceiptBuilder.Log[] memory logs = ReceiptBuilder.two(
            ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, ALICE, 100e6),
            ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, ALICE, 250e6)
        );
        bytes memory encoded = ReceiptBuilder.successful(logs);
        bytes32 txHash = keccak256("s3c");

        VouchTypes.FactClaim[] memory claims = _batch(
            _claim(FactTypes.AAVE_REPAYMENT, 20_000_030, txHash, 0, encoded),
            _claim(FactTypes.AAVE_REPAYMENT, 20_000_030, txHash, 1, encoded)
        );

        uint256 verified = _submit(claims);

        assertEq(verified, 2, "both logs verify");
        assertEq(registry.proofCount(ALICE, FactTypes.AAVE_REPAYMENT), 2, "two facts recorded");
        assertEq(registry.proofValue(ALICE, FactTypes.AAVE_REPAYMENT), 350e6, "values accumulate");
        assertEq(registry.factIdsOf(ALICE).length, 2, "two distinct factIds");
    }

    /// @notice Naming a log index past the end of the receipt reverts.
    function test_logIndexOutOfRangeIsRejected() public {
        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, ALICE, 1e6))
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 20_000_031, keccak256("oob"), 7, encoded);

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.LogIndexOutOfRange.selector, uint32(7), uint256(1)));
        _submit(claim);
    }

    // =====================================================================
    // chainKey pinning — trusting the wrong chain is a silent failure
    // =====================================================================

    /// @dev chainKey is not chainId. On CC3 Testnet 1 is Sepolia and 3 is
    ///      mainnet, so a claim that quietly swapped in Sepolia would credit
    ///      testnet-faucet activity as real history.
    function test_chainKeyMismatchIsRejected() public {
        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 1e6, 20_000_040, keccak256("ck"));
        claim.chainKey = CHAIN_SEPOLIA;

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.ChainKeyMismatch.selector, CHAIN_ETHEREUM, CHAIN_SEPOLIA));
        _submit(claim);
    }

    // =====================================================================
    // Proof bounds — griefing the verifier
    // =====================================================================

    /// @dev Continuity length drives verification gas linearly, and it is
    ///      attacker-supplied. Unbounded, it is a cheap way to burn the
    ///      submitter's gas.
    function test_overlongContinuityProofIsRejected() public {
        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 1e6, 20_000_050, keccak256("cont"));
        uint256 tooMany = registry.MAX_CONTINUITY_ROOTS() + 1;

        vm.prank(RELAYER);
        vm.expectRevert(
            abi.encodeWithSelector(
                VouchErrors.ContinuityProofTooLong.selector, tooMany, registry.MAX_CONTINUITY_ROOTS()
            )
        );
        registry.submitBatch(_continuityWithRoots(tooMany), _batch(claim));
    }

    function test_emptyBatchIsRejected() public {
        vm.prank(RELAYER);
        vm.expectRevert(VouchErrors.EmptyBatch.selector);
        registry.submitBatch(_continuity(), new VouchTypes.FactClaim[](0));
    }

    /// @dev Attestcoin shares one continuity proof across at most ten claims.
    ///      Exceeding it is not a Vouch limit to relax, it is a protocol limit.
    function test_oversizedBatchIsRejected() public {
        uint256 max = registry.MAX_BATCH_SIZE();
        VouchTypes.FactClaim[] memory claims = new VouchTypes.FactClaim[](max + 1);
        for (uint256 i; i < claims.length; ++i) {
            claims[i] = _repayClaim(ALICE, 1e6, uint64(20_000_060 + i), keccak256(abi.encodePacked("big", i)));
        }

        vm.prank(RELAYER);
        vm.expectRevert(abi.encodeWithSelector(VouchErrors.BatchTooLarge.selector, max + 1, max));
        registry.submitBatch(_continuity(), claims);
    }

    /// @notice A batch at exactly the protocol limit succeeds.
    function test_batchAtExactlyMaxSizeSucceeds() public {
        uint256 max = registry.MAX_BATCH_SIZE();
        VouchTypes.FactClaim[] memory claims = new VouchTypes.FactClaim[](max);
        for (uint256 i; i < claims.length; ++i) {
            claims[i] = _repayClaim(ALICE, 1e6, uint64(20_000_070 + i), keccak256(abi.encodePacked("ok", i)));
        }

        assertEq(_submit(claims), max, "full batch verifies");
        assertEq(verifier.callCount(), max, "one precompile call per claim, one shared continuity");
    }

    // =====================================================================
    // Precompile rejection
    // =====================================================================

    /// @notice If the precompile rejects the proof, nothing is written.
    function test_precompileRejectionIsPropagated() public {
        verifier.setShouldVerify(false);
        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 1e6, 20_000_080, keccak256("rej"));

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.ProofVerificationFailed.selector, keccak256("rej")));
        _submit(claim);
    }

    /// @notice An unsupported transaction type is rejected before decoding.
    function test_unsupportedTransactionTypeIsRejected() public {
        VouchTypes.FactClaim memory claim =
            _claim(FactTypes.AAVE_REPAYMENT, 20_000_090, keccak256("badtype"), 0, ReceiptBuilder.withInvalidType());

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.UnsupportedTransactionType.selector, uint8(9)));
        _submit(claim);
    }

    // =====================================================================
    // Source registry access control
    // =====================================================================

    function test_unregisteredFactTypeIsRejected() public {
        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 1e6, 20_000_100, keccak256("unreg"));
        claim.factType = keccak256("NEVER_REGISTERED");

        vm.expectRevert();
        _submit(claim);
    }

    function test_disabledSourceIsRejected() public {
        vm.prank(ADMIN);
        registry.setSourceEnabled(FactTypes.AAVE_REPAYMENT, false);

        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 1e6, 20_000_110, keccak256("disabled"));

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.SourceDisabled.selector, FactTypes.AAVE_REPAYMENT));
        _submit(claim);
    }

    function test_nonAdminCannotRegisterSource() public {
        vm.prank(IMPOSTOR);
        vm.expectRevert(abi.encodeWithSelector(VouchErrors.NotAdmin.selector, IMPOSTOR));
        registry.registerSource(keccak256("EVIL"), CHAIN_ETHEREUM, IMPOSTOR, keccak256("Evil()"), 1);
    }

    /// @notice Anti: submission stays permissionless.
    /// @dev The relayer is untrusted by design; it affects liveness only. If a
    ///      future change adds an allowlist to `submitBatch`, this test is the
    ///      thing that notices.
    function test_anySenderCanSubmit() public {
        address stranger = address(0xC0FFEE);
        VouchTypes.FactClaim memory claim = _repayClaim(BOB, 42e6, 20_000_120, keccak256("open"));

        vm.prank(stranger);
        uint256 verified = registry.submitBatch(_continuity(), _batch(claim));

        assertEq(verified, 1, "anyone may submit a valid proof");
        assertTrue(
            registry.hasProof(BOB, FactTypes.AAVE_REPAYMENT), "standing belongs to the subject, not the submitter"
        );
    }

    /// @notice The subject is read from the proven log, never from the submitter.
    function test_submitterCannotClaimSomeoneElsesStanding() public {
        VouchTypes.FactClaim memory claim = _repayClaim(ALICE, 900e6, 20_000_130, keccak256("subj"));

        vm.prank(IMPOSTOR);
        registry.submitBatch(_continuity(), _batch(claim));

        assertTrue(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "standing accrues to the log subject");
        assertFalse(registry.hasProof(IMPOSTOR, FactTypes.AAVE_REPAYMENT), "submitter gains nothing");
    }
}
