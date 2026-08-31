# Vouch — Architecture

**Attestcoin proves the fact. Vouch establishes that the fact means what it appears to mean. Applications decide what it is worth.**

*A valid proof is not the same as a true claim. The gap between those two is where this system does its work.*

| Field | Value |
|---|---|
| Version | 3.0 — adversarial verification |
| Date | 2026-09-01 |
| Execution chain | Creditcoin CC3 Testnet |
| Source chain (honest path) | Ethereum Mainnet (`chainKey 3`) |
| Source chain (adversarial path) | Ethereum Sepolia (`chainKey 1`) |
| Companion doc | [PRD.md](./PRD.md) |

---

## 1. Design thesis

Four commitments, in priority order.

**0. Inclusion is not authorship.** Attestcoin proves that a transaction was included in a block on a source chain. It does not prove the transaction succeeded, that the contract emitting the event is the one you meant, or that you have not seen this proof before. Every one of those gaps is silent: the proof verifies, nothing reverts, and the consuming contract records something false. Establishing semantics on top of proven inclusion is the actual product (§7).

**1. Verify once, reuse forever.** Attestcoin readability is powerful but priced against repetition — each verification pays for a continuity proof whose length grows as the source block ages. Any system that re-verifies the same history per application, per query, is economically dead. Vouch verifies once, stores canonically, and amortizes across every future consumer.

**2. The registry is the protocol; the passport is the UX; credit is the reference consumer.** This separation is the whole architecture. `VouchRegistry` holds verified facts and nothing else. `VouchPassport` aggregates them for humans. `VouchCredit` is one application among many, with no privileged access. If `VouchCredit` were deleted, the registry would still be useful to the ecosystem.

**3. Vouch proves facts. It does not decide what they mean.** The registry stores *"this address emitted this event on this chain in this block."* Whether that is worth a lower collateral ratio, a fee tier, or a game unlock is the consumer's decision. This is what separates Vouch from another credit-score product, and it is why the primitive generalizes.

### 1.1 The diagram that goes in the deck

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
        ║                      ║
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

---

## 2. Full system architecture

```
                         EXTERNAL CHAINS
                    ┌──────────────────────┐
                    │  Ethereum Mainnet    │
                    │  Ethereum Sepolia    │
                    │  Future chains       │
                    └──────────┬───────────┘
                               │  on-chain events
                               ▼
                    ┌──────────────────────┐
                    │  VOUCH RELAYER       │
                    │  Event Discovery     │
                    │  Proof Builder       │
                    │  Batch Scheduler     │
                    │  Retry / Deadline    │
                    └──────────┬───────────┘
                               │  Attestcoin SDK
                               ▼
                    ┌──────────────────────┐
                    │     ATTESTCOIN       │
                    │  Block Proof         │
                    │  Merkle Verification │
                    │  Continuity Proof    │
                    └──────────┬───────────┘
                               │  verified fact
                               ▼
             ╔══════════════════════════════════╗
             ║          CREDITCOIN              ║
             ║  ┌────────────────────────────┐  ║
             ║  │      VOUCH REGISTRY        │  ║
             ║  │  Verified Facts            │  ║
             ║  │  Proof References          │  ║
             ║  │  Replay Protection         │  ║
             ║  │  Source Validation         │  ║
             ║  └─────────────┬──────────────┘  ║
             ║       ┌────────┴────────┐        ║
             ║       ▼                 ▼        ║
             ║  Vouch Passport    Vouch SDK     ║
             ╚═══════╪═════════════════╪════════╝
                     │                 │
              ┌──────┴─────┐     ┌─────┴───────┐
              ▼            ▼     ▼             ▼
           Lending        DEX  Gaming         DAO
```

### 2.1 Trust model

Off-chain components — discovery, scheduler, proof builder, relayer — are **untrusted**. They affect *liveness only*: which proofs get submitted, and when. They cannot forge a fact, because every submission is verified against the Block Prover Precompile on-chain before storage.

