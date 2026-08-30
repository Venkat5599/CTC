// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INativeQueryVerifier} from "../../src/interfaces/INativeQueryVerifier.sol";

/// @title MockNativeQueryVerifier
/// @notice Stands in for the Attestcoin Block Prover Precompile at 0x...0FD2.
/// @dev Etched at the precompile address by the test base so `AttestcoinVerifier`
///      reaches it through the real code path. The mock's whole job is to answer
///      the ONE question the real precompile answers: was this transaction
///      included in a block belonging to the confirmed source chain?
///
///      It deliberately answers NOTHING else. It does not look at the receipt
///      status, it does not look at who emitted the logs, and it does not care
///      whether the same transaction has been submitted before. That is the
///      point: the mock reproduces the precompile's documented blind spots
///      exactly, so the S1/S2/S3 tests are testing Vouch's defences rather than
///      testing a helpful stub. A mock that validated receipts would make every
///      security test pass for the wrong reason.
contract MockNativeQueryVerifier is INativeQueryVerifier {
    /// @dev Global switch. `false` simulates a proof the precompile rejects.
    bool public shouldVerify = true;

    /// @dev Per-block override, so one batch can mix accepted and rejected claims.
    mapping(uint64 => bool) private _blockRejected;

    /// @dev Recorded for assertions about what the registry actually asked.
    uint256 public callCount;
    uint64 public lastChainKey;
    uint64 public lastHeight;
    uint256 public lastContinuityRootsLength;

    function setShouldVerify(bool value) external {
        shouldVerify = value;
    }

    function rejectBlock(uint64 height) external {
        _blockRejected[height] = true;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata,
        MerkleProof calldata,
        ContinuityProof calldata continuityProof
    ) external override returns (bool) {
        ++callCount;
        lastChainKey = chainKey;
        lastHeight = height;
        lastContinuityRootsLength = continuityProof.roots.length;

        if (_blockRejected[height]) return false;
        return shouldVerify;
    }

    function calculateTxIndex(MerkleProof calldata merkleProof) external pure override returns (uint64) {
        return uint64(merkleProof.siblings.length);
    }
}
