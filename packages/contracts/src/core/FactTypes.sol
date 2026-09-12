// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title FactTypes
/// @notice Canonical fact type identifiers.
/// @dev Three types spanning three domains ship in v1, deliberately. Shipping
///      only AAVE_REPAYMENT would collapse Vouch back into a credit-score
///      product; the point of the registry is that it is domain-agnostic.
///
///      Adding a fourth is a SourceRegistry entry, not a code change.
library FactTypes {
    /// @dev Credit. Aave V3 Repay.
    bytes32 internal constant AAVE_REPAYMENT = keccak256("AAVE_REPAYMENT");

    /// @dev Liquidity. Aave V3 Supply, with tenure derived from block bounds.
    bytes32 internal constant LONG_TERM_LP = keccak256("LONG_TERM_LP");

    /// @dev Governance. Governor VoteCast.
    bytes32 internal constant GOVERNANCE_ACTIVITY = keccak256("GOVERNANCE_ACTIVITY");

    /// @dev Compliance. ERC-3643 `IdentityRegistered`, the moment an identity
    ///      registry admits an investor to a permissioned security token.
    ///
    ///      This constant is here to make a structural point rather than to
    ///      widen a product. Cross-chain compliance is usually pitched as its
    ///      own protocol: a KYC bridge, an attestation network, a second
    ///      registry to maintain. In a registry that pins the emitter, it is a
    ///      `registerSource` call and a `bytes32`. NOT ONE LINE of VouchRegistry
    ///      changes to carry it, which is the difference between infrastructure
    ///      and an application with a compliance feature.
    ///
    ///      And the emitter pin is exactly what a compliance fact needs most.
    ///      An identity registry is a permissioning contract; anyone can deploy
    ///      one emitting a byte-identical `IdentityRegistered` and admit
    ///      themselves. That forged accreditation carries a VALID inclusion
    ///      proof. S2 is the only thing standing between it and a credited
    ///      investor -- see `ComplianceTest`.
    bytes32 internal constant KYC_VERIFIED = keccak256("KYC_VERIFIED");
}

/// @title EventSignatures
/// @notice topic0 values for the registered source events.
/// @dev These MUST be verified against the deployed source contracts before
///      deployment, never taken from memory. Pinning the wrong signature makes
///      the registry silently unable to match any log.
library EventSignatures {
    /// @dev keccak256("Repay(address,address,address,uint256,bool)")
    ///      Aave V3 Pool. topics: [sig, reserve, user, repayer]; data: (amount, useATokens)
    ///      subjectTopicIndex = 2 (user)
    bytes32 internal constant AAVE_REPAY = keccak256("Repay(address,address,address,uint256,bool)");

    /// @dev keccak256("Supply(address,address,address,uint256,uint16)")
    ///      Aave V3 Pool. topics: [sig, reserve, onBehalfOf, referralCode]; data: (user, amount)
    ///      subjectTopicIndex = 2 (onBehalfOf)
    bytes32 internal constant AAVE_SUPPLY = keccak256("Supply(address,address,address,uint256,uint16)");

    /// @dev keccak256("VoteCast(address,uint256,uint8,uint256,string)")
    ///      OpenZeppelin Governor. Note: voter is NOT indexed in the standard
    ///      Governor, so a Governor whose voter is indexed must be chosen, or
    ///      the subject must be decoded from data. Verify before registering.
    bytes32 internal constant VOTE_CAST = keccak256("VoteCast(address,uint256,uint8,uint256,string)");

    /// @dev keccak256("IdentityRegistered(address,address)")
    ///      ERC-3643 (T-REX) IdentityRegistry. topics: [sig, investorAddress, identity]
    ///      subjectTopicIndex = 1 (investorAddress)
    ///
    ///      ERC-3643 is the deployed standard for permissioned security tokens,
    ///      which is why the compliance fact is anchored to it rather than to a
    ///      KYC registry written for this repo. A source we authored ourselves
    ///      would prove only that our own contract fired.
    bytes32 internal constant IDENTITY_REGISTERED = keccak256("IdentityRegistered(address,address)");
}
