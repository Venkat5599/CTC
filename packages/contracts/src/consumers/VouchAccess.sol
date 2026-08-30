// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVouchRegistry} from "../interfaces/IVouchRegistry.sol";
import {VouchErrors} from "../core/VouchErrors.sol";

/// @title VouchAccess
/// @notice Third consumer. A permissionless gate that opens on proven standing.
///
/// @dev A game, a mint, a governance forum, a private pool — any application
///      whose only question is "has this address done the thing?" Historically
///      that question is answered with a snapshot: someone picks a block, runs a
///      script, publishes a merkle root, and every participant trusts that the
///      script was honest and the list was not edited. Here the same question is
///      a view call against a fact that was cryptographically proven once.
///
///      Two properties worth noticing.
///
///      The gate is configured rather than coded. `requiredFactType` is set at
///      construction, so a fourth or fortieth application does not need a new
///      contract type — it needs a different constructor argument. Adding a
///      protocol to Vouch is a SourceRegistry entry, and consuming it is a
///      deployment parameter.
///
///      And the gate is monotonic like everything downstream of the registry.
///      Once an address is admitted it stays admitted, because the registry has
///      no code path that removes a fact. Nobody can be quietly de-listed.
contract VouchAccess {
    IVouchRegistry public immutable REGISTRY;

    /// @dev Which proven fact opens this particular gate.
    bytes32 public immutable REQUIRED_FACT_TYPE;

    /// @dev How many proofs of it are needed. One, for a simple gate.
    uint32 public immutable MIN_PROOFS;

    event Admitted(address indexed member, bytes32 indexed factType, uint32 proofs);

    mapping(address => bool) public hasClaimed;

    constructor(address registry_, bytes32 requiredFactType_, uint32 minProofs_) {
        if (registry_ == address(0)) revert VouchErrors.ZeroAddress();
        REGISTRY = IVouchRegistry(registry_);
        REQUIRED_FACT_TYPE = requiredFactType_;
        MIN_PROOFS = minProofs_ == 0 ? 1 : minProofs_;
    }

    /// @notice The entire integration.
    function isAdmitted(address member) public view returns (bool) {
        return REGISTRY.proofCount(member, REQUIRED_FACT_TYPE) >= MIN_PROOFS;
    }

    /// @notice Claim the benefit behind the gate. Callable once, by the member themselves.
    /// @dev Self-service and unattended. There is no allowlist to maintain and
    ///      no operator who could refuse.
    function claim() external {
        if (!isAdmitted(msg.sender)) revert NotAdmitted(msg.sender, REQUIRED_FACT_TYPE);
        if (hasClaimed[msg.sender]) revert AlreadyClaimed(msg.sender);

        hasClaimed[msg.sender] = true;
        emit Admitted(msg.sender, REQUIRED_FACT_TYPE, REGISTRY.proofCount(msg.sender, REQUIRED_FACT_TYPE));
    }

    error NotAdmitted(address member, bytes32 requiredFactType);
    error AlreadyClaimed(address member);
}