`VouchRegistry.submitBatch` is **permissionless**. Anyone can relay proofs for any address. If our relayer disappears, no incorrect state exists and anyone can run one. That is a deliberate decentralization property.

Trusted set: the Attestcoin attestor quorum, the Creditcoin chain, and Vouch's own contract logic. Nothing else.

---

## 3. Attestcoin integration

Vouch uses **readability** only. Writability is out of scope per the kickoff AMA (final development phase); forward compatibility in §11.

### 3.1 What readability proves

| Proof | Establishes |
|---|---|
| **Merkle proof** | The transaction is included in a specific block's transaction tree |
| **Continuity proof** | That block belongs to a sequence anchored to an attestation on Creditcoin |

Attestors watch the source chain, reach quorum on its confirmed state, and record attestations on Creditcoin. The Block Prover Precompile verifies both proofs synchronously — in the same transaction that consumes the result — as native Rust.

### 3.2 What readability does **not** prove

Two gaps that define the entire security model:

1. **Success.** The precompile validates inclusion, not outcome. A reverted transaction is still in the block and still yields a valid proof. The consuming contract must check receipt `status` itself.
2. **Authorship intent.** A proof that *some contract* emitted *some event* is valid regardless of who deployed that contract. Semantics must be established by pinning the emitter.

Both handled in §7.

### 3.3 Environment

| Component | CC3 Testnet |
|---|---|
| Creditcoin RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| BlockProver Precompile | `0x0000000000000000000000000000000000000FD2` |
| ChainInfo Precompile | `0x0000000000000000000000000000000000000fd3` |
| Decoder contract | `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f` |
| Proof Builder API | `https://proof-gen-api.cc3-testnet.creditcoin.network/` |
| ASC Dashboard | `https://dashboard.cc3-testnet.creditcoin.network/` |
| SDK | `@gluwa/usc-sdk` (peer dep: ethers v6) |

| Source chain | `chainKey` (on CC3 Testnet) |
|---|---|
| Ethereum Sepolia | `1` |
| Ethereum **Mainnet** | `3` |

> **`chainKey` is not `chainId`.** It is Creditcoin-internal. On CC3 Testnet `1` is Sepolia and `3` is Ethereum Mainnet; on CC3 Mainnet `1` is Ethereum Mainnet. Hard-coding the wrong constant silently changes which chain you trust. Vouch pins `chainKey` per registered source and asserts it on every claim.

**Vouch reads Ethereum Mainnet (`chainKey 3`) from CC3 Testnet.** Real addresses, real Aave history, real demo. No fixtures. This is the most valuable environment property available and most teams will not use it.

### 3.4 The adapter boundary

Attestcoin SDK calls are **never** scattered through the codebase. One package owns the boundary:

```
Vouch
  │
  ▼
AttestcoinAdapter        packages/attestcoin
  ├── discover
  ├── waitForAttestation
  ├── buildProof
  ├── buildBatchProof
  └── submitProof
       │
       ▼
   @gluwa/usc-sdk
```

The SDK is young and was renamed from USC recently enough that repository names still lag. When it changes, one package changes. This is cheap insurance and it reads as protocol engineering rather than hackathon wiring.

---

## 4. Smart contract architecture

```
packages/contracts/src/
│
├── core/
│   ├── VouchRegistry.sol        # the ASC — sole writer of facts
│   ├── VouchFact.sol            # fact struct + FactId derivation
│   ├── VouchTypes.sol           # shared types
│   └── VouchErrors.sol          # custom errors
│
├── verification/
│   ├── AttestcoinVerifier.sol   # precompile boundary
│   ├── ProofValidator.sol       # proof shape + bounds
│   └── SourceValidator.sol      # emitter + topic0 + status
│
├── security/
│   ├── ReplayGuard.sol          # FactId consumed-set
│   ├── EmitterRegistry.sol      # registered source contracts
│   └── ChainRegistry.sol        # registered chainKeys
│
├── passport/
│   ├── VouchPassport.sol        # aggregation, monotonic
│   └── PassportView.sol         # read helpers, no state
│
├── consumers/
│   └── VouchCredit.sol          # reference consumer
│
└── interfaces/
    ├── IVouchRegistry.sol
    ├── IVouchPassport.sol
    └── IAttestcoinVerifier.sol
```

