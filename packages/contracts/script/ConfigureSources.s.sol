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
///      GOVERNANCE IS DELIBERATELY LEFT OUT. The standard OpenZeppelin Governor
///      does NOT index `voter` in VoteCast, so the subject cannot be read from a
///      topic at all. Registering it with subjectTopicIndex would silently pin
///      the wrong address. It needs either a Governor that indexes the voter or
///      a data-decoding path in SourceValidator, and shipping it wrong is worse
///      than shipping two fact types.
///
///      Usage:
///        VOUCH_REGISTRY_ADDRESS=0x... forge script \
///          packages/contracts/script/ConfigureSources.s.sol:ConfigureSources \
///          --rpc-url creditcoin_testnet --broadcast
contract ConfigureSources is Script {
    /// @dev Attestcoin key space on CC3 Testnet. 3 = Ethereum Mainnet.
    uint64 internal constant CHAINKEY_ETHEREUM_MAINNET = 3;

    /// @dev Aave V3 Pool proxy, Ethereum mainnet.
    address internal constant AAVE_V3_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;

    uint8 internal constant SUBJECT_TOPIC_INDEX = 2;

    function run() external {
        address registryAddr = vm.envAddress("VOUCH_REGISTRY_ADDRESS");
        uint256 adminKey = vm.envOr("CREDITCOIN_PRIVATE_KEY", uint256(0));

        VouchRegistry registry = VouchRegistry(registryAddr);

        if (adminKey == 0) {
            vm.startBroadcast();
        } else {
            vm.startBroadcast(adminKey);
        }

        registry.registerSource(
            FactTypes.AAVE_REPAYMENT,
            CHAINKEY_ETHEREUM_MAINNET,
            AAVE_V3_POOL,
            EventSignatures.AAVE_REPAY,
            SUBJECT_TOPIC_INDEX
        );

        registry.registerSource(
            FactTypes.LONG_TERM_LP,
            CHAINKEY_ETHEREUM_MAINNET,
            AAVE_V3_POOL,
            EventSignatures.AAVE_SUPPLY,
            SUBJECT_TOPIC_INDEX
        );

        vm.stopBroadcast();

        console2.log("registry        ", registryAddr);
        console2.log("chainKey        ", CHAINKEY_ETHEREUM_MAINNET);
        console2.log("emitter         ", AAVE_V3_POOL);
        console2.logBytes32(EventSignatures.AAVE_REPAY);
        console2.logBytes32(EventSignatures.AAVE_SUPPLY);
        console2.log("registered fact types:", registry.registeredFactTypes().length);
    }
}
