# Vouch — who pays, and why this becomes a business

**Status: pre-revenue.** Nothing in this document has been charged to anyone. It is the model the protocol is built to support, written down so the question is answered rather than dodged. Every figure marked *modelled* is an arithmetic consequence of Attestcoin's published pricing, not a measured result or a forecast.

---

## 1. The question a registry has to answer

Reading the registry costs an `SLOAD`. Anyone can call `hasProof`. There is no gate, no allowlist, and no per-read fee, and that is a design commitment rather than a pricing oversight — a standing registry that charges at the read is a standing registry nobody builds against.

So the reasonable objection is direct: **if reading is free, what is the business?**

The answer is that reading was never the scarce thing. **Proving is.**

---

## 2. Where the cost actually sits

Attestcoin prices verification against repetition. From the protocol's own documentation:

```
CTC cost ≈ 2.3×10⁻⁵ + 2.9×10⁻⁷ × (continuity hash count)
```

A transaction finalised ~10 minutes ago sits ~10 hashes from a dense attestation. After roughly 24 hours those dense attestations are replaced by sparse checkpoints at one per 1000 blocks, so proving the same transaction costs ~1000 hashes.

| What is being proven | Continuity hashes | Relative cost |
|---|---|---|
| A transaction from ~10 minutes ago | ~10 | 1× |
| The same transaction after ~24 hours | ~1000 | **>10×** |

Credit history is always in the second row. A borrower's repayment record is months old by definition. **Underwriting is the expensive case, permanently.**

That is the asymmetry the business sits on: the read is free, the *first* proof of any given fact is not, and history only ever gets more expensive to prove.

---

## 3. The revenue model — proving on demand

An issuer wants to underwrite an address that has never been proven. Today that address returns `false` from `hasProof`, and the issuer has no way to change that without running their own indexer, relayer and proof-building pipeline.

**The product is that pipeline, sold per resolution.**

| Line | What the issuer gets | What they pay for |
|---|---|---|
| **Fact resolution** | "Prove everything provable about this address, now" — discovery across registered sources, proof construction, submission | Proof cost + margin, per address resolved |
| **Source onboarding** | A new protocol or event registered as a fact type, verified and pinned | One-off integration fee |
| **Priority proving** | Resolution inside an underwriting SLA rather than best-effort batching | Premium on the resolution fee |

Three properties make this a real line rather than a fee bolted onto a public good:

1. **The cost is genuine and external.** Proof gas is paid to Creditcoin, not invented. Margin sits on work actually performed.
2. **It never cannibalises the free read.** Once a fact is proven it is public forever and every subsequent issuer reads it for an `SLOAD`. The buyer pays for *newly proven history*, not for access.
3. **The buyer has budget.** Underwriting a facility is a decision with money attached. A credit-bureau pull is an ordinary line item in that process, and this is a cheaper, colder, cryptographic version of one.

**Modelled unit economics.** At a sparse-checkpoint proof of ~1000 continuity hashes, the arithmetic above puts one fact's verification in the region of ~3×10⁻⁴ CTC. Resolving an address means proving a handful of facts. The input cost is therefore small in absolute terms, and the price is anchored to what the decision is worth to the issuer, not to the gas — which is what makes the margin defensible rather than a spread on gas.

---

## 4. The chicken-and-egg problem, stated honestly

A registry's value scales with its consumer count. Today there are four consumers and this team wrote all of them. **That is a demo, not a network,** and pretending otherwise would be the same failure of nerve this protocol was built to argue against.

Three things make the cold start survivable, and none of them is "we hope people integrate":

**The registry is useful at N=1.** Every other Creditcoin issuer integrating is upside, not a precondition. A single issuer using Vouch to resolve borrower history they otherwise cannot see already gets the whole benefit — the verify-once economics only need one buyer to make sense of the *proving* line. Compare a messaging network, which is worthless until the second user arrives.

**The facts outlive the consumers.** A proven fact is permanent and public. Proofs accumulated for the first paying issuer are already there when the second arrives, so the asset compounds while the network does not yet exist. The cold-start cost is paid once, by the party who was going to pay it anyway.

**The integration is one view call.** The switching cost for consumer number two is a single `hasProof` in an existing contract. There is no ASC to write, no worker to run, no proof gas, and no registration step. Adoption friction is close to the floor, which is the only honest defence a cold-start network has.

**What would falsify this.** If no Creditcoin issuer will pay to resolve an address after being shown a working resolution, the "proving on demand" line is wrong and the model has to change. That conversation has not happened yet, and until it does this section is a hypothesis. See §6.

---

## 5. What Vouch deliberately is not

Scope discipline, because an investment conversation punishes vagueness more than it punishes narrowness.

- **Not an issuance platform.** Vouch does not tokenize, transfer or custody anything.
- **Not a transfer agent, and not a KYC or KYB provider.** Invoice authenticity, debtor verification and borrower identity are off-chain onboarding problems Vouch does not solve and does not claim to.
- **Not a credit bureau.** Vouch proves positive facts only. It can never prove an address was *never* liquidated, because absence of an event is not enumerable. An unproven address is **unknown**, never **clean**, and never **bad**.
- **Not a scoring product.** The registry stores facts. What a fact is worth is the consumer's decision, and the tier system in `VouchPassport` is a reference interpretation rather than an opinion the registry holds.

That last boundary is the load-bearing one. A registry that scores becomes a party with a view, and a party with a view is a party that can be wrong, captured, or sued.

---

## 6. Open, and honest about it

| Question | Status |
|---|---|
| Will a Creditcoin issuer pay per resolution? | **Untested.** No issuer has been asked. Needs one design-partner conversation. |
| What is a resolution actually worth to an underwriter? | **Unpriced.** Anchored to credit-bureau pull pricing by analogy, which is not evidence. |
| Does the second consumer arrive without being written by this team? | **Unproven.** Four consumers exist; all four are ours. |
| Regulatory posture for a regulated issuer consuming this? | **Unexamined.** Positioning moved to RWA before the compliance surface was reviewed. |

These are listed rather than buried because the diligence process will find them anyway, and a team that surfaced its own open questions is a better bet than one that did not notice them.

---

## 7. Why this is worth funding rather than just judging

The technology risk is largely retired: the contracts are deployed, a real cross-chain repayment has been proven end to end through the real precompile, and the security model is enforced and adversarially tested rather than asserted.

What remains is **commercial** risk — whether issuers buy resolutions — and that is the kind of risk a fast-track diligence process is designed to price. The build is not the open question. The first paying issuer is.

---

*Cross-references: positioning in [`PRD.md`](PRD.md), system design and threat model in [`ARCHITECTURE.md`](ARCHITECTURE.md), the RWA consumer in `packages/contracts/src/consumers/VouchReceivablesFacility.sol`.*
