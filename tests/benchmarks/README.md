# Benchmarks

See [`docs/benchmarks/results.md`](../../docs/benchmarks/results.md) for the
current numbers and their caveats.

## Method

Run `Gas.t.sol` and read the logged figures. Assertions in that file are
deliberately relational rather than absolute -- see the note in
`scripts/benchmark/README.md` for why a threshold like `< 5000` passed locally
and failed in CI on identical code.

## What is worth measuring

| Measurement | Why it matters |
|---|---|
| Consumer read cost | The verify-once claim. Must be flat in the number of consumers. |
| Precompile calls per read | Must be zero. 75 consumer reads triggered none. |
| Batched vs individual, dense proof | Roughly a wash. Measured 0.7% worse. |
| Batched vs individual, sparse proof | Where batching actually wins. |
| Continuity proofs per N facts | ceil(N/10). The economic argument in one number. |

## The result that corrected the pitch

Batching does not make verification cheap at the execution level. Each claim
still runs its own decode, its own validation and its own precompile call. With
a dense continuity proof, batching ten claims measured *worse* than ten separate
submissions. It wins with a sparse proof -- the 1000-root case that proving old
history actually requires -- where the shared array is copied once instead of ten
times, and it wins much larger at the transaction level, where calldata and the
21,000 intrinsic cost live.

The claim moved to match the measurement rather than the other way around.