The split is not decoration. `security/` isolates the three checks that most Attestcoin integrations will get wrong, so they are trivially auditable and individually testable — which matters because a registry bug harms every consumer, not one app.

### 4.1 `VouchRegistry` — the fact model

Store identity and a payload hash, not bulky decoded payloads. Keeps storage bounded and cost predictable.

```solidity
struct VerifiedFact {
    bytes32 factId;         // keccak(chainKey, blockNumber, txHash, logIndex)

    uint64  sourceChain;    // chainKey, pinned
    uint64  blockNumber;    // source block

    bytes32 txHash;         // source transaction
    uint32  logIndex;       // which log in the receipt

    address subject;        // decoded from the event payload
    address emitter;        // the source contract, pinned

    bytes32 factType;       // AAVE_REPAYMENT, LONG_TERM_LP, ...
    bytes32 payloadHash;    // keccak of the decoded payload
    uint256 value;          // the one numeric the consumers need

    uint64  sourceTimestamp;
    uint64  verifiedAt;
}
```

```
Fact
 ├── identity      (factId)
 ├── source        (chain, block, tx, logIndex)
 ├── proof ref     (payloadHash)
 ├── subject       (who it's about)
 ├── fact type     (what happened)
 └── value         (how much)
```

Public interface:

```solidity
interface IVouchRegistry {
    event FactVerified(
        bytes32 indexed factId,
        address indexed subject,
        bytes32 indexed factType,
        uint256 value
    );

    function submitBatch(BatchProof calldata proof, FactClaim[] calldata claims)
        external returns (uint256 verifiedCount);

    function hasProof(address subject, bytes32 factType) external view returns (bool);
    function proofCount(address subject, bytes32 factType) external view returns (uint32);
    function proofValue(address subject, bytes32 factType) external view returns (uint256);

    function getFact(bytes32 factId) external view returns (VerifiedFact memory);
    function isVerified(bytes32 factId) external view returns (bool);
}
```

`hasProof(user, factType)` is **the** primitive. A consumer needs nothing else.

### 4.2 Verification sequence — per claim, inside `submitBatch`

1. Derive `factId`; revert if consumed. → `ReplayGuard` (**S3**)
2. Assert `claim.chainKey` equals the registered chain for this fact type. → `ChainRegistry`
3. Assert `continuityRoots.length <= MAX_CONTINUITY_ROOTS`. → `ProofValidator` (gas griefing)
4. Assert `txBytes.length <= MAX_TX_BYTES` (~500KB provability ceiling). → `ProofValidator`
5. Call BlockProver Precompile `verify()`. Revert on failure. → `AttestcoinVerifier`
6. Decode the verified transaction via `EvmV1Decoder`.
7. Assert receipt `status == 0x1`. → `SourceValidator` (**S1**)
8. Assert `log.emitter == registered.emitter` **and** `log.topic0 == registered.topic0`. → `SourceValidator` + `EmitterRegistry` (**S2**)
9. Decode `subject` and `value` from the payload per the registered arg indices.
10. Store `VerifiedFact`, mark `factId` consumed, emit `FactVerified`.

Steps 7 and 8 are the ones most implementations miss. They are not optional.

### 4.3 Fact types — typed, not arbitrary strings

```
packages/schemas/
├── facts/
│   ├── aave.ts
│   ├── uniswap.ts
│   ├── ethereum.ts
│   └── common.ts
├── fact-types.ts
└── validation.ts
```

v1 ships three, spanning three domains so generality is demonstrated rather than asserted:

| Fact type | Source event | Domain |
|---|---|---|
| `AAVE_REPAYMENT` | Aave V3 `Repay` | Credit |
| `LONG_TERM_LP` | Aave V3 `Supply` + tenure | Liquidity |
| `GOVERNANCE_ACTIVITY` | Governor `VoteCast` | Governance |

Registered as configuration, not code:

