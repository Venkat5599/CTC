# Vouch — Product Requirements Document

**Verified borrower history, proven not asserted.**
*One Attestcoin proof of what a borrower actually did. Every Creditcoin issuer reads it for a storage read.*

| Field | Value |
|---|---|
| Version | 3.0 — adversarial verification, issuer repositioning |
| Date | 2026-09-01 |
| Event | BUIDL CTC 2026 Fall — "BUIDL For The Real World" |
| Track | RWA |
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

v3.0 differentiates on three axes, in descending order of defensibility.

### 2.1 Adversarially verified — the primary claim

Everyone in this field can *consume* an Attestcoin proof. We demonstrate that we understand where the proof layer **breaks**, and that our verifier holds.

> **A valid Attestcoin proof can still be a lie.**

Three ways, all silent, none of which revert:

- **S1** — the precompile proves *inclusion, not success*. A reverted transaction is still in its block and proves perfectly.
- **S2** — anyone can deploy a contract emitting Aave's exact `topic0` and field layout. A proof of that forgery is **cryptographically valid**.
- **S3** — proofs are public and replayable, and one transaction can carry several claimable events.

The demo does not describe these. It **performs S2 live**: a lookalike emitter on a source chain, a genuine proof of a forged event, a naive consumer accepting it and issuing credit, and Vouch rejecting the identical proof on emitter mismatch.

No other entry will attack the protocol it is building on. This is the strongest available evidence for the one criterion the brief actually scores — *"depth of Attestcoin Protocol utilization"* — because it demonstrates understanding a working integration does not.

### 2.2 Issuer, not borrower — the customer change

v2.0 sold a standing **passport to a borrower**. v3.0 sells a borrower-verification **primitive to an issuer**.

Evidence for the change, with its limits stated:

