// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTestBase} from "./helpers/VouchTestBase.sol";
import {ReceiptBuilder} from "./helpers/ReceiptBuilder.sol";

import {VouchTypes} from "../src/core/VouchTypes.sol";
import {FactTypes, EventSignatures} from "../src/core/FactTypes.sol";
import {VouchErrors} from "../src/core/VouchErrors.sol";
import {VouchPassport} from "../src/passport/VouchPassport.sol";

/// @title RegistryTest
/// @notice The primitive itself: what gets stored, what accumulates, and what
///         can never move backwards.
contract RegistryTest is VouchTestBase {
    VouchPassport internal passport;

    function setUp() public override {
        super.setUp();
        passport = new VouchPassport(address(registry));
    }

    // =====================================================================
    // hasProof — the whole public surface, in one function
    // =====================================================================

    function test_hasProofIsFalseBeforeAndTrueAfter() public {
        assertFalse(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "no standing before proof");

        _submit(_repayClaim(ALICE, 1_000e6, 20_100_000, keccak256("r1")));

        assertTrue(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "standing after proof");
    }

    /// @dev Standing is per fact type. Proving a repayment says nothing about
    ///      liquidity, which is what keeps the registry from collapsing into a
    ///      single opaque score.
    function test_standingDoesNotLeakAcrossFactTypes() public {
        _submit(_repayClaim(ALICE, 1_000e6, 20_100_001, keccak256("r2")));

        assertTrue(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT));
        assertFalse(registry.hasProof(ALICE, FactTypes.LONG_TERM_LP), "repayment is not liquidity");
    }

    function test_standingDoesNotLeakAcrossSubjects() public {
        _submit(_repayClaim(ALICE, 1_000e6, 20_100_002, keccak256("r3")));

        assertTrue(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT));
        assertFalse(registry.hasProof(BOB, FactTypes.AAVE_REPAYMENT));
    }

    // =====================================================================
    // Accumulation
    // =====================================================================

    function test_proofValueAccumulatesAcrossFacts() public {
        _submit(_repayClaim(ALICE, 1_000e6, 20_100_010, keccak256("v1")));
        _submit(_repayClaim(ALICE, 2_500e6, 20_100_011, keccak256("v2")));

        assertEq(registry.proofCount(ALICE, FactTypes.AAVE_REPAYMENT), 2);
        assertEq(registry.proofValue(ALICE, FactTypes.AAVE_REPAYMENT), 3_500e6);
        assertEq(registry.totalProofs(ALICE), 2);
    }

    function test_factIdsAreRecordedPerSubject() public {
        _submit(_repayClaim(ALICE, 1e6, 20_100_020, keccak256("f1")));
        _submit(_repayClaim(ALICE, 1e6, 20_100_021, keccak256("f2")));

        bytes32[] memory ids = registry.factIdsOf(ALICE);
        assertEq(ids.length, 2);
        assertTrue(ids[0] != ids[1], "distinct logs produce distinct ids");
        assertTrue(registry.isVerified(ids[0]));
        assertTrue(registry.isVerified(ids[1]));
    }

    function test_storedFactMatchesTheProvenLog() public {
        uint64 blockNumber = 20_100_030;
        bytes32 txHash = keccak256("stored");
        _submit(_repayClaim(ALICE, 777e6, blockNumber, txHash));

        bytes32 factId = registry.factIdsOf(ALICE)[0];
        VouchTypes.VerifiedFact memory fact = registry.getFact(factId);

        assertEq(fact.subject, ALICE, "subject from the log, not the submitter");
        assertEq(fact.emitter, AAVE_POOL, "emitter is the pinned source");
        assertEq(fact.value, 777e6, "value from the log data");
        assertEq(fact.blockNumber, blockNumber);
        assertEq(fact.txHash, txHash);
        assertEq(fact.sourceChain, CHAIN_ETHEREUM);
        assertEq(fact.factType, FactTypes.AAVE_REPAYMENT);
        assertEq(fact.verifiedAt, uint64(block.timestamp));
    }

    // =====================================================================
    // Monotonicity — the structural reason a tier can never fall
    // =====================================================================

    /// @dev Facts arrive in whatever order the relayer submits them, which is not
    ///      the order they happened. firstSeen must still end up at the earliest
    ///      source block regardless.
    function test_firstSeenWidensBackwardsWhenAnOlderFactArrivesLater() public {
        _submit(_repayClaim(ALICE, 1e6, 20_500_000, keccak256("m1")));
        assertEq(registry.firstSeen(ALICE), 20_500_000);
        assertEq(registry.lastSeen(ALICE), 20_500_000);

        // An older repayment, discovered and submitted afterwards.
        _submit(_repayClaim(ALICE, 1e6, 19_000_000, keccak256("m2")));

        assertEq(registry.firstSeen(ALICE), 19_000_000, "bounds widen backwards");
        assertEq(registry.lastSeen(ALICE), 20_500_000, "and the upper bound holds");
    }

    function test_lastSeenNeverNarrows() public {
        _submit(_repayClaim(ALICE, 1e6, 20_500_000, keccak256("m3")));
        _submit(_repayClaim(ALICE, 1e6, 19_000_000, keccak256("m4")));
        _submit(_repayClaim(ALICE, 1e6, 20_000_000, keccak256("m5")));

        assertEq(registry.lastSeen(ALICE), 20_500_000, "an interleaved fact cannot lower the ceiling");
        assertEq(registry.firstSeen(ALICE), 19_000_000);
    }

    /// @dev Fuzzed: no submission order can produce a narrower window than the
    ///      extremes of the blocks submitted.
    function testFuzz_boundsAlwaysSpanTheSubmittedBlocks(uint64 a, uint64 b, uint64 c) public {
        a = uint64(bound(a, 1, 30_000_000));
        b = uint64(bound(b, 1, 30_000_000));
        c = uint64(bound(c, 1, 30_000_000));
        vm.assume(a != b && b != c && a != c);

        _submit(_repayClaim(ALICE, 1e6, a, keccak256(abi.encodePacked("fz", a))));
        _submit(_repayClaim(ALICE, 1e6, b, keccak256(abi.encodePacked("fz", b))));
        _submit(_repayClaim(ALICE, 1e6, c, keccak256(abi.encodePacked("fz", c))));

        uint64 lo = a < b ? (a < c ? a : c) : (b < c ? b : c);
        uint64 hi = a > b ? (a > c ? a : c) : (b > c ? b : c);

        assertEq(registry.firstSeen(ALICE), lo);
        assertEq(registry.lastSeen(ALICE), hi);
        assertEq(registry.totalProofs(ALICE), 3);
    }

    // =====================================================================
    // Passport aggregation
    // =====================================================================

    function test_tierRisesWithProvenRepayments() public {
        assertEq(passport.tierOf(ALICE), passport.TIER_NONE(), "unproven is UNKNOWN, not clean");

        _proveRepayments(ALICE, 1, 21_000_000);
        assertEq(passport.tierOf(ALICE), passport.TIER_BRONZE());

        _proveRepayments(ALICE, 4, 21_100_000);
        assertEq(passport.tierOf(ALICE), passport.TIER_SILVER(), "5 total");

        _proveRepayments(ALICE, 7, 21_200_000);
        assertEq(passport.tierOf(ALICE), passport.TIER_GOLD(), "12 total");
    }

    /// @dev The property the whole design exists to guarantee. Every additional
    ///      fact is append-only, so tier is a non-decreasing function of time.
    function test_tierNeverFalls() public {
        uint8 previous = passport.tierOf(ALICE);

        for (uint64 i; i < 14; ++i) {
            _submit(_repayClaim(ALICE, 1e6, 22_000_000 + i, keccak256(abi.encodePacked("t", i))));
            uint8 current = passport.tierOf(ALICE);
            assertGe(current, previous, "tier is monotonic");
            previous = current;
        }
        assertEq(previous, passport.TIER_GOLD());
    }

    function test_passportAggregatesAcrossTwoFactTypes() public {
        _submit(_repayClaim(ALICE, 1e6, 23_000_000, keccak256("p1")));
        _submitSupply(ALICE, 9_000e6, 23_500_000, keccak256("p2"));

        VouchTypes.Passport memory p = passport.passportOf(ALICE);

        assertEq(p.totalProofs, 2, "totalProofs spans fact types");
        assertEq(p.earliestFact, 23_000_000);
        assertEq(p.latestFact, 23_500_000);
        assertEq(p.tier, passport.TIER_BRONZE(), "tier still reads repayments only");

        assertEq(registry.proofCount(ALICE, FactTypes.LONG_TERM_LP), 1);
        assertEq(registry.proofValue(ALICE, FactTypes.LONG_TERM_LP), 9_000e6);
    }

    function test_provenTenureIsZeroWithASingleFact() public {
        _submit(_repayClaim(ALICE, 1e6, 24_000_000, keccak256("tenure1")));
        assertEq(passport.provenTenureBlocks(ALICE), 0, "one point spans nothing");

        _submit(_repayClaim(ALICE, 1e6, 24_900_000, keccak256("tenure2")));
        assertEq(passport.provenTenureBlocks(ALICE), 900_000);
    }

    /// @notice The honest limitation, asserted rather than merely documented.
    /// @dev Inclusion proofs prove positive facts only. An address with no
    ///      standing is UNKNOWN; a consumer must never read tier 0 as evidence
    ///      of bad behaviour, because a clean history and an unproven history
    ///      are indistinguishable here.
    function test_unprovenAddressIsIndistinguishableFromCleanOne() public view {
        address neverSeen = address(0xDEAD);

        assertEq(passport.tierOf(neverSeen), passport.TIER_NONE());
        assertEq(passport.passportOf(neverSeen).totalProofs, 0);
        assertEq(registry.firstSeen(neverSeen), 0);
        assertFalse(registry.hasProof(neverSeen, FactTypes.AAVE_REPAYMENT));
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    function _proveRepayments(address user, uint256 count, uint64 startBlock) internal {
        for (uint256 i; i < count; ++i) {
            _submit(_repayClaim(user, 1e6, startBlock + uint64(i), keccak256(abi.encodePacked(startBlock, i))));
        }
    }

    function _submitSupply(address user, uint256 amount, uint64 blockNumber, bytes32 txHash) internal {
        bytes32[] memory topics = new bytes32[](4);
        topics[0] = EventSignatures.AAVE_SUPPLY;
        topics[1] = bytes32(uint256(uint160(USDC)));
        topics[2] = bytes32(uint256(uint160(user)));
        topics[3] = bytes32(0);

        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(ReceiptBuilder.log(AAVE_POOL, topics, abi.encode(amount, uint16(0))))
        );
        _submit(_claim(FactTypes.LONG_TERM_LP, blockNumber, txHash, 0, encoded));
    }

    // =====================================================================
    // Governance (M3): the third domain
    // =====================================================================

    /// @notice A Governor vote proves standing the same way an Aave event does.
    /// @dev This fact type was held back for a while on the claim that the
    ///      standard Governor does not index `voter`. It does --
    ///      IGovernor declares `VoteCast(address indexed voter, ...)` -- so the
    ///      subject sits at topic 1 and nothing special is required. The test
    ///      exists because the claim was wrong once and should not be able to
    ///      become wrong again silently.
    function test_governanceVoteProvesStanding() public {
        vm.prank(ADMIN);
        registry.registerSource(FactTypes.GOVERNANCE_ACTIVITY, CHAIN_ETHEREUM, GOVERNOR, EventSignatures.VOTE_CAST, 1);

        _submitVote(ALICE, 42, 33_000_000, keccak256("gov1"));

        assertTrue(registry.hasProof(ALICE, FactTypes.GOVERNANCE_ACTIVITY), "vote proves standing");
        assertEq(registry.proofCount(ALICE, FactTypes.GOVERNANCE_ACTIVITY), 1);
    }

    /// @notice Governance standing does not leak into credit or liquidity.
    function test_governanceIsItsOwnDomain() public {
        vm.prank(ADMIN);
        registry.registerSource(FactTypes.GOVERNANCE_ACTIVITY, CHAIN_ETHEREUM, GOVERNOR, EventSignatures.VOTE_CAST, 1);

        _submitVote(ALICE, 7, 33_000_010, keccak256("gov2"));

        assertTrue(registry.hasProof(ALICE, FactTypes.GOVERNANCE_ACTIVITY));
        assertFalse(registry.hasProof(ALICE, FactTypes.AAVE_REPAYMENT), "a vote is not a repayment");
        assertFalse(registry.hasProof(ALICE, FactTypes.LONG_TERM_LP), "a vote is not liquidity");
    }

    /// @notice S2 still applies: a vote from an unregistered Governor is rejected.
    function test_governanceSpoofedGovernorIsRejected() public {
        vm.prank(ADMIN);
        registry.registerSource(FactTypes.GOVERNANCE_ACTIVITY, CHAIN_ETHEREUM, GOVERNOR, EventSignatures.VOTE_CAST, 1);

        bytes32[] memory topics = new bytes32[](2);
        topics[0] = EventSignatures.VOTE_CAST;
        topics[1] = bytes32(uint256(uint160(ALICE)));

        bytes memory encoded = ReceiptBuilder.successful(
            // Anyone can deploy a contract emitting a byte-identical VoteCast.
            ReceiptBuilder.one(ReceiptBuilder.log(IMPOSTOR, topics, abi.encode(uint256(1))))
        );

        vm.expectRevert(abi.encodeWithSelector(VouchErrors.EmitterMismatch.selector, GOVERNOR, IMPOSTOR));
        _submit(_claim(FactTypes.GOVERNANCE_ACTIVITY, 33_000_020, keccak256("gov3"), 0, encoded));
    }

    function _submitVote(address voter, uint256 proposalId, uint64 blockNumber, bytes32 txHash) internal {
        // IGovernor: VoteCast(address indexed voter, uint256 proposalId, ...).
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = EventSignatures.VOTE_CAST;
        topics[1] = bytes32(uint256(uint160(voter)));

        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(ReceiptBuilder.log(GOVERNOR, topics, abi.encode(proposalId, uint8(1), uint256(100))))
        );

        _submit(_claim(FactTypes.GOVERNANCE_ACTIVITY, blockNumber, txHash, 0, encoded));
    }
}