```solidity
struct RegisteredSource {
    uint64  chainKey;    // 3 = Ethereum Mainnet
    address emitter;     // pinned source contract
    bytes32 topic0;      // pinned event signature
    bytes32 factType;
    uint8   subjectArg;  // index of the subject in the decoded args
    uint8   valueArg;    // index of the value
    bool    enabled;
}
```

Adding a fourth is a registry entry. That property is what makes this infrastructure rather than an app.

### 4.4 `VouchPassport` — aggregation

```solidity
struct Passport {
    uint32  totalProofs;
    uint64  earliestFact;    // source timestamp
    uint64  latestFact;
    uint8   tier;            // 0 None, 1 Bronze, 2 Silver, 3 Gold
}

interface IVouchPassport {
    function passportOf(address user) external view returns (Passport memory);
    function tierOf(address user) external view returns (uint8);
}
```

**Monotonic by construction.** The registry is append-only and the passport is a pure function of it. No code path lowers a tier. Asserted by invariant test: for any ordering of fact additions, tier is non-decreasing.

Consumers wanting precision call `hasProof` directly; consumers wanting one number read `tierOf`. Both are first-class.

### 4.5 `VouchCredit` — the reference consumer

```
User → VouchRegistry → verified facts → risk tier → loan terms
```

Bounded demo pool, single asset, hard caps, deliberately unsophisticated. Its job is to prove that an application can consume Vouch and grant a real benefit — not to be a lending protocol. Ships alongside at least one additional consumer (fee tier or access gate) written as a third party would write it, because **one consumer makes us a competitor to CrossCredit; multiple consumers make us a different category.**

---

## 5. Relayer architecture

Not a cron job.

```
services/relayer/src/
├── discovery/
│   ├── event-scanner.ts
│   └── source-monitor.ts
├── scheduler/
│   ├── queue.ts
│   ├── batcher.ts
│   ├── priority.ts
│   └── deadline.ts
├── proof/
│   ├── builder.ts
│   └── submitter.ts
├── settlement/
│   └── keeper.ts
└── index.ts
```

Pipeline:

```
Ethereum Event
      ↓
   Discovery
      ↓
Fact Candidate
      ↓
    Queue
      ↓
┌──────────────────────┐
│ Batch Scheduler      │
│  same chain          │
│  same block range    │
│  same deadline       │
└──────────┬───────────┘
           ↓
     Proof Builder
           ↓
      Attestcoin
           ↓
      Creditcoin
```

```typescript
import { JsonRpcProvider } from 'ethers';
import { proofProvider } from '@gluwa/usc-sdk';

const ETH_MAINNET_CHAINKEY = 3;
const creditcoin = new JsonRpcProvider('https://rpc.cc3-testnet.creditcoin.network');

const proofBuilder = new proofProvider.service.ProofBuilder(
  ETH_MAINNET_CHAINKEY,
  'https://proof-gen-api.cc3-testnet.creditcoin.network',
  5000,
);

await proofBuilder.waitUntilHeightAttested(ETH_MAINNET_CHAINKEY, blockNumber);
const batch = await proofBuilder.getBatchProof(txHashes); // <= 10, within 1000 blocks
```

---

## 6. The batch scheduler — core engineering

### 6.1 The constraint

Documented Attestcoin verification cost:

```
CTC cost ≈ 2.3×10⁻⁵ + 2.9×10⁻⁷ × (continuity hash count)
```

| Age of source transaction | Continuity hashes | Cost |
|---|---|---|
| ~10 minutes | 10 | 2.59×10⁻⁵ CTC |
| 24+ hours | 1000 | 3.13×10⁻⁴ CTC |

Dense attestations are replaced by sparse checkpoints — one per 1000 blocks — after roughly a day. More than 10x. **History is always in the second row.**

### 6.2 The lever

The SDK's batch API shares **one continuity proof across the whole batch**: `MAX_BATCH_SIZE` 10, `MAX_BATCH_RANGE` 1000 blocks.

Nothing requires those ten transactions to belong to the same user. That is the observation the design turns on.

