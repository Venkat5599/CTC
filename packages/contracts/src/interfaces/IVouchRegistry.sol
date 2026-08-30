// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTypes} from "../core/VouchTypes.sol";

/// @title IVouchRegistry
/// @notice The public primitive. Any Creditcoin contract can consume Vouch
///         through this interface in a single view call.
///
///         if (IVouchRegistry(VOUCH).hasProof(user, AAVE_REPAYMENT)) {
///             collateralBps = 11_500; // 115% instead of 150%
///         }
///
/// @dev Vouch proves facts. It does not decide what they mean. Whether a proven
///      repayment is worth a lower collateral ratio, a fee tier, or a game
///      unlock is the consumer's decision.
interface IVouchRegistry {
    event FactVerified(bytes32 indexed factId, address indexed subject, bytes32 indexed factType, uint256 value);

    function submitBatch(VouchTypes.BatchContinuity calldata continuity, VouchTypes.FactClaim[] calldata claims)
        external
        returns (uint256 verifiedCount);

    // --- the primitive ---
    function hasProof(address subject, bytes32 factType) external view returns (bool);
    function proofCount(address subject, bytes32 factType) external view returns (uint32);
    function proofValue(address subject, bytes32 factType) external view returns (uint256);

    // --- detail ---
    function getFact(bytes32 factId) external view returns (VouchTypes.VerifiedFact memory);
    function isVerified(bytes32 factId) external view returns (bool);
    function factIdsOf(address subject) external view returns (bytes32[] memory);
    function firstSeen(address subject) external view returns (uint64);
    function lastSeen(address subject) external view returns (uint64);
    function totalProofs(address subject) external view returns (uint32);
}
