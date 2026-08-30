// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ReceiptBuilder
/// @notice Builds `encodedTransaction` payloads in the exact shape the Attestcoin
///         prover hands to an ASC, so tests exercise the real decode path.
/// @dev The prover's wire format is documented in `EvmV1Decoder`:
///
///          abi.encode(uint8 txType, bytes[] chunks)
///
///      where `chunks[0]` is the common transaction fields, `chunks[1]` is the
///      type-specific fields, and the LAST chunk is the receipt. Types 0-2 carry
///      three chunks; types 3-4 carry four, with the extra chunk sitting in the
///      middle for blob / authorization-list extras.
///
///      Nothing here is RLP. The prover has already parsed the source chain and
///      re-encoded it as plain ABI, which is why fixtures can be built in
///      Solidity without a serialisation library.
///
///      The struct below is declared locally rather than imported because
///      `EvmV1Decoder.LogEntryTuple` is library-internal. ABI encoding is
///      structural, not nominal, so an identically-shaped struct encodes
///      identically and the decoder cannot tell the difference.
library ReceiptBuilder {
    struct Log {
        address emitter;
        bytes32[] topics;
        bytes data;
    }

    uint8 internal constant TX_TYPE_LEGACY = 0;
    uint8 internal constant TX_TYPE_EIP1559 = 2;
    uint8 internal constant TX_TYPE_BLOB = 3;

    uint8 internal constant STATUS_SUCCESS = 1;
    uint8 internal constant STATUS_REVERTED = 0;

    /// @notice Build a successful EIP-1559 transaction carrying `logs`.
    function successful(Log[] memory logs) internal pure returns (bytes memory) {
        return build(TX_TYPE_EIP1559, STATUS_SUCCESS, logs);
    }

    /// @notice Build a REVERTED transaction carrying `logs`.
    /// @dev This is the S1 fixture. A reverted transaction is still included in
    ///      its block and still yields a completely valid inclusion proof, logs
    ///      and all. The registry has to reject it on the status field alone.
    function reverted(Log[] memory logs) internal pure returns (bytes memory) {
        return build(TX_TYPE_EIP1559, STATUS_REVERTED, logs);
    }

    function build(uint8 txType, uint8 status, Log[] memory logs) internal pure returns (bytes memory) {
        uint256 chunkCount = txType <= 2 ? 3 : 4;
        bytes[] memory chunks = new bytes[](chunkCount);

        chunks[0] = _commonChunk();
        chunks[1] = _typeSpecificChunk(txType);
        if (chunkCount == 4) {
            chunks[2] = hex"";
        }
        chunks[chunkCount - 1] = _receiptChunk(status, logs);

        return abi.encode(txType, chunks);
    }

    /// @notice Build a transaction whose encoding is structurally valid but whose
    ///         declared type is out of range, for the UnsupportedTransactionType path.
    function withInvalidType() internal pure returns (bytes memory) {
        bytes[] memory chunks = new bytes[](3);
        chunks[0] = _commonChunk();
        chunks[1] = _typeSpecificChunk(TX_TYPE_LEGACY);
        chunks[2] = _receiptChunk(STATUS_SUCCESS, new Log[](0));
        return abi.encode(uint8(9), chunks);
    }

    // -----------------------------------------------------------------------
    // Log construction
    // -----------------------------------------------------------------------

    /// @notice One log with an arbitrary topic list.
    function log(address emitter, bytes32[] memory topics, bytes memory data)
        internal
        pure
        returns (Log memory)
    {
        return Log({emitter: emitter, topics: topics, data: data});
    }

    /// @notice An Aave-V3-shaped `Repay` log.
    /// @dev topics: [signature, reserve, user, repayer]; data: (amount, useATokens).
    ///      `user` sits at topic index 2, which is what the source registry pins
    ///      as `subjectTopicIndex` for AAVE_REPAYMENT.
    function repayLog(address emitter, bytes32 topic0, address reserve, address user, uint256 amount)
        internal
        pure
        returns (Log memory)
    {
        bytes32[] memory topics = new bytes32[](4);
        topics[0] = topic0;
        topics[1] = bytes32(uint256(uint160(reserve)));
        topics[2] = bytes32(uint256(uint160(user)));
        topics[3] = bytes32(uint256(uint160(user)));
        return Log({emitter: emitter, topics: topics, data: abi.encode(amount, false)});
    }

    /// @notice A log with a topic0 but no subject topic, for the malformed-log path.
    function shortLog(address emitter, bytes32 topic0) internal pure returns (Log memory) {
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = topic0;
        return Log({emitter: emitter, topics: topics, data: abi.encode(uint256(0))});
    }

    function one(Log memory a) internal pure returns (Log[] memory out) {
        out = new Log[](1);
        out[0] = a;
    }

    function two(Log memory a, Log memory b) internal pure returns (Log[] memory out) {
        out = new Log[](2);
        out[0] = a;
        out[1] = b;
    }

    function three(Log memory a, Log memory b, Log memory c) internal pure returns (Log[] memory out) {
        out = new Log[](3);
        out[0] = a;
        out[1] = b;
        out[2] = c;
    }

    // -----------------------------------------------------------------------
    // Chunk encoders
    // -----------------------------------------------------------------------

    function _commonChunk() private pure returns (bytes memory) {
        // (nonce, gasLimit, from, toIsNull, to, value, data)
        return abi.encode(
            uint64(1),
            uint64(21_000),
            address(0xA11CE),
            false,
            address(0xB0B),
            uint256(0),
            bytes("")
        );
    }

    function _typeSpecificChunk(uint8 txType) private pure returns (bytes memory) {
        if (txType == TX_TYPE_LEGACY) {
            // (gasPrice, v, r, s)
            return abi.encode(uint128(1 gwei), uint256(27), bytes32(0), bytes32(0));
        }
        // Type 2: (chainId, maxPriorityFeePerGas, maxFeePerGas, accessList, yParity, r, s)
        AccessListEntry[] memory accessList = new AccessListEntry[](0);
        return abi.encode(
            uint64(1), uint128(1 gwei), uint128(2 gwei), accessList, uint8(0), bytes32(0), bytes32(0)
        );
    }

    function _receiptChunk(uint8 status, Log[] memory logs) private pure returns (bytes memory) {
        // (receiptStatus, receiptGasUsed, logs, logsBloom)
        return abi.encode(status, uint64(100_000), logs, bytes(""));
    }
}

/// @dev Mirrors `EvmV1Decoder.AccessListEntryBytes32` for encoding purposes.
struct AccessListEntry {
    address account;
    bytes32[] storageKeys;
}
