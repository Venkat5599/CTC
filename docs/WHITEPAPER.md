# Vouch Whitepaper

**A Shared Cross-Chain Standing Registry for Creditcoin**

*Verify once. Underwrite everywhere.*

Version 1.0 · September 2026 · Creditcoin CC3 Testnet

---

## Abstract

Lenders on Creditcoin cannot see what a borrower has done on other blockchains. A borrower with years of clean repayments on Ethereum arrives on Creditcoin as a stranger and is priced as one. Attestcoin (formerly USC) makes cross-chain facts provable, but it leaves two problems unsolved for credit applications.

The first is **cost**. Attestcoin proofs get more expensive as history ages, and credit history is always old. If every lender proves the same fact on its own, the ecosystem pays for it again and again.

The second is **meaning**. An Attestcoin proof shows that a transaction was included in a block. It does not show that the transaction succeeded, or which contract created the event inside it. We demonstrated live that a lookalike Aave repayment event, proven by the real prover, makes a naive consumer credit 1,000,000 USDC that never moved.

Vouch is a permissionless registry on Creditcoin that verifies each cross-chain fact once, with the checks a raw proof does not provide, stores the result permanently, and exposes it to every application through one view call:

```solidity
VOUCH.hasProof(borrower, AAVE_REPAYMENT)   // ~1,202 gas, flat
```

One proven fact then improves a borrower's terms across independent products: lower collateral, higher invoice advances, and access to gated markets. None of those products needs to write verification code.

---

## 1. The Problem

### 1.1 Credit without history

On-chain lending is overcollateralized because lenders know nothing about borrowers. Every address is treated as a first-time borrower, so every address posts the maximum collateral. That is expensive for good borrowers and it rules out lending with no liquidation path at all, such as invoice financing and other real world asset (RWA) credit.

The history exists. It is on other chains: repayments on Aave, long-term liquidity positions, identity registrations. Creditcoin cannot read it directly.

### 1.2 Proving history is expensive, and gets more expensive

Attestcoin publishes its verification cost as:

```
CTC cost ≈ 2.3×10⁻⁵ + 2.9×10⁻⁷ × (continuity hash count)
```

A transaction from about ten minutes ago sits roughly 10 continuity hashes from a dense attestation. After about 24 hours, dense attestations are replaced by sparse checkpoints (one per 1,000 blocks), and the same transaction needs roughly 1,000 hashes.

| What is being proven | Continuity hashes | Relative cost |
|---|---|---|
| A transaction from ~10 minutes ago | ~10 | 1× |
| The same transaction after ~24 hours | ~1,000 | >10× |

A repayment record is months old by definition. **Underwriting is always the expensive case.** If ten lenders each prove the same borrower's history, the network pays for the same proof ten times.

### 1.3 A valid proof can still be a lie

The Attestcoin Block Prover precompile (`0x0000000000000000000000000000000000000FD2`) correctly proves that a transaction is included in a block on a source chain. That is all it proves. It does not prove:

- **that the transaction succeeded.** A reverted transaction is still in its block, and still yields a valid inclusion proof.
- **who authored the event.** An event's `topic0` is the hash of its signature. Any contract can emit an event with the same signature as Aave's `Repay`.
- **that the proof has not been used before.** Proofs are public and can be copied and resubmitted.

Every integrator has to add these checks by hand, and it is easy to miss one. This is a consumer-layer mistake, not an Attestcoin vulnerability: the proof does exactly what it claims. But at ecosystem scale, a single missed check means credit issued against events that never meant anything.

---

## 2. The Demonstration

On 2026-09-05 we tested this against real infrastructure, not a simulation.

1. We deployed `SpoofEmitter` to **Sepolia** (`0xBB0C0BeAF600B205d44f267E0D7586A543f609CF`). It emits a `Repay` event whose `topic0` is byte-identical to Aave V3's.
2. The **real** Attestcoin prover produced a valid proof of that transaction.
3. We submitted the identical proof bytes to two contracts on Creditcoin CC3.