### 6.3 The algorithm

```
INPUT:  pending fact candidates, each with a source blockNumber
OUTPUT: batches of <= 10, each spanning <= 1000 blocks

1. Sort candidates by blockNumber ascending.
2. Anchor a window at the lowest unassigned candidate.
3. Greedily absorb while:
      batch.size < 10  AND  (candidate.block - anchor) < 1000
4. Emit batch; re-anchor at next unassigned.
5. Deadline override: any candidate approaching the end of its
   hot attestation window jumps the queue and is emitted
   immediately, even in a partial batch. A full batch that
   misses the cheap window costs more than a partial one
   that catches it.
```

A single user's Aave history is scattered across a wide block range, so single-user packing fills poorly. Pooling *many users'* candidates densifies the block axis. **The system gets cheaper per user as more users join** — a genuine network effect, not a slogan.

### 6.4 Effect

For N facts:

| Strategy | Continuity proofs | Relative cost |
|---|---|---|
| Naive, one per fact | N | 1.0x |
| Single-user batching | sparse fill | ~0.4x |
| Cross-user packing | ⌈N/10⌉ at good fill | ~0.1x |
| **+ registry cache, 2nd+ consumer** | **0** | **SLOAD only** |

The last row is the ecosystem argument, quantified: the first consumer pays for verification; every subsequent consumer reads free. That is why a shared registry beats per-app integration, and it is why "Vouch turns cross-chain proof into a reusable primitive" is an engineering claim rather than positioning.

### 6.5 Dashboard surface

```
BATCH OPTIMIZER

Pending facts        27
Compatible           19
Packed                3

Individual proofs    19
Batched proofs        3

Measured verification reduction
██████████████████░░  84%
```

**Measured numbers only.** Every figure on this panel comes from the benchmark harness against CC3 Testnet. No projections, no illustrative percentages. If a number is not measured it does not ship.

---

## 7. Security architecture

A registry bug harms every consumer. This section is weighted accordingly.

### 7.1 S1 — Reverted transaction acceptance

**Attack.** Submit a transaction to Aave that reverts. It is still included in a block. The inclusion proof is entirely valid. An ASC that does not inspect the receipt records a repayment that never happened.

**Why it is missed.** The precompile returns success. The proof *is* correct. Nothing fails. The bug is silent.

**Mitigation.** `SourceValidator` asserts `status == 0x1` before any state write. Test: `test_RejectsRevertedTransaction`.

### 7.2 S2 — Emitter spoofing

**Attack.** Deploy to Ethereum Mainnet:

```solidity
contract Spoof {
    event Repay(address indexed reserve, address indexed user,
                address indexed repayer, uint256 amount, bool useATokens);
    function mintHistory() external {
        emit Repay(USDC, msg.sender, msg.sender, 1_000_000e6, false);
    }
}
```

Call it. Transaction succeeds. `topic0` matches Aave's `Repay` exactly. Merkle and continuity proofs are genuine. An ASC checking only the event signature credits a fabricated million-dollar repayment.

**This is the most dangerous class in the design**, because everything about the proof is legitimate. The proof system is not compromised; the consuming contract simply failed to establish semantics.

**Mitigation.** `EmitterRegistry` + `SourceValidator` assert `log.emitter == registered.emitter` alongside `topic0` and `chainKey`. Test: `test_RejectsSpoofedEmitter`, on a forked mainnet, deploying the spoof contract and asserting rejection. **This is demoed live** — it is the most memorable 20 seconds in the technical video.

### 7.3 S3 — Replay

**Attack.** Resubmit a valid proof to inflate standing.

**Mitigation.** `ReplayGuard` keyed on `keccak(chainKey, blockNumber, txHash, logIndex)`. `logIndex` is required: one transaction can contain several qualifying events. Test: `test_RejectsReplay`.

### 7.4 Secondary

