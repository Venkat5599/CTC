# The relayer

Finds facts, batches them, proves them, submits them. Untrusted by construction.

---

## What untrusted means here, precisely

The relayer chooses **which** facts get submitted and **when**. That is real
power and it is entirely liveness: it can censor and it can stall, and both are
fixable by anyone running their own, because submission is permissionless.

It cannot make the registry believe something false. Every field it submits is
either re-derived on chain from the proven payload (subject, value, emitter) or
asserted against a registered source (chainKey, topic0, logIndex). Its best
available attack is to do nothing.

This is why nothing in the service holds a key that grants authority. The
submitting wallet pays gas.

---

## Discovery

`EventScanner` walks the source chain with two deliberate properties.

**Overlap on purpose.** Each pass re-scans a span behind the cursor, because logs
can surface late from a node that was briefly behind. A strictly forward cursor
would skip them permanently and never know. Duplicates are dropped by identity
downstream and again by the replay guard.

**Confirmations, not finality.** The cursor never advances past a backed-off
head. A reorged-away fact is not a security problem, but building a proof for one
wastes the expensive resource.

---

## Batching

`packBatches` groups claims by chain and 1000-block window, up to
`MAX_BATCH_SIZE`.

Windows are anchored to **absolute** block multiples rather than to the first
claim seen. Anchoring to the first claim would make the partition depend on which
claims happen to be pending, so the same block could land in different windows on
different runs. As written, two relayers running concurrently produce identical
batches, and the loser reverts on the replay guard rather than writing something
different. That determinism is what makes the relayer safely replaceable.

---

## The deadline

Batching is a tradeoff, not a free optimisation, and the scheduler makes it
explicit. A batch ships when it is **full** or when its **deadline** passes.

| Urgency | Wait | Why |
|---|---|---|
| interactive | 15s | Someone is watching a spinner. |
| standard | 2min | Roughly the ceiling before a person assumes it is broken. |
| backfill | 1h | Nothing is waiting. Fill every batch. |

Being late is recoverable; being early has already spent the proof. An empty
batch never ships, deadline or not, because it would amortise nothing.

Priority orders strictly by urgency class first, so a decade-long backfill can
never starve someone who just connected a wallet. Attempt count is deliberately
not a factor: demoting failed jobs pushes exactly the ones needing attention out
of sight.

---

## Settlement

`classify` distinguishes three reverts a naive handler would collapse into one:

| Revert | Meaning | Action |
|---|---|---|
| `FactAlreadyVerified` | Someone else landed it first | **Success.** This is what permissionless means. |
| `EmitterMismatch`, `TransactionReverted`, ... | The claim is invalid | Never retry. Burns a proof to reach the same revert. |
| Anything else | Transient | Retry with backoff. |

A job past its retry budget is **kept**, not dropped. An invisible permanent
failure, in a system whose whole value is that the fact eventually lands, is the
worst available outcome. It stops being eligible and shows up in metrics.
