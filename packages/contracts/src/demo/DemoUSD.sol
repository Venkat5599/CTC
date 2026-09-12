// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title DemoUSD
/// @notice The settlement unit for the receivables facility on testnet.
///
/// @dev This token is NOT part of the protocol. VouchRegistry does not know it
///      exists, and no fact anywhere is denominated in it. It exists so the RWA
///      consumer can be shown moving value rather than only quoting a rate --
///      a facility that emits `Drawdown(80_000)` and transfers nothing is a
///      spreadsheet, and the difference between a spreadsheet and a facility is
///      exactly the transfer.
///
///      Minting is open. That is deliberate and is the reason the name says
///      DEMO: a permissionlessly-mintable token has no value, cannot be
///      mistaken for one, and cannot be used to claim the facility holds
///      anything real. The alternative -- an owner-gated mint -- would look
///      more like a real stablecoin, which is precisely the impression that
///      would be dishonest here.
///
///      Six decimals, matching USDC, so the invoice figures in the demo read
///      the way an invoice actually reads.
contract DemoUSD is ERC20 {
    constructor() ERC20("Demo USD", "dUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint to anyone. Testnet faucet semantics, on purpose.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
