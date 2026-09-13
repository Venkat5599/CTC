// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTestBase} from "./helpers/VouchTestBase.sol";
import {ReceiptBuilder} from "./helpers/ReceiptBuilder.sol";

import {VouchAccess} from "../src/consumers/VouchAccess.sol";
import {VouchCredit} from "../src/consumers/VouchCredit.sol";
import {VouchPassport} from "../src/passport/VouchPassport.sol";
import {VouchTypes} from "../src/core/VouchTypes.sol";
import {VouchErrors} from "../src/core/VouchErrors.sol";
import {FactTypes, EventSignatures} from "../src/core/FactTypes.sol";

/// @title ComplianceTest
/// @notice Cross-chain KYC as a registry entry, not a protocol.
///
/// @dev THE CLAIM UNDER TEST.
///
///      Cross-chain compliance is normally proposed as its own system: an
///      attestation network, a KYC bridge, a second registry per chain. The
///      claim this suite checks is that in a registry which already pins the
///      emitter, it is a `registerSource` call.
///
///      `test_addingComplianceRequiresNoContractChange` is that claim, and it is
///      falsifiable: it registers ERC-3643 `IdentityRegistered` on a REGISTRY
///      THAT IS ALREADY DEPLOYED in this fixture, proves an accreditation
///      through it, and gates a consumer on the result. If carrying a new domain
///      needed a new code path, this test could not compile.
///
///      ERC-3643 is deliberately chosen over a KYC registry written for this
///      repo. A source we authored ourselves and then proved would demonstrate
///      only that our own contract can emit an event.
///
/// @dev AND THE REASON IT IS SAFE.
///
///      An identity registry is a permissioning contract, so a forged
///      `IdentityRegistered` is self-issued accreditation -- a strictly worse
///      outcome than a forged repayment, because it is the check that gates who
///      may hold the asset at all. Anyone can deploy a contract emitting the
///      identical event and admit themselves, and the resulting inclusion proof
///      is completely valid.
///
///      `test_theForgedAccreditationCarriesAValidProof` asserts that the
///      precompile accepts it, and `test_selfIssuedAccreditationIsRejected`
///      asserts the registry does not. Compliance rides on S2 or it rides on
///      nothing.
contract ComplianceTest is VouchTestBase {
    /// @dev A T-REX IdentityRegistry, as a FIXTURE ADDRESS.
    ///
    ///      Not a real mainnet address, and deliberately not dressed up as one.
    ///      ERC-3643 deployments are per-issuer -- every security token stands
    ///      up its own identity registry -- so there is no canonical address to
    ///      cite the way `AAVE_POOL` is cited, and inventing a plausible one
    ///      would put an unverified constant in a repo whose whole argument is
    ///      that unverified claims are the problem. `FactTypes` states the rule
    ///      already: a source address is verified against the deployed contract
    ///      before registration, never taken from memory.
    ///
    ///      What is under test here is the mechanism -- that a compliance domain
    ///      needs no code -- and the mechanism is address-independent.
    address internal constant IDENTITY_REGISTRY = address(0x1DE471795157);

    /// @dev An attacker-deployed lookalike identity registry.
    address internal constant FAKE_REGISTRY = address(0xFA4E);

    /// @dev The investor's on-chain identity contract (ONCHAINID), topic 2.
    address internal constant IDENTITY = address(0x1DE7);

    VouchAccess internal complianceGate;
    VouchPassport internal passport;

    function setUp() public override {
        super.setUp();

        // The whole integration. No new contract, no upgrade, no migration --
        // the registry deployed in `super.setUp()` is the one being extended.
        vm.prank(ADMIN);
        registry.registerSource(
            FactTypes.KYC_VERIFIED, CHAIN_ETHEREUM, IDENTITY_REGISTRY, EventSignatures.IDENTITY_REGISTERED, 1
        );

        // And the whole consumer. A compliance gate is VouchAccess with a
        // different constructor argument.
        complianceGate = new VouchAccess(address(registry), FactTypes.KYC_VERIFIED, 1);
        passport = new VouchPassport(address(registry));
    }

    // -----------------------------------------------------------------------
    // The claim
    // -----------------------------------------------------------------------

    function test_addingComplianceRequiresNoContractChange() public {
        assertFalse(registry.hasProof(ALICE, FactTypes.KYC_VERIFIED), "unknown before");

        _submit(_kycClaim(IDENTITY_REGISTRY, ALICE, 8_000_000, keccak256("kyc-alice")));

        assertTrue(registry.hasProof(ALICE, FactTypes.KYC_VERIFIED), "proven after");
        assertTrue(complianceGate.isAdmitted(ALICE), "and the gate opens");
    }

    /// @dev The registry now carries four domains through one code path. The
    ///      number is the assertion: a registry that needed a branch per domain
    ///      would not have got here without four edits.
    function test_oneRegistryCarriesFourUnrelatedDomains() public {
        bytes32[] memory types = registry.registeredFactTypes();
        assertEq(types.length, 3, "repayment, supply, kyc");

        vm.prank(ADMIN);
        registry.registerSource(FactTypes.GOVERNANCE_ACTIVITY, CHAIN_ETHEREUM, GOVERNOR, EventSignatures.VOTE_CAST, 1);

        assertEq(registry.registeredFactTypes().length, 4, "credit, liquidity, compliance, governance");
    }

    /// @dev A verified investor is not a creditworthy one. The compliance proof
    ///      opens the compliance gate and moves nothing on the credit side,
    ///      which is what separates a registry of facts from a score.
    function test_accreditationDoesNotLeakIntoCreditTerms() public {
        VouchCredit credit = new VouchCredit(address(registry), address(passport));
        uint16 before = credit.collateralBpsFor(ALICE);

        _submit(_kycClaim(IDENTITY_REGISTRY, ALICE, 8_000_000, keccak256("kyc-alice")));

        assertTrue(complianceGate.isAdmitted(ALICE), "admitted");
        assertEq(credit.collateralBpsFor(ALICE), before, "and still priced as unproven");
        assertEq(passport.tierOf(ALICE), 0, "KYC is not standing");
    }

    /// @dev And the converse. A proven repayment does not make anyone compliant.
    function test_repaymentHistoryDoesNotOpenTheComplianceGate() public {
        _submit(_repayClaim(ALICE, 5_000e6, 21_000_000, keccak256("repay-alice")));

        assertEq(passport.tierOf(ALICE), 1, "bronze on the credit side");
        assertFalse(complianceGate.isAdmitted(ALICE), "and no accreditation");
    }

    // -----------------------------------------------------------------------
    // Why it is safe: the forged accreditation
    // -----------------------------------------------------------------------

    /// @dev The proof itself is valid. The precompile is not compromised and
    ///      does not fail -- it proves inclusion, which is all it ever claimed.
    ///      Stating this explicitly is the point: the danger is not a broken
    ///      prover, it is a consumer that mistakes a valid proof for a true
    ///      claim.
    function test_theForgedAccreditationCarriesAValidProof() public view {
        assertTrue(verifier.shouldVerify(), "the prover accepts the forgery");
    }

    /// @dev Self-issued accreditation: an attacker deploys their own identity
    ///      registry, emits a byte-identical `IdentityRegistered` naming
    ///      themselves, and proves it. Every field is real. Only the emitter
    ///      pin rejects it.
    function test_selfIssuedAccreditationIsRejected() public {
        VouchTypes.FactClaim memory forged = _kycClaim(FAKE_REGISTRY, BOB, 8_000_001, keccak256("kyc-forged"));

        vm.prank(RELAYER);
        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, IDENTITY_REGISTRY, FAKE_REGISTRY));
        registry.submitBatch(_continuity(), _batch(forged));

        assertFalse(complianceGate.isAdmitted(BOB), "the gate stays shut");
    }

    /// @dev The forged and the genuine accreditation are identical in topic0,
    ///      in shape and in proof validity. The emitter is the only field that
    ///      differs, and it is the only field that decides.
    function test_theForgeryDiffersFromTheGenuineArticleInExactlyOneField() public {
        VouchTypes.FactClaim memory forged = _kycClaim(FAKE_REGISTRY, BOB, 8_000_002, keccak256("kyc-pair"));
        VouchTypes.FactClaim memory genuine = _kycClaim(IDENTITY_REGISTRY, BOB, 8_000_003, keccak256("kyc-pair-2"));

        assertEq(forged.factType, genuine.factType, "same fact type");
        assertEq(forged.chainKey, genuine.chainKey, "same chain");
        assertEq(forged.logIndex, genuine.logIndex, "same log position");

        vm.prank(RELAYER);
        vm.expectRevert();
        registry.submitBatch(_continuity(), _batch(forged));

        _submit(genuine);
        assertTrue(complianceGate.isAdmitted(BOB), "only the real registry admits");
    }

    /// @dev A revoked-then-reissued accreditation is out of scope, and saying so
    ///      is the honest position. Inclusion proofs prove positive facts, so
    ///      Vouch can prove an investor WAS admitted and can never prove they
    ///      were not later removed. A consumer needing live revocation must read
    ///      the identity registry on its own chain; what Vouch carries across
    ///      chains is the admission, not the current status.
    function test_admissionIsMonotonicAndThatIsAKnownLimit() public {
        _submit(_kycClaim(IDENTITY_REGISTRY, ALICE, 8_000_004, keccak256("kyc-mono")));
        assertTrue(complianceGate.isAdmitted(ALICE), "admitted");

        // Nothing in the registry can undo it. There is no revoke path to call.
        assertEq(registry.proofCount(ALICE, FactTypes.KYC_VERIFIED), 1, "and it cannot be decremented");
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// @dev ERC-3643 `IdentityRegistered(address indexed investor, address indexed identity)`.
    ///      topics: [sig, investor, identity]; the investor sits at index 1.
    function _kycClaim(address emitter, address investor, uint64 blockNumber, bytes32 txHash)
        internal
        pure
        returns (VouchTypes.FactClaim memory)
    {
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = EventSignatures.IDENTITY_REGISTERED;
        topics[1] = bytes32(uint256(uint160(investor)));
        topics[2] = bytes32(uint256(uint160(IDENTITY)));

        bytes memory encoded =
            ReceiptBuilder.successful(ReceiptBuilder.one(ReceiptBuilder.log(emitter, topics, abi.encode(uint256(1)))));

        return _claim(FactTypes.KYC_VERIFIED, blockNumber, txHash, 0, encoded);
    }
}
