# Threat model

Three failure modes are specific to building on the Attestcoin Protocol. All
three are silent: the precompile returns true, nothing reverts, and the registry
records something false. Each has a test named for it in
`packages/contracts/test/Security.t.sol`, written as the attack rather than as
the check.

---

## S1 — the precompile proves inclusion, not success

From the Attestcoin documentation:

> The block prover precompile **does not** validate if a transaction was
> successful or not. It only validates if a transaction is included in a block
> and that block is really a part of the confirmed source chain. Therefore, a
> dApp's ASC **MUST** check the status field.

### The attack

Call `repay` on Aave with no allowance. The transaction reverts. The logs are
still written to the receipt, the transaction is still in the block, and the
block is still part of the confirmed chain — so the inclusion proof is
completely valid. An ASC that skips the status check credits a repayment that
never happened, and costs the attacker one failed transaction.

### The defence

`SourceValidator.validateAndExtract` reverts on `receipt.receiptStatus != 1`
before reading a single log.

### The tests

`test_S1_revertedTransactionIsRejected` and
`test_S1_precompileAcceptedTheProofAnyway` — the second asserts the mock
precompile was in accepting mode, so the rejection is demonstrably Vouch's and
not the precompile's.

---

## S2 — a valid proof of a lookalike event is still a valid proof

### The attack

Deploy a contract to Ethereum mainnet that emits
`Repay(address,address,address,uint256,bool)` naming yourself, with any amount
you like. Call it. The transaction succeeds, the event is real, the inclusion
proof is sound. Nothing is forged. An ASC matching on the event signature alone
mints you a repayment history you invented.

The proof system is not compromised here. The consuming contract simply failed
to establish semantics.

### The defence

`SourceRegistry` pins an emitter address per fact type, and the validator
requires the log at the claimed index to have come from it. Adding a protocol is
a registry entry rather than a code change — which is what makes Vouch
infrastructure — but every entry pins exactly one contract.

### The tests

`test_S2_spoofedEmitterIsRejected`,
`test_S2_spoofedEmitterRejectedEvenWhenMixedWithRealLogs` (burying the spoofed
log among genuine ones does not help), and `test_S2_wrongTopicIsRejected`.

---

## S3 — proofs are public and replayable

### The attack

Watch the mempool. Copy a submitted proof. Submit it again. Without a guard,
standing is farmable from a single genuine repayment, by anyone, at the cost of
gas.

### The defence

`ReplayGuard` consumes `keccak(chainKey, blockNumber, txHash, factType,
logIndex)` — the log, not the transaction. The reference `ASCBase` keys on
`(chainKey, blockHeight, txIndex)`, which is per-transaction and therefore either
over-consumes (dropping legitimate facts from a multi-log transaction) or
under-protects.

`factType` is in the key deliberately, so one log may satisfy two registered
fact types without the second being rejected as a replay of the first. Two
different meanings drawn from one proven event is a legitimate configuration;
the same meaning drawn twice is not.

### The tests

`test_S3_replayIsRejected`, `test_S3_replayByDifferentSubmitterIsRejected` (the
guard is keyed on the log, not on `msg.sender`, which is what makes a
permissionless `submitBatch` safe), and
`test_S3_twoLogsInOneTransactionAreTwoFacts`.

---

## A fourth, found while building

### The bug

`SourceValidator` originally located its log with `getLogsByEventSignature` and
used the position within that **filtered** array as the log index. That index
names nothing on the source chain — the filter has already discarded the
original positions — and because the scan stopped at the first match, a
transaction emitting several qualifying logs could only ever yield one fact.

Both problems were the same problem.

### The fix

`FactClaim` carries an explicit receipt-wide `logIndex`, and the validator
asserts the log at that position carries the registered `topic0` and came from
the pinned emitter. Naming a wrong index reverts rather than minting a false
fact, so this is not a new trust assumption. It is also cheaper: no filtered
array is allocated.

---

## Chain key confusion

`chainKey` is **not** an EVM `chainId`. On CC3 Testnet, `1` is Sepolia and `3`
is Ethereum mainnet; on CC3 Mainnet, `1` is Ethereum mainnet. Passing the wrong
one does not throw — it silently proves facts about a different chain, crediting
testnet faucet activity as real history.

Defended in three places: `SourceRegistry` pins a `chainKey` per fact type and
`VouchRegistry` asserts it on every claim (`test_chainKeyMismatchIsRejected`);
`@vouch/config` gives `ChainKey` and `ChainId` incompatible branded types so the
compiler refuses the substitution.

---

## Proof bounds

Continuity proof length drives verification gas linearly and is
attacker-supplied. Unbounded, it is a cheap way to burn a submitter's gas.
Capped at `MAX_CONTINUITY_ROOTS = 1200`, above the ~1000 that sparse checkpoints
require. Transaction size is capped at 500KB, the documented practical
provability ceiling.

---

## What is deliberately not defended

**The relayer.** It is untrusted by construction. It chooses which facts get
submitted and when, so it can censor and it can stall — both liveness
properties, both fixable by anyone running their own, because `submitBatch` is
permissionless and stays that way (`test_anySenderCanSubmit`, enforced as its own
CI job). It cannot make the registry believe something false: every field is
either re-derived on chain from the proven payload or asserted against a
registered source. Its best available attack is to do nothing.

**Negative history.** Inclusion proofs prove positive facts only. Vouch can
prove an address repaid; it can never prove an address was never liquidated,
because absence of an event is not enumerable. See
[`assumptions.md`](./assumptions.md).

**Source protocol correctness.** If Aave emits a `Repay` for a repayment that
did not economically occur, Vouch records it faithfully. Vouch proves what the
source chain says, not whether the source chain is right.
