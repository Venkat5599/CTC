# Vouch — Product Requirements Document

**Portable On-Chain Standing.**
*Prove what you've done on any supported chain once. Let every Creditcoin application recognize it.*

| Field | Value |
|---|---|
| Version | 2.0 — registry-first repositioning |
| Date | 2026-08-30 |
| Event | BUIDL CTC 2026 Fall — "BUIDL For The Real World" |
| Track | DeFi |
| Theme requirement | Attestcoin Protocol as a core feature |
| Execution chain | Creditcoin CC3 Testnet |
| Source chain | Ethereum Mainnet (`chainKey 3`) |
| Deadline | 2026-09-13 23:59 ET (extended; AMA stated 09-06 — confirm in Discord) |

---

## 1. Summary

Vouch is a **shared standing registry** for Creditcoin. It proves facts about a user's activity on a source chain — once — through the Attestcoin Protocol, stores them as permanent on-chain records, and exposes them to every Creditcoin application through one interface.

```
        Ethereum
           │
     Real activity
           │
           ▼
      ATTESTCOIN
           │
    cryptographic proof
           │
           ▼
        VOUCH
   Standing Registry
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
   DeFi  Gaming  AI
     │     │     │
     └─────┼─────┘
           ▼
       CREDITCOIN
```

The interface is deliberately small:

```solidity
Vouch.hasProof(user, AAVE_REPAYMENT);
Vouch.hasProof(user, LONG_TERM_LP);
Vouch.hasProof(user, GOVERNANCE_ACTIVITY);
```

One proof, many consumers:

| Consumer | Reads standing → grants |
|---|---|
| A lending market | Lower collateral requirement |
| A DEX | Lower trading fee tier |
| A game | Unlocked tier or cosmetic |
| A campaign | Eligibility without a snapshot |

**Credit is the flagship use case, not the entire product.** Vouch ships one DeFi consumer to prove the loop end to end. The registry is the deliverable.

---

## 2. Positioning — and the competition

This season already has technically serious cross-chain credit entries:

- **CrossCredit** — reports 214 tests, real mainnet Aave proof flows, batch verification, deployed Creditcoin contracts.
- **Spark** — reports a live end-to-end testnet borrow/repay loop with real Attestcoin proofs.

**A working Attestcoin integration is therefore not a differentiator.** It is table stakes. Any submission whose pitch is "we proved Aave history on Creditcoin" is competing directly with two teams that have already done exactly that, possibly with more test coverage.

The winning argument has to be structural:

> **CrossCredit proves cross-chain credit works. Vouch turns cross-chain proof into a reusable ecosystem primitive.**

CrossCredit and Spark are *one application consuming cross-chain history*. Vouch is *the shared layer many applications consume*. The entire submission is built around that distinction — architecture, demo, pitch, and roadmap.

Practical consequences for what we build:

1. The registry's public read interface is the headline artifact, not the lending pool.
2. The demo must show **more than one independent consumer** reading the same proof. One consumer makes us a competitor to CrossCredit. Multiple consumers make us a different category.
3. Proof types must be **broader than credit** from day one. Shipping only `AAVE_REPAYMENT` would collapse us back into the credit-app category.
4. The pitch leads with the primitive and uses credit as illustration.

---

## 3. Problem

### 3.1 For the user
On-chain reputation is real, valuable, and stranded. Activity on Ethereum — repayments, sustained liquidity provision, governance participation — has no expression anywhere else. Arriving on a new chain means arriving as a stranger, re-proving nothing, and paying for it in collateral, fees, and access.

### 3.2 For the ecosystem
Every Creditcoin application that wants to recognize genuine users faces the same problem independently, and each solves it badly: centralized snapshots, self-reported claims, or nothing. There is no shared, trust-minimized way to ask *"has this user actually done the thing?"*

Worse, if each application integrates Attestcoin separately, each one:
- writes its own ASC and its own verification logic, including the security checks most will get wrong (§8),
- runs its own off-chain worker,
- and re-pays continuity-proof gas for facts another application has already verified.

That duplication is the ecosystem-level waste Vouch removes.

### 3.3 Why now
Proving a foreign chain's state without a trusted operator is what Attestcoin readability newly makes possible on Creditcoin. Vouch is only buildable now.

---

## 4. Goals and non-goals

