// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchErrors} from "../core/VouchErrors.sol";

/// @title ReplayGuard
/// @notice S3 defence. Each source-chain log may be consumed exactly once.
/// @dev The reference ASCBase keys its guard on (chainKey, blockHeight, txIndex),
///      which is per-TRANSACTION. A single transaction can contain several
///      qualifying logs, so a per-transaction key either over-consumes (drops
///      legitimate facts) or under-protects. Vouch keys on the LOG:
///      keccak(chainKey, blockNumber, txHash, logIndex).
abstract contract ReplayGuard {
    mapping(bytes32 => bool) private _consumed;

    event FactConsumed(bytes32 indexed factId);

    function isVerified(bytes32 factId) public view virtual returns (bool) {
        return _consumed[factId];
    }

    /// @dev factType is part of the key on purpose. The tuple
    ///      (chainKey, blockNumber, txHash, logIndex) already names exactly one
    ///      log on the source chain, so it would be sufficient to stop replay.
    ///      Including factType keeps the door open for one log to satisfy two
    ///      registered fact types at once — a Repay that counts as both
    ///      AAVE_REPAYMENT and some future broader DEFI_ACTIVITY — without the
    ///      second registration being silently rejected as a replay of the
    ///      first. Two DIFFERENT meanings drawn from one proven event is a
    ///      legitimate registry configuration; the same meaning drawn twice is
    ///      not, and that is what this guard still blocks.
    function _factId(uint64 chainKey, uint64 blockNumber, bytes32 txHash, bytes32 factType, uint32 logIndex)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(chainKey, blockNumber, txHash, factType, logIndex));
    }

    function _consume(bytes32 factId) internal {
        if (_consumed[factId]) revert VouchErrors.FactAlreadyVerified(factId);
        _consumed[factId] = true;
        emit FactConsumed(factId);
    }
}
