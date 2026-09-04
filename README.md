# Vouch

**An underwriting primitive for tokenized credit.**

> A valid Attestcoin proof can still be a lie — at the consumer layer, which is where credit facts are actually decided.

**Demonstrated live, not simulated.** On 2026-09-05 a lookalike contract on Sepolia emitted a `Repay` whose `topic0` is byte-identical to Aave V3's. The **real** Attestcoin prover proved it (2 continuity roots, 3,458 bytes). The identical proof bytes were then submitted to two contracts on CC3: `NaiveConsumer` **accepted** it and credited a fabricated 1,000,000 USDC repayment; `VouchRegistry` **reverted** and granted no standing. Same bytes, opposite outcomes. The finding is a **consumer-layer footgun, not an Attestcoin vulnerability** — the inclusion proof did exactly what it claims, and `test_forgery_anti_theProofItselfIsValid` asserts so.

| The live run | |
|---|---|
| Forged event | [`0x6585e365...ad316cf3`](https://sepolia.etherscan.io/tx/0x6585e3652a5a5cb8808182be76280771069203f75b90e9777116c5eaad316cf3) on Sepolia, block 11,635,069, status `success` |
| Lookalike emitter | [`0xBB0C0BeA...43f609CF`](https://sepolia.etherscan.io/address/0xBB0C0BeAF600B205d44f267E0D7586A543f609CF) — not affiliated with Aave |
| `topic0` | `0xa534c8db...c784051` — identical to Aave V3 `Repay` |
| Naive consumer | [`0x791CbBCb...d3e17e82`](https://creditcoin-testnet.blockscout.com/address/0x791CbBCb6837F2eFbEbA77c7218C4695d3e17e82) — **accepted**, credited 1,000,000 USDC |
| `VouchRegistry` | `0xb6e0497d...bbe8329` — **reverted**, `hasProof` stayed false |

Reproduce it: `node scripts/attack/prove-existing.mjs 0x6585e3652a5a5cb8808182be76280771069203f75b90e9777116c5eaad316cf3`

You are an issuer extending credit on Creditcoin, and you cannot see what the borrower did anywhere else. An operator's attestation is a claim. Vouch hands you a cryptographic proof instead - that this address repaid an Aave loan on Ethereum - verified once through the Attestcoin Protocol and readable from your contract for the cost of a storage read.

**Track: RWA.** BUIDL CTC 2026 Fall. Verified borrower history is an underwriting input, not a DeFi yield feature - real-world credit for underbanked borrowers is Creditcoin's own 2017 thesis. Canonical positioning lives in [`docs/PRD.md`](docs/PRD.md); the system design and threat model in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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

Built for **BUIDL CTC 2026 Fall** — track: RWA.

---

## What this is

A shared standing registry for Creditcoin, written for the party doing the underwriting. It proves facts about a borrower's activity on a source chain through the Attestcoin Protocol, stores them permanently on-chain, and exposes them to every issuer on the chain through one interface. You do not run the proving. You read the result.

```solidity
if (IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)) {
    collateralBps = 11_500; // 115% instead of 150%
}
```

That is the entire integration. No ASC to write, no off-chain worker to run, no proof gas to pay.

**Credit is the flagship use case, not the entire product.** `VouchCredit` is one consumer of many.

### Why the issuer and not the borrower

A borrower-facing "portable credit score" is a well-explored dead end - five prior on-chain credit-score projects, no survivors. The framing fails because the borrower is not the party with the unmet problem. The issuer is: a regulated RWA platform or a licensed fiat anchor underwrites a borrower it cannot see, against history held by an institution it has no relationship with. That is the party who needs a proof rather than an assertion, and that is who this repository is addressed to.

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

## Proven end to end

A real Aave repayment on Sepolia, proven through the Attestcoin precompile and
written to the registry. Not a fixture, and not our own transaction -- the point
of a standing registry is that history is proven rather than asserted, so the
demo proves a repayment we had no hand in.

| | |
|---|---|
| Source transaction | [`0x55e617f1...a493941e`](https://sepolia.etherscan.io/tx/0x55e617f1a86b8f2d73a7f2519c80052449488b3e74945a318ba6cc8da493941e) on Sepolia |
| Subject | `0x83900c0eda960a31899d51aae9b9c180a7e21711` |
| Verification | [`0x979e3dbe...ebf5c0f8`](https://creditcoin-testnet.blockscout.com/tx/0x979e3dbe9002522ce08d7e481feb274b1f97c4a4b46d080963936cebebf5c0f8) on CC3 Testnet |
| Continuity proof | 89 roots |
| Gas | 565,420 |

Four unrelated consumers then read that one fact and grant four different
things:

| Consumer | Reads | Result |
|---|---|---|
| `VouchPassport` | repayment count | Tier 1 |
| `VouchCredit` | repayment history | 130% collateral, down from 150% |
| `VouchReceivablesFacility` | repayment history | **80%** advance rate, up from 70% |
| `VouchAccess` | any registered fact | gate open |
| `VouchFeeTier` | **supply** history | 0.30%, unchanged |

The last row is the interesting one. The exchange fee does not move, because it
reads a different fact type. Standing does not leak between domains, which is
what separates a registry from a score.

Check it yourself:

```bash
cast call 0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329   "hasProof(address,bytes32)(bool)"   0x83900c0eda960a31899d51aae9b9c180a7e21711   $(cast keccak "AAVE_REPAYMENT")   --rpc-url https://rpc.cc3-testnet.creditcoin.network
```

## Deployed — CC3 Testnet

| Contract | Address |
|---|---|
| `VouchRegistry` | [`0xb6e0497d...bbe8329`](https://creditcoin-testnet.blockscout.com/address/0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329) |
| `VouchPassport` | [`0xbfb2e062...ab7cb20a`](https://creditcoin-testnet.blockscout.com/address/0xbfb2e062cc9098a68c60cb00d9f0731aab7cb20a) |
| `VouchCredit` | [`0x68e495fd...cccb3622`](https://creditcoin-testnet.blockscout.com/address/0x68e495fd8d43ff1aa443eb0689f4f2f5cccb3622) |
| `VouchFeeTier` | [`0xf1ed0bc7...f70f3bd8`](https://creditcoin-testnet.blockscout.com/address/0xf1ed0bc7a5f9dd5aa98cf5b63a2a51ecf70f3bd8) |
| `VouchAccess` | [`0x46ecf42f...bd8f64be`](https://creditcoin-testnet.blockscout.com/address/0x46ecf42ff86e564fe4ffa086451a6f9dbd8f64be) |
| `VouchReceivablesFacility` | [`0x33652813...ea915553`](https://creditcoin-testnet.blockscout.com/address/0x33652813fe9fb069b41b3de674405608ea915553) |

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

Every surface reads the deployed registry live. Nothing on any page is a
fixture: an address with no proven history renders as empty and says so, rather
than showing invented data.

## Status

| Component | State |
|---|---|
| `VouchRegistry` (ASC) | Deployed to CC3 Testnet — 95 contract tests passing, 0 failed — 8 of them against the live deployment |
| `VouchPassport` | Deployed, tested (17 registry + passport tests) |
| `VouchCredit` (consumer 1 — lending) | Deployed, tested |
| `VouchFeeTier` (consumer 2 — DEX fees) | Deployed, tested |
| `VouchAccess` (consumer 3 — access gate) | Deployed, tested |
| `VouchReceivablesFacility` (consumer 4 — RWA) | Deployed to CC3 Testnet, 19 tests |
| Security: S1 / S2 / S3 | Implemented, 23 tests in `Security.t.sol` proving each attack is rejected |
| Forgery harness (`SpoofEmitter` + `NaiveConsumer`) | **Deployed and performed live** — 11 tests, plus a real run against the real prover |
| Deploy + source-config scripts | Implemented, run against CC3 Testnet |
| CI (build, fmt, S1/S2/S3, secret scan) | Implemented |
| Gas benchmark | Implemented, 5 tests — numbers below |
| Live contract tests | 8 tests against the **deployed** contracts on CC3, no mock — `forge test --match-contract LiveTest --fork-url https://rpc.cc3-testnet.creditcoin.network` |
| Batch packer | Implemented, 13 tests |
| Proof-request pipeline | Implemented, 7 tests |
| Indexer | Implemented, typechecked — not yet run against mainnet |
| Frontend | Deployed — https://vouch-registry.vercel.app |
| Deck + demo video | Not started |

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

**This is the claim the whole submission rests on: a valid Attestcoin proof can still be a lie.**

Deploy this to any supported source chain:

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

### The harness — S2 performed, not described

The attack ships in the repository. Four pieces:

| Piece | Where | Role |
|---|---|---|
| `SpoofEmitter.sol` | `src/attack/`, deploys to **Sepolia** | Emits `Repay` with Aave's exact signature and field layout. Not affiliated with Aave. |
| `NaiveConsumer.sol` | `src/attack/`, deploys to CC3 | Verifies the proof, checks receipt status, guards replay — and never checks the emitter. |
| `VouchRegistry` | CC3 | The real verifier: emitter-pinned, status-checked, replay-guarded. |
| `scripts/attack/forge-fact.mjs` | — | Emits, proves through the real Block Prover, submits identical bytes to both. |

```bash
cd packages/contracts && forge test --match-contract ForgeryTest
```

**11 tests, 0 failed — and performed live against the real prover.** The load-bearing one is `test_forgery_sameBytesOppositeOutcomes`: it builds the proof once, fingerprints the payload, submits it to `NaiveConsumer` (accepted — a fabricated million-dollar repayment is credited), asserts the bytes were not altered, then submits the same object to `VouchRegistry` (reverts, `EmitterMismatch`).

**`NaiveConsumer` is not a strawman.** It calls the same precompile through the same `AttestcoinVerifier` the registry uses, rejects reverted transactions (S1), and guards replay (S3) — all asserted by their own tests. It omits exactly one line:

```solidity
if (entry.address_ != src.emitter) revert EmitterMismatch(expected, actual);
```

That omission is the entire vulnerability, and `test_forgery_bothAgreeOnAGenuineRepayment` proves the two contracts agree on honest input, so the disagreement is about authorship and nothing else.

**Scope of the claim, bounded.** This proves *a valid Attestcoin proof of a lookalike event is accepted by a consumer that verifies the proof, checks status and guards replay but does not pin the emitter*. It does **not** prove Attestcoin is broken — `test_forgery_anti_theProofItselfIsValid` asserts the proof verified correctly. Attestcoin answered its question right; the naive consumer asked the wrong question.

**Live-run status: PERFORMED, 2026-09-05.** `SpoofEmitter` is deployed to Sepolia at [`0xBB0C0BeAF600B205d44f267E0D7586A543f609CF`](https://sepolia.etherscan.io/address/0xBB0C0BeAF600B205d44f267E0D7586A543f609CF) and `NaiveConsumer` to CC3 at [`0x791CbBCb6837F2eFbEbA77c7218C4695d3e17e82`](https://creditcoin-testnet.blockscout.com/address/0x791CbBCb6837F2eFbEbA77c7218C4695d3e17e82). The real Attestcoin prover proved the forged event; the naive consumer accepted it and the registry reverted on identical bytes. Reproduce with `node scripts/attack/prove-existing.mjs <tx>`. The script states its own falsifier and exits non-zero if the claim fails.

### Layer two — what `EmitterMismatch` does *not* fix

Pinning the emitter closes S2. It does not make a proven fact economically meaningful, and pretending otherwise would repeat the exact mistake this project exists to name. Four attacks survive emitter pinning, listed because a reviewer will find them anyway:

| Attack | Status |
|---|---|
| **Cross-chain address collision.** Same contract address on another EVM chain via CREATE2 or a matched deployer nonce, same `topic0`, genuine emitter match. | **Closed.** `VouchRegistry` pins `chainKey` and reverts `ChainKeyMismatch`. `chainKey` is Attestcoin's key space, not `chainId`. |
| **Permissionless market self-dealing.** Deploy a worthless ERC-20, list it in an isolated Aave market, self-borrow and self-repay 1,000,000 units. The emitter is the *real* pool. The event is real. The proof is real. | **Open.** The reserve asset is not pinned and there is no value oracle. `proofValue` is denominated in a token nobody checked. |
| **Wash repayment.** `repayer == user == attacker`, cycled to farm `proofCount`. Every field is genuine. | **Open.** Tier is a function of event count. This is the actual credit-scoring attack on a lender, and emitter pinning does nothing about it. |
| **Semantic drift.** Aave's `Repay` carries `useATokens`; repaying with aTokens is not the same economic event as repaying with underlying. | **Open.** The flag is inside the log data and is not decoded or branched on. |

The registry's own limitation section already says standing is optimistic-but-bounded. These are the specific reasons why. **A proven fact is a fact about an event, never a judgement about a counterparty** — the consumer decides what it is worth, and a consumer that treats `proofCount` as creditworthiness has made the layer-two version of the naive consumer's mistake.

Mitigations for the two open economic attacks — pinning the reserve asset, and requiring `repayer != user` — are one `RegisteredSource` field and one validator line each. They are deliberately not shipped in this pass because doing it properly needs a value oracle, and asserting a fix we have not tested is the failure mode this repository was built to argue against. The end-to-end harness - a `SpoofEmitter` on Sepolia, a naive consumer that checks `topic0` alone, and the identical proof bytes submitted to both - is specified in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) section 7.6 and is not built yet. It will run on Sepolia and never on mainnet: a mainnet contract whose only purpose is emitting convincing fake Aave events is a live artifact built to deceive third parties, and `topic0` is not chain-specific, so nothing is lost by demonstrating it where it is safe.

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
