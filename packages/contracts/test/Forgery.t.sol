// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Vm} from "forge-std/Vm.sol";
import {VouchTestBase} from "./helpers/VouchTestBase.sol";
import {ReceiptBuilder} from "./helpers/ReceiptBuilder.sol";

import {NaiveConsumer} from "../src/attack/NaiveConsumer.sol";
import {SpoofEmitter} from "../src/attack/SpoofEmitter.sol";
import {VouchTypes} from "../src/core/VouchTypes.sol";
import {FactTypes, EventSignatures} from "../src/core/FactTypes.sol";
import {VouchErrors} from "../src/core/VouchErrors.sol";

/// @title ForgeryTest
/// @notice The adversarial harness. The SAME proof bytes go into two contracts
///         and produce opposite outcomes.
///
/// @dev This is the submission's central claim, executed rather than described:
///
///        A valid Attestcoin proof can still be a lie.
///
///      The proof is not defective in either case. It verifies through the same
///      precompile for both contracts. What differs is whether the consumer
///      establishes AUTHORSHIP -- and authorship is what a credit fact actually
///      depends on.
///
///      The falsifier, stated before the harness was built: if `NaiveConsumer`
///      rejects the forged proof, or if `VouchRegistry` accepts it, the S2 claim
///      is refuted and must be withdrawn from every surface.
contract ForgeryTest is VouchTestBase {
    NaiveConsumer internal naive;
    SpoofEmitter internal spoofer;

    /// @dev The attacker. Not `IMPOSTOR` from the base fixture -- this is the
    ///      address the fabricated history is credited TO.
    address internal constant MALLORY = address(0x4A110E);

    /// @dev Where the lookalike contract lives. On the live harness this is a
    ///      real Sepolia deployment; here it is the address whose logs the
    ///      receipt fixture claims.
    address internal constant LOOKALIKE = address(0x5900F);

    function setUp() public override {
        super.setUp();
        spoofer = new SpoofEmitter();
        naive = new NaiveConsumer(EventSignatures.AAVE_REPAY, 2);
    }

    // -----------------------------------------------------------------------
    // The premise: the lookalike really does produce Aave's exact signature
    // -----------------------------------------------------------------------

    /// @notice `SpoofEmitter.Repay` and Aave V3's `Repay` are the same topic0.
    /// @dev If this fails, the whole attack is theoretical. It is the first
    ///      thing to check, because everything downstream assumes it.
    function test_forgery_spoofSignatureIsIdenticalToAave() public pure {
        bytes32 aave = keccak256("Repay(address,address,address,uint256,bool)");
        assertEq(aave, EventSignatures.AAVE_REPAY, "fixture topic0 must be Aave's Repay");
    }

    /// @notice The lookalike contract emits a log with that exact topic0.
    /// @dev Proven against the real deployed bytecode, not against a fixture.
    function test_forgery_spoofEmitterProducesTheAaveTopic() public {
        vm.recordLogs();
        vm.prank(MALLORY);
        spoofer.mintHistory(USDC, 1_000_000e6);

        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1, "one log");
        assertEq(entries[0].topics[0], EventSignatures.AAVE_REPAY, "topic0 is byte-identical to Aave's Repay");
        assertEq(
            address(uint160(uint256(entries[0].topics[2]))),
            MALLORY,
            "the attacker names themselves in the subject topic"
        );
        assertEq(entries[0].emitter, address(spoofer), "and it came from the lookalike, not Aave");
    }

    // -----------------------------------------------------------------------
    // THE HARNESS: identical bytes, opposite outcomes
    // -----------------------------------------------------------------------

    /// @notice The naive consumer credits a fabricated million-dollar repayment.
    /// @dev Nothing here is a shortcut. The proof verifies through the real
    ///      precompile path, the receipt status is checked, the replay guard
    ///      runs. The only missing check is the emitter, and that is enough.
    function test_forgery_naiveConsumerAcceptsTheForgedProof() public {
        VouchTypes.FactClaim memory claim = _forgedClaim();

        (address subject, uint256 value) = naive.submit(_continuity(), claim);

        assertEq(subject, MALLORY, "the naive consumer believes Mallory is the repayer");
        assertEq(value, 1_000_000e6, "and believes the amount");
        assertTrue(naive.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT), "fabricated standing was granted");
        assertEq(naive.proofValue(MALLORY, FactTypes.AAVE_REPAYMENT), 1_000_000e6, "and it is worth a million");
    }

    /// @notice Vouch rejects the identical proof, by name.
    function test_forgery_vouchRejectsTheIdenticalProof() public {
        VouchTypes.FactClaim memory claim = _forgedClaim();

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, AAVE_POOL, LOOKALIKE));
        _submit(claim);

        assertFalse(registry.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT), "no standing was granted");
        assertEq(registry.totalProofs(MALLORY), 0, "and none was recorded");
    }

    /// @notice THE ASSERTION. One proof, byte for byte, into both contracts.
    /// @dev This single test is the submission's argument. The bytes are
    ///      constructed once and reused, so nobody can claim the two contracts
    ///      were fed different inputs.
    function test_forgery_sameBytesOppositeOutcomes() public {
        VouchTypes.FactClaim memory claim = _forgedClaim();

        // Same encoded transaction object, submitted to both.
        bytes32 fingerprint = keccak256(claim.encodedTransaction);

        // 1. The naive consumer accepts and issues credit.
        naive.submit(_continuity(), claim);
        assertTrue(naive.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT), "naive: forged history accepted");

        // 2. The same bytes, unmodified.
        assertEq(keccak256(claim.encodedTransaction), fingerprint, "the payload was not altered between submissions");

        // 3. Vouch rejects them.
        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, AAVE_POOL, LOOKALIKE));
        _submit(claim);
        assertFalse(registry.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT), "vouch: forged history rejected");

        // The lesson, as an assertion: the two contracts disagree about the
        // same valid proof, and only one of them established authorship.
        assertTrue(
            naive.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT) != registry.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT),
            "the same valid proof means different things to the two consumers"
        );
    }

    // -----------------------------------------------------------------------
    // The naive consumer is not a strawman
    // -----------------------------------------------------------------------

    /// @notice It rejects S1. A reverted transaction does not fool it.
    function test_forgery_naiveConsumerStillCatchesRevertedTransactions() public {
        bytes memory encoded = ReceiptBuilder.reverted(
            ReceiptBuilder.one(ReceiptBuilder.repayLog(LOOKALIKE, EventSignatures.AAVE_REPAY, USDC, MALLORY, 1e6))
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 21_000_001, keccak256("f-rev"), 0, encoded);

        vm.expectRevert(abi.encodeWithSelector(NaiveConsumer.TransactionReverted.selector, keccak256("f-rev")));
        naive.submit(_continuity(), claim);
    }

    /// @notice It rejects S3. The same proof cannot be replayed.
    function test_forgery_naiveConsumerStillCatchesReplay() public {
        VouchTypes.FactClaim memory claim = _forgedClaim();
        naive.submit(_continuity(), claim);

        vm.expectRevert();
        naive.submit(_continuity(), claim);

        assertEq(naive.proofCount(MALLORY, FactTypes.AAVE_REPAYMENT), 1, "credited exactly once");
    }

    /// @notice It rejects an unrelated event signature.
    function test_forgery_naiveConsumerStillCatchesWrongTopic() public {
        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(
                ReceiptBuilder.repayLog(LOOKALIKE, keccak256("SomethingElse(uint256)"), USDC, MALLORY, 1e6)
            )
        );
        VouchTypes.FactClaim memory claim = _claim(FactTypes.AAVE_REPAYMENT, 21_000_002, keccak256("f-top"), 0, encoded);

        vm.expectRevert();
        naive.submit(_continuity(), claim);
    }

    /// @notice And it accepts a GENUINE Aave repayment, so the disagreement in
    ///         `test_forgery_sameBytesOppositeOutcomes` is about authorship and
    ///         nothing else.
    /// @dev Without this, a sceptic could argue the naive consumer simply
    ///      accepts everything and the comparison is meaningless. It does not:
    ///      on honest input both contracts agree.
    function test_forgery_bothAgreeOnAGenuineRepayment() public {
        VouchTypes.FactClaim memory honest = _repayClaim(ALICE, 500e6, 21_000_010, keccak256("honest"));

        naive.submit(_continuity(), honest);
        _submit(honest);

        assertTrue(naive.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "naive accepts the real repayment");
        assertTrue(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "vouch accepts the real repayment");
        assertEq(
            naive.proofValue(ALICE, FactTypes.AAVE_REPAYMENT),
            registry.proofValue(ALICE, FactTypes.AAVE_REPAYMENT),
            "and they agree on the value"
        );
    }

    /// @notice Burying the forged log among genuine ones does not help either.
    function test_forgery_buriedForgeryIsAlsoRejected() public {
        ReceiptBuilder.Log[] memory logs = ReceiptBuilder.two(
            ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, BOB, 100e6),
            ReceiptBuilder.repayLog(LOOKALIKE, EventSignatures.AAVE_REPAY, USDC, MALLORY, 9_999_999e6)
        );
        bytes memory encoded = ReceiptBuilder.successful(logs);
        VouchTypes.FactClaim memory claim =
            _claim(FactTypes.AAVE_REPAYMENT, 21_000_020, keccak256("buried"), 1, encoded);

        // The naive consumer takes the log at the named index without asking
        // who emitted it.
        naive.submit(_continuity(), claim);
        assertTrue(naive.hasProof(MALLORY, FactTypes.AAVE_REPAYMENT), "naive credits the buried forgery");

        // Vouch names the emitter at that exact index and rejects.
        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, AAVE_POOL, LOOKALIKE));
        _submit(claim);
    }

    // -----------------------------------------------------------------------
    // Anti-criteria: the harness must not be able to prove too much
    // -----------------------------------------------------------------------

    /// @notice Anti: the harness must NOT claim Attestcoin is broken.
    /// @dev The precompile verified the forged proof, and it was RIGHT to. The
    ///      transaction was included. Attestcoin answered its question
    ///      correctly; the naive consumer asked the wrong question.
    function test_forgery_anti_theProofItselfIsValid() public {
        VouchTypes.FactClaim memory claim = _forgedClaim();

        // The naive consumer's proof-verification step passes. If the precompile
        // had rejected the forgery, `submit` would revert with
        // ProofVerificationFailed rather than succeeding.
        (address subject,) = naive.submit(_continuity(), claim);
        assertEq(subject, MALLORY, "the proof verified: Attestcoin did its job correctly");
    }

    // -----------------------------------------------------------------------
    // helpers
    // -----------------------------------------------------------------------

    /// @dev A genuine proof of a forged event: successful transaction, real
    ///      Aave topic0, attacker as subject, lookalike contract as emitter.
    function _forgedClaim() internal pure returns (VouchTypes.FactClaim memory) {
        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(
                ReceiptBuilder.repayLog(LOOKALIKE, EventSignatures.AAVE_REPAY, USDC, MALLORY, 1_000_000e6)
            )
        );
        return _claim(FactTypes.AAVE_REPAYMENT, 21_000_000, keccak256("forged"), 0, encoded);
    }
}