### 4.1 Goals
- **G1** — Prove real Ethereum **mainnet** activity on CC3 Testnet with no trusted operator in the trust path.
- **G2** — Expose standing as a public, permissionless primitive readable by any Creditcoin contract in one call.
- **G3** — Ship **at least two independent consumers** reading the same registry. This is the differentiator; it is not optional.
- **G4** — Support **three proof types** spanning more than one domain, so the primitive is visibly general.
- **G5** — Make historical proof economically viable by defeating the continuity-proof gas cliff (§7).
- **G6** — Ship a correct ASC: emitter-pinned, status-checked, replay-guarded, with a written threat model.

### 4.2 Non-goals
- **NG1** — Attestcoin **Writability**. Out of scope per the kickoff AMA. Roadmap only (§13).
- **NG2** — A production money market. The DeFi consumer is a bounded demo, deliberately unsophisticated.
- **NG3** — Proving *absence* of events. Structurally impossible with inclusion proofs (§6).
- **NG4** — Source chains beyond those Attestcoin supports on CC3 Testnet.
- **NG5** — Off-chain or ML scoring. Every input must be cryptographically proven.
- **NG6** — Mainnet deployment.
- **NG7** — Out-competing CrossCredit on lending features. Wrong axis; we are not a lending protocol.

---

## 5. Users

### 5.1 Ethereum user with history (primary)
Has done real things on Ethereum. Gets nothing for it elsewhere. Vouch is a permissionless entry point that makes that history expressible on Creditcoin.

> **Claim discipline.** We do not say "millions of Ethereum users will come to Creditcoin." That is a projection, not evidence. We say: **"Vouch creates a permissionless entry point for existing Ethereum users to bring verifiable on-chain standing into Creditcoin."** Mechanism, not forecast. This language is binding across the PRD, README, pitch, and deck.

### 5.2 Creditcoin application builder (equally primary)
Wants to reward genuine users, price risk, or gate access. Today has no trust-minimized way to distinguish a veteran from a fresh wallet. With Vouch, it is one `view` call — no ASC to write, no worker to run, no proof gas to pay.

This user is why Vouch is a primitive rather than an app, and they are half the pitch.

### 5.3 Emerging-market borrower (narrative)
Draws against standing, off-ramps to local currency through existing Creditcoin rails. The closing illustration of "real users and fiat connections," presented as roadmap, not as built.

---

## 6. Product

### 6.1 The registry (the product)

A permanent on-chain record that a specific address performed a specific, verified action on a source chain.

**Proof types for v1** — deliberately spanning three different domains so generality is visible, not asserted:

| Proof type | Source event | Domain | Evidences |
|---|---|---|---|
| `AAVE_REPAYMENT` | Aave V3 `Repay` | Credit | Debt serviced |
| `LONG_TERM_LP` | Aave V3 `Supply` with tenure | Liquidity | Sustained capital commitment |
| `GOVERNANCE_ACTIVITY` | Governor `VoteCast` | Governance | Protocol participation |

Adding a fourth is a registry entry, not a code change (§ARCHITECTURE 4.3). That property is what makes this infrastructure.

**Public interface:**

```solidity
interface IVouch {
    function hasProof(address user, bytes32 proofType) external view returns (bool);
    function proofCount(address user, bytes32 proofType) external view returns (uint32);
    function proofValue(address user, bytes32 proofType) external view returns (uint256);
    function passportOf(address user) external view returns (Passport memory);
}
```

`hasProof` is the primitive. Everything else is convenience.

### 6.2 The passport (aggregation)

`VouchPassport` aggregates a user's proofs into a compact record — counts, summed values, tenure span, and a band. Consumers that want a single number read the band; consumers that want precision read `hasProof` directly.

**Monotonic by construction.** Proofs only ever raise standing. No code path lowers a band. Enforced structurally and asserted by invariant test (§ARCHITECTURE 4.2).

### 6.3 Consumers (proof of the thesis)

Three ship, each independent, none privileged:

| Contract | Reads | Grants |
|---|---|---|
| `LendingConsumer.sol` | `AAVE_REPAYMENT` count + value | Reduced collateral ratio |
| `FeeTierConsumer.sol` | `LONG_TERM_LP` | Lower fee tier |
| `AccessConsumer.sol` | any proof ≥ threshold | Gated access / eligibility |

`LendingConsumer` is the flagship demo. The other two exist to prove composability — they are written as a third party would write them, with no special relationship to Vouch.

### 6.4 User flow

