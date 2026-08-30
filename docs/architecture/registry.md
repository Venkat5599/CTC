# The registry

`VouchRegistry` is the Attestcoin Smart Contract and the only writer of verified
facts. Everything else in the protocol reads it.

---

## Submission is permissionless

`submitBatch` is open to anyone, permanently. The relayer is untrusted and
affects liveness only — it decides which proofs get submitted and when, so it
can censor and it can stall, and anyone can run their own if it disappears. It
cannot forge a fact, because every claim is verified against the precompile and
re-validated before storage.

Enforced mechanically: `test_anySenderCanSubmit` runs as its own CI job, so
adding an allowlist or an owner check to the submission path fails the build
before it reaches review.

---

## The eight-step claim pipeline

1. **Source registered and enabled.** Unknown fact types revert.
2. **chainKey pinned.** Asserted against the registered source. Not a chainId.
3. **Proof bounds.** Continuity length and transaction size capped before the
   precompile is reached, since both drive gas and both are attacker-supplied.
4. **Inclusion proof.** The precompile. Proves the transaction is in a block
   belonging to the confirmed source chain — and nothing else.
5. **S1.** Receipt status must be 1.
6. **S2.** The log at the claimed index must carry the registered `topic0` and
   have come from the pinned emitter. Subject and value are read from the
   **proven payload**, never from calldata.
7. **S3.** Replay guard, keyed on the log.
8. **Store.** Append-only.

Steps 5 and 6 exist because step 4 proves less than it appears to.

---

## Shared continuity

Attestcoin shares one continuity proof across up to `MAX_BATCH_SIZE` claims in a
1000-block window. Nothing requires those claims to belong to the same user,
which is what makes cross-user packing possible: ten strangers' facts ride one
proof where ten separate integrations would need ten.

---

## Monotonicity

No function removes or decrements a fact. Bounds widen — backwards when an older
fact is discovered late, forwards when a newer one lands — and counts only rise.
The passport reads only the registry and holds no state, so a tier can never
fall. Structural, not conventional.

---

## Adding a protocol

A `SourceRegistry` entry, not a code change:

```solidity
registry.registerSource(factType, chainKey, emitter, topic0, subjectTopicIndex);
```

That property is what makes Vouch infrastructure rather than an application. It
is also the most dangerous operation in the system — every field fails silently
when wrong. See [`../../scripts/deploy/README.md`](../../scripts/deploy/README.md).

---

## What is not registered, and why

`GOVERNANCE_ACTIVITY` is defined and deliberately excluded. The standard
OpenZeppelin Governor does not index `voter` in `VoteCast`, so no
`subjectTopicIndex` can name the subject and registering it would silently pin
whatever address occupied that topic. Two correct fact types beat three with one
quietly wrong.
