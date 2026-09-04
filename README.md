<p align="center">
  <img src="docs/assets/vouch-brand.png" alt="Vouch — Verify once. Underwrite everywhere." width="820" />
</p>

<h1 align="center">Vouch</h1>

<p align="center">
  <strong>Shared Cross-Chain Standing Registry for Creditcoin</strong>
</p>

<p align="center">
  <a href="https://creditcoin-testnet.blockscout.com/address/0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329">
    <img src="https://img.shields.io/badge/🔴_LIVE-Creditcoin_CC3-4edea3?style=for-the-badge&labelColor=0c0e10" alt="Live on CC3" />
  </a>
  <a href="https://vouch-registry.vercel.app">
    <img src="https://img.shields.io/badge/▶_DEMO-vouch--registry-4edea3?style=for-the-badge&labelColor=0c0e10" alt="Live demo" />
  </a>
  <img src="https://img.shields.io/badge/95_TESTS-0_failed-10b981?style=for-the-badge&labelColor=0c0e10" alt="95 tests" />
  <img src="https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
</p>

<p align="center">
  <em>Verify once. Underwrite everywhere.</em>
</p>

---

## 📋 Project Overview

**Vouch** proves facts about a borrower's activity on another blockchain through
the Attestcoin Protocol, validates that the proof means what it claims, records
the result permanently on Creditcoin, and exposes it to every credit application
on the chain through one interface.

You are an issuer extending credit to an address you cannot see. An operator's
attestation is a claim. Vouch hands you a cryptographic proof instead.

```solidity
if (IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)) {
    collateralBps = 11_500; // 115% instead of 150%
}
```

That is the entire integration. **No ASC to write, no off-chain worker to run, no
proof gas to pay, no registration step.** ~1,202 gas per read, flat.

### 🔥 The finding this project rests on

> **A valid Attestcoin proof can still be a lie — at the consumer layer, which is
> where credit facts are actually decided.**

The Block Prover precompile proves a transaction was included in a block. It does
that correctly. It does **not** prove the transaction succeeded, and it does not
prove *who authored the event inside it*.

**Demonstrated live on 2026-09-05, not simulated.** A lookalike contract on
Sepolia emitted a `Repay` whose `topic0` is byte-identical to Aave V3's. The
**real** Attestcoin prover proved it. The identical proof bytes were then
submitted to two contracts on CC3:

| Contract | Checks | Outcome |
|---|---|---|
| `NaiveConsumer` | inclusion ✓ · status ✓ · topic0 ✓ · replay ✓ · **emitter ✗** | ❌ **Accepted** — credited 1,000,000 USDC that never moved |
| `VouchRegistry` | inclusion ✓ · status ✓ · topic0 ✓ · replay ✓ · **emitter ✓** | ✅ **Reverted** — `EmitterMismatch`, no standing granted |

Same bytes. Opposite outcomes. Only one contract asked who authored the event.

```bash
node scripts/attack/prove-existing.mjs <sepolia-tx>
```

The finding is a **consumer-layer footgun, not an Attestcoin vulnerability** — the
inclusion proof did exactly what it claims, and
`test_forgery_anti_theProofItselfIsValid` asserts so.

---

## 🌐 Why This Matters for Creditcoin

### The economics

Attestcoin prices verification against repetition:

```
CTC cost ≈ 2.3×10⁻⁵ + 2.9×10⁻⁷ × (continuity hash count)
```

| What is being proven | Continuity hashes | Relative cost |
|---|---|---|
| A transaction from ~10 minutes ago | ~10 | 1× |
| The same transaction after ~24 hours | ~1,000 | **>10×** |

**Credit history is always in the second row.** Underwriting is the expensive
case, permanently.

### What we bring

| Benefit | Impact |
|---|---|
| **Verify once, read forever** | The first consumer pays. Every subsequent consumer reads for an `SLOAD`. |
| **Security done once, correctly** | Every integrator re-implements the same three checks, and most get one wrong. The forgery above is that mistake, at ecosystem scale. |
| **Enables RWA underwriting** | Receivables financing has no liquidation path. With nothing to seize, proven history becomes the primary underwriting input rather than a discount lever. |
| **No trusted operator** | `submitBatch` is permissionless and the subject is read from the proven log, so a submitter gains nothing by submitting. |

---

## 🚀 Deployment Information

