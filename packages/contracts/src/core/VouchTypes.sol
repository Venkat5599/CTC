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
        /// Pinned reserve asset. `address(0)` accepts any asset, which is the
        /// prior behaviour and stays the default.
        ///
        /// Closes permissionless-market self-dealing: deploy a worthless ERC-20,
        /// list it in an isolated market, self-borrow and self-repay a million
        /// units. The emitter is the real pool and the event is real, so emitter
        /// pinning does not touch it -- but the repayment is denominated in a
        /// token nobody registered. Pinning WHICH asset counts is an equality
        /// check. Knowing what a repayment is WORTH needs a value oracle, and
        /// that is still not attempted here.
        address reserveAsset;
        /// Topic carrying the asset. Read only when `reserveAsset != 0`.
        uint8 assetTopicIndex;
        /// Topic carrying whoever settled the debt. Read only when
        /// `requireDistinctPayer` is set.
        uint8 payerTopicIndex;
        /// Reject when the payer IS the subject.
        ///
        /// Off by default, and that default is a judgement rather than caution:
        /// an honest borrower repaying their own loan has `payer == subject`, so
        /// enforcing this unconditionally would reject the ordinary case to stop
        /// the adversarial one. It narrows what the fact MEANS -- "somebody else
        /// settled this debt" is a different claim from "this was repaid" -- so
        /// the registrar decides per source, and the registry only provides the
        /// mechanism.
        bool requireDistinctPayer;
    }

    /// @notice One claim within a batch submission.
    /// @dev `logIndex` is the RECEIPT-WIDE index of the log being claimed, and the
    ///      submitter names it explicitly. It is not a trust assumption: the
    ///      validator asserts that the log at that exact position carries the
    ///      registered topic0 and was emitted by the pinned contract, so naming
    ///      the wrong index reverts rather than mints a false fact.
    ///
    ///      Making the submitter name the log is what allows a single transaction
    ///      to yield SEVERAL facts. A transaction that repays three positions
    ///      emits three qualifying logs, and each one is a separate claim at a
    ///      separate index. Deriving the index by scanning for the first match
    ///      instead would make logs two and three permanently unclaimable.
    struct FactClaim {
        uint64 chainKey;
        uint64 blockNumber;
        bytes32 txHash;
        bytes32 factType;
        uint32 logIndex;
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