1. Connect wallet.
2. Vouch discovers source-chain history.
3. *"14 Aave repayments found. 1 governance vote found."*
4. Click **Verify**.
5. Attestcoin proof executes; Creditcoin stores the verified facts.
6. Passport updates.
7. Example applications read it — and grant a benefit.

The user signs **nothing on Ethereum**. The history already exists. Onboarding costs no source-chain gas.

---

## 7. The gas problem — core engineering

Documented Attestcoin verification cost:

```
CTC cost ≈ 2.3×10⁻⁵ + 2.9×10⁻⁷ × (continuity hash count)
```

| Age of source transaction | Continuity hashes | Cost |
|---|---|---|
| ~10 minutes | 10 | 2.59×10⁻⁵ CTC |
| 24+ hours | 1000 | 3.13×10⁻⁴ CTC |

Dense attestations are replaced by sparse checkpoints — one per 1000 blocks — after roughly a day. More than 10x. **History is always in the second row.**

Three mitigations (detail in ARCHITECTURE §6):

1. **Verify-once.** Each fact verified once, stored canonically. Every later read by any consumer is an `SLOAD`.
2. **Cross-user batch packing.** `MAX_BATCH_SIZE` 10, `MAX_BATCH_RANGE` 1000 blocks, one shared continuity proof per batch. Nothing requires those ten transactions to belong to the same user. Bucketing *different users'* facts by 1000-block window collapses N continuity proofs into ⌈N/10⌉.
3. **Hot-window capture** for new activity at the cheap rate.

The registry model makes mitigation 1 an ecosystem property rather than an internal optimization: the first consumer pays, every subsequent consumer reads free. That is the economic argument for a shared registry over per-app integration, and it is quantified in the benchmark.

**Deliverable:** a benchmark table — naive vs. Vouch, N users × M facts, and marginal cost of the Nth consumer. This is the substance of the technical demo.

---

## 8. Security requirements

Three protocol-specific failure modes. Full treatment in ARCHITECTURE §7.

**S1 — Receipt status.** The Block Prover Precompile proves inclusion, not success. A reverted transaction is still in the block and still yields a valid proof. The ASC **must** assert `status == 0x1`.

**S2 — Emitter pinning.** A valid proof of a lookalike event from an attacker-deployed contract is still a valid proof. Without pinning the emitter address, an attacker deploys their own mainnet contract emitting `Repay(...)` and mints themselves a history. The proof is honest; the ASC is wrong. Pin emitter + `topic0` + `chainKey`.

**S3 — Replay.** Each `(chainKey, blockHeight, txHash, logIndex)` consumed exactly once.

Also: bound `continuityRoots` length against gas griefing; reject transactions above the ~500KB provability limit; pin `chainKey` explicitly (on CC3 Testnet `1` is Sepolia, `3` is Ethereum Mainnet — trivial to confuse, expensive to discover).

**This matters more for a registry than for an app.** A bug in one lending app harms that app. A bug in a shared registry harms every consumer. `THREAT_MODEL.md` ships in the repo, and the S2 attack is demonstrated live in the technical demo.

---

## 9. The honest limitation

Inclusion proofs prove **positive** facts only.

Vouch can prove *"this user repaid."* It **cannot** prove *"this user was never liquidated."* Absence is not enumerable.

Enforced consequences:
- Standing is monotonic — nothing lowers it.
- Unproven renders as **unknown**, never **clean**. No surface claims a clean history.
- Consumers receive positive evidence only; a collateral ratio floors at 100% and never reaches zero.

Stated in the pitch, the README, and the technical demo. It is a correctness property, not a disclaimer — and stating it plainly is a credibility signal to judges who wrote the protocol.

---

## 10. Success criteria

### 10.1 Must have
- **M1** — Real Ethereum **mainnet** address with real Aave history produces verified standing on CC3 Testnet. Real data, not fixtures.
- **M2** — **Two or more independent consumers** read the same registry and grant different benefits. *This is the differentiator; without it we are a slower CrossCredit.*
- **M3** — Three proof types live, spanning credit / liquidity / governance.
- **M4** — All contracts deployed and verified on CC3 Testnet, addresses in README.
- **M5** — Batch packing implemented and benchmarked; gas table published including marginal cost of the Nth consumer.
- **M6** — S1, S2, S3 implemented with tests proving each attack is rejected.
- **M7** — Public repo from day one with incremental commit history.
- **M8** — Integration guide showing a third party how to consume Vouch in under 20 lines.
- **M9** — Pitch video ≤3 min; technical demo 2–3 min.