### Live Contracts — Creditcoin CC3 Testnet

| Contract | Address | Explorer |
|---|---|---|
| **VouchRegistry** | `0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329) |
| **VouchPassport** | `0xbfb2e062cc9098a68c60cb00d9f0731aab7cb20a` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xbfb2e062cc9098a68c60cb00d9f0731aab7cb20a) |
| **VouchCredit** | `0x68e495fd8d43ff1aa443eb0689f4f2f5cccb3622` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0x68e495fd8d43ff1aa443eb0689f4f2f5cccb3622) |
| **VouchReceivablesFacility** | `0x33652813fe9fb069b41b3de674405608ea915553` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0x33652813fe9fb069b41b3de674405608ea915553) |
| **VouchFeeTier** | `0xf1ed0bc7a5f9dd5aa98cf5b63a2a51ecf70f3bd8` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xf1ed0bc7a5f9dd5aa98cf5b63a2a51ecf70f3bd8) |
| **VouchAccess** | `0x46ecf42ff86e564fe4ffa086451a6f9dbd8f64be` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0x46ecf42ff86e564fe4ffa086451a6f9dbd8f64be) |

### The forgery harness

| Contract | Network | Address |
|---|---|---|
| **SpoofEmitter** | Sepolia | [`0xBB0C0BeA...43f609CF`](https://sepolia.etherscan.io/address/0xBB0C0BeAF600B205d44f267E0D7586A543f609CF) |
| **NaiveConsumer** | CC3 | [`0x791CbBCb...d3e17e82`](https://creditcoin-testnet.blockscout.com/address/0x791CbBCb6837F2eFbEbA77c7218C4695d3e17e82) |

> The lookalike is deployed to **Sepolia and never to mainnet**. A mainnet
> contract whose only purpose is emitting convincing fake Aave events is a live
> artifact built to deceive third parties. `topic0` is not chain-specific, so
> nothing is lost by demonstrating it where it is safe.

### Network Details

```
Network:      Creditcoin CC3 Testnet
Chain ID:     102031
RPC URL:      https://rpc.cc3-testnet.creditcoin.network
Explorer:     https://creditcoin-testnet.blockscout.com
Block Prover: 0x0000000000000000000000000000000000000FD2
ChainInfo:    0x0000000000000000000000000000000000000fd3
Proof API:    https://proof-gen-api.cc3-testnet.creditcoin.network
```

> ⚠️ **`chainKey` is NOT `chainId`.** Attestcoin maintains its own key space. On
> CC3 Testnet, `1` is Sepolia and `3` is Ethereum mainnet. Passing a chainId does
> not revert — it proves facts about a different chain, silently. Branded types
> in `packages/config/src/chains.ts` make that a compile error.

---

## 📖 How to Use

### Read standing from Solidity

```solidity
interface IVouchRegistry {
    function hasProof(address subject, bytes32 factType) external view returns (bool);
    function proofCount(address subject, bytes32 factType) external view returns (uint32);
    function proofValue(address subject, bytes32 factType) external view returns (uint256);
}

contract MyLendingMarket {
    IVouchRegistry constant VOUCH =
        IVouchRegistry(0xb6E0497dfD8FDbfFB25F6AE3DC8104c46bBE8329);

    bytes32 constant AAVE_REPAYMENT = keccak256("AAVE_REPAYMENT");

    function collateralFor(address borrower) public view returns (uint16) {
        if (VOUCH.proofCount(borrower, AAVE_REPAYMENT) >= 5) return 11_500;
        if (VOUCH.hasProof(borrower, AAVE_REPAYMENT))        return 13_000;
        return 15_000;
    }
}
```

### Read it from the command line

```bash
cast call 0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329 \
  "hasProof(address,bytes32)(bool)" \
  0x83900c0eda960a31899d51aae9b9c180a7e21711 \
  $(cast keccak "AAVE_REPAYMENT") \
  --rpc-url https://rpc.cc3-testnet.creditcoin.network
```

### TypeScript SDK

```typescript
import { createVouchClient, AAVE_REPAYMENT } from '@vouch/sdk';

const vouch = createVouchClient({
  registry: '0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329',
  passport: '0xbfb2e062cc9098a68c60cb00d9f0731aab7cb20a',
  publicClient,
});

