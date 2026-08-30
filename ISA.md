---
project: vouch
task: Build every missing Vouch component one by one and publish to GitHub
effort: E3
phase: observe
progress: 0/38
mode: build
started: 2026-08-30
updated: 2026-08-30
---

# Vouch — Ideal State Artifact

## Problem

The repo holds a complete PRD, a complete architecture doc, and a compiling contract skeleton — and nothing else. `packages/contracts/test/` and `script/` are empty directories. `services/relayer/src` and `services/indexer/src` are empty. `.github/workflows/` is empty. There is no git remote, so the "public repo from day one" requirement (PRD M7) is unmet on day 1 of 14.

Worse, the single security claim the submission rests on — S1/S2/S3 enforcement — is asserted in comments and README prose with zero executable proof. And only one consumer (`VouchCredit`) exists, so the entire competitive differentiator (PRD M2: "two or more independent consumers read the same registry") is one third built.

One functional defect is already known: `SourceValidator.validateAndExtract` sets `logIndex` from the index into the *filtered* log array, not the receipt-wide log index, and breaks at the first emitter match. A transaction emitting two valid pinned-emitter logs can only ever yield one fact.

## Vision

A judge clones `github.com/Venkat5599/CT`, runs `forge test`, and watches attack after attack get rejected by name — a reverted transaction, a spoofed emitter, a replayed log — each one a passing test with the threat-model ID in its name. Then they read a twenty-line consumer contract and understand instantly that Vouch is a layer, not an app: three unrelated contracts reading one registry, none of them knowing the others exist.

## Out of Scope

No frontend, no dashboard, no docs site in this ISA. No Redis, no BullMQ, no Docker, no Kubernetes. No additional source protocols beyond Aave (Compound/Morpho/Uniswap stay Phase 2). No Writability work — the registry is read-only-from-source in v1. No mainnet deployment; CC3 Testnet only. No SDK package until the P0 proof flow is green.

## Principles

- **Verification beats assertion.** A security property with no failing-test-that-now-passes is a claim, not a control.
- **Build in dependency order.** A component whose dependency is unproven is a component built on sand.
- **The precompile proves inclusion only.** Every layer above it must re-establish meaning: success, authorship, uniqueness.
- **Monotonic standing.** No code path removes or decrements a fact; a tier can never fall.
- **The relayer is untrusted.** It affects liveness, never correctness.

## Constraints

- Solidity `0.8.28`, Foundry, `via_ir`, optimizer 200 runs — as pinned in `foundry.toml`.
- Attestcoin precompile ABI is vendored at `interfaces/INativeQueryVerifier.sol` and pinned to `0x...0FD2`; nothing but `AttestcoinVerifier` may touch it.
- Batch continuity is shared across at most `MAX_BATCH_SIZE` claims in a 1000-block window — the batch packer must respect this, not work around it.
- `submitBatch` stays permissionless. No allowlist on submission, ever.
- Source chainKey is Attestcoin's key space, not EVM chainId (Mainnet = 3, Sepolia = 1).
- TypeScript for all services. No Python.

## Goal

Every empty directory in the repo is filled with working, tested code, built in dependency order — starting with the test suite that proves S1/S2/S3, then deploy scripts, then the second and third consumers that constitute the competitive claim — and the whole thing lives at `github.com/Venkat5599/CT` with incremental commit history.

## Criteria