| Risk | Mitigation |
|---|---|
| Gas griefing via long `continuityRoots` | `MAX_CONTINUITY_ROOTS` bound |
| Oversized tx (>~500KB unprovable) | `MAX_TX_BYTES` bound + relayer pre-flight |
| `chainKey` confusion (Sepolia `1` / mainnet `3`) | Pinned per source, asserted per claim |
| Subject substitution | `subject` read from the decoded payload, never calldata |
| Malicious relayer | Untrusted by construction; `submitBatch` permissionless, all claims verified |
| Wrong event | `topic0` pinned and asserted |

### 7.5 Structural limitation — unprovable absence

Inclusion proofs prove **positive** facts. There is no proof of the form *"no liquidation exists for this address."* Absence is not enumerable.

Enforced consequences:
- Standing is monotonic; nothing lowers it.
- Unproven renders as **unknown**, never **clean**. No surface claims a clean history.
- Consumers receive positive evidence only; a collateral ratio floors at 100% and never reaches zero.

Documented in `docs/security/threat-model.md`, stated in the pitch, shown in the technical demo. A correctness property, not a disclaimer.

---

### 7.6 The adversarial harness — a shipped artifact

S2 is not described in the submission. It is **performed**, from the repo, by a judge if they choose.

The harness is four pieces:

| Piece | Chain | Role |
|---|---|---|
| `SpoofEmitter.sol` | Ethereum Sepolia | Emits a `Repay` event with Aave's exact signature and field layout. Not affiliated with Aave in any way. |
| `NaiveConsumer.sol` | CC3 Testnet | Verifies `topic0` and nothing else. Represents the integration a careful team writes on a deadline. |
| `VouchRegistry` | CC3 Testnet | The real verifier: emitter-pinned, status-checked, replay-guarded. |
| `scripts/attack/forge-fact.mjs` | — | Emits, proves through the real Block Prover, submits the identical proof to both. |

**Why Sepolia and not mainnet for the forgery.** The honest path proves real Ethereum mainnet history (`chainKey 3`) because real data is the point. The *attack* deliberately runs on Sepolia (`chainKey 1`) instead. Deploying a contract to Ethereum mainnet whose only purpose is to emit convincing fake Aave events would leave a live artifact designed to deceive anyone else reading mainnet logs. The vulnerability class is identical on both chains — `topic0` is not chain-specific — so nothing is lost by demonstrating it where it is safe to demonstrate. Both `chainKey` values are exercised in the same submission, which also proves the branded-type handling is real rather than hardcoded.

**The assertion the harness makes.** Not "our contract is secure" — an unfalsifiable claim. Instead, two specific and checkable ones:

1. `NaiveConsumer.hasProof(attacker, AAVE_REPAYMENT) == true` after submitting the forged proof.
2. `VouchRegistry.submitBatch(...)` reverts with `EmitterMismatch` on the identical proof bytes.

The same proof, byte for byte, into two contracts, with opposite outcomes. The proof is valid in both cases. Only the semantics differ, and that is the entire lesson.

**Why this is the strongest evidence of protocol depth.** A working integration demonstrates that a team can follow the tutorial. A working *attack* demonstrates that a team understands what the tutorial does not say: that Attestcoin guarantees inclusion, and inclusion is not authorship, and authorship is what a credit fact actually depends on.

**Failure mode of the harness itself.** If the proof builder or the precompile refuses to prove the lookalike event for a reason not yet discovered, the S2 claim degrades from *demonstrated* to *defended by test only*, and the submission falls back to the v2.0 argument. This is why the harness is built on days 2–3 of the remaining schedule rather than at the end.

---

