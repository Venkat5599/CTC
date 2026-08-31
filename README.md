# Vouch

**Portable On-Chain Standing.**

> Attestcoin proves the fact. Vouch makes the fact reusable. Applications decide what the fact is worth.

Prove what you've done on a supported chain once. Let every Creditcoin application recognize it.

```
                 ETHEREUM
                    │
              Real activity
                    │
                    ▼
             ┌────────────┐
             │ Attestcoin │
             │   Proof    │
             └─────┬──────┘
                   │
                   ▼
        ╔══════════════════════╗
        ║       VOUCH          ║
        ║  Verify → Store      ║
        ║  Once → Reuse        ║
        ╚══════════┬═══════════╝
                   │
             Vouch Registry
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     Lending      DEX      Gaming
        │          │          │
        └──────────┼──────────┘
                   ▼
              CREDITCOIN
```

Built for **BUIDL CTC 2026 Fall** — track: DeFi.

---

## What this is

A shared standing registry for Creditcoin. It proves facts about a user's activity on a source chain through the Attestcoin Protocol, stores them permanently on-chain, and exposes them to every Creditcoin application through one interface.

```solidity
if (IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)) {
    collateralBps = 11_500; // 115% instead of 150%
}
```

That is the entire integration. No ASC to write, no off-chain worker to run, no proof gas to pay.

**Credit is the flagship use case, not the entire product.** `VouchCredit` is one consumer of many.

---

## Why a registry rather than an application

Attestcoin readability is priced against repetition. Verification cost is documented as:

```
CTC cost ≈ 2.3×10⁻⁵ + 2.9×10⁻⁷ × (continuity hash count)
```

A transaction finalized ~10 minutes ago sits ~10 hashes from a dense attestation. After roughly 24 hours those attestations are replaced by sparse checkpoints at one per 1000 blocks, so the same proof costs 1000 hashes — **more than 10x**. History is always in the second row.

If every application integrates Attestcoin separately, each one re-pays that cost for facts another application has already proven, and each one re-implements the security checks (most will get at least one wrong).

Vouch verifies once and stores canonically. The first consumer pays; **every subsequent consumer reads for an `SLOAD`.**

---

## Deployed — CC3 Testnet

