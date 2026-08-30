// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INativeQueryVerifier, NativeQueryVerifierLib} from "../interfaces/INativeQueryVerifier.sol";
import {VouchTypes} from "../core/VouchTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title AttestcoinVerifier
/// @notice The single boundary between Vouch and the Attestcoin Block Prover
///         Precompile. Nothing else in the protocol talks to 0x...0FD2.
/// @dev Keeping the precompile behind one contract means a protocol ABI change
///      touches one file. The Attestcoin SDK and contracts were renamed from USC
///      recently enough that repo names still lag, so this insurance is cheap.
///
///      IMPORTANT: verifyAndEmit proves INCLUSION ONLY. It does not prove the
///      transaction succeeded, and it does not establish who emitted the event.
///      Those are S1 and S2 and are handled in SourceValidator.
abstract contract AttestcoinVerifier {
    INativeQueryVerifier public immutable VERIFIER;

    constructor() {
        VERIFIER = NativeQueryVerifierLib.getVerifier();
    }

    function _verifyInclusion(
        uint64 chainKey,
        uint64 blockNumber,
        bytes memory encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] memory siblings,
        VouchTypes.BatchContinuity memory continuity
    ) internal returns (bool) {
        INativeQueryVerifier.MerkleProof memory merkleProof =
            INativeQueryVerifier.MerkleProof({root: merkleRoot, siblings: siblings});

        INativeQueryVerifier.ContinuityProof memory continuityProof = INativeQueryVerifier.ContinuityProof({
            lowerEndpointDigest: continuity.lowerEndpointDigest,
            roots: continuity.roots
        });

        return VERIFIER.verifyAndEmit(chainKey, blockNumber, encodedTransaction, merkleProof, continuityProof);
    }
}
