// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchErrors} from "../core/VouchErrors.sol";

/// @title ProofValidator
/// @notice Bounds proof inputs before they reach the precompile.
/// @dev Two documented protocol limits are enforced here:
///
///      1. Continuity proof length drives verification gas directly:
///           cost ~= 2.3e-5 + 2.9e-7 * continuityHashCount  (CTC)
///         A recent block sits ~10 hashes from a dense attestation; after ~24h
///         attestations are replaced by sparse 1-per-1000-block checkpoints, so
///         the same proof costs 1000 hashes (>10x). An unbounded array is a
///         cheap griefing vector, so we cap it.
///
///      2. Transactions above ~500KB may be unprovable: verifying and decoding
///         them can exceed the Creditcoin EVM block gas limit.
abstract contract ProofValidator {
    /// @dev Sparse checkpoints are 1 per 1000 blocks; allow headroom above that.
    uint256 public constant MAX_CONTINUITY_ROOTS = 1200;

    /// @dev Documented practical provability ceiling for a source transaction.
    uint256 public constant MAX_TX_BYTES = 500_000;

    /// @dev Attestcoin MAX_BATCH_SIZE.
    uint256 public constant MAX_BATCH_SIZE = 10;

    function _validateProofBounds(uint256 continuityRootsLength, uint256 txBytesLength) internal pure {
        if (continuityRootsLength > MAX_CONTINUITY_ROOTS) {
            revert VouchErrors.ContinuityProofTooLong(continuityRootsLength, MAX_CONTINUITY_ROOTS);
        }
        if (txBytesLength > MAX_TX_BYTES) {
            revert VouchErrors.TransactionTooLarge(txBytesLength, MAX_TX_BYTES);
        }
    }

    function _validateBatchSize(uint256 size) internal pure {
        if (size == 0) revert VouchErrors.EmptyBatch();
        if (size > MAX_BATCH_SIZE) revert VouchErrors.BatchTooLarge(size, MAX_BATCH_SIZE);
    }
}