| Contract | Address |
|---|---|
| `VouchRegistry` | [`0xb6e0497d...bbe8329`](https://creditcoin-testnet.blockscout.com/address/0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329) |
| `VouchPassport` | [`0xbfb2e062...ab7cb20a`](https://creditcoin-testnet.blockscout.com/address/0xbfb2e062cc9098a68c60cb00d9f0731aab7cb20a) |
| `VouchCredit` | [`0x68e495fd...cccb3622`](https://creditcoin-testnet.blockscout.com/address/0x68e495fd8d43ff1aa443eb0689f4f2f5cccb3622) |
| `VouchFeeTier` | [`0xf1ed0bc7...f70f3bd8`](https://creditcoin-testnet.blockscout.com/address/0xf1ed0bc7a5f9dd5aa98cf5b63a2a51ecf70f3bd8) |
| `VouchAccess` | [`0x46ecf42f...bd8f64be`](https://creditcoin-testnet.blockscout.com/address/0x46ecf42ff86e564fe4ffa086451a6f9dbd8f64be) |

Three fact types registered against Sepolia (`chainKey 1`): Aave `Repay`, Aave
`Supply`, and Governor `VoteCast`. Read them back yourself:

```bash
cast call 0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329 "registeredFactTypes()(bytes32[])"   --rpc-url https://rpc.cc3-testnet.creditcoin.network
```

## Live

| | |
|---|---|
| Site | https://vouch-registry.vercel.app |
| Explorer | https://vouch-explorer.vercel.app |
| Docs | https://vouch-protocol-docs.vercel.app |
| Demo lending market | https://vouch-demo-credit.vercel.app |

The demo market is a separate deployment on purpose. The argument for a shared
registry only lands if the consumer looks like somebody else's product, which it
is: no shared storage, no registration, no privileged relationship. Just an
address and a view call.

Contracts are not yet deployed, so every surface reads an empty registry and
says so plainly rather than showing invented data.

## Status

| Component | State |
|---|---|
| `VouchRegistry` (ASC) | Implemented, 52 contract tests passing |
| `VouchPassport` | Implemented, tested |
| `VouchCredit` (consumer 1 — lending) | Implemented, tested |
| `VouchFeeTier` (consumer 2 — DEX fees) | Implemented, tested |
| `VouchAccess` (consumer 3 — access gate) | Implemented, tested |
| Security: S1 / S2 / S3 | Implemented, 21 tests proving each attack is rejected |
| Deploy + source-config scripts | Implemented, dry-run clean |
| CI (build, fmt, S1/S2/S3, secret scan) | Implemented |
| Gas benchmark | Implemented — numbers below |
| Batch packer | Implemented, 13 tests |
| Proof-request pipeline | Implemented, 7 tests |
| Indexer | Implemented, typechecked — not yet run against mainnet |
| Deployment to CC3 Testnet | Not started |
| Frontend | Not started |

**Measured gas.** A consumer read is flat at **~1,202 gas** regardless of how
many consumers came before it, and 75 consumer reads trigger **zero** precompile
calls. On batching, the honest result is narrower than the pitch: with a *dense*
continuity proof batching is a wash and measured ~0.7% worse, because each claim
still runs its own decode and its own precompile call. It wins only with a
*sparse* proof — ~1,000 roots, which is what proving history older than roughly a
day actually requires — where the shared array is copied once instead of ten
times: ~8% execution and **6.8x** transaction cost. See `test/Gas.t.sol`.

Building in the open. See [docs/PRD.md](docs/PRD.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Security — three protocol-specific failure modes

These are the checks an Attestcoin integration must get right. All three are enforced in `VouchRegistry`.

### S1 — The precompile proves inclusion, not success

From the Attestcoin docs:

> *"The block prover precompile **does not** validate if a transaction was successful or not. It only validates if a transaction is included in a block and that block is really a part of the confirmed source chain. Therefore, a dApp's ASC **MUST** check the status field."*

A reverted transaction is still in the block and still yields a valid proof. Skipping this credits actions that never took effect, and the failure is **silent** — the precompile returns true and nothing reverts.

Enforced in `SourceValidator.validateAndExtract`: `receipt.receiptStatus != 1` reverts.

### S2 — A valid proof of a lookalike event is still a valid proof

Deploy this to Ethereum Mainnet:

```solidity
contract Spoof {
    event Repay(address indexed reserve, address indexed user,
                address indexed repayer, uint256 amount, bool useATokens);
    function mintHistory() external {
        emit Repay(USDC, msg.sender, msg.sender, 1_000_000e6, false);
    }
}
```

Call it. The transaction succeeds. `topic0` matches Aave's `Repay` exactly. The Merkle and continuity proofs are genuine. An ASC checking only the event signature credits a fabricated million-dollar repayment.

**This is the most dangerous class in the design**, because nothing about the proof is wrong. The proof system is not compromised — the consuming contract simply failed to establish semantics.

Enforced by pinning the emitter contract address in `SourceRegistry` and asserting it alongside `topic0` and `chainKey`.

### S3 — Replay

Keyed on `keccak(chainKey, blockNumber, txHash, factType, logIndex)`.

`logIndex` is required because one transaction can contain several qualifying logs. `factType` is required because `getLogsByEventSignature` returns a **filtered** array — index 0 under one fact type and index 0 under another can be different logs in the same transaction, and without `factType` in the key those two legitimate facts would collide.

> The reference `ASCBase` keys its guard on `(chainKey, blockHeight, txIndex)`, which is per-**transaction**. Vouch keys per-**log**.

---

## The honest limitation

Inclusion proofs prove **positive** facts only.

Vouch can prove *"this address repaid."* It **cannot** prove *"this address was never liquidated"* — absence of an event is not enumerable.

Consequences, enforced in code:

- Standing is **monotonic**. The registry is append-only; the passport is a pure function of it. No sequence of operations can lower a tier.
- Unproven is **unknown**, never **clean**. Nothing in the UI claims a clean history.
- Collateral floors at 100%. Standing *reduces* collateral; it never eliminates it.

This is a correctness property of the design, not a disclaimer.

---

## Notes for other builders on Attestcoin

Two things cost us time. Both are documentation drift from the recent USC → Attestcoin rename:

1. **`EvmV1Decoder` import path.** The docs and the examples repo import
   `@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol`.
   In the published npm package (`@gluwa/usc-contracts@0.2.0`) it lives at
   `@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol`.

2. **Solidity version.** The examples pin `^0.8.23`; the published decoder requires `^0.8.28`. Mixing them fails with `No solc version exists that matches the version requirement`.

Also: `via_ir = true` is required — the decoder's inline assembly hits *stack too deep* otherwise.

---

## Layout

```
packages/contracts/src/
├── core/            VouchRegistry, VouchTypes, VouchErrors, FactTypes
├── verification/    AttestcoinVerifier, ProofValidator, SourceValidator
├── security/        ReplayGuard, SourceRegistry
├── passport/        VouchPassport
├── consumers/       VouchCredit
└── interfaces/      IVouchRegistry, IVouchPassport, INativeQueryVerifier
```

`security/` is a separate directory on purpose: it isolates the three checks most Attestcoin integrations will get wrong, so they are individually auditable. A registry bug harms every consumer, not one app.

---

## Environment

| Component | CC3 Testnet |
|---|---|
| Creditcoin RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| BlockProver Precompile | `0x0000000000000000000000000000000000000FD2` |
| ChainInfo Precompile | `0x0000000000000000000000000000000000000fd3` |
| Proof Builder API | `https://proof-gen-api.cc3-testnet.creditcoin.network/` |

| Source chain | `chainKey` |
|---|---|
| Ethereum Sepolia | `1` |
| Ethereum **Mainnet** | `3` |

`chainKey` is **not** `chainId`. Vouch reads Ethereum **Mainnet** from CC3 Testnet, so the demo runs on real addresses with real history.

---

## Build

```bash
npm install
forge build
forge test -vv
```

Requires Foundry and Node 22+.

---

## Docs

- [Product Requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)

## License

MIT
