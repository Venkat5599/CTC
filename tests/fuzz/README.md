# Fuzz campaigns

Long-running Foundry runs, kept out of CI because they are measured in minutes.

```bash
forge test --match-path "packages/contracts/test/*" --fuzz-runs 100000
```

## Properties worth hammering

**Monotonicity.** No sequence of submissions, in any order, may narrow the
proven block window or lower a tier. `testFuzz_boundsAlwaysSpanTheSubmittedBlocks`
covers the bounds at 512 runs in CI; this is where it gets six figures.

**Replay identity.** No two distinct source logs may collide on a `factId`, and
the same log under two registered fact types must produce two ids. The key is
`keccak(chainKey, blockNumber, txHash, factType, logIndex)`, so a collision here
would mean either a lost legitimate fact or an accepted replay.

**Value accumulation.** `proofValue` must equal the sum of the individual facts,
for any submission order, with no overflow path. Values are uint256 and summed
unchecked.

## What fuzzing cannot reach

The silent failures. A wrong `topic0` or `chainKey` produces a registry that is
empty rather than incorrect, and no property test can distinguish that from a
protocol nobody used. Those are caught by configuration review and by the
source-freshness alert, not here.