const standing = await vouch.standing(borrower, AAVE_REPAYMENT.id);
// { state: 'proven' | 'unknown', count: number, value: bigint }
```

### Contract Functions Reference

| Function | Description | Access |
|---|---|---|
| `submitBatch(continuity, claims)` | Verify and store facts | **Anyone** — permissionless |
| `hasProof(subject, factType)` | Has anything been proven? | View |
| `proofCount(subject, factType)` | How many times | View |
| `proofValue(subject, factType)` | Accumulated value | View |
| `getFact(factId)` | The full stored record | View |
| `factIdsOf(subject)` | Every fact for an address | View |
| `registerSource(...)` | Pin an emitter and topic | Admin only |

---

## 🛡️ Security — three failure modes an integration must not miss

All three are enforced in `VouchRegistry`. Each is a **revert**, not a warning.

| ID | The trap | Enforcement |
|---|---|---|
| **S1** | The precompile proves inclusion, **not success**. A reverted transaction is still in its block and still yields a valid proof. | `receipt.receiptStatus != 1` reverts |
| **S2** | A valid proof of a **lookalike event** is still a valid proof. `topic0` is not authorship. | Emitter pinned in `SourceRegistry`, asserted alongside `topic0` and `chainKey` |
| **S3** | Proofs are public and **replayable**. Watch the mempool, copy, resubmit. | Guard keyed on `keccak(chainKey, blockNumber, txHash, factType, logIndex)` — per **log**, not per transaction |

> The reference `ASCBase` keys its guard on `(chainKey, blockHeight, txIndex)`,
> which is per-**transaction**. One transaction can carry several qualifying
> logs, so Vouch keys per-**log**.

### What emitter pinning does **not** fix

Pinning closes the forgery. It does not make a proven fact economically
meaningful, and pretending otherwise would repeat the exact mistake this project
exists to name.

| Attack | Status |
|---|---|
| Cross-chain address collision (same address, another chain) | ✅ **Closed** — `chainKey` pinned, reverts `ChainKeyMismatch` |
| Permissionless market self-dealing (real pool, worthless token) | ⚠️ **Open** — reserve asset is not pinned, no value oracle |
| Wash repayment (`repayer == user == attacker`, cycled) | ⚠️ **Open** — tier is a function of event count |
| Semantic drift (`useATokens` not decoded) | ⚠️ **Open** — the flag is in the log data and is not branched on |

Both open items need a value oracle to fix properly. **Asserting an untested fix
is the failure mode this repository was built to argue against**, so they are
documented rather than shipped.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ETHEREUM (source chain)                         │
│         A real Aave repayment, by someone with no idea Vouch exists      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ATTESTCOIN BLOCK PROVER                           │
│                 0x0000000000000000000000000000000000000FD2               │
│                                                                          │
│   Proves: this transaction is in a block on the confirmed source chain  │
│   Does NOT prove: that it succeeded, or who emitted the log inside it   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            VOUCH REGISTRY                                │
│                 0xb6e0497d...bbe8329  ·  Creditcoin CC3                 │
│                                                                          │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│   │  chainKey    │ │  S1: status  │ │ S2: emitter  │ │  S3: replay  │  │
│   │  pinned      │ │  must be 1   │ │  pinned      │ │  per LOG     │  │
│   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │
│          └────────────────┴────────────────┴────────────────┘           │
│                                   │                                      │
│                        Every check is a REVERT                          │
│                                   ▼                                      │
│                  Append-only storage · nothing removes a fact           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
              ┌──────────┬───────────┼───────────┬──────────┐
              ▼          ▼           ▼           ▼          ▼
        ┌──────────┐┌─────────┐┌──────────┐┌─────────┐┌──────────┐
        │ Passport ││ Credit  ││Receivable││ Access  ││ FeeTier  │
        │  Tier 1  ││  130%   ││   80%    ││  open   ││  0.30%   │
        │          ││ ← 150%  ││  ← 70%   ││         ││UNCHANGED │
        └──────────┘└─────────┘└──────────┘└─────────┘└──────────┘
                                                            │
                    Reads a DIFFERENT fact type ────────────┘
                    Standing does not leak between domains
```

**The fee tier is the load-bearing row.** It reads `LONG_TERM_LP`, so a proven
repayment cannot move it. That is what separates a registry from a score.

---

## 🎬 Proven End to End

