// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVouchRegistry} from "../interfaces/IVouchRegistry.sol";
import {VouchTypes} from "./VouchTypes.sol";
import {VouchErrors} from "./VouchErrors.sol";
import {ReplayGuard} from "../security/ReplayGuard.sol";
import {SourceRegistry} from "../security/SourceRegistry.sol";
import {ProofValidator} from "../verification/ProofValidator.sol";
import {AttestcoinVerifier} from "../verification/AttestcoinVerifier.sol";
import {SourceValidator} from "../verification/SourceValidator.sol";

/// @title VouchRegistry
/// @notice The Attestcoin Smart Contract (ASC) and sole writer of verified facts.
///
///         Verify once, while it is cheap. Reuse forever, for free.
///
/// @dev Design notes that matter:
///
///      PERMISSIONLESS. submitBatch is open to anyone. The relayer is untrusted
///      and affects liveness only, deciding which proofs get submitted and when.
///      It cannot forge a fact, because every claim is verified against the
///      Block Prover Precompile before storage. If our relayer disappears, no
///      incorrect state exists and anyone can run one.
///
///      SHARED CONTINUITY. Attestcoin batches share ONE continuity proof across
///      up to 10 claims within a 1000-block window. Nothing requires those ten
///      transactions to belong to the same user, which is what makes cross-user
///      batch packing possible: N continuity proofs collapse to ceil(N/10).
///
///      VERIFY-ONCE. A fact is verified once and stored canonically. Every later
///      read, by this protocol or any other Creditcoin application, is an SLOAD.
///      The first consumer pays; every subsequent consumer reads free.
contract VouchRegistry is IVouchRegistry, ReplayGuard, SourceRegistry, ProofValidator, AttestcoinVerifier {
    // factId => fact
    mapping(bytes32 => VouchTypes.VerifiedFact) private _facts;

    // subject => factIds
    mapping(address => bytes32[]) private _subjectFacts;

    // subject => factType => count / summed value
    mapping(address => mapping(bytes32 => uint32)) private _proofCount;
    mapping(address => mapping(bytes32 => uint256)) private _proofValue;

    // subject => aggregate bounds
    mapping(address => uint64) private _firstSeen;
    mapping(address => uint64) private _lastSeen;
    mapping(address => uint32) private _totalProofs;

    constructor(address admin_) SourceRegistry(admin_) AttestcoinVerifier() {}

    // ---------------------------------------------------------------------
    // Submission
    // ---------------------------------------------------------------------

    /// @notice Verify and store a batch of source-chain facts.
    ///
    /// @dev A claim whose fact is already on record is SKIPPED, not reverted.
    ///      Submission is permissionless, so two relayers racing the same log is
    ///      ordinary traffic rather than an error -- and reverting the batch on
    ///      one duplicate would discard every other proof in it and burn the gas
    ///      that built them. Anything the registry considers a real failure
    ///      (unregistered source, wrong chain, reverted receipt, unpinned
    ///      emitter, bad proof) still reverts the whole batch, because those are
    ///      configuration or attack conditions and silence would hide them.
    ///
    /// @param continuity Continuity proof shared by every claim in the batch.
    /// @param claims Up to MAX_BATCH_SIZE claims within a 1000-block window.
    /// @return verifiedCount Facts newly written. Less than `claims.length` when
    ///         the batch contained facts already on record.
    function submitBatch(VouchTypes.BatchContinuity calldata continuity, VouchTypes.FactClaim[] calldata claims)
        external
        override
        returns (uint256 verifiedCount)
    {
        _validateBatchSize(claims.length);

        for (uint256 i = 0; i < claims.length; ++i) {
            if (_processClaim(continuity, claims[i])) {
                unchecked {
                    ++verifiedCount;
                }
            }
        }
    }

    function _processClaim(VouchTypes.BatchContinuity calldata continuity, VouchTypes.FactClaim calldata claim)
        internal
        returns (bool)
    {
        // 1. Source must be registered and enabled.
        VouchTypes.RegisteredSource memory src = _requireEnabledSource(claim.factType);

        // 2. chainKey pinning. chainKey is NOT chainId; on CC3 Testnet 1 is
        //    Sepolia and 3 is Ethereum Mainnet. Trusting the wrong chain is a
        //    silent failure, so assert it explicitly.
        if (src.chainKey != claim.chainKey) {
            revert VouchErrors.ChainKeyMismatch(src.chainKey, claim.chainKey);
        }

        // 3. S3, checked EARLY. The factId is a pure function of the claim's own
        //    fields, so a duplicate is knowable before any expensive work is
        //    done. Checking here rather than after verification means a
        //    already-recorded fact costs one SLOAD instead of a full precompile
        //    call, and -- more importantly -- lets the rest of the batch
        //    proceed. The write-side guard in step 8 still runs; this is a fast
        //    path, not a replacement for it.
        bytes32 factId = _factId(claim.chainKey, claim.blockNumber, claim.txHash, claim.factType, claim.logIndex);
        if (isVerified(factId)) return false;

        // 4. Bound the proof before it reaches the precompile. Continuity length
        //    drives gas linearly and is attacker-influenced.
        _validateProofBounds(continuity.roots.length, claim.encodedTransaction.length);

        // 4. Inclusion proof. Proves the transaction is in a block belonging to
        //    the confirmed source chain. Proves NOTHING about success or
        //    authorship, which is what steps 5 and 6 are for.
        bool verified = _verifyInclusion(
            claim.chainKey, claim.blockNumber, claim.encodedTransaction, claim.merkleRoot, claim.siblings, continuity
        );
        if (!verified) revert VouchErrors.ProofVerificationFailed(claim.txHash);

        // 5 & 6. S1 (receipt status) and S2 (emitter pinning), plus subject and
        //        value extraction from the PROVEN payload. The claim names which
        //        log it is about; the validator asserts that log is the one the
        //        registry pinned, so a wrong index reverts rather than lies.
        (address subject, uint256 value, bytes32 payloadHash) =
            SourceValidator.validateAndExtract(claim.encodedTransaction, src, claim.logIndex, claim.txHash);

        // 7. S3, enforced. The step-3 check is a fast path that can go stale
        //    within a single batch -- two claims naming the same log would both
        //    pass it. This consume is the authority, and it still reverts.
        _consume(factId);

        // 8. Store.
        _facts[factId] = VouchTypes.VerifiedFact({
            factId: factId,
            sourceChain: claim.chainKey,
            blockNumber: claim.blockNumber,
            txHash: claim.txHash,
            logIndex: claim.logIndex,
            subject: subject,
            emitter: src.emitter,
            factType: claim.factType,
            payloadHash: payloadHash,
            value: value,
            verifiedAt: uint64(block.timestamp)
        });

        _subjectFacts[subject].push(factId);

        unchecked {
            _proofCount[subject][claim.factType] += 1;
            _proofValue[subject][claim.factType] += value;
            _totalProofs[subject] += 1;
        }

        // Standing is monotonic: bounds only widen, counts only rise. There is
        // no code path here that removes or decrements a fact. This is the
        // structural reason a Vouch tier can never fall.
        if (_firstSeen[subject] == 0 || claim.blockNumber < _firstSeen[subject]) {
            _firstSeen[subject] = claim.blockNumber;
        }
        if (claim.blockNumber > _lastSeen[subject]) {
            _lastSeen[subject] = claim.blockNumber;
        }

        emit FactVerified(factId, subject, claim.factType, value);
        return true;
    }

    // ---------------------------------------------------------------------
    // The primitive
    // ---------------------------------------------------------------------

    function hasProof(address subject, bytes32 factType) external view override returns (bool) {
        return _proofCount[subject][factType] > 0;
    }

    function proofCount(address subject, bytes32 factType) external view override returns (uint32) {
        return _proofCount[subject][factType];
    }

    function proofValue(address subject, bytes32 factType) external view override returns (uint256) {
        return _proofValue[subject][factType];
    }

    // ---------------------------------------------------------------------
    // Detail
    // ---------------------------------------------------------------------

    function getFact(bytes32 factId) external view override returns (VouchTypes.VerifiedFact memory) {
        return _facts[factId];
    }

    function isVerified(bytes32 factId) public view override(IVouchRegistry, ReplayGuard) returns (bool) {
        return ReplayGuard.isVerified(factId);
    }

    function factIdsOf(address subject) external view override returns (bytes32[] memory) {
        return _subjectFacts[subject];
    }

    function firstSeen(address subject) external view override returns (uint64) {
        return _firstSeen[subject];
    }

    function lastSeen(address subject) external view override returns (uint64) {
        return _lastSeen[subject];
    }

    function totalProofs(address subject) external view override returns (uint32) {
        return _totalProofs[subject];
    }
}
