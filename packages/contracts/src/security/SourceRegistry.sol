// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTypes} from "../core/VouchTypes.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title SourceRegistry
/// @notice S2 defence, plus chainKey pinning. Holds the set of source-chain
///         events that count as Vouch facts.
/// @dev Adding a protocol is a registry entry, not a code change. That property
///      is what makes Vouch infrastructure rather than an application.
///
///      chainKey is NOT chainId. On CC3 Testnet: 1 = Sepolia, 3 = Ethereum
///      Mainnet. On CC3 Mainnet: 1 = Ethereum Mainnet. Hard-coding the wrong
///      constant silently changes which chain you trust, so it is pinned per
///      source here and asserted on every claim.
abstract contract SourceRegistry {
    address public admin;

    /// @dev factType => registered source
    mapping(bytes32 => VouchTypes.RegisteredSource) private _sources;
    bytes32[] private _factTypes;

    event SourceRegistered(bytes32 indexed factType, uint64 indexed chainKey, address indexed emitter, bytes32 topic0);
    event SourceEnabledSet(bytes32 indexed factType, bool enabled);
    /// Emitted only when a source carries an economic pin, so the log says which
    /// sources were registered with the stronger guarantee.
    event SourcePinned(bytes32 indexed factType, address indexed reserveAsset, bool requireDistinctPayer);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert VouchErrors.NotAdmin(msg.sender);
        _;
    }

    constructor(address admin_) {
        if (admin_ == address(0)) revert VouchErrors.ZeroAddress();
        admin = admin_;
    }

    /// @notice Register a source with the economic pins left open.
    /// @dev Kept so an existing integration compiles unchanged. It registers a
    ///      source that accepts any reserve asset and any payer, which is what
    ///      every source did before those pins existed. A registrar who wants
    ///      them uses the overload below rather than getting them by accident.
    function registerSource(bytes32 factType, uint64 chainKey, address emitter, bytes32 topic0, uint8 subjectTopicIndex)
        external
        onlyAdmin
    {
        _register(factType, chainKey, emitter, topic0, subjectTopicIndex, address(0), 0, 0, false);
    }

    /// @notice Register a source, pinning the reserve asset and/or the payer.
    ///
    /// @param reserveAsset Asset the event must name. `address(0)` accepts any,
    ///        which leaves permissionless-market self-dealing open -- see
    ///        VouchTypes.RegisteredSource.
    /// @param assetTopicIndex Topic carrying the asset. Read only when pinned.
    /// @param payerTopicIndex Topic carrying whoever settled. Read only when
    ///        `requireDistinctPayer`.
    /// @param requireDistinctPayer Reject `payer == subject`. Narrows what the
    ///        fact means, and rejects honest self-repayment, so it is a choice
    ///        the registrar makes per source rather than a default.
    function registerSourcePinned(
        bytes32 factType,
        uint64 chainKey,
        address emitter,
        bytes32 topic0,
        uint8 subjectTopicIndex,
        address reserveAsset,
        uint8 assetTopicIndex,
        uint8 payerTopicIndex,
        bool requireDistinctPayer
    ) external onlyAdmin {
        _register(
            factType,
            chainKey,
            emitter,
            topic0,
            subjectTopicIndex,
            reserveAsset,
            assetTopicIndex,
            payerTopicIndex,
            requireDistinctPayer
        );
    }

    function _register(
        bytes32 factType,
        uint64 chainKey,
        address emitter,
        bytes32 topic0,
        uint8 subjectTopicIndex,
        address reserveAsset,
        uint8 assetTopicIndex,
        uint8 payerTopicIndex,
        bool requireDistinctPayer
    ) internal {
        if (emitter == address(0)) revert VouchErrors.ZeroAddress();
        if (_sources[factType].emitter == address(0)) {
            _factTypes.push(factType);
        }
        _sources[factType] = VouchTypes.RegisteredSource({
            chainKey: chainKey,
            emitter: emitter,
            topic0: topic0,
            factType: factType,
            subjectTopicIndex: subjectTopicIndex,
            enabled: true,
            reserveAsset: reserveAsset,
            assetTopicIndex: assetTopicIndex,
            payerTopicIndex: payerTopicIndex,
            requireDistinctPayer: requireDistinctPayer
        });
        emit SourceRegistered(factType, chainKey, emitter, topic0);
        if (reserveAsset != address(0) || requireDistinctPayer) {
            emit SourcePinned(factType, reserveAsset, requireDistinctPayer);
        }
    }

    function setSourceEnabled(bytes32 factType, bool enabled) external onlyAdmin {
        _sources[factType].enabled = enabled;
        emit SourceEnabledSet(factType, enabled);
    }

    function getSource(bytes32 factType) public view returns (VouchTypes.RegisteredSource memory) {
        return _sources[factType];
    }

    function registeredFactTypes() external view returns (bytes32[] memory) {
        return _factTypes;
    }

    function _requireEnabledSource(bytes32 factType) internal view returns (VouchTypes.RegisteredSource memory src) {
        src = _sources[factType];
        if (src.emitter == address(0)) {
            revert VouchErrors.SourceNotRegistered(0, address(0), factType);
        }
        if (!src.enabled) revert VouchErrors.SourceDisabled(factType);
    }
}