| Contract | Inclusion | Status | topic0 | Replay | Emitter | Outcome |
|---|---|---|---|---|---|---|
| `NaiveConsumer` | ✓ | ✓ | ✓ | ✓ | ✗ not checked | **Accepted.** Credited 1,000,000 USDC that never moved |
| `VouchRegistry` | ✓ | ✓ | ✓ | ✓ | ✓ | **Reverted** with `EmitterMismatch` |

Same bytes, opposite outcomes. Only one contract asked who authored the event.

The lookalike was deployed to a testnet only, deliberately. A mainnet contract whose only purpose is emitting convincing fake Aave events would be a live tool for deceiving third parties. Because `topic0` is not chain-specific, nothing is lost by showing it where it is safe.

---

## 3. The Solution

Vouch turns a raw inclusion proof into a **fact**: a checked, permanent, public statement about an address.

### 3.1 Design principles

- **Verify once, read forever.** The first submitter pays for the proof. Every later reader pays for a storage read.
- **Security done once, correctly.** The checks every integrator would otherwise re-implement live in one audited path.
- **Permissionless.** Anyone can submit a proof. The subject of a fact is read from the proven event, never from the submitter, so a submitter gains nothing by submitting.
- **Facts, not scores.** The registry records what happened. What a fact is worth is each consumer's decision.
- **Append-only.** Nothing removes a fact once it is stored.

### 3.2 Architecture

```
  Source chain (Ethereum / Sepolia)
  A real Aave repayment, by someone with no idea Vouch exists
                    │
                    ▼
  Attestcoin Block Prover  (0x…0FD2, Creditcoin CC3)
  Proves: the transaction is in a confirmed block
  Does not prove: success, or who emitted the event
                    │
                    ▼
  VouchRegistry  (Creditcoin CC3)
  chainKey pinned · status = 1 · emitter pinned · replay guard per log
  Every check is a revert · append-only storage
                    │
     ┌──────────┬───┴──────┬───────────┬──────────┐
     ▼          ▼          ▼           ▼          ▼
  Passport   Credit   Receivables   Access    FeeTier
```

### 3.3 Sources and fact types

A **fact type** is a named kind of fact, identified by `keccak256` of its name (for example `keccak256("AAVE_REPAYMENT")`). Each fact type is bound to a **registered source** that pins:

- the source chain's `chainKey`,
- the exact emitter contract address,
- the event signature (`topic0`),
- which topic holds the subject address,
- optionally, a pinned reserve asset and a distinct-payer requirement.

A proof only becomes a fact if the event matches its registered source in every pinned field.

> **`chainKey` is not `chainId`.** Attestcoin maintains its own key space. On CC3 Testnet, `1` is Sepolia and `3` is Ethereum mainnet. Passing a chain ID does not revert; it silently proves facts about a different chain. The Vouch TypeScript config uses branded types so that this mistake fails to compile.

### 3.4 The read interface

```solidity
interface IVouchRegistry {
    function hasProof(address subject, bytes32 factType) external view returns (bool);
    function proofCount(address subject, bytes32 factType) external view returns (uint32);
    function proofValue(address subject, bytes32 factType) external view returns (uint256);
    function getFact(bytes32 factId) external view returns (VouchTypes.VerifiedFact memory);
    function factIdsOf(address subject) external view returns (bytes32[] memory);
}
```

An integration is a single call inside an existing contract:

```solidity
function collateralFor(address borrower) public view returns (uint16) {
    if (VOUCH.proofCount(borrower, AAVE_REPAYMENT) >= 5) return 11_500; // 115%
    if (VOUCH.hasProof(borrower, AAVE_REPAYMENT))        return 13_000; // 130%
    return 15_000;                                                       // 150%
}
```

There is no contract to write against the precompile, no off-chain worker, no proof gas and no registration step. A read costs about 1,202 gas, flat, and makes zero precompile calls.

---

## 4. Security Model

### 4.1 Verification invariants

Every check is a revert, not a warning.