A real Aave repayment on Sepolia — **not a fixture, and not our own transaction**.
The point of a standing registry is that history is proven rather than asserted,
so the demo proves a repayment we had no hand in.

| | |
|---|---|
| Source transaction | [`0x55e617f1...a493941e`](https://sepolia.etherscan.io/tx/0x55e617f1a86b8f2d73a7f2519c80052449488b3e74945a318ba6cc8da493941e) on Sepolia |
| Subject | `0x83900c0eda960a31899d51aae9b9c180a7e21711` |
| Verification | [`0x979e3dbe...ebf5c0f8`](https://creditcoin-testnet.blockscout.com/tx/0x979e3dbe9002522ce08d7e481feb274b1f97c4a4b46d080963936cebebf5c0f8) on CC3 |
| Continuity proof | 89 roots |
| Gas | 565,420 |

Five unrelated consumers then read that one fact:

| Consumer | Reads | Unproven | With standing |
|---|---|---|---|
| `VouchPassport` | repayment count | Tier 0 | **Tier 1** |
| `VouchCredit` | repayment history | 150% collateral | **130% collateral** |
| `VouchReceivablesFacility` | repayment history | 70% advance | **80% advance** |
| `VouchAccess` | any registered fact | closed | **open, permanently** |
| `VouchFeeTier` | **supply** history | 0.30% | **0.30% — unchanged** |

---

## 🧪 Testing

```bash
# The full suite
forge test                                    # 95 passing, 0 failed

# The forgery, against a mocked precompile
forge test --match-contract ForgeryTest       # 11 tests

# Each security invariant, individually
forge test --match-test "test_S1_"            # inclusion is not success
forge test --match-test "test_S2_"            # emitter pinning
forge test --match-test "test_S3_"            # replay protection

# Against the DEPLOYED contracts — no mock, forked CC3
forge test --match-contract LiveTest \
  --fork-url https://rpc.cc3-testnet.creditcoin.network
```

| Suite | Tests | What it proves |
|---|---|---|
| `Security.t.sol` | 23 | Each attack is rejected |
| `Receivables.t.sol` | 19 | The RWA consumer's terms |
| `Registry.t.sol` | 17 | Storage, monotonicity, bounds |
| `Consumers.t.sol` | 12 | Consumers are mutually ignorant |
| `Forgery.t.sol` | 11 | Identical bytes, opposite outcomes |
| **`Live.t.sol`** | **8** | **The deployed contracts, forked, no mock** |
| `Gas.t.sol` | 5 | 1,202 gas flat, 0 precompile calls |

> `Live.t.sol` fails if a documented address, a registered source, or the proven
> fact ever drifts from the chain. A claim in a document nobody re-checks is
> exactly the kind of unverified assertion this protocol exists to remove.

---

## 🖥️ Run It Yourself

```bash
# 1. Clone
git clone https://github.com/Venkat5599/CTC.git && cd CTC

# 2. Install (Foundry + Node 22+)
npm install && forge build

# 3. Test
forge test -vv

# 4. Run the interface
cd apps/web && bun run dev     # http://localhost:3000
```

**The live demo needs no local setup:** open
[vouch-registry.vercel.app/create](https://vouch-registry.vercel.app/create),
connect a wallet on CC3, and click **Run the demo**. It finds a real Aave
repayment on Sepolia, obtains a genuine Attestcoin proof, and submits it to the
registry **from your wallet** — no relayer, no server key, no trusted operator.

---

## ⚖️ The Honest Limitation

**Inclusion proofs prove positive facts only.**

Vouch can prove *"this address repaid."* It can **never** prove *"this address
was never liquidated"* — absence of an event is not enumerable.

Consequences, enforced in code rather than promised:

- **Standing is monotonic.** The registry is append-only and the passport is a
  pure function of it. No sequence of operations can lower a tier.
- **Unproven is *unknown*, never *clean*.** Nothing in the interface claims a
  clean history, and a consumer must not read a low tier as evidence of bad
  behaviour.
- **Collateral floors at 100%.** Standing reduces collateral; it never eliminates
  it.

This is a correctness property of the design, not a disclaimer.

---

## 📁 Project Structure

```
CTC/
├── packages/
│   ├── contracts/             # Solidity
│   │   ├── src/core/          #   VouchRegistry, VouchTypes, FactTypes
│   │   ├── src/verification/  #   AttestcoinVerifier, SourceValidator
│   │   ├── src/security/      #   ReplayGuard, SourceRegistry
│   │   ├── src/consumers/     #   Credit, FeeTier, Access, Receivables
│   │   ├── src/attack/        #   SpoofEmitter, NaiveConsumer
│   │   └── test/              #   95 tests, incl. Live.t.sol against CC3
│   ├── sdk/                   # TypeScript client
│   ├── config/                # chainKey ≠ chainId, enforced by branded types
│   ├── schemas/               # Fact definitions
│   ├── proof-engine/          # Batching, deadlines, priority
│   └── attestcoin/            # Proof builder client
├── services/
│   ├── relayer/               # Discovery → proof → submission
│   ├── indexer/               # Mirrors FactVerified into Postgres
│   └── worker/                # Metrics
├── apps/
│   ├── web/                   # The interface
│   └── explorer/ docs/ demo-credit/
├── scripts/attack/            # The live forgery
└── docs/                      # PRD, architecture, threat model, demo script
```

`security/` is a separate directory on purpose: it isolates the three checks most
Attestcoin integrations will get wrong, so they are individually auditable. **A
registry bug harms every consumer, not one app.**

---

## 📚 Documentation

| Document | What it covers |
|---|---|
| [Product Requirements](docs/PRD.md) | Positioning, goals, milestones, judging alignment |
| [Architecture](docs/ARCHITECTURE.md) | System design, §7 security, §7.6 the adversarial harness |
| [Business model](docs/BUSINESS.md) | Who pays, and what would falsify it |
| [Threat model](docs/security/threat-model.md) | Attack surface, in full |
| [Demo script](docs/DEMO_SCRIPT.md) | Shot list for the video |

---

## 🔗 Links

| Resource | URL |
|---|---|
| **Live interface** | [vouch-registry.vercel.app](https://vouch-registry.vercel.app) |
| **Live demo** | [/create](https://vouch-registry.vercel.app/create) |
| **Registry contract** | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329) |
| **The forged event** | [Etherscan](https://sepolia.etherscan.io/tx/0x6585e3652a5a5cb8808182be76280771069203f75b90e9777116c5eaad316cf3) |
| **Attestcoin docs** | [docs.attestcoin.org](https://docs.attestcoin.org) |

---

## 🛠️ Tech Stack

- **Contracts:** Solidity 0.8.28, Foundry, `via_ir` — the decoder's inline
  assembly hits stack-too-deep otherwise
- **EVM target:** London — CC3 is Frontier-based and has no `PREVRANDAO`
- **Services:** TypeScript, viem, Prisma
- **Interface:** Next.js 15, wagmi, RainbowKit, TanStack Query
- **Chains:** Creditcoin CC3 Testnet, with Ethereum Sepolia as source

### 🐛 Notes for other builders on Attestcoin

Two things cost us time, both documentation drift from the USC → Attestcoin
rename:

1. **`EvmV1Decoder` import path.** The docs import
   `@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol`. In the published
   package it lives at `.../contracts/write-ability/common/EvmV1Decoder.sol`.
2. **Solidity version.** Examples pin `^0.8.23`; the published decoder requires
   `^0.8.28`. Mixing them fails with `No solc version exists that matches`.

Also: **`logIndex` is receipt-scoped, not block-scoped.** `eth_getLogs` returns a
block-scoped index; the registry decodes a *receipt*. Convert with
`receipt.logs.findIndex(l => l.logIndex === log.logIndex)` — the wrong one
reverts `LogIndexOutOfRange`, and would be far worse if it landed in range,
because it would then prove the wrong log.

---

## 📈 Status

- [x] Registry, passport and four consumers deployed to CC3 Testnet
- [x] S1 / S2 / S3 implemented, 23 tests, gated individually in CI
- [x] One real Aave repayment proven end to end through the live precompile
- [x] **Forgery performed live against the real prover**
- [x] 8 tests against the deployed contracts on a forked chain
- [x] Interface deployed, live demo runs from the visitor's wallet
- [ ] Demo video
- [ ] Reserve-asset pinning (needs a value oracle)
- [ ] Mainnet deployment

---

<div align="center">

## Built for BUIDL CTC 2026 Fall 🏆

**Track: RWA**

*Verify once. Underwrite everywhere.*

</div>

## License

MIT
