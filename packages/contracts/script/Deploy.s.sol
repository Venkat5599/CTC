// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VouchRegistry} from "../src/core/VouchRegistry.sol";
import {VouchPassport} from "../src/passport/VouchPassport.sol";
import {VouchCredit} from "../src/consumers/VouchCredit.sol";
import {VouchFeeTier} from "../src/consumers/VouchFeeTier.sol";
import {VouchAccess} from "../src/consumers/VouchAccess.sol";
import {FactTypes} from "../src/core/FactTypes.sol";

/// @title Deploy
/// @notice Deploys the registry, the passport, and the three reference consumers.
///
/// @dev Ordering is forced by construction arguments: the registry has no
///      dependencies, the passport needs the registry, and each consumer needs
///      whichever of those it reads. Nothing is registered with anything —
///      consumers are wired one-way, and the registry never learns they exist.
///      That asymmetry is the design, so if a future version needs a
///      registration step here, something has gone wrong upstream.
///
///      Sources are NOT configured by this script. Registering a source pins an
///      emitter address and an event signature that must be checked against the
///      live source chain first, so it lives in ConfigureSources.s.sol as a
///      separate, deliberate step.
///
///      Usage:
///        forge script packages/contracts/script/Deploy.s.sol:Deploy \
///          --rpc-url creditcoin_testnet --broadcast
contract Deploy is Script {
    function run() external returns (address registryAddr, address passportAddr) {
        uint256 deployerKey = vm.envOr("CREDITCOIN_PRIVATE_KEY", uint256(0));
        address admin = deployerKey == 0 ? msg.sender : vm.addr(deployerKey);

        if (deployerKey == 0) {
            vm.startBroadcast();
        } else {
            vm.startBroadcast(deployerKey);
        }

        VouchRegistry registry = new VouchRegistry(admin);
        VouchPassport passport = new VouchPassport(address(registry));

        VouchCredit credit = new VouchCredit(address(registry), address(passport));
        VouchFeeTier feeTier = new VouchFeeTier(address(registry));
        VouchAccess accessGate = new VouchAccess(address(registry), FactTypes.AAVE_REPAYMENT, 1);

        vm.stopBroadcast();

        console2.log("admin           ", admin);
        console2.log("VouchRegistry   ", address(registry));
        console2.log("VouchPassport   ", address(passport));
        console2.log("VouchCredit     ", address(credit));
        console2.log("VouchFeeTier    ", address(feeTier));
        console2.log("VouchAccess     ", address(accessGate));
        console2.log("");
        console2.log("Next: ConfigureSources.s.sol, then verify topic0 values against the source chain.");

        return (address(registry), address(passport));
    }
}