- [ ] ISC-1: `git remote -v` shows `origin` pointing at `github.com/Venkat5599/CT`
- [ ] ISC-2: `gh repo view Venkat5599/CT` resolves without error
- [ ] ISC-3: `git log origin/master` shows all pre-existing commits pushed, history preserved
- [ ] ISC-4: A mock precompile contract exists at `test/mocks/MockNativeQueryVerifier.sol` and returns configurable verification results
- [ ] ISC-5: A receipt-fixture builder exists that produces `encodedTransaction` bytes `EvmV1Decoder` can decode
- [ ] ISC-6: `forge test` exits 0
- [ ] ISC-7: A test named for S1 proves a claim whose receipt status is 0 reverts with `TransactionReverted`
- [ ] ISC-8: A test named for S2 proves a log with the correct topic0 from a non-pinned emitter reverts with `EmitterMismatch`
- [ ] ISC-9: A test named for S3 proves submitting the same factId twice reverts on the second attempt
- [ ] ISC-10: A test proves `ChainKeyMismatch` reverts when claim chainKey differs from the registered source
- [ ] ISC-11: A test proves a batch exceeding `MAX_BATCH_SIZE` reverts
- [ ] ISC-12: A test proves proof bounds reject an over-long continuity roots array
- [ ] ISC-13: A test proves `hasProof` returns false before submission and true after
- [ ] ISC-14: A test proves `firstSeen`/`lastSeen` widen monotonically and never narrow
- [ ] ISC-15: A test proves `proofValue` accumulates across two facts of the same type
- [ ] ISC-16: A test proves an unregistered factType reverts
- [ ] ISC-17: A test proves a disabled source reverts
- [ ] ISC-18: `SourceValidator` returns the receipt-wide log index, not the filtered-array index
- [ ] ISC-19: A test proves a transaction with two pinned-emitter logs yields two distinct factIds
- [ ] ISC-20: `VouchPassport` has tests covering aggregation across two or more fact types
- [ ] ISC-21: `VouchCredit` has a test proving collateral drops when `hasProof` is true
- [ ] ISC-22: `VouchFeeTier` consumer contract exists and compiles
- [ ] ISC-23: `VouchFeeTier` has a test proving fee tier changes with registry standing
- [ ] ISC-24: `VouchAccess` consumer contract exists and compiles
- [ ] ISC-25: `VouchAccess` has a test proving access gate opens with registry standing
- [ ] ISC-26: A single test deploys all three consumers against one registry and asserts three different benefits from one fact
- [ ] ISC-27: `script/Deploy.s.sol` exists and dry-runs without revert
- [ ] ISC-28: `script/ConfigureSources.s.sol` registers the three fact types with real Aave mainnet addresses
- [ ] ISC-29: `.github/workflows/ci.yml` exists and runs `forge build` plus `forge test`
- [ ] ISC-30: CI workflow includes a formatting check
- [ ] ISC-31: `services/indexer` has a TypeScript entrypoint that queries Ethereum mainnet logs for a pinned emitter and topic0
- [ ] ISC-32: `services/relayer` has a TypeScript entrypoint that builds an Attestcoin proof request payload
- [ ] ISC-33: The relayer contains a batch packer that groups claims into 1000-block buckets of at most MAX_BATCH_SIZE
- [ ] ISC-34: A unit test proves the batch packer collapses N claims to ceil(N/10) continuity proofs
- [ ] ISC-35: A gas benchmark test prints per-fact verification gas and marginal cost of the Nth consumer read
- [ ] ISC-36: Anti: no test passes by stubbing out `SourceValidator` — S1/S2 must execute real decode paths
- [ ] ISC-37: Anti: no allowlist, owner check, or pause modifier is added to `submitBatch`
- [ ] ISC-38: Anti: no secret, private key, or funded mnemonic is committed to the repo

## Test Strategy

| isc | type | check | threshold | tool |
|---|---|---|---|---|
| ISC-1..3 | ops | remote configured and pushed | exact match | git / gh |
| ISC-4..5 | file | fixture harness compiles | forge build exit 0 | Bash |
| ISC-6 | build | full suite green | exit 0 | forge test |
| ISC-7..12 | security | expectRevert with named error | each reverts | forge test --match-test |
| ISC-13..17, 20, 21 | functional | state assertions | exact values | forge test |
| ISC-18..19 | correctness | two-log receipt yields two factIds | count == 2 | forge test |
| ISC-22..26 | functional | three consumers, one registry | 3 distinct benefits | forge test |
| ISC-27..28 | deploy | script dry-run | no revert | forge script |
| ISC-29..30 | ci | workflow file valid | job list non-empty | Read |
| ISC-31..34 | service | entrypoint runs | exit 0 | bun / vitest |
| ISC-35 | perf | gas table printed | numbers present | forge test --gas-report |
| ISC-36..38 | anti | grep for forbidden pattern | zero hits | Grep |

## Features

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| F1-remote | Create GitHub repo, set origin, push history | ISC-1,2,3 | — | yes |
| F2-harness | Mock precompile + receipt fixture builder | ISC-4,5,6 | — | no |
| F3-security-tests | S1/S2/S3 and guard tests | ISC-7..12,36 | F2-harness | no |
| F4-logindex-fix | Correct receipt-wide log index, multi-log support | ISC-18,19 | F2-harness | no |
| F5-registry-tests | Registry invariants and aggregation | ISC-13..17,20 | F2-harness | no |
| F6-consumers | VouchFeeTier + VouchAccess + three-consumer proof | ISC-21..26 | F5-registry-tests | no |
| F7-deploy | Deploy and ConfigureSources scripts | ISC-27,28,37,38 | F6-consumers | yes |
| F8-ci | GitHub Actions workflow | ISC-29,30 | F3-security-tests | yes |
| F9-services | Indexer, relayer, batch packer | ISC-31..34 | F7-deploy | no |
| F10-benchmark | Gas benchmark harness | ISC-35 | F6-consumers | yes |

## Decisions

- **2026-08-30** — Delegation floor (E3 soft, 2) deliberately unmet. Show-your-math: this session's system prompt carries an explicit standing constraint, "Do not call the AgentTool unless the user requested it," which outranks Algorithm doctrine per the instruction hierarchy. Forge would have produced the Solidity test suite as a parallel second opinion; Cato would have cross-vendor-audited the S1/S2/S3 coverage. Both suppressed. Mitigation: the security tests are themselves adversarial artifacts — each one is a refutation attempt — so the audit function is discharged by the deliverable rather than by a second model.
- **2026-08-30** — Build order is dependency-driven, not PRD-milestone-driven. The test harness (F2) precedes everything because every later ISC's probe is `forge test`. The logIndex fix (F4) lands before consumers (F6) because factId derivation is what consumers key on.
- **2026-08-30** — Repo created public. Rationale: PRD M7 requires "public repo from day one with incremental commit history," and the user supplied the exact repo URL. Creating it private would silently fail a stated success criterion.
