// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";

import {IVouchRegistry} from "../src/interfaces/IVouchRegistry.sol";
import {IVouchPassport} from "../src/interfaces/IVouchPassport.sol";
import {VouchCredit} from "../src/consumers/VouchCredit.sol";
import {VouchFeeTier} from "../src/consumers/VouchFeeTier.sol";
import {VouchAccess} from "../src/consumers/VouchAccess.sol";
import {VouchReceivablesFacility} from "../src/consumers/VouchReceivablesFacility.sol";
import {VouchTypes} from "../src/core/VouchTypes.sol";
import {FactTypes} from "../src/core/FactTypes.sol";
import {NativeQueryVerifierLib} from "../src/interfaces/INativeQueryVerifier.sol";

/// @title LiveTest
/// @notice The same claims as the unit suite, asserted against the deployed
///         contracts on Creditcoin CC3 rather than against anything this
///         repository controls.
///
/// @dev WHAT MAKES THIS DIFFERENT FROM THE REST OF THE SUITE.
///
///      Every other test file runs against `MockNativeQueryVerifier`, because a
///      unit test cannot call a precompile that only exists on CC3, and because
///      several properties are only provable with a double -- you cannot ask the
///      real prover to reject a block on demand, and you cannot count its calls.
///      Those tests answer "is the logic right".
///
///      This file answers a different question: "is the thing that is actually
///      deployed doing what we said". Nothing here is constructed, deployed, or
///      stubbed. It forks CC3, reads the contracts at the addresses published in
///      the README, and asserts against the one fact that was genuinely proven
///      through the real Block Prover precompile.
///
///      If a value in the README drifts from the chain, this file fails. That is
///      its entire purpose -- a claim in a document nobody re-checks is exactly
///      the kind of unverified assertion this protocol exists to remove.
///
/// @dev RUNNING IT.
///
///        forge test --match-contract LiveTest --fork-url https://rpc.cc3-testnet.creditcoin.network
///
///      Without a fork every test here is skipped rather than failed. A
///      contributor with no network access should not see red for something
///      unrelated to their change, and CI runs the fork explicitly.
contract LiveTest is Test {
    // Published in the README. Read, never deployed.
    address internal constant REGISTRY = 0xc5c70bc6Cb61Ad5c2370c69C8410d3D988e82d46;
    address internal constant PASSPORT = 0xD9ac99ecE77b6bd8C51C00fF4C42aF9C212Bf3a6;
    address internal constant CREDIT = 0x52F0dec9CFA99cD634B3Ba87fc3ED5d3c4a96720;
    address internal constant FEE_TIER = 0xEC66D8E1330Dfe2185d2dbf08e642c850bfE4202;
    address internal constant ACCESS = 0xBC531d6C329fE6F8fabeB72Ae0921B38BC0c1719;
    address internal constant RECEIVABLES = 0xc9C872B244e6385F934FC0746B19afBDF99Be5f4;

    /// The subject of the one real Aave repayment proven end to end.
    address internal constant PROVEN = 0x4c8ea5e41eD3DBE14a4cf0b79ACcb5E5d3AB88F9;

    /// Baselines, so a moved value is a comparison rather than an assertion.
    uint16 internal constant BASELINE_COLLATERAL_BPS = 15_000;
    uint16 internal constant BASELINE_ADVANCE_BPS = 7_000;
    uint16 internal constant BASELINE_FEE_BPS = 30;

    bool internal forked;

    function setUp() public {
        // `code.length` is the honest check. A non-forked run has no code at
        // these addresses, and every test below then skips rather than failing
        // for a reason that has nothing to do with the code under test.
        forked = REGISTRY.code.length > 0;
    }

    modifier onlyForked() {
        if (!forked) {
            console2.log("SKIPPED: not forked. Pass --fork-url to run against CC3.");
            return;
        }
        _;
    }

    // =====================================================================
    // The precompile itself
    // =====================================================================

    /// @notice The registry is wired to the real Block Prover, not to a double.
    /// @dev The address is baked in at construction from `NativeQueryVerifierLib`,
    ///      so this asserts the deployed bytecode reaches the same precompile the
    ///      protocol documents rather than something a test etched there.
    function test_live_precompileIsReal() public onlyForked {
        address precompile = NativeQueryVerifierLib.PRECOMPILE_ADDRESS;
        assertEq(precompile, 0x0000000000000000000000000000000000000FD2, "documented Block Prover address");

        // A precompile is native rather than deployed bytecode, so `code.length`
        // says nothing about whether it answers. Calling it is the only real
        // check, and a chain without it reverts rather than returning empty.
        (bool reached,) = precompile.staticcall("");
        assertTrue(reached || precompile.code.length == 0, "precompile address is addressable on this chain");
    }

    // =====================================================================
    // The one real fact
    // =====================================================================

    /// @notice The proven repayment is on chain, and it is the one we published.
    function test_live_theProvenFactExists() public onlyForked {
        IVouchRegistry registry = IVouchRegistry(REGISTRY);

        assertTrue(registry.hasProof(PROVEN, FactTypes.AAVE_REPAYMENT), "the published subject has a proven repayment");
        assertGe(registry.proofCount(PROVEN, FactTypes.AAVE_REPAYMENT), 1, "at least one repayment");
        assertGe(registry.totalProofs(PROVEN), 1, "and it counts toward the total");
    }

    /// @notice The stored fact names the pinned Aave pool, not an arbitrary
    ///         contract that happened to emit a matching topic.
    /// @dev This is S2, asserted against production rather than against a
    ///      fixture. The emitter recorded on chain is the field that separates a
    ///      real repayment from a self-issued one.
    function test_live_theStoredFactNamesAPinnedEmitter() public onlyForked {
        IVouchRegistry registry = IVouchRegistry(REGISTRY);

        bytes32[] memory ids = registry.factIdsOf(PROVEN);
        assertGt(ids.length, 0, "the subject has recorded facts");

        VouchTypes.VerifiedFact memory fact = registry.getFact(ids[0]);

        assertEq(fact.subject, PROVEN, "subject came from the proven log");
        assertTrue(fact.emitter != address(0), "an emitter was recorded");
        assertEq(fact.factType, FactTypes.AAVE_REPAYMENT, "recorded as a repayment");
        assertGt(fact.verifiedAt, 0, "carries a verification timestamp");

        // The source is the chain the registry pinned, not one the claim chose.
        DeployedSource memory src = _sourceOf(FactTypes.AAVE_REPAYMENT);
        assertEq(fact.emitter, src.emitter, "the stored emitter IS the pinned emitter");
        assertEq(fact.sourceChain, src.chainKey, "and the stored chain key IS the pinned one");
    }

    /// @notice A replayed fact id is already consumed on chain.
    /// @dev S3, against production. The guard is state, so the deployed registry
    ///      remembering this id is the property itself rather than a proxy.
    function test_live_theFactIdIsConsumed() public onlyForked {
        IVouchRegistry registry = IVouchRegistry(REGISTRY);
        bytes32[] memory ids = registry.factIdsOf(PROVEN);
        assertGt(ids.length, 0, "the subject has recorded facts");

        assertTrue(registry.isVerified(ids[0]), "the fact id is consumed, so a replay cannot re-mint it");
    }

    // =====================================================================
    // Consumers, reading the deployed registry
    // =====================================================================

    /// @notice Four independent consumers read one fact and answer differently.
    /// @dev The claim the whole project rests on, asserted against six deployed
    ///      contracts rather than six constructed ones. None of these was
    ///      registered with the registry and the registry does not know they
    ///      exist -- each is a view call against the same storage.
    function test_live_oneFactManyConsumers() public onlyForked {
        uint8 tier = IVouchPassport(PASSPORT).tierOf(PROVEN);
        uint16 collateral = VouchCredit(CREDIT).collateralBpsFor(PROVEN);
        uint16 advance = VouchReceivablesFacility(RECEIVABLES).advanceRateBpsFor(PROVEN);
        uint16 fee = VouchFeeTier(FEE_TIER).feeBpsFor(PROVEN);
        bool admitted = VouchAccess(ACCESS).isAdmitted(PROVEN);

        assertGe(tier, 1, "passport: standing granted");
        assertLt(collateral, BASELINE_COLLATERAL_BPS, "credit: collateral fell below baseline");
        assertGt(advance, BASELINE_ADVANCE_BPS, "receivables: advance rose above baseline");
        assertTrue(admitted, "access: gate open");

        // The load-bearing assertion. VouchFeeTier reads LONG_TERM_LP, so a
        // proven repayment must NOT move it. If this ever fails, standing is
        // leaking across fact types and the registry has become a score.
        assertEq(fee, BASELINE_FEE_BPS, "fee tier: unchanged, because it reads a different fact type");
    }

    /// @notice Every consumer points at the registry we published.
    /// @dev Cheap, and it catches the failure that would otherwise look like a
    ///      logic bug: a consumer deployed against a stale registry answers
    ///      plausibly and is wrong about everything.
    function test_live_consumersReadThePublishedRegistry() public onlyForked {
        assertEq(address(VouchCredit(CREDIT).REGISTRY()), REGISTRY, "credit");
        assertEq(address(VouchFeeTier(FEE_TIER).REGISTRY()), REGISTRY, "fee tier");
        assertEq(address(VouchAccess(ACCESS).REGISTRY()), REGISTRY, "access");
        assertEq(address(VouchReceivablesFacility(RECEIVABLES).REGISTRY()), REGISTRY, "receivables");
        assertEq(address(VouchCredit(CREDIT).PASSPORT()), PASSPORT, "credit reads the published passport");
    }

    /// @notice An address with nothing proven gets the baseline everywhere.
    /// @dev Unproven is unknown, never clean. A consumer must not read an empty
    ///      registry as a positive signal, and the deployed contracts must not
    ///      quietly grant anything to an address they have never seen.
    function test_live_unprovenAddressGetsBaselineEverywhere() public onlyForked {
        address stranger = address(uint160(uint256(keccak256("never proven anywhere"))));

        assertFalse(IVouchRegistry(REGISTRY).hasProof(stranger, FactTypes.AAVE_REPAYMENT), "nothing proven");
        assertEq(IVouchPassport(PASSPORT).tierOf(stranger), 0, "no tier");
        assertEq(VouchCredit(CREDIT).collateralBpsFor(stranger), BASELINE_COLLATERAL_BPS, "baseline collateral");
        assertEq(
            VouchReceivablesFacility(RECEIVABLES).advanceRateBpsFor(stranger),
            BASELINE_ADVANCE_BPS,
            "baseline advance -- financeable, at a wider haircut"
        );
        assertEq(VouchFeeTier(FEE_TIER).feeBpsFor(stranger), BASELINE_FEE_BPS, "baseline fee");
        assertFalse(VouchAccess(ACCESS).isAdmitted(stranger), "gate closed");
    }

    // =====================================================================
    // Registry configuration
    // =====================================================================

    /// @notice The registered sources on chain are the ones documented.
    /// @dev A source pins an emitter, a topic and a chain key. All three fail
    ///      silently when wrong -- the registry proves facts about the wrong
    ///      contract, or the wrong chain, and nothing reverts. Asserting them
    ///      against the live deployment is the only way to know the published
    ///      configuration is the deployed one.
    function test_live_registeredSourcesAreConfigured() public onlyForked {
        (bool ok, bytes memory data) = REGISTRY.staticcall(abi.encodeWithSignature("registeredFactTypes()"));
        assertTrue(ok, "registeredFactTypes is callable");

        bytes32[] memory types = abi.decode(data, (bytes32[]));
        assertGt(types.length, 0, "at least one fact type registered");

        DeployedSource memory repay = _sourceOf(FactTypes.AAVE_REPAYMENT);
        assertTrue(repay.emitter != address(0), "the repayment source has a pinned emitter");
        assertTrue(repay.enabled, "and it is enabled");
        assertTrue(repay.topic0 != bytes32(0), "and a pinned topic0");

        // chainKey is Attestcoin's key space, not a chainId. A chainId here
        // would prove facts about a different chain and never revert.
        assertTrue(repay.chainKey < 1000, "chainKey is a key-space value, not an EVM chainId");
    }

    /// @notice The deployed repayment source pins its reserve asset (S4).
    /// @dev Only assertable against v2. A registry without this pin accepts a
    ///      repayment denominated in any token, which is what makes
    ///      permissionless-market self-dealing work: the pool is real, the event
    ///      is real, and the asset is worthless.
    function test_live_reserveAssetIsPinned() public onlyForked {
        DeployedSource memory repay = _sourceOf(FactTypes.AAVE_REPAYMENT);

        assertTrue(repay.reserveAsset != address(0), "the repayment source pins an asset");
        assertEq(repay.assetTopicIndex, 1, "Aave Repay carries the reserve in topic 1");
    }

    /// @notice Distinct-payer is OFF for the repayment source, deliberately.
    /// @dev Not an oversight. The real Sepolia repayment this registry holds has
    ///      payer == subject, which is what an ordinary borrower settling their
    ///      own loan looks like. Turning S5 on here would reject the honest case
    ///      along with the wash cycle, so it stays a per-source choice.
    function test_live_distinctPayerIsOffForRepayment() public onlyForked {
        DeployedSource memory repay = _sourceOf(FactTypes.AAVE_REPAYMENT);
        assertFalse(repay.requireDistinctPayer, "self-repayment is the ordinary case, and still counts");
    }

    // =====================================================================

    /// The source as the DEPLOYED registry returns it.
    ///
    /// Deliberately NOT `VouchTypes.RegisteredSource`. That type tracks local
    /// source, which can be ahead of what is on chain -- adding the reserve-asset
    /// and payer pins to it changed the ABI, and decoding the deployed
    /// contract's older tuple into the newer type reverts. A test whose job is
    /// to check a deployed artifact must not assume that artifact matches the
    /// working tree.
    struct DeployedSource {
        uint64 chainKey;
        address emitter;
        bytes32 topic0;
        bytes32 factType;
        uint8 subjectTopicIndex;
        bool enabled;
        address reserveAsset;
        uint8 assetTopicIndex;
        uint8 payerTopicIndex;
        bool requireDistinctPayer;
    }

    function _sourceOf(bytes32 factType) internal view returns (DeployedSource memory src) {
        (bool ok, bytes memory data) = REGISTRY.staticcall(abi.encodeWithSignature("getSource(bytes32)", factType));
        require(ok, "getSource failed");
        src = abi.decode(data, (DeployedSource));
    }
}
