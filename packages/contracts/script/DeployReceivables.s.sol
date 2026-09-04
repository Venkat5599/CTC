// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {VouchReceivablesFacility} from "../src/consumers/VouchReceivablesFacility.sol";
import {IVouchRegistry} from "../src/interfaces/IVouchRegistry.sol";
import {IVouchPassport} from "../src/interfaces/IVouchPassport.sol";

/// @title DeployReceivables
/// @notice Deploys the RWA consumer against the ALREADY DEPLOYED registry and
///         passport. It does not redeploy either.
///
/// @dev This script exists separately from Deploy.s.sol on purpose. Deploy.s.sol
///      stands the whole system up from nothing; by the time a fourth consumer
///      is added the registry is live and holds proven facts, and redeploying it
///      would silently orphan them. So this script REQUIRES the addresses rather
///      than defaulting them — a blank env var aborts instead of deploying a
///      facility wired to address(0), which would compile, deploy, and answer
///      every read with a zero.
///
///      The facility is wired one-way, like every other consumer: it reads the
///      registry and the passport, and neither learns it exists. A consumer
///      deployed today reads a fact proven months ago with no registration step.
///      That property is asserted in ReceivablesTest and is the whole argument
///      for a shared registry, so this script deliberately performs no
///      registration of any kind.
///
///      Usage:
///        forge script packages/contracts/script/DeployReceivables.s.sol:DeployReceivables \
///          --rpc-url creditcoin_testnet --broadcast
contract DeployReceivables is Script {
    error RegistryAddressNotSet();
    error PassportAddressNotSet();
    error RegistryHasNoCode(address registry);
    error PassportHasNoCode(address passport);

    function run() external returns (address facilityAddr) {
        address registry = vm.envOr("VOUCH_REGISTRY_ADDRESS", address(0));
        address passport = vm.envOr("VOUCH_PASSPORT_ADDRESS", address(0));

        // A blank address is not a default worth having. VouchReceivablesFacility
        // reverts on address(0) in its constructor, but only for the zero case --
        // a typo'd address with no code deploys cleanly and then answers every
        // read by reverting at call time, which looks like a facility bug rather
        // than a wiring one. Check both here, where the error is legible.
        if (registry == address(0)) revert RegistryAddressNotSet();
        if (passport == address(0)) revert PassportAddressNotSet();
        if (registry.code.length == 0) revert RegistryHasNoCode(registry);
        if (passport.code.length == 0) revert PassportHasNoCode(passport);

        uint256 deployerKey = vm.envOr("CREDITCOIN_PRIVATE_KEY", uint256(0));

        if (deployerKey == 0) {
            vm.startBroadcast();
        } else {
            vm.startBroadcast(deployerKey);
        }

        VouchReceivablesFacility facility = new VouchReceivablesFacility(registry, passport);

        vm.stopBroadcast();

        console2.log("VouchRegistry (existing)  ", registry);
        console2.log("VouchPassport (existing)  ", passport);
        console2.log("VouchReceivablesFacility  ", address(facility));
        console2.log("");
        console2.log("Advance rates, unproven -> gold:");
        console2.log("  ADVANCE_UNPROVEN_BPS    ", facility.ADVANCE_UNPROVEN_BPS());
        console2.log("  ADVANCE_BRONZE_BPS      ", facility.ADVANCE_BRONZE_BPS());
        console2.log("  ADVANCE_SILVER_BPS      ", facility.ADVANCE_SILVER_BPS());
        console2.log("  ADVANCE_GOLD_BPS        ", facility.ADVANCE_GOLD_BPS());
        console2.log("");
        console2.log("Record the address in packages/config/src/chains.ts under DEPLOYED.");

        return address(facility);
    }
}