- **Colosseum builder corpus** (5,400+ projects): on-chain credit-score and reputation projects have been attempted repeatedly and none are recorded winners — `credencechain-2`, `cipherscore`, `solana-credit-scoring`, `lyhva`, `branq`. The consumer-facing "portable score" framing has a poor track record.
- **Stellar ecosystem directory** (as of 2026-08-31): 97 RWA projects, where the Live ones are regulated institutional issuers — Franklin Templeton (Benji), Ondo, WisdomTree, Spiko (AMF/ACPR-regulated), RedSwan (FINRA-regulated). 43 anchors, all Live, are emerging-market fiat rails — MoneyGram, Bitso (LATAM), Yellow Card (Africa's largest licensed stablecoin ramp), Fonbnk. Meanwhile generic money markets churn: Slender and OrbitCDP both **Inactive**.

**Claim discipline.** Both corpora are *other ecosystems* — Solana and Stellar. They are evidence about which product framings survive in comparable markets. They are **not** evidence about Creditcoin demand, and this PRD does not use them that way. What they support is a positioning decision, not a market-size forecast.

The conclusion we do draw: the party with the problem is the one underwriting the loan, not the one taking it. Issuers cannot see a borrower's history on another chain, and today have no trust-minimized way to ask.

### 2.3 Shared primitive, not an application — retained from v2.0

CrossCredit and Spark are *one application consuming cross-chain history*. Vouch is *the shared layer many applications consume*. The demo shows multiple independent consumers reading one proof and granting different benefits, including one that correctly grants nothing.

### 2.4 Why RWA rather than DeFi

Two reasons, one strategic and one substantive.

1. **The direct competition is in DeFi.** Entering the same track as two mature cross-chain-credit entries invites a feature comparison we do not want and do not need.
2. **RWA is Creditcoin's actual business.** Real-world credit for underbanked borrowers is the 2017 thesis. Verified borrower history is an RWA underwriting input, not a DeFi yield feature.

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
- **G7** — **Demonstrate the attack, not just the defence.** Ship a working S2 forgery against a naive consumer, and show Vouch rejecting the identical proof. This is the primary differentiator (§2.1) and is not cuttable.

### 4.2 Non-goals
- **NG1** — Attestcoin **Writability**. Out of scope per the kickoff AMA. Roadmap only (§13).
- **NG2** — A production money market. The DeFi consumer is a bounded demo, deliberately unsophisticated.
- **NG3** — Proving *absence* of events. Structurally impossible with inclusion proofs (§6).
- **NG4** — Source chains beyond those Attestcoin supports on CC3 Testnet.
- **NG5** — Off-chain or ML scoring. Every input must be cryptographically proven.
- **NG6** — Mainnet deployment.
- **NG7** — Out-competing CrossCredit on lending features. Wrong axis; we are not a lending protocol.
- **NG8** — Regulatory or compliance tooling for RWA issuance. We supply one underwriting input. We are not an issuance platform, a transfer agent, or a KYC provider.
- **NG9** — Claiming Creditcoin market demand from Solana or Stellar ecosystem data. Those corpora informed positioning only (§2.2).

---

## 5. Users

### 5.1 Credit issuer on Creditcoin (primary)

Underwrites a loan, prices collateral, or gates a facility, and cannot see what the borrower did anywhere else. Today the options are a centralized snapshot, a self-reported claim, or nothing. With Vouch it is one `view` call against facts proven by consensus rather than asserted by an operator — no ASC to write, no worker to run, no proof gas to pay.

This is the party with the problem, and v3.0 is written for them.

### 5.2 Ethereum user with history (source of the data)
Has done real things on Ethereum. Gets nothing for it elsewhere. Vouch is a permissionless entry point that makes that history expressible on Creditcoin.

> **Claim discipline.** We do not say "millions of Ethereum users will come to Creditcoin." That is a projection, not evidence. We say: **"Vouch creates a permissionless entry point for existing Ethereum users to bring verifiable on-chain standing into Creditcoin."** Mechanism, not forecast. This language is binding across the PRD, README, pitch, and deck.

### 5.3 Creditcoin application builder (equally primary)
Wants to reward genuine users, price risk, or gate access. Today has no trust-minimized way to distinguish a veteran from a fresh wallet. With Vouch, it is one `view` call — no ASC to write, no worker to run, no proof gas to pay.

This user is why Vouch is a primitive rather than an app, and they are half the pitch.

### 5.4 Emerging-market borrower (narrative)
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
- **M10** — **Live S2 forgery.** A lookalike emitter on a source chain, a genuine Attestcoin proof of the forged event, a naive consumer accepting it, and Vouch rejecting it. Reproducible by a judge from the repo.

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

**Against the field.** CrossCredit and Spark demonstrate cross-chain credit. Both integrations presumably work. Ours does too, and that is table stakes.

The claim that separates us is narrower and harder to copy: *we can break a naive Attestcoin consumer on stage, with a proof that is cryptographically valid, and show our verifier rejecting it.* That is a statement about depth of protocol understanding, which is the one thing the brief says it scores. A team that has only consumed proofs cannot make it.

Secondary: the same proof consumed three different ways by three contracts that do not know about each other — including one that correctly grants nothing.

**Top-3 is not guaranteed.** The field is technically serious and "depth" is judged subjectively. The bet is that a demonstrated attack outscores another working integration.

---

## 12. Milestones

Days 1–14 of the original plan are complete: contracts deployed to CC3 Testnet, one real source-chain Aave repayment proven end to end through the Block Prover precompile, five contracts live, three consumers reading one registry, S1/S2/S3 implemented and tested, frontend deployed.

**Remaining: 2026-09-01 → 09-13.** v3.0 adds two things and reframes the rest.

| Day | Milestone | Exit criteria |
|---|---|---|
| 1 | **Mainnet source path** | `chainKey 3` proves one real Ethereum **mainnet** Aave `Repay` on CC3 Testnet. Riskiest unknown — settle it first. |
| 2 | **S2 forgery, offensive half** | Lookalike emitter deployed on a source chain; a genuine Attestcoin proof of the forged `Repay` is produced. |
| 3 | **S2 forgery, defensive half** | `NaiveConsumer.sol` accepts the forged proof and grants credit; `VouchRegistry` rejects the identical proof on emitter mismatch. Both paths under test. |
| 4 | **Forgery in the product** | Demo surface switching between naive and guarded verification, driven by the real proof. Judge-reproducible from the repo. |
| 5 | **Issuer reframing** | Copy, README and dashboard addressed to the issuer (§5.1), not the borrower. Track fields updated to RWA. |
| 6 | **Attestcoin integration write-up** | `docs/ATTESTCOIN.md`: what is proven, what is not, the three failure modes, the chainKey trap, and why each check exists. A scored deliverable. |
| 7 | Deck | Narrative per §2.1: table stakes, then the attack. |
| 8 | Pitch video + technical demo | ≤3 min and 2–3 min. |
| 9 | Submit | Submitted with four days of slack. |

**Slack: days 10–13.** Deliberate. The forgery is the one item whose feasibility is not yet proven, and it owns the front of the schedule so that failure is discovered on day 2 rather than day 11.

**Fallback.** If the S2 forgery cannot be produced — if the prover or the precompile rejects a lookalike event for a reason not yet found — v3.0 degrades to v2.0: the shared-primitive claim (§2.3) plus mainnet proofs, on the RWA track. That is still a complete submission. The cost of finding out is two days, and it is spent first for exactly that reason.

**Never cut:** M10 (the forgery), M6 (the security tests), M2 (the second consumer). Those are the argument.

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
