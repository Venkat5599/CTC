// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import {VouchTypes} from "../core/VouchTypes.sol";
import {AttestcoinVerifier} from "../verification/AttestcoinVerifier.sol";

/// @title NaiveConsumer
/// @notice The integration a careful team writes on a deadline, and the reason
///         the S2 claim is worth making.
///
/// @dev THIS CONTRACT IS DELIBERATELY VULNERABLE. It is not a strawman in the
///      dishonest sense -- it is not artificially weakened to lose. It does
///      three things right, and one thing not at all:
///
///        RIGHT  It calls the real Block Prover precompile through the same
///               `AttestcoinVerifier` the registry uses. The proof genuinely
///               verifies. There is no shortcut here.
///        RIGHT  It checks the receipt status, so a reverted transaction is
///               rejected. It does NOT fall for S1.
///        RIGHT  It guards replay on `(chainKey, txHash, logIndex)`, so a
///               submitted proof cannot be resubmitted. It does NOT fall for S3.
///        MISSING It matches the log by `topic0` alone. It never asks which
///               contract emitted it.
///
///      That single omission is the whole vulnerability, and it is the natural
///      one. `topic0` is what the docs and every tutorial show you filtering on;
///      it is what `getLogsByEventSignature` is named after. Pinning the emitter
///      is an extra step nothing prompts you to take, and skipping it produces
///      no error, no warning and no failing test -- only a contract that
///      believes an attacker's self-issued history.
///
/// @dev SCOPE OF THE CLAIM THIS CONTRACT SUPPORTS.
///
///      Running the harness proves: "a valid Attestcoin proof of a lookalike
///      event is accepted by a consumer that verifies the proof, checks the
///      receipt status, and guards replay, but does not pin the emitter."
///
///      It does NOT prove "Attestcoin is broken" -- Attestcoin does exactly what
///      it says. It does not prove every real integration is vulnerable. The
///      claim is bounded to the omission named above, and that is the claim the
///      submission makes.
contract NaiveConsumer is AttestcoinVerifier {
    /// @dev The event signature this consumer trusts. Set once at construction,
    ///      exactly as a real integration would hardcode Aave's Repay.
    bytes32 public immutable TOPIC0;

    /// @dev Which topic names the subject. 2 == `user` on Aave V3's Repay.
    uint8 public immutable SUBJECT_TOPIC_INDEX;

    /// @dev Standing this consumer believes in. Same shape as the registry's,
    ///      so the two can be compared directly after the same submission.
    mapping(address => mapping(bytes32 => uint32)) private _proofCount;
    mapping(address => mapping(bytes32 => uint256)) private _proofValue;

    /// @dev Replay guard. Present so the harness cannot be dismissed as "you
    ///      forgot everything, of course it broke."
    mapping(bytes32 => bool) public consumed;

    event Credited(address indexed subject, bytes32 indexed factType, uint256 value, address emitter);

    error ProofVerificationFailed(bytes32 txHash);
    error TransactionReverted(bytes32 txHash);
    error LogIndexOutOfRange(uint32 logIndex, uint256 logCount);
    error TopicMismatch(bytes32 expected, bytes32 actual);
    error AlreadyConsumed(bytes32 key);

    constructor(bytes32 topic0_, uint8 subjectTopicIndex_) {
        TOPIC0 = topic0_;
        SUBJECT_TOPIC_INDEX = subjectTopicIndex_;
    }

    /// @notice Verify a proof and credit the subject named inside it.
    /// @dev Compare line for line against `SourceValidator.validateAndExtract`.
    ///      Every check is present except the emitter assertion:
    ///
    ///        if (entry.address_ != src.emitter) revert EmitterMismatch(...);
    ///
    ///      That one missing line is the difference between this contract and
    ///      the registry, and it is the entire lesson.
    function submit(VouchTypes.BatchContinuity calldata continuity, VouchTypes.FactClaim calldata claim)
        external
        returns (address subject, uint256 value)
    {
        // --- replay guard (S3 handled) ---
        bytes32 key = keccak256(abi.encodePacked(claim.chainKey, claim.txHash, claim.logIndex, claim.factType));
        if (consumed[key]) revert AlreadyConsumed(key);
        consumed[key] = true;

        // --- the proof is real, and really verified ---
        // Same precompile, same call, same code path the registry uses.
        bool ok = _verifyInclusion(
            claim.chainKey, claim.blockNumber, claim.encodedTransaction, claim.merkleRoot, claim.siblings, continuity
        );
        if (!ok) revert ProofVerificationFailed(claim.txHash);

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(claim.encodedTransaction);

        // --- receipt status checked (S1 handled) ---
        if (receipt.receiptStatus != 1) revert TransactionReverted(claim.txHash);

        if (claim.logIndex >= receipt.receiptLogs.length) {
            revert LogIndexOutOfRange(claim.logIndex, receipt.receiptLogs.length);
        }
        EvmV1Decoder.LogEntry memory entry = receipt.receiptLogs[claim.logIndex];

        // --- the event signature matches ---
        if (entry.topics.length == 0 || entry.topics[0] != TOPIC0) {
            revert TopicMismatch(TOPIC0, entry.topics.length == 0 ? bytes32(0) : entry.topics[0]);
        }

        // ------------------------------------------------------------------
        // S2 IS NOT HANDLED. The emitter is never checked.
        //
        // The registry's next line is:
        //     if (entry.address_ != src.emitter) revert EmitterMismatch(...);
        //
        // Its absence here is the vulnerability. Everything below operates on
        // a log this contract has no reason to believe came from Aave.
        // ------------------------------------------------------------------

        subject = address(uint160(uint256(entry.topics[SUBJECT_TOPIC_INDEX])));

        if (entry.data.length >= 32) {
            bytes memory data = entry.data;
            uint256 v;
            // solhint-disable-next-line no-inline-assembly
            assembly {
                v := mload(add(data, 32))
            }
            value = v;
        }

        unchecked {
            _proofCount[subject][claim.factType] += 1;
            _proofValue[subject][claim.factType] += value;
        }

        emit Credited(subject, claim.factType, value, entry.address_);
    }

    /// @notice Same signature as `IVouchRegistry.hasProof`, so the two contracts
    ///         can be asked the identical question after the identical input.
    function hasProof(address subject, bytes32 factType) external view returns (bool) {
        return _proofCount[subject][factType] > 0;
    }

    function proofCount(address subject, bytes32 factType) external view returns (uint32) {
        return _proofCount[subject][factType];
    }

    function proofValue(address subject, bytes32 factType) external view returns (uint256) {
        return _proofValue[subject][factType];
    }
}
