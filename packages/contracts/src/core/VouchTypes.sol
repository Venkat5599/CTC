// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {INativeQueryVerifier} from "../interfaces/INativeQueryVerifier.sol";

/// @notice Shared types for the Vouch protocol.
library VouchTypes {
    /// @notice A fact proven to have occurred on a source chain.
    /// @dev Identity + source + subject + type + one numeric value. Bulky decoded
    ///      payloads are NOT stored; `payloadHash` commits to them instead, keeping
    ///      storage bounded and verification cost predictable.
    struct VerifiedFact {
        bytes32 factId;
        uint64 sourceChain;
        uint64 blockNumber;
        bytes32 txHash;
        uint32 logIndex;
        address subject;
        address emitter;
        bytes32 factType;
        bytes32 payloadHash;
        uint256 value;
        uint64 verifiedAt;
    }

    /// @notice A source-chain event registered as a valid input to the registry.
    /// @dev This is the S2 (emitter spoofing) defence. A proof of a lookalike event
    ///      from an attacker-deployed contract is a VALID proof; only pinning the
    ///      emitting contract address establishes semantics.
    struct RegisteredSource {
        uint64 chainKey;
        address emitter;
        bytes32 topic0;
        bytes32 factType;
        uint8 subjectTopicIndex;
        bool enabled;
    }

    /// @notice One claim within a batch submission.
    struct FactClaim {
        uint64 chainKey;
        uint64 blockNumber;
        bytes32 txHash;
        bytes32 factType;
        bytes encodedTransaction;
        bytes32 merkleRoot;
        INativeQueryVerifier.MerkleProofEntry[] siblings;
    }

    /// @notice Continuity proof shared across every claim in a batch.
    /// @dev This sharing is what makes cross-user batch packing worthwhile:
    ///      N claims in one 1000-block window amortise ONE continuity proof.
    struct BatchContinuity {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    /// @notice Aggregated standing for a subject.
    struct Passport {
        uint32 totalProofs;
        uint64 earliestFact;
        uint64 latestFact;
        uint8 tier;
    }
}
