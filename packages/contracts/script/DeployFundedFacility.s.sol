// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {DemoUSD} from "../src/demo/DemoUSD.sol";
import {VouchReceivablesFacility} from "../src/consumers/VouchReceivablesFacility.sol";

/// @title DeployFundedFacility
/// @notice Stands up the settlement rail: a demo token, a facility wired to it,
///         and a funded pool, against the ALREADY DEPLOYED registry and passport.
///
/// @dev This does not touch the registry. It deploys a SECOND facility rather
///      than replacing the bookkeeping one, because the existing address is
///      documented and a redeploy would quietly change what a published address
///      means. Both read the same registry and quote the same rate; one moves
///      money and one does not, which is the comparison worth having on chain.
///
///      The pool is funded in the same broadcast as the deployment on purpose.
///      A facility deployed empty answers `drawdown` with `InsufficientLiquidity`
///      and looks broken to anyone who finds the address before the funding
///      transaction lands.
///
///      Usage:
///        forge script packages/contracts/script/DeployFundedFacility.s.sol:DeployFundedFacility \
///          --rpc-url creditcoin_testnet --broadcast
contract DeployFundedFacility is Script {
    error RegistryAddressNotSet();
    error PassportAddressNotSet();
    error RegistryHasNoCode(address registry);
    error PassportHasNoCode(address passport);

    /// @dev One million dUSD, six decimals. Enough for ten 100,000 invoices,
    ///      which is a demonstration rather than a balance sheet.
    uint256 internal constant POOL = 1_000_000e6;

    function run() external returns (address token, address facilityAddr) {
        address registry = vm.envOr("VOUCH_REGISTRY_ADDRESS", address(0));
        address passport = vm.envOr("VOUCH_PASSPORT_ADDRESS", address(0));

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

        DemoUSD usd = new DemoUSD();
        VouchReceivablesFacility facility =
            new VouchReceivablesFacility(registry, passport, address(usd));

        usd.mint(msg.sender, POOL);
        usd.approve(address(facility), POOL);
        facility.fund(POOL);

        vm.stopBroadcast();

        console2.log("VouchRegistry (existing)  ", registry);
        console2.log("VouchPassport (existing)  ", passport);
        console2.log("DemoUSD                   ", address(usd));
        console2.log("VouchReceivablesFacility  ", address(facility));
        console2.log("Funded rail               ", facility.fundedRail());
        console2.log("Pool liquidity            ", facility.liquidity());
        console2.log("");
        console2.log("Anyone can mint dUSD and fund further: usd.mint(you, amount).");
        console2.log("Record both addresses in packages/config/src/chains.ts under DEPLOYED.");

        return (address(usd), address(facility));
    }
}
