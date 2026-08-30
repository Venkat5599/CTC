# Data flow

```
Ethereum event
      |
   Discovery                    services/indexer
      |
 Fact candidate                 source_events
      |
    Queue                       verification_jobs
      |
+---------------------+
|  Batch scheduler    |         packages/proof-engine
|                     |
|  same chain         |
|  same range         |
|  same deadline      |
+----------+----------+
           |
     Proof builder                packages/attestcoin
           |
      Attestcoin                  precompile 0x...0FD2
           |
      Creditcoin                  VouchRegistry
```

---

## Stage by stage

| Stage | Component | Table | Trust |
|---|---|---|---|
| Discovery | `EventScanner` | `source_events` | None. Re-derived on chain. |
| Queue | `BatchQueue` | `verification_jobs` | None. Liveness only. |
| Scheduling | `packBatches` + deadline | `verification_jobs` | Deterministic. |
| Proof | `buildSubmission` | `proofs` | Attestcoin's. |
| Submission | `Keeper` | `transactions` | Pays gas, grants nothing. |
| Verified | `VouchRegistry` | `facts` | **Authoritative.** |
| Aggregation | `VouchPassport` | `passport_facts` | Pure function of above. |

Only one row of that table is authoritative. Everything above it is a work queue;
everything below is a cache.

---

## The log index, through the whole pipeline

The receipt-wide log index is read from the node in discovery and passed through
untouched to the claim. It is never recomputed by enumeration at any stage.

This matters because an earlier version derived it from a **filtered** log array,
which named nothing on the source chain and made every log after the first
permanently unclaimable. Tests assert it survives the pipeline unchanged, in the
contracts and in the proof-request builder.

---

## Where it can stall, and what that costs

| Stall | Effect | Recovery |
|---|---|---|
| Indexer stops | Facts not discovered | Restart; overlap re-reads |
| Queue backs up | Latency | Deadline still fires |
| Proof builder down | Nothing lands | Retry with backoff |
| Relayer disappears | Nothing lands | Anyone runs one |
| Database dropped | Queue lost | Replay from chain; no standing lost |

No row of that table says "standing corrupted", and that is the design rather
than luck.

---

## Reading, once verified

```solidity
IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)
```

One `SLOAD`. No relayer, no database, no API. The pipeline above exists to make
this call true; nothing in it is needed to make the call.
