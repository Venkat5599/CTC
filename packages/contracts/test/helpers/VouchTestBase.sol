// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {VouchRegistry} from "../../src/core/VouchRegistry.sol";
import {VouchTypes} from "../../src/core/VouchTypes.sol";
import {FactTypes, EventSignatures} from "../../src/core/FactTypes.sol";
import {INativeQueryVerifier, NativeQueryVerifierLib} from "../../src/interfaces/INativeQueryVerifier.sol";

import {MockNativeQueryVerifier} from "../mocks/MockNativeQueryVerifier.sol";
import {ReceiptBuilder} from "./ReceiptBuilder.sol";

/// @title VouchTestBase
/// @notice Shared fixture: a registry wired to a mocked Block Prover Precompile,
///         one registered Aave source, and claim-construction helpers.
/// @dev The mock is etched at the real precompile address rather than injected,
///      so `AttestcoinVerifier` resolves it through `NativeQueryVerifierLib`
///      exactly as it will on CC3 Testnet. No test-only branch exists in the
///      production contracts, which is the point — a security suite that runs
///      against a different code path than production proves nothing.
abstract contract VouchTestBase is Test {
    using ReceiptBuilder for ReceiptBuilder.Log[];

    // Attestcoin key space, NOT chainId. On CC3 Testnet 3 is Ethereum Mainnet.
    uint64 internal constant CHAIN_ETHEREUM = 3;
    uint64 internal constant CHAIN_SEPOLIA = 1;

    // Aave V3 Pool on Ethereum mainnet.
    address internal constant AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address internal constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    address internal constant ADMIN = address(0xAD814);
    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);
    address internal constant RELAYER = address(0xBEEF);

    /// @dev An attacker-deployed contract emitting a byte-identical Repay event.
    address internal constant IMPOSTOR = address(0xBAD0);

    VouchRegistry internal registry;
    MockNativeQueryVerifier internal verifier;

    function setUp() public virtual {
        _etchVerifier();

        registry = new VouchRegistry(ADMIN);

        vm.startPrank(ADMIN);
        registry.registerSource(
            FactTypes.AAVE_REPAYMENT, CHAIN_ETHEREUM, AAVE_POOL, EventSignatures.AAVE_REPAY, 2
        );
        registry.registerSource(
            FactTypes.LONG_TERM_LP, CHAIN_ETHEREUM, AAVE_POOL, EventSignatures.AAVE_SUPPLY, 2
        );
        vm.stopPrank();
    }

    /// @dev Place the mock's runtime code at 0x...0FD2 and keep a typed handle to it.
    function _etchVerifier() internal {
        address precompile = address(NativeQueryVerifierLib.getVerifier());
        MockNativeQueryVerifier deployed = new MockNativeQueryVerifier();
        vm.etch(precompile, address(deployed).code);
        verifier = MockNativeQueryVerifier(precompile);
        verifier.setShouldVerify(true);
        vm.label(precompile, "BlockProverPrecompile");
    }

    // -----------------------------------------------------------------------
    // Claim construction
    // -----------------------------------------------------------------------

    function _continuity() internal pure returns (VouchTypes.BatchContinuity memory) {
        bytes32[] memory roots = new bytes32[](8);
        for (uint256 i; i < roots.length; ++i) {
            roots[i] = keccak256(abi.encodePacked("root", i));
        }
        return VouchTypes.BatchContinuity({lowerEndpointDigest: keccak256("lower"), roots: roots});
    }

    function _continuityWithRoots(uint256 count)
        internal
        pure
        returns (VouchTypes.BatchContinuity memory)
    {
        bytes32[] memory roots = new bytes32[](count);
        return VouchTypes.BatchContinuity({lowerEndpointDigest: keccak256("lower"), roots: roots});
    }

    function _claim(
        bytes32 factType,
        uint64 blockNumber,
        bytes32 txHash,
        uint32 logIndex,
        bytes memory encodedTransaction
    ) internal pure returns (VouchTypes.FactClaim memory) {
        return VouchTypes.FactClaim({
            chainKey: CHAIN_ETHEREUM,
            blockNumber: blockNumber,
            txHash: txHash,
            factType: factType,
            logIndex: logIndex,
            encodedTransaction: encodedTransaction,
            merkleRoot: keccak256(abi.encodePacked("merkle", txHash)),
            siblings: new INativeQueryVerifier.MerkleProofEntry[](2)
        });
    }

    /// @notice The happy path: one successful Aave Repay by `user`, at log index 0.
    function _repayClaim(address user, uint256 amount, uint64 blockNumber, bytes32 txHash)
        internal
        pure
        returns (VouchTypes.FactClaim memory)
    {
        bytes memory encoded = ReceiptBuilder.successful(
            ReceiptBuilder.one(
                ReceiptBuilder.repayLog(AAVE_POOL, EventSignatures.AAVE_REPAY, USDC, user, amount)
            )
        );
        return _claim(FactTypes.AAVE_REPAYMENT, blockNumber, txHash, 0, encoded);
    }

    function _batch(VouchTypes.FactClaim memory a)
        internal
        pure
        returns (VouchTypes.FactClaim[] memory out)
    {
        out = new VouchTypes.FactClaim[](1);
        out[0] = a;
    }

    function _batch(VouchTypes.FactClaim memory a, VouchTypes.FactClaim memory b)
        internal
        pure
        returns (VouchTypes.FactClaim[] memory out)
    {
        out = new VouchTypes.FactClaim[](2);
        out[0] = a;
        out[1] = b;
    }

    function _submit(VouchTypes.FactClaim memory claim) internal returns (uint256) {
        vm.prank(RELAYER);
        return registry.submitBatch(_continuity(), _batch(claim));
    }

    function _submit(VouchTypes.FactClaim[] memory claims) internal returns (uint256) {
        vm.prank(RELAYER);
        return registry.submitBatch(_continuity(), claims);
    }
}
