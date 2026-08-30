# Assumptions

What Vouch takes on trust, and what it refuses to claim.

---

## The honest limitation

**Inclusion proofs prove positive facts only.**

Vouch can prove *this address repaid on Aave*. It can never prove *this address
was never liquidated*, because absence of an event is not enumerable: there is
no proof that a thing did not happen, only the failure to find one that says it
did.

The consequences are structural, not cosmetic:

- An address with no proofs is **UNKNOWN**, never **CLEAN**.
- A consumer must never read a low tier as evidence of bad behaviour. A pristine
  borrower and a borrower nobody has proven anything about are indistinguishable
  here, and always will be.
- Underwriting on Vouch can only ever be optimistic-but-bounded. `VouchCredit`
  floors collateral at 100% for exactly this reason: standing reduces collateral
  and never eliminates it.

The SDK enforces the distinction in its types — `standing()` returns
`'proven' | 'unknown'` rather than a boolean — because a boolean is precisely how
this gets quietly lost.

---

## Trusted

**The Attestcoin Block Prover Precompile.** If `0x...0FD2` says a transaction was
included in a block belonging to the confirmed source chain, Vouch believes it.
This is the protocol's core assumption and Vouch adds nothing to it.

**The Creditcoin chain.** Standard chain-security assumptions. A reorg on
Creditcoin could unwind a write.

**The source protocol's own semantics.** If Aave emits `Repay`, a repayment
happened. Vouch proves what the source chain *says*, not whether the source
chain is *right*.

**The admin, for source configuration only.** `registerSource` is admin-gated,
and a malicious or careless admin can point a fact type at the wrong contract.
They cannot forge a fact, mint standing, remove a fact, or lower a tier — the
registry has no code path for any of those. Retiring a source stops new facts and
cannot retract proven ones (`test_admissionIsPermanent`).

---

## Not trusted

**The relayer.** Untrusted by construction. See the threat model.

**The indexer.** Decides nothing. Everything it reports is re-derived on chain
before it counts.

**The database.** Not authoritative. On-chain state is the truth; Postgres is a
work queue for unproven facts plus a cache of proven ones. Drop it and no
standing is lost — a fresh indexer replays the source chain and the registry and
arrives at the same place.

**The submitting wallet.** Pays gas, grants nothing. The subject of every fact is
read from the proven log, so a submitter cannot claim standing for themselves
(`test_submitterCannotClaimSomeoneElsesStanding`).

---

## Monotonicity

Standing only ever rises. This is structural rather than conventional:

- The registry is append-only. No function removes or decrements a fact.
- The passport holds no state of its own and is a pure function of the registry.
- Therefore no sequence of operations can lower a tier.

A tier is safe to cache indefinitely upward and never safe to invalidate
downward. A cached tier can only be stale-low.

---

## Time and finality

Source blocks are only proven after a confirmation backoff (64 blocks by
default). A reorged-away fact is not a security problem — the precompile would
decline to prove it — but it wastes a proof, and proofs are the expensive
resource in this system.

Continuity proof cost depends on distance from an attestation. Recent blocks sit
around 10 hashes away; after roughly 24 hours attestations are replaced by sparse
one-per-1000-block checkpoints and the same proof carries ~1000 roots. Proving
old history — which is the entire point of a standing registry — is therefore
structurally more expensive than proving recent history.

---

## What would invalidate the design

- If the precompile ever validated receipt status itself, S1 would become
  redundant. It does not, and the documentation is explicit.
- If continuity proofs stopped being shareable across claims, batching would buy
  only the 21,000 intrinsic cost per transaction.
- If a source protocol changed an event signature, that fact type would silently
  stop matching. Nothing would throw. The source-freshness alert exists for
  exactly this.
