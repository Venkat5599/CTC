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
///
///      A NOTE ON THE LOG INDEX. An earlier version of this file located its
///      log with `EvmV1Decoder.getLogsByEventSignature` and then used the
///      position within that FILTERED array as the log index. That is not a log
///      index — the filter has already discarded the original positions, so the
///      number names nothing on the source chain, and since the scan stopped at
///      the first match, a transaction emitting several qualifying logs could
///      only ever produce one fact. Both problems are the same problem, and both
///      disappear by not filtering: the caller names the receipt-wide index and
///      this function verifies the log sitting there is the one the registry
///      pinned. Cheaper, correct, and multi-log capable.
library SourceValidator {
    /// @notice Validate the named log against a registered source and extract the fact.
    /// @param encodedTransaction The verified transaction bytes from the precompile.
    /// @param src The registered source this claim must match.
    /// @param logIndex Receipt-wide index of the log being claimed.
    /// @param txHash Source transaction hash, for error reporting.
    /// @return subject The address the fact is about.
    /// @return value The primary numeric payload (first word of log data).
    /// @return payloadHash Commitment to the full decoded log data.
    function validateAndExtract(
        bytes memory encodedTransaction,
        VouchTypes.RegisteredSource memory src,
        uint32 logIndex,
        bytes32 txHash
    ) internal pure returns (address subject, uint256 value, bytes32 payloadHash) {
        // --- transaction shape ---
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        if (!EvmV1Decoder.isValidTransactionType(txType)) {
            revert VouchErrors.UnsupportedTransactionType(txType);
        }

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);

        // --- S1: the precompile proved inclusion, NOT success ---
        if (receipt.receiptStatus != 1) revert VouchErrors.TransactionReverted(txHash);

        // --- the claimed log must exist ---
        if (logIndex >= receipt.receiptLogs.length) {
            revert VouchErrors.LogIndexOutOfRange(logIndex, receipt.receiptLogs.length);
        }
        EvmV1Decoder.LogEntry memory entry = receipt.receiptLogs[logIndex];

        // --- the log must be the registered event ---
        if (entry.topics.length == 0 || entry.topics[0] != src.topic0) {
            revert VouchErrors.TopicMismatch(src.topic0, entry.topics.length == 0 ? bytes32(0) : entry.topics[0]);
        }

        // --- S2: the signature alone proves nothing. Pin the emitter. ---
        // A spoofed log carrying an identical topic0 from an attacker-deployed
        // contract dies here, and it dies whichever index it was placed at.
        if (entry.address_ != src.emitter) {
            revert VouchErrors.EmitterMismatch(src.emitter, entry.address_);
        }

        // --- subject comes from the PROVEN payload, never from calldata ---
        if (entry.topics.length <= src.subjectTopicIndex) {
            revert VouchErrors.SubjectTopicMissing(src.subjectTopicIndex, entry.topics.length);
        }
        subject = address(uint160(uint256(entry.topics[src.subjectTopicIndex])));

        // S4. The reserve asset, when the source pins one.
        //
        // Emitter pinning proves the REAL pool emitted this. It says nothing
        // about what was repaid. An attacker lists a worthless ERC-20 in an
        // isolated market, self-borrows and self-repays a million units, and
        // every check above passes because every field is genuine.
        //
        // Pinning the asset is an equality check and needs no oracle. What it
        // does NOT do is tell you the repayment was worth anything -- a pinned
        // asset can still be repaid in a trivial amount, and `value` remains a
        // number denominated in a token this contract cannot price.
        if (src.reserveAsset != address(0)) {
            if (entry.topics.length <= src.assetTopicIndex) {
                revert VouchErrors.AssetTopicMissing(src.assetTopicIndex, entry.topics.length);
            }
            address asset = address(uint160(uint256(entry.topics[src.assetTopicIndex])));
            if (asset != src.reserveAsset) {
                revert VouchErrors.ReserveAssetMismatch(src.reserveAsset, asset);
            }
        }

        // S5. Distinct payer, when the source requires one.
        //
        // Wash repayment is `payer == subject`, cycled to farm proofCount. Every
        // field is genuine, so nothing above catches it.
        //
        // This is off unless a source opts in, and that is deliberate: an honest
        // borrower repaying their own loan ALSO has `payer == subject`. Enforcing
        // it everywhere would reject the ordinary case to stop the adversarial
        // one. Where it is on, the fact means something narrower and stronger --
        // somebody else settled this debt -- and the registrar chose that.
        if (src.requireDistinctPayer) {
            if (entry.topics.length <= src.payerTopicIndex) {
                revert VouchErrors.PayerTopicMissing(src.payerTopicIndex, entry.topics.length);
            }
            address payer = address(uint160(uint256(entry.topics[src.payerTopicIndex])));
            if (payer == subject) revert VouchErrors.PayerIsSubject(subject);
        }

        // --- primary numeric value: first word of log data ---
        if (entry.data.length >= 32) {
            bytes memory data = entry.data;
            uint256 v;
            // solhint-disable-next-line no-inline-assembly
            assembly {
                v := mload(add(data, 32))
            }
            value = v;
        }

        payloadHash = keccak256(entry.data);
    }
}
