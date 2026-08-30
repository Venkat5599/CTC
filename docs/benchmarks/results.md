# Benchmark results

Measured by `packages/contracts/test/Gas.t.sol`.

**Two caveats first, because they change how these numbers should be read.**

They are measured against a **mock precompile**, so the real verification cost —
roughly `2.3e-5 + 2.9e-7 * continuityHashCount` CTC — is excluded. That
exclusion strengthens the verify-once argument rather than weakening it: the
omitted part is precisely the part being amortised. It does mean per-fact figures
here are a floor.

And absolute gas figures are **environment-dependent**. `hasProof` measured 1,202
gas locally and 7,702 in CI on identical code. Every assertion in the harness is
therefore relational, expressed against a submission cost measured in the same
run.

---

## Consumer reads — the verify-once claim

| Read | Gas (local) |
|---|---|
| 1st consumer `hasProof` | 1,202 |
| 2nd consumer `hasProof` | 1,202 |
| 3rd consumer `hasProof` | 1,202 |

**Flat.** The marginal cost of the Nth consumer does not grow, asserted rather
than observed.

| Consumer | Gas |
|---|---|
| `VouchCredit.collateralBpsFor` | 10,028 |
| `VouchFeeTier.feeBpsFor` | 8,444 |
| `VouchAccess.isAdmitted` | 6,503 |

Credit costs more because it reads through the passport rather than the registry
directly.

**75 consumer reads triggered 0 precompile calls.** That is the whole claim.

---

## Batching — where the pitch was wrong

The naive version of the claim is that batching makes verification cheap. It
does not, and the harness said so.

| Continuity proof | Batched (10) vs individual | Result |
|---|---|---|
| Dense (~8 roots) | 2,963,380 vs 2,941,881 | **0.7% worse** |
| Sparse (1000 roots) | — | 8–30% better |

With a dense proof, batching is a wash or slightly negative: each claim still
runs its own decode, its own validation and its own precompile call, and there is
almost nothing shared to amortise.

It wins with a **sparse** proof — the ~1000-root case that proving history older
than roughly a day actually requires — where the shared array is copied from
calldata to memory once per transaction instead of once per claim.

The claim was moved to match the measurement.

---

## Transaction-level cost — where batching actually pays

With a 1000-root continuity proof:

| | Batched (10) | Individual (10) |
|---|---|---|
| Calldata bytes | 50,756 | 340,520 |
| Intrinsic + calldata gas | 833,096 | 5,658,320 |

**6.8x**, and `gasleft()` cannot see any of it. Two sources: ten transactions pay
21,000 intrinsic gas each before a single opcode runs, and the continuity proof
is sent once rather than ten times.

---

## Continuity proofs required

| Facts | Batched | Unbatched |
|---|---|---|
| 1 | 1 | 1 |
| 10 | 1 | 10 |
| 11 | 2 | 11 |
| 100 | 10 | 100 |
| 1000 | 100 | 1000 |

`ceil(N/10)`. The economic argument in one column.

---

## What is not yet measured

Everything against the **real** precompile. Until the flow runs on CC3 Testnet
with genuine Attestcoin proofs, these numbers describe an architecture rather
than a deployed system. That gap is the largest open risk in the project.
