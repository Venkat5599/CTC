# Benchmarks

```bash
forge test --gas-report --match-path "packages/contracts/test/Gas.t.sol" -vv
```

Results, with the caveats that make them honest, live in
[`docs/benchmarks/results.md`](../../docs/benchmarks/results.md).

## Reading the numbers

Two rules learned the hard way here.

**Absolute gas figures are environment-dependent.** `hasProof` measured 1,202
gas locally and 7,702 in CI on identical code, because the compiler version and
the runner's warm/cold accounting differ. Absolute numbers belong in a report;
assertions belong on relationships. Every threshold in `Gas.t.sol` is expressed
against a submission cost measured in the same run.

**The mock precompile excludes the real verification cost.** The Attestcoin docs
price it at roughly `2.3e-5 + 2.9e-7 * continuityHashCount` CTC. That exclusion
does not weaken the verify-once argument, it strengthens it: the omitted part is
precisely the part being amortised, so the real saving is larger than what the
harness prints. It does mean the absolute per-fact figures here are a floor, not
a forecast.
