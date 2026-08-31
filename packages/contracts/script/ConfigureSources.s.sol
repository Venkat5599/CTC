// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VouchRegistry} from "../src/core/VouchRegistry.sol";
import {FactTypes, EventSignatures} from "../src/core/FactTypes.sol";

/// @title ConfigureSources
/// @notice Registers the three v1 fact types against real Ethereum mainnet contracts.
///
/// @dev Separate from Deploy.s.sol on purpose. Everything this script writes is
///      a trust decision: an emitter address decides which contract counts as
///      Aave, an event signature decides which log counts as a repayment, and a
///      chainKey decides which chain is believed. Getting any of them wrong
///      fails SILENTLY — a wrong topic0 matches nothing and the registry simply
///      appears empty, while a wrong chainKey credits the wrong chain's history
///      without complaint.
///
///      CHAINKEY IS NOT CHAINID. On CC3 Testnet, 1 is Sepolia and 3 is Ethereum
///      Mainnet. The value below is the testnet mapping; deploying against CC3
///      Mainnet requires re-reading the ChainInfo precompile, not editing this
///      constant from memory.
///
///      SUBJECT TOPIC INDEX. Aave V3 emits
///        Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)
///      so topics are [signature, reserve, user, repayer] and the subject -- the
///      borrower whose standing this is -- sits at index 2. Supply is
///        Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)
///      whose indexed set differs; index 2 is onBehalfOf. Confirm both against a
///      real receipt before trusting this file.
///
///      GOVERNANCE. OpenZeppelin's IGovernor declares
///        VoteCast(address indexed voter, uint256 proposalId, uint8 support,
///                 uint256 weight, string reason)
///      so `voter` IS indexed and sits at topic index 1. An earlier version of
///      this script held the fact type back on the claim that it was not
///      indexed; that claim was checked against the installed contracts and was
///      wrong.
///
///      The GOVERNOR address below must still be verified before broadcast. It
///      is the one field here with no default worth trusting: every Governor
///      deployment is its own contract.
///
///      Usage:
///        VOUCH_REGISTRY_ADDRESS=0x... forge script \
///          packages/contracts/script/ConfigureSources.s.sol:ConfigureSources \
///          --rpc-url creditcoin_testnet --broadcast
contract ConfigureSources is Script {
    /// @dev Attestcoin key space on CC3 Testnet. NOT chainId: 1 is Sepolia and
    ///      3 is Ethereum Mainnet. Picking the wrong one does not throw -- it
    ///      credits a different chain's activity as real history.
    uint64 internal constant CHAINKEY_ETHEREUM_MAINNET = 3;
    uint64 internal constant CHAINKEY_SEPOLIA = 1;

    /// @dev Aave V3 Pool proxy, Ethereum mainnet.
    address internal constant AAVE_V3_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;

    /// @dev Aave V3 Pool, Sepolia. A different deployment, so a different
    ///      address -- reusing the mainnet one would match no logs and the
    ///      source would look permanently quiet.
    address internal constant AAVE_V3_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;

    uint8 internal constant SUBJECT_TOPIC_INDEX = 2;

    /// @dev Compound Governor Bravo on Ethereum mainnet. Verify against a real
    ///      VoteCast receipt before broadcasting: a wrong emitter matches no
    ///      logs and the fact type simply looks unused.
    address internal constant GOVERNOR = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;

    /// @dev `voter` is topic 1 in IGovernor.VoteCast.
    uint8 internal constant VOTER_TOPIC_INDEX = 1;

    /**
     * @notice Register sources for one source chain.
     *
     * @dev SOURCE=sepolia registers against Sepolia (chainKey 1); anything else
     *      registers against Ethereum mainnet (chainKey 3). Both can be run --
     *      they write different rows, keyed by fact type, so a registry can
     *      serve a live Sepolia demo and hold proven mainnet history at once.
     *
     *      Worth being deliberate about which you run. Sepolia lets you trigger
     *      a repayment on demand, which is what makes a live demo possible.
     *      Mainnet is what PRD M1 asks for, and it is read-only and free, so
     *      running both costs nothing but a second invocation.
     */
    function run() external {
        address registryAddr = vm.envAddress("VOUCH_REGISTRY_ADDRESS");
        bool sepolia = keccak256(bytes(vm.envOr("SOURCE", string("mainnet")))) == keccak256("sepolia");

        uint64 chainKey = sepolia ? CHAINKEY_SEPOLIA : CHAINKEY_ETHEREUM_MAINNET;
        address pool = sepolia ? AAVE_V3_POOL_SEPOLIA : AAVE_V3_POOL;
        uint256 adminKey = vm.envOr("CREDITCOIN_PRIVATE_KEY", uint256(0));

        VouchRegistry registry = VouchRegistry(registryAddr);

        if (adminKey == 0) {
            vm.startBroadcast();
        } else {
            vm.startBroadcast(adminKey);
        }

        registry.registerSource(
            FactTypes.AAVE_REPAYMENT,
            chainKey,
            pool,
            EventSignatures.AAVE_REPAY,
            SUBJECT_TOPIC_INDEX
        );

        registry.registerSource(
            FactTypes.LONG_TERM_LP,
            chainKey,
            pool,
            EventSignatures.AAVE_SUPPLY,
            SUBJECT_TOPIC_INDEX
        );

        registry.registerSource(
            FactTypes.GOVERNANCE_ACTIVITY,
            chainKey,
            GOVERNOR,
            EventSignatures.VOTE_CAST,
            VOTER_TOPIC_INDEX
        );

        vm.stopBroadcast();

        console2.log("registry        ", registryAddr);
        console2.log("source          ", sepolia ? "sepolia" : "mainnet");
        console2.log("chainKey        ", chainKey);
        console2.log("emitter         ", pool);
        console2.logBytes32(EventSignatures.AAVE_REPAY);
        console2.logBytes32(EventSignatures.AAVE_SUPPLY);
        console2.log("registered fact types:", registry.registeredFactTypes().length);
    }
}