| ID | The trap | Enforcement |
|---|---|---|
| **S1** | Inclusion is not success. A reverted transaction still yields a valid proof. | `receiptStatus != 1` reverts |
| **S2** | A valid proof of a lookalike event is still a valid proof. `topic0` is not authorship. | Emitter pinned per source, checked with `topic0` and `chainKey`. Reverts `EmitterMismatch` |
| **S3** | Proofs are public and replayable. | Guard keyed on `keccak(chainKey, blockNumber, txHash, factType, logIndex)` |

S3 is keyed per **log**, not per transaction. The reference Attestcoin base contract keys its guard on `(chainKey, blockHeight, txIndex)`. One transaction can carry several qualifying logs, so a per-transaction key either blocks legitimate facts or, if loosened, allows replays.

### 4.2 Economic attacks

Pinning the emitter stops forgery. It does not make every genuine event economically meaningful. Two further checks exist, both **opt-in per source**, because each narrows what a fact means.

| ID | The attack | Enforcement |
|---|---|---|
| **S4** | **Market self-dealing.** List a worthless token in a permissionless isolated market, borrow from yourself, repay a million units. The pool, event and proof are all real. | `reserveAsset` pinned in the source. Reverts `ReserveAssetMismatch` |
| **S5** | **Wash repayment.** Borrow and repay yourself in a cycle to farm `proofCount`. | `requireDistinctPayer`. Reverts `PayerIsSubject` |

`requireDistinctPayer` is off by default, and that default is a judgement. An honest borrower repaying their own loan also has `payer == subject`. Enforcing it everywhere would reject the ordinary case to stop the adversarial one. A source that turns it on produces a narrower, stronger fact: *somebody else settled this debt*.

### 4.3 Status of known attacks

| Attack | Status |
|---|---|
| Cross-chain address collision | **Closed.** `chainKey` pinned, reverts `ChainKeyMismatch` |
| Lookalike emitter (S2) | **Closed.** Demonstrated live |
| Permissionless market self-dealing (S4) | **Closed where pinned** |
| Wash repayment (S5) | **Closed where required** |
| Semantic drift (`useATokens` flag not decoded) | **Open.** The flag is in the log data and is not branched on |
| Economic value of a fact | **Open by design.** `proofValue` is a token amount, not a valuation. Pricing it needs an oracle |

### 4.4 What Vouch can never prove

Vouch proves **positive** facts only. It can prove a borrower repaid. It can never prove a borrower was *never* liquidated, because the absence of an event cannot be enumerated. An unproven address is **unknown**, never **clean** and never **bad**. Consumers must treat it that way.

---

## 5. Consumers: One Fact, Many Products

Vouch ships five reference consumers. They do not know about each other; each reads the registry independently.

| Consumer | Reads | Without standing | With one proven repayment |
|---|---|---|---|
| `VouchPassport` | repayment count | Tier 0 | **Tier 1** |
| `VouchCredit` | repayment history | 150% collateral | **130% collateral** |
| `VouchReceivablesFacility` | repayment history | 70% advance | **80% advance** |
| `VouchAccess` | any registered fact | closed | **open** |
| `VouchFeeTier` | **liquidity** history | 0.30% fee | **0.30%, unchanged** |

**The fee tier is the most important row.** It reads a different fact type (`LONG_TERM_LP`), so a proven repayment cannot move it. Standing does not leak between domains. That is what separates a registry of facts from a single reputation score.

### 5.1 RWA: receivables financing with real settlement

Invoice financing has no liquidation path: there is nothing to seize if a debtor does not pay. That makes proven history the primary underwriting input rather than a discount.

`VouchReceivablesFacility` can be deployed with a settlement token, so the advance rate becomes a token balance rather than a number in an event. Two suppliers each finance a 100,000 invoice, identical except for one proven Aave repayment on another chain:

| | Advance rate | Paid out |
|---|---|---|
| Unproven supplier | 70% | 70,000 dUSD |
| One proven repayment | 80% | **80,000 dUSD** |
| **Value of the proof** | | **10,000 dUSD** |

