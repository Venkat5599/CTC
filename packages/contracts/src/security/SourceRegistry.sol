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

    modifier onlyAdmin() {
        if (msg.sender != admin) revert VouchErrors.NotAdmin(msg.sender);
        _;
    }

    constructor(address admin_) {
        if (admin_ == address(0)) revert VouchErrors.ZeroAddress();
        admin = admin_;
    }

    function registerSource(bytes32 factType, uint64 chainKey, address emitter, bytes32 topic0, uint8 subjectTopicIndex)
        external
        onlyAdmin
    {
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
            enabled: true
        });

        emit SourceRegistered(factType, chainKey, emitter, topic0);
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