## 8. Data flow — end to end

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Vouch Web
    participant DS as Discovery
    participant SC as Batch Scheduler
    participant PB as Attestcoin Proof Builder
    participant RL as Relayer
    participant VR as VouchRegistry (ASC)
    participant BP as BlockProver Precompile
    participant VP as VouchPassport
    participant VC as VouchCredit

    U->>FE: Connect wallet
    FE->>DS: Scan mainnet history
    DS-->>FE: 14 Aave repayments, 1 governance vote
    U->>FE: Verify
    FE->>SC: Enqueue candidates
    SC->>SC: Bucket by 1000-block window, pack <=10
    SC->>PB: getBatchProof(txHashes)
    PB-->>SC: Merkle + shared continuity proof
    SC->>RL: Batches ready
    RL->>VR: submitBatch(proof, claims)

    loop per claim
        VR->>VR: ReplayGuard — factId unconsumed?
        VR->>VR: ChainRegistry — chainKey pinned?
        VR->>BP: verify(merkle, continuity, txBytes)
        BP-->>VR: valid
        VR->>VR: decode; assert status == 0x1
        VR->>VR: assert emitter + topic0
        VR->>VR: store fact, consume factId
    end

    VR-->>VP: FactVerified events
    U->>VP: passportOf(address)
    VP-->>U: Silver
    VC->>VR: hasProof(user, AAVE_REPAYMENT)
    VR-->>VC: true
    VC-->>U: reduced collateral
```

The user signs **nothing on Ethereum**. The history already exists on-chain. Onboarding costs no source-chain gas and no source-chain transaction — a real UX property, worth stating in the pitch.

---

## 9. Monorepo layout

pnpm + Turborepo + Foundry.

```
vouch/
├── apps/
│   ├── web/                  # Next.js — passport, verify, developers
│   ├── explorer/             # proof explorer
│   ├── demo-credit/          # reference consumer UI
│   └── docs/
├── packages/
│   ├── contracts/            # Foundry — see §4
│   ├── attestcoin/           # SDK adapter boundary — see §3.4
│   ├── sdk/                  # public Vouch SDK — see §12
│   ├── proof-engine/         # batching + deadline logic (shared)
│   ├── schemas/              # typed fact definitions
│   ├── config/               # chainKeys, precompiles, addresses
│   ├── ui/
│   ├── eslint-config/
│   └── tsconfig/
├── services/
│   ├── relayer/              # see §5
│   ├── indexer/              # see §10
│   └── worker/
├── infra/
│   ├── docker/
│   ├── anvil/
│   └── monitoring/
├── scripts/
│   ├── deploy/  seed/  verify/  benchmark/
├── tests/
│   ├── integration/  e2e/  fuzz/  benchmarks/
├── docs/
│   ├── architecture/  security/  protocol/  benchmarks/
├── .github/workflows/
├── foundry.toml
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
└── README.md
```

This reads as a protocol project rather than `frontend/ contracts/ backend/`, which is what most submissions look like. That signal is worth the setup cost — but only after P0 works (§14).

---

## 10. Indexer

The frontend must not query historical source-chain events directly.

```
services/indexer/src/
├── listeners/    vouch-registry.ts, creditcoin.ts
├── processors/   facts.ts, passports.ts, proofs.ts
├── database/     schema.prisma, client.ts
└── index.ts
```

PostgreSQL + Prisma. Tables: `users`, `facts`, `proofs`, `source_events`, `passport_facts`, `verification_jobs`, `transactions`.

**Postgres is never the source of truth.**

```
Blockchain  →  source of truth
Postgres    →  index / search layer
Frontend    →  presentation
```

Any value the UI asserts must be reconstructible from chain state alone.

---

## 11. Writability — forward compatibility

Out of scope for the hackathon; the architecture slots it in without redesign:

- `VerifiedFact` carries `sourceChain` explicitly. The model is directional only by configuration.
- `VouchPassport` reads the fact set and is indifferent to origin chain.
- `VouchCredit` isolates settlement behind an interface.

When Writability ships: extend benefits back onto source chains, settle cross-chain, export Creditcoin-native history outward. Stated as roadmap, never claimed as built.

---

## 12. Vouch SDK

The ecosystem story, made concrete.

```typescript
import { createVouchClient } from '@vouch/sdk';

const vouch = createVouchClient({ chain: 'creditcoin-testnet' });