The test `test_theProofIsWorthTenThousandTokens` asserts that difference against `balanceOf`, not against an emitted event. (`DemoUSD` is a freely mintable demonstration token and is not part of the protocol.)

### 5.2 Compliance as a registry entry

Cross-chain KYC is usually pitched as a separate system. In Vouch it is one source registration:

```solidity
registry.registerSource(
    FactTypes.KYC_VERIFIED,
    CHAIN_ETHEREUM,
    IDENTITY_REGISTRY,                    // an ERC-3643 IdentityRegistry
    EventSignatures.IDENTITY_REGISTERED,  // IdentityRegistered(address,address)
    1                                     // investor address at topic 1
);
```

No registry code changes. The registry already carries four unrelated domains (credit, liquidity, governance, compliance) through the same path.

Emitter pinning matters most here. Anyone can deploy a contract that emits a byte-identical `IdentityRegistered` naming themselves: a self-issued accreditation with a completely valid inclusion proof. The registry rejects it with `EmitterMismatch`.

`KYC_VERIFIED` is defined but not yet registered on chain. ERC-3643 identity registries are deployed per issuer, so there is no single canonical emitter to pin. Choosing one is a trust decision each deployment has to make against a verified contract. Vouch can also prove an investor *was* admitted, but not that they were not later removed; consumers needing live revocation must read the identity registry on its own chain.

---

## 6. Deployment and Evidence

### 6.1 Live contracts (Creditcoin CC3 Testnet, chain ID 102031)

| Contract | Address |
|---|---|
| VouchRegistry | `0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46` |
| VouchPassport | `0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6` |
| VouchCredit | `0x52f0dec9cfa99cd634b3ba87fc3ed5d3c4a96720` |
| VouchReceivablesFacility | `0xc9c872b244e6385f934fc0746b19afbdf99be5f4` |
| VouchFeeTier | `0xec66d8e1330dfe2185d2dbf08e642c850bfe4202` |
| VouchAccess | `0xbc531d6c329fe6f8fabeb72ae0921b38bc0c1719` |

The registry carries S1 to S5. `AAVE_REPAYMENT` is registered with its reserve asset pinned to Sepolia USDC and `requireDistinctPayer` off. The earlier v1 registry (`0xb6e0497d…bbe8329`) remains on chain and its facts remain true, but it cannot enforce S4 or S5. Facts do not migrate between registries; a proof records where it was verified.

### 6.2 Proven end to end

A real Aave repayment on Sepolia, made by an address unrelated to this project:

| | |
|---|---|
| Source transaction (Sepolia) | `0x29e6cd2ba2e121e4ffd227ee5305478986889d9f1e6a84a15ac5d4abc72d9e86` |
| Subject | `0x4c8ea5e41ed3dbe14a4cf0b79accb5e5d3ab88f9` |
| Verification transaction (CC3) | `0x12b077b18fa983224916e703a657f97b8bfa43dd86d410a10523dbe204db679a` |
| Reserve asset | USDC, pinned (S4 enforced on this proof) |
| Gas used | 524,014 |

### 6.3 Testing

128 Foundry tests pass with 0 failures.

| Suite | Tests | What it proves |
|---|---|---|
| `Security.t.sol` | 30 | Each attack S1 to S5 is rejected |
| `Receivables.t.sol` | 19 | The RWA consumer's terms |
| `Registry.t.sol` | 17 | Storage, monotonicity, bounds |
| `FundedFacility.t.sol` | 16 | The same terms, in tokens that move |
| `Consumers.t.sol` | 12 | Consumers are independent |
| `Forgery.t.sol` | 11 | Identical bytes, opposite outcomes |
| `Live.t.sol` | 10 | The deployed contracts, on a CC3 fork, no mocks |
| `Compliance.t.sol` | 8 | A new domain with no code change |
| `Gas.t.sol` | 5 | ~1,202 gas per read, 0 precompile calls |

`Live.t.sol` fails if any documented address, registered source, or proven fact drifts from what is actually on chain.

