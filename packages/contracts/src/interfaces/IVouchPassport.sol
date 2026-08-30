// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VouchTypes} from "../core/VouchTypes.sol";

/// @title IVouchPassport
/// @notice Aggregated standing. Consumers wanting one number read tierOf;
///         consumers wanting precision call IVouchRegistry.hasProof directly.
///         Both are first-class.
interface IVouchPassport {
    function passportOf(address user) external view returns (VouchTypes.Passport memory);
    function tierOf(address user) external view returns (uint8);
}
