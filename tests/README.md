# Test layout

Tests live next to what they test, except where they span packages.

| Location | What runs there |
|---|---|
| `packages/contracts/test/` | Foundry: 52 tests, including S1/S2/S3 |
| `packages/*/src/*.test.ts` | Vitest unit tests, beside their module |
| `services/relayer/test/` | Vitest: batching, deadline, retry |
| `tests/integration/` | Cross-package flows against a local chain |
| `tests/e2e/` | Playwright, against a running frontend |
| `tests/fuzz/` | Long-running Foundry campaigns, kept out of CI |
| `tests/benchmarks/` | Gas and throughput measurement |

## Why the split

Unit tests are fast and run on every commit. The directories here hold the ones
that need a database, a chain, a browser, or minutes rather than milliseconds --
things that would make the inner loop too slow to keep using.

## The rule that matters

Nothing in this repo may pass by stubbing out `SourceValidator`. S1 and S2 must
execute the real decode path, against a mock precompile that reproduces the real
precompile's documented blind spots exactly -- it validates inclusion and
nothing else, just as the real one does. A mock that checked receipt status
would make every security test pass for the wrong reason, and the suite would be
testing the mock rather than the defence.
