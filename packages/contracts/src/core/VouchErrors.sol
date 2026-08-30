// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Custom errors for the Vouch protocol.
library VouchErrors {
    // --- replay (S3) ---
    error FactAlreadyVerified(bytes32 factId);

    // --- source validation (S2) ---
    error SourceNotRegistered(uint64 chainKey, address emitter, bytes32 topic0);
    error SourceDisabled(bytes32 factType);
    error EmitterMismatch(address expected, address actual);
    error TopicMismatch(bytes32 expected, bytes32 actual);
    error ChainKeyMismatch(uint64 expected, uint64 actual);

    // --- receipt validation (S1) ---
    error TransactionReverted(bytes32 txHash);
    error UnsupportedTransactionType(uint8 txType);
    error NoMatchingLogs(bytes32 topic0);
    error LogIndexOutOfRange(uint32 logIndex, uint256 logCount);
    error SubjectTopicMissing(uint8 subjectTopicIndex, uint256 topicCount);

    // --- proof bounds ---
    error ContinuityProofTooLong(uint256 length, uint256 maxLength);
    error TransactionTooLarge(uint256 size, uint256 maxSize);
    error BatchTooLarge(uint256 size, uint256 maxSize);
    error EmptyBatch();
    error ProofVerificationFailed(bytes32 txHash);

    // --- access ---
    error NotAdmin(address caller);
    error ZeroAddress();
}