const verified = await vouch.facts.hasProof({
  user: address,
  type: 'AAVE_REPAYMENT',
});
```

Solidity side is one interface and one call:

```solidity
if (IVouchRegistry(VOUCH).hasProof(user, AAVE_REPAYMENT)) {
    collateralBps = 11_500; // 115% instead of 150%
}
```

The README ships an integration guide proving a third party can consume Vouch in under 20 lines. That guide is what makes "public primitive" credible rather than rhetorical.

---

## 13. Testing

```
tests/
├── unit/
├── integration/
│   ├── ethereum-to-attestcoin/
│   ├── attestcoin-to-creditcoin/
│   └── registry/
├── e2e/          passport-flow.spec.ts
├── fuzz/         replay.t.sol, malformed-proof.t.sol, source-validation.t.sol
└── benchmarks/   proof-cost.ts, batch-cost.ts, registry-read.ts
```

Foundry for Solidity and fuzzing. Vitest for TypeScript. Playwright for E2E.

| Layer | Focus |
|---|---|
| Security | Each attack class **demonstrated rejected**, not merely absent |
| Fork | Forked mainnet, deploy spoof contract, prove S2 rejection |
| Integration | Real mainnet Aave transaction proven end to end on CC3 Testnet |
| Invariant | Passport monotonicity across arbitrary fact orderings |
| Benchmark | Gas across batch sizes and fact ages → published table |

**Iteration-speed warning.** Attestation is not instant: `waitUntilHeightAttested` polls at 15s with a 15-minute default timeout. Live-attestation integration tests are slow by construction. Unit and security tests run against recorded proof fixtures; a smaller live suite runs in CI on merge. Budget for this — it is the single biggest drag on the build.

---

## 14. Build priority

**This document is the 10/10 architecture, not the two-week checklist.** Building all of it is how the submission fails.

### P0 — must work, nothing else matters until it does

```
Real Ethereum event
        ↓
Real Attestcoin proof
        ↓
Real Creditcoin contract
        ↓
Real Vouch fact
```

Concretely: `AttestcoinVerifier` + `VouchRegistry` + `VouchPassport` + `VouchCredit`, deployed on CC3 Testnet, proving one genuine Aave mainnet `Repay`.

Do not build the SDK, the docs site, or the explorer while the proof flow is broken.

### P1 — makes it competitive
Proof Explorer · batch scheduler · Vouch SDK · security tests (S1/S2/S3) · gas benchmark · second and third consumers

### P2 — polish
Docs portal · indexer optimization · Redis/BullMQ · monitoring · additional source protocols · additional fact types

Under schedule pressure cut from the bottom. **Never cut:** the second consumer, the security tests, or the benchmark. Those three are the entire competitive argument (see PRD §2).

---

## 15. Stack

| Layer | Choice |
|---|---|
| Chains | Creditcoin CC3 Testnet, Ethereum Mainnet, Sepolia |
| Contracts | Solidity, Foundry, OpenZeppelin |
| Web3 | Viem, Wagmi, `@gluwa/usc-sdk` |
| Frontend | Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query, Recharts |
| Services | Node.js, TypeScript, Fastify |
| Data | PostgreSQL, Prisma |
| Queue | In-process first; Redis + BullMQ only if measured need |
| Testing | Foundry, Vitest, Playwright |
| Infra | Docker, GitHub Actions, Vercel (web), Railway/Fly (services) |

Deliberately bounded. No Kubernetes. Deploy on a platform the team already knows — hackathon time spent learning infrastructure is time not spent on the proof flow.

---

## 16. Sources

- Attestcoin Protocol documentation — `https://docs.attestcoin.org/` (architecture, readability, gas costs, SDK, chains and environments, dApp design patterns, ASC contracts)
- Attestcoin SDK — `@gluwa/usc-sdk`
- Attestcoin examples — `https://github.com/gluwa/attestcoin-protocol-examples`
- BUIDL CTC 2026 Fall Kickoff AMA — scope limits, chainKeys, judging pillars, open-source and commit-transparency requirements

All protocol constants here — precompile addresses, chainKeys, batch limits, gas formula — were read from live documentation on 2026-08-30. **Re-verify before deployment.** The protocol is under active development and the USC → Attestcoin rename is recent enough that repository names still lag.
