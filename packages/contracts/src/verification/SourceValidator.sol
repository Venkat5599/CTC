// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import {VouchTypes} from "../core/VouchTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title SourceValidator
/// @notice Turns a PROVEN transaction into a MEANINGFUL fact. This is where S1
///         and S2 are enforced, and it is the most security-critical file here.
///
/// @dev The Attestcoin docs carry an explicit warning:
///
///        "The block prover precompile DOES NOT validate if a transaction was
///         successful or not. It only validates if a transaction is included in
///         a block and that block is really a part of the confirmed source
///         chain. Therefore, a dApp's ASC MUST check the status field."
///
///      S1 — a reverted transaction is still included in a block and still
///      yields a completely valid proof. Skipping the status check credits
///      actions that never took effect. The failure is silent: the precompile
///      returns true and nothing reverts.
///
///      S2 — a valid proof of a lookalike event from an attacker-deployed
///      contract is ALSO a valid proof. An attacker can deploy their own
///      mainnet contract emitting an identical event signature and mint
///      themselves a history. The proof system is not compromised; the
///      consuming contract simply failed to establish semantics. Pinning the
///      emitter address is the only defence.
library SourceValidator {
    /// @notice Extract and validate the log matching a registered source.
    /// @param encodedTransaction The verified transaction bytes from the precompile.
    /// @param src The registered source this claim must match.
    /// @param txHash Source transaction hash, for error reporting.
    /// @return logIndex Index of the matched log within the receipt.
    /// @return subject The address the fact is about.
    /// @return value The primary numeric payload (first 32 bytes of log data).
    /// @return payloadHash Commitment to the full decoded log data.
    function validateAndExtract(
        bytes memory encodedTransaction,
        VouchTypes.RegisteredSource memory src,
        bytes32 txHash
    ) internal pure returns (uint32 logIndex, address subject, uint256 value, bytes32 payloadHash) {
        // --- transaction shape ---
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        if (!EvmV1Decoder.isValidTransactionType(txType)) {
            revert VouchErrors.UnsupportedTransactionType(txType);
        }

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);

        // --- S1: the precompile proved inclusion, NOT success ---
        if (receipt.receiptStatus != 1) revert VouchErrors.TransactionReverted(txHash);

        // --- locate candidate logs by event signature ---
        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, src.topic0);
        if (logs.length == 0) revert VouchErrors.NoMatchingLogs(src.topic0);

        // --- S2: the signature alone proves nothing. Pin the emitter. ---
        // Walk candidates and take the first whose emitter matches the pinned
        // source contract. A spoofed log with an identical topic0 is skipped
        // here, and if no log survives the filter the claim reverts.
        bool found;
        EvmV1Decoder.LogEntry memory log;
        for (uint256 i = 0; i < logs.length; ++i) {
            if (logs[i].address_ == src.emitter) {
                log = logs[i];
                logIndex = uint32(i);
                found = true;
                break;
            }
        }
        if (!found) revert VouchErrors.EmitterMismatch(src.emitter, logs[0].address_);

        // --- subject comes from the PROVEN payload, never from calldata ---
        if (log.topics.length <= src.subjectTopicIndex) {
            revert VouchErrors.NoMatchingLogs(src.topic0);
        }
        subject = address(uint160(uint256(log.topics[src.subjectTopicIndex])));

        // --- primary numeric value: first word of log data ---
        if (log.data.length >= 32) {
            bytes memory data = log.data;
            uint256 v;
            assembly {
                v := mload(add(data, 32))
            }
            value = v;
        }

        payloadHash = keccak256(abi.encodePacked(log.data));
    }
}
