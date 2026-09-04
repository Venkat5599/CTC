<p align="center">
  <img src="docs/assets/vouch-brand.png" alt="Vouch — Verify once. Underwrite everywhere." width="820" />
</p>

<h1 align="center">Vouch</h1>

<p align="center">
  <strong>Shared Cross-Chain Standing Registry for Creditcoin</strong>
</p>

<p align="center">
  <a href="https://creditcoin-testnet.blockscout.com/address/0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46">
    <img src="https://img.shields.io/badge/🔴_LIVE-Creditcoin_CC3-4edea3?style=for-the-badge&labelColor=0c0e10" alt="Live on CC3" />
  </a>
  <a href="https://vouch-registry.vercel.app">
    <img src="https://img.shields.io/badge/▶_DEMO-vouch--registry-4edea3?style=for-the-badge&labelColor=0c0e10" alt="Live demo" />
  </a>
  <img src="https://img.shields.io/badge/104_TESTS-0_failed-10b981?style=for-the-badge&labelColor=0c0e10" alt="95 tests" />
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
| **VouchRegistry** | `0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46) |
| **VouchPassport** | `0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6) |
| **VouchCredit** | `0x52f0dec9cfa99cd634b3ba87fc3ed5d3c4a96720` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0x52f0dec9cfa99cd634b3ba87fc3ed5d3c4a96720) |
| **VouchReceivablesFacility** | `0xc9c872b244e6385f934fc0746b19afbdf99be5f4` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xc9c872b244e6385f934fc0746b19afbdf99be5f4) |
| **VouchFeeTier** | `0xec66d8e1330dfe2185d2dbf08e642c850bfe4202` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xec66d8e1330dfe2185d2dbf08e642c850bfe4202) |
| **VouchAccess** | `0xbc531d6c329fe6f8fabeb72ae0921b38bc0c1719` | [✅ View](https://creditcoin-testnet.blockscout.com/address/0xbc531d6c329fe6f8fabeb72ae0921b38bc0c1719) |

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
        IVouchRegistry(0xc5C70bC6cB61AD5c2370c69C8410d3d988e82d46);

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
cast call 0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46 \
  "hasProof(address,bytes32)(bool)" \
  0x4c8ea5e41ed3dbe14a4cf0b79accb5e5d3ab88f9 \
  $(cast keccak "AAVE_REPAYMENT") \
  --rpc-url https://rpc.cc3-testnet.creditcoin.network
```

### TypeScript SDK

```typescript
import { createVouchClient, AAVE_REPAYMENT } from '@vouch/sdk';

const vouch = createVouchClient({
  registry: '0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46',
  passport: '0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6',
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

### Beyond the emitter — the economic attacks

Pinning the emitter closes the forgery. It does not make a proven fact
economically meaningful, so two more checks exist. Both are **opt-in per source**,
because both narrow what a fact means and neither is free.

| ID | The attack | Enforcement |
|---|---|---|
| **S4** | **Permissionless market self-dealing.** List a worthless ERC-20 in an isolated market, self-borrow, self-repay a million units. The pool is real, the event is real, the proof is real. | `reserveAsset` pinned in `RegisteredSource`; reverts `ReserveAssetMismatch` |
| **S5** | **Wash repayment.** `payer == subject`, cycled to farm `proofCount`. Every field is genuine. | `requireDistinctPayer`; reverts `PayerIsSubject` |

Pinning **which** asset counts is an equality check and needs no oracle. Knowing
what a repayment is **worth** does, and is still not attempted — a pinned asset
can be repaid in a trivial amount, and `proofValue` remains a number this
contract cannot price.

`requireDistinctPayer` is **off by default, and that default is a judgement**: an
honest borrower repaying their own loan also has `payer == subject`. Enforcing it
everywhere would reject the ordinary case to stop the adversarial one. Where a
source turns it on, the fact means something narrower and stronger — *somebody
else settled this debt*.

| Attack | Status |
|---|---|
| Cross-chain address collision | ✅ **Closed** — `chainKey` pinned, reverts `ChainKeyMismatch` |
| Lookalike emitter (S2) | ✅ **Closed** — emitter pinned, demonstrated live |
| Permissionless market self-dealing (S4) | ✅ **Closed where pinned** — 3 tests |
| Wash repayment (S5) | ✅ **Closed where required** — 4 tests |
| Semantic drift (`useATokens` not decoded) | ⚠️ **Open** — the flag is in the log data and is not branched on |
| Economic **value** of a proven fact | ⚠️ **Open by design** — needs a price oracle. `proofValue` is a token amount, not a valuation. |

> ✅ **Deployed and live.** The registry above carries S1–S5. `AAVE_REPAYMENT` is
> registered with its reserve asset pinned to Sepolia USDC, and with
> `requireDistinctPayer` **off** — the real repayment this registry holds has
> `payer == subject`, which is what an ordinary borrower settling their own loan
> looks like. Turning it on would reject the honest case along with the wash
> cycle. Two live tests assert both facts against the deployed contract.

> The v1 registry (`0xb6e0497d…bbe8329`) is still on chain and its facts are
> still true. It simply cannot enforce S4 or S5, and no fact migrates between
> registries — a proof records where it was verified.

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
│                 0xc5c70bc6...988e82d46  ·  Creditcoin CC3                 │
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
| Source transaction | [`0x29e6cd2b...c72d9e86`](https://sepolia.etherscan.io/tx/0x29e6cd2ba2e121e4ffd227ee5305478986889d9f1e6a84a15ac5d4abc72d9e86) on Sepolia |
| Subject | `0x4c8ea5e41ed3dbe14a4cf0b79accb5e5d3ab88f9` |
| Verification | [`0x12b077b1...04db679a`](https://creditcoin-testnet.blockscout.com/tx/0x12b077b18fa983224916e703a657f97b8bfa43dd86d410a10523dbe204db679a) on CC3 |
| Reserve asset | USDC, **pinned** — S4 enforced on this very proof |
| Gas | 524,014 |

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
forge test                                    # 104 passing, 0 failed

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
| `Security.t.sol` | 30 | Each attack is rejected, S1–S5 |
| `Receivables.t.sol` | 19 | The RWA consumer's terms |
| `Registry.t.sol` | 17 | Storage, monotonicity, bounds |
| `Consumers.t.sol` | 12 | Consumers are mutually ignorant |
| `Forgery.t.sol` | 11 | Identical bytes, opposite outcomes |
| **`Live.t.sol`** | **10** | **The deployed contracts, forked, no mock** |
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
| **Registry contract** | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46) |
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
- [x] Reserve-asset pinning and wash-repayment guard (S4/S5) — **deployed**, 9 tests
- [ ] Value oracle, so `proofValue` means something
- [ ] Mainnet deployment

---

<div align="center">

## Built for BUIDL CTC 2026 Fall 🏆

**Track: RWA**

*Verify once. Underwrite everywhere.*

</div>

## License

MIT