---

## 7. Economics and Business Model

**Status: pre-revenue.** Figures below are arithmetic consequences of Attestcoin's published pricing, not measured results or forecasts.

### 7.1 Reading is free; proving is the product

Reading the registry has no gate and no fee. That is a design commitment: a registry that charges per read is one nobody builds against. The scarce thing is not reading. It is **proving**.

An issuer who wants to underwrite an address with no proven history today has to run its own indexer, relayer and proof pipeline. Vouch offers that pipeline as a service.

| Line | What the issuer gets | What they pay for |
|---|---|---|
| **Fact resolution** | Discover and prove every provable fact about an address, now | Proof cost plus margin, per address |
| **Source onboarding** | A new protocol or event registered and pinned as a fact type | One-off integration fee |
| **Priority proving** | Resolution within an underwriting deadline | Premium on the resolution fee |

This does not compete with the free read. Once a fact is proven it is public forever. The buyer pays for **newly proven history**, not access.

### 7.2 Unit cost

At roughly 1,000 continuity hashes, one fact's verification costs in the region of 3×10⁻⁴ CTC. Resolving an address means proving a handful of facts. The input cost is small; the price is anchored to what the underwriting decision is worth to the issuer.

### 7.3 Cold start

A registry's value grows with its consumers, and today all consumers were written by this team. Three things make that survivable:

- **Useful to one issuer.** A single issuer resolving borrower history it otherwise cannot see gets the full benefit.
- **Facts accumulate.** Proofs paid for by the first issuer are already there for the second.
- **Integration is one view call,** so the cost of becoming consumer number two is close to zero.

---

## 8. Scope: What Vouch Is Not

- **Not an issuance platform.** It does not tokenize, transfer or custody assets.
- **Not a KYC provider or transfer agent.** Invoice authenticity and identity checks are off-chain onboarding problems Vouch does not claim to solve.
- **Not a credit bureau.** It proves positive facts only and cannot prove absence.
- **Not a scoring system.** The registry stores facts. Tiers in `VouchPassport` are one reference interpretation, not an opinion the registry holds.

---

## 9. Open Questions

| Question | Status |
|---|---|
| Will a Creditcoin issuer pay per resolution? | Untested. Needs a design-partner conversation |
| What is a resolution worth to an underwriter? | Unpriced |
| Will a consumer arrive that this team did not write? | Unproven |
| Regulatory posture for regulated issuers consuming facts | Not yet reviewed |
| Decoding `useATokens` in Aave repayments | Open |
| Pricing the economic value of a fact | Open by design; requires an oracle |

---

## 10. Roadmap

1. **Mainnet sources.** Register `AAVE_REPAYMENT` against Ethereum mainnet Aave V3 and prove live mainnet history.
2. **Fact resolution service.** Productize the indexer, relayer and proof builder already in `services/` as an issuer-facing API.
3. **More fact types.** Additional lending protocols, long-term liquidity, and governance participation.
4. **Issuer-chosen compliance sources.** Register `KYC_VERIFIED` per deployment against verified ERC-3643 identity registries.
5. **First external consumer.** A Creditcoin lending or RWA protocol reading Vouch without code from this team.
6. **Independent audit** before any mainnet deployment holding real value.

---

## 11. Conclusion

Attestcoin makes cross-chain history provable. Vouch makes it usable for credit: verified once with the checks a raw proof leaves out, stored permanently, and readable by any application for the price of a storage read.

The core claim is not a promise. It is deployed on Creditcoin CC3, demonstrated against a live forgery, proven with a real third-party repayment, and checked by a test suite that runs against the chain itself.

*Verify once. Underwrite everywhere.*

---

### Links

- Repository: https://github.com/Venkat5599/CTC
- Live demo: https://ctc-web-coral.vercel.app
- Registry on explorer: https://creditcoin-testnet.blockscout.com/address/0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46
- Further reading: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`BUSINESS.md`](BUSINESS.md) · [`PRD.md`](PRD.md)