### 10.2 Should have
- Public dashboard: proofs verified, CTC saved by batching, addresses onboarded, consumers registered.
- CI lint enforcing S1/S2/S3 on every commit.
- A fourth proof type added live during the demo, to show the registry extends by configuration.

### 10.3 Could have
- Additional source protocols (Compound, Morpho, Uniswap).
- Recency weighting.
- Fiat off-ramp walkthrough.

---

## 11. Judging alignment

| Pillar | Answer |
|---|---|
| **User base expansion** | Vouch creates a permissionless entry point for existing Ethereum users to bring verifiable standing into Creditcoin — and, because it is shared, it is an entry point *every* Creditcoin app inherits, not just ours. |
| **Technical alignment** | Attestcoin readability is load-bearing: remove it and the registry is a centralized claims database. Deep utilization — batch packing, precompile verification, correct ASC construction. |
| **Product vision** | A primitive, not a feature. Credit is one consumer of many. Clear Writability roadmap. |
| **Execution capability** | Narrow, provable two-week scope. Transparent daily commits. Real mainnet data on testnet. |
| **Market fit** | Portable reputation generalizes beyond Creditcoin; on-chain credit is the cited flagship application of it. |

**Against the field.** CrossCredit and Spark demonstrate cross-chain credit. Neither is a shared primitive. Our claim is narrow, defensible, and demonstrable in the demo: *the same proof, consumed three different ways, by three contracts that do not know about each other.*

**Top-3 is not guaranteed.** The field is technically serious. The bet is that judges evaluating "ecosystem expansion" reward the layer every future team builds on over the third instance of the same application.

---

## 12. Milestones

2026-08-30 → 09-13.

| Day | Milestone | Exit criteria |
|---|---|---|
| 1 | Repo public, scaffold, RPC + faucet, SDK spike | One Sepolia tx proven locally |
| 2–3 | `VouchRegistry.sol` — verify, pin, store | One real mainnet Aave `Repay` verified on CC3 Testnet |
| 4 | Proof-type registry, 3 types configured | All three verify end to end |
| 5 | Keeper: indexer + proof builder + submitter | Unattended single-fact flow |
| 6–7 | Batch packer, 1000-block bucketing | ⌈N/10⌉ continuity proofs demonstrated |
| 8 | `VouchPassport.sol` + monotonic aggregation | `hasProof` / `passportOf` live |
| 9 | `LendingConsumer.sol` | Reduced-collateral borrow executes |
| 10 | `FeeTierConsumer.sol` + `AccessConsumer.sol` | **Three independent consumers, one registry** |
| 11 | Gas benchmark harness | Table published incl. Nth-consumer marginal cost |
| 12 | Security tests S1/S2/S3 + `THREAT_MODEL.md` | Each attack demonstrably rejected |
| 13 | Frontend + integration guide | Full flow clickable; third-party guide written |
| 14 | Pitch video, technical demo, README, submit | Submitted with buffer |

Cut order under schedule pressure: dashboard → `AccessConsumer` polish → frontend polish. **Never cut:** the second consumer (M2), the security tests, or the benchmark. Those three are the entire argument.

---

## 13. Roadmap

**Phase 2 — Writability.** Standing becomes bidirectional: extend benefits back onto source chains, settle cross-chain, export Creditcoin-native history outward. The fact model is already chain-agnostic and directional only by configuration.

**Phase 3 — Open proof-type registry.** Any team registers a source-chain event as a standing input, permissionlessly. Vouch becomes the reputation substrate for Creditcoin.

**Phase 4 — Real-world standing.** Combine proven on-chain standing with Creditcoin's existing off-chain loan record and fiat rails — the 2017 thesis with a working cross-chain proof layer underneath.

---

## 14. Open questions

- **Q1** — Confirm the deadline (AMA says 09-06; brief says 09-13). Verify in Discord `#buidl-ctc-qna`.
- **Q2** — Pin exact Aave V3 mainnet Pool address and `Repay` ABI against the deployed contract. Never from memory.
- **Q3** — Which Governor contract for `GOVERNANCE_ACTIVITY`? Needs a high-activity mainnet target with a stable `VoteCast` signature.
- **Q4** — Proof Builder rate limits under batch load during the demo.
- **Q5** — Practical `continuityRoots` upper bound before the CC3 block gas limit binds.
