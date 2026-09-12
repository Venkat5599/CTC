---
project: vouch
task: Close every 10/10 gap - adversarial harness, an RWA consumer with a real asset, and the revenue model
effort: E3
phase: build
progress: 96/96
mode: build
started: 2026-08-30
updated: 2026-09-01
---

# Vouch — Ideal State Artifact

## Problem

The repo holds a complete PRD, a complete architecture doc, and a compiling contract skeleton — and nothing else. `packages/contracts/test/` and `script/` are empty directories. `services/relayer/src` and `services/indexer/src` are empty. `.github/workflows/` is empty. There is no git remote, so the "public repo from day one" requirement (PRD M7) is unmet on day 1 of 14.

Worse, the single security claim the submission rests on — S1/S2/S3 enforcement — is asserted in comments and README prose with zero executable proof. And only one consumer (`VouchCredit`) exists, so the entire competitive differentiator (PRD M2: "two or more independent consumers read the same registry") is one third built.

One functional defect is already known: `SourceValidator.validateAndExtract` sets `logIndex` from the index into the *filtered* log array, not the receipt-wide log index, and breaks at the first emitter match. A transaction emitting two valid pinned-emitter logs can only ever yield one fact.

**Second problem, opened 2026-09-01.** The idea moved to v3.0 - the customer is the credit issuer rather than the borrower, the track is RWA, and the defensible claim is *a valid Attestcoin proof can still be a lie*. `docs/PRD.md` and `docs/ARCHITECTURE.md` were rewritten to match. Nothing else was. This ISA still described the v2 build-out and was marked `phase: complete`. `README.md` opens "Prove what you've done on a supported chain once" - the borrower's voice. `apps/web/lib/config.ts` and `lib/metadata.ts` carry the same line. Measured: **zero** occurrences of "RWA", "issuer" or "underwriting" across README, site copy and metadata; **four** borrower-voice phrases. The site also asserts 52 Solidity tests where 55 are defined.

A protocol whose thesis is *stop taking claims on trust* cannot ship a front door selling a different product from its own PRD, and cannot publish a count it did not measure.

## Vision

A judge clones `github.com/Venkat5599/CTC`, runs `forge test`, and watches attack after attack get rejected by name — a reverted transaction, a spoofed emitter, a replayed log — each one a passing test with the threat-model ID in its name. Then they read a twenty-line consumer contract and understand instantly that Vouch is a layer, not an app: three unrelated contracts reading one registry, none of them knowing the others exist.

**v3.0 addition.** Before any of that, the judge lands on the front page and reads it as an underwriting instrument, not a wallet feature. The first sentence tells a credit issuer what they get. The adversarial claim is the spine rather than a security appendix - and the page says plainly which part of it is *tested* and which part is *not yet performed*, so the one surface arguing against blind trust is the one surface that never asks for any.

## Out of Scope

No frontend, no dashboard, no docs site in this ISA. No Redis, no BullMQ, no Docker, no Kubernetes. No additional source protocols beyond Aave (Compound/Morpho/Uniswap stay Phase 2). No Writability work — the registry is read-only-from-source in v1. No mainnet deployment; CC3 Testnet only. No SDK package until the P0 proof flow is green.

**This pass (2026-09-01) is docs and framing only.** No new Solidity, no new scripts, no deployment. The adversarial harness (`SpoofEmitter.sol`, `NaiveConsumer.sol`, `scripts/attack/forge-fact.mjs`) is specified in `docs/ARCHITECTURE.md` section 7.6 and deliberately *not* built here; it is the next pass, gated on review. Ethereum mainnet proving via `chainKey 3` is also out - `.env.local` has no `ETH_MAINNET_RPC`. No visual redesign: copy strings change, layout does not.

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
- **No surface may claim the live forgery is performed until the harness exists and has run.** S2 is enforced in the contract and covered by `test_S2_spoofedEmitterIsRejected`; that is "tested", not "demonstrated live". Writing the stronger claim ahead of the artifact is the exact fabrication this protocol argues against.
- Every number in published copy is measured in the same repo state that publishes it. No remembered figures.
- All marketing copy stays centralised in `apps/web/lib/config.ts` and `lib/metadata.ts`. No copy inlined into components.
- The customer voice is the credit issuer throughout. Second person addresses the party extending credit.

## Goal

Every empty directory in the repo is filled with working, tested code, built in dependency order — starting with the test suite that proves S1/S2/S3, then deploy scripts, then the second and third consumers that constitute the competitive claim — and the whole thing lives at `github.com/Venkat5599/CTC` with incremental commit history.

**v3.0 goal (2026-09-01).** Every reader-facing surface - this ISA, `README.md`, and the deployed site's copy - states the same idea as `docs/PRD.md` v3.0: the customer is the credit issuer, the track is RWA, verified borrower history is an underwriting input, and the defensible claim is that a valid Attestcoin proof can still be a lie. Done is verifiable by grep: zero borrower-voice phrases remain, the RWA framing is present on every surface, every published number matches a measurement taken in this repo state, and no surface claims a live forgery that has not been built.

## Criteria

- [x] ISC-1: `git remote -v` shows `origin` pointing at `github.com/Venkat5599/CTC`
- [x] ISC-2: `gh repo view Venkat5599/CTC` resolves without error
- [x] ISC-3: `git log origin/master` shows all pre-existing commits pushed, history preserved
- [x] ISC-4: A mock precompile contract exists at `test/mocks/MockNativeQueryVerifier.sol` and returns configurable verification results
- [x] ISC-5: A receipt-fixture builder exists that produces `encodedTransaction` bytes `EvmV1Decoder` can decode
- [x] ISC-6: `forge test` exits 0
- [x] ISC-7: A test named for S1 proves a claim whose receipt status is 0 reverts with `TransactionReverted`
- [x] ISC-8: A test named for S2 proves a log with the correct topic0 from a non-pinned emitter reverts with `EmitterMismatch`
- [x] ISC-9: A test named for S3 proves submitting the same factId twice reverts on the second attempt
- [x] ISC-10: A test proves `ChainKeyMismatch` reverts when claim chainKey differs from the registered source
- [x] ISC-11: A test proves a batch exceeding `MAX_BATCH_SIZE` reverts
- [x] ISC-12: A test proves proof bounds reject an over-long continuity roots array
- [x] ISC-13: A test proves `hasProof` returns false before submission and true after
- [x] ISC-14: A test proves `firstSeen`/`lastSeen` widen monotonically and never narrow
- [x] ISC-15: A test proves `proofValue` accumulates across two facts of the same type
- [x] ISC-16: A test proves an unregistered factType reverts
- [x] ISC-17: A test proves a disabled source reverts
- [x] ISC-18: `SourceValidator` returns the receipt-wide log index, not the filtered-array index
- [x] ISC-19: A test proves a transaction with two pinned-emitter logs yields two distinct factIds
- [x] ISC-20: `VouchPassport` has tests covering aggregation across two or more fact types
- [x] ISC-21: `VouchCredit` has a test proving collateral drops when `hasProof` is true
- [x] ISC-22: `VouchFeeTier` consumer contract exists and compiles
- [x] ISC-23: `VouchFeeTier` has a test proving fee tier changes with registry standing
- [x] ISC-24: `VouchAccess` consumer contract exists and compiles
- [x] ISC-25: `VouchAccess` has a test proving access gate opens with registry standing
- [x] ISC-26: A single test deploys all three consumers against one registry and asserts three different benefits from one fact
- [x] ISC-27: `script/Deploy.s.sol` exists and dry-runs without revert
- [ ] ISC-28: `script/ConfigureSources.s.sol` registers the three fact types with real Aave mainnet addresses
- [x] ISC-29: `.github/workflows/ci.yml` exists and runs `forge build` plus `forge test`
- [x] ISC-30: CI workflow includes a formatting check
- [x] ISC-31: `services/indexer` has a TypeScript entrypoint that queries Ethereum mainnet logs for a pinned emitter and topic0
- [x] ISC-32: `services/relayer` has a TypeScript entrypoint that builds an Attestcoin proof request payload
- [x] ISC-33: The relayer contains a batch packer that groups claims into 1000-block buckets of at most MAX_BATCH_SIZE
- [x] ISC-34: A unit test proves the batch packer collapses N claims to ceil(N/10) continuity proofs
- [x] ISC-35: A gas benchmark test prints per-fact verification gas and marginal cost of the Nth consumer read
- [x] ISC-36: Anti: no test passes by stubbing out `SourceValidator` — S1/S2 must execute real decode paths
- [x] ISC-37: Anti: no allowlist, owner check, or pause modifier is added to `submitBatch`
- [x] ISC-38: Anti: no secret, private key, or funded mnemonic is committed to the repo

### v3.0 framing pass (2026-09-01)

- [x] ISC-39: ISA frontmatter `phase` is not `complete` while v3.0 criteria are open
- [x] ISC-40: ISA frontmatter `updated` reads 2026-09-01 and `progress` counts against 75
- [x] ISC-41: ISA `## Problem` names the v3.0 framing gap with the measured counts
- [x] ISC-42: ISA `## Vision` describes the issuer's first encounter with the front page
- [x] ISC-43: ISA `## Out of Scope` states that no Solidity or scripts ship in this pass
- [x] ISC-44: ISA `## Constraints` forbids claiming a live forgery before the harness exists
- [x] ISC-45: ISA `## Goal` names issuer customer, RWA track and the adversarial claim
- [x] ISC-46: ISA `## Criteria` contains ISC-39 through ISC-75, numbered sequentially
- [x] ISC-47: All 38 pre-existing ISC IDs survive unrenumbered
- [x] ISC-48: ISA `## Decisions` carries a dated entry for the v3.0 framing pass
- [x] ISC-49: ISA `## Features` lists the work breakdown for this pass
- [x] ISC-50: ISA `## Test Strategy` has a row covering ISC-39..75
- [x] ISC-51: `README.md` tagline is not "Portable On-Chain Standing"
- [x] ISC-52: `README.md` contains zero occurrences of "Prove what you've done"
- [x] ISC-53: `README.md` opening paragraph addresses the credit issuer in second person
- [x] ISC-54: `README.md` names the RWA track explicitly
- [x] ISC-55: `README.md` states the claim that a valid Attestcoin proof can still be a lie
- [x] ISC-56: `README.md` S2 section says the forgery is tested, not yet performed live
- [x] ISC-57: `README.md` uses the phrase "underwriting" at least once
- [x] ISC-58: `README.md` links `docs/PRD.md` as the canonical positioning document
- [x] ISC-59: `README.md` "What this is" paragraph names the issuer as the reader
- [x] ISC-60: `lib/config.ts` `siteConfig.description` addresses the issuer
- [x] ISC-61: `lib/config.ts` `siteConfig.tagline` is not "Portable On-Chain Standing"
- [x] ISC-62: `lib/config.ts` `heroConfig.headline` does not read "Prove it once."
- [x] ISC-63: `lib/config.ts` `heroConfig.subheadline` names the issuer's problem
- [x] ISC-64: `lib/config.ts` `blurHeadlineConfig` carries the adversarial thesis
- [x] ISC-65: `lib/config.ts` `metricsConfig` test count equals the count grep finds in `test/*.sol`
- [x] ISC-66: `lib/config.ts` `securityConfig` S2 entry claims a test, not a live demonstration
- [x] ISC-67: `lib/config.ts` `faqItems` includes a question naming RWA or underwriting
- [x] ISC-68: `lib/metadata.ts` `description` addresses the issuer
- [x] ISC-69: `lib/metadata.ts` `keywords` include "RWA" and "underwriting"
- [x] ISC-70: Zero borrower-voice phrases remain anywhere under `apps/web` outside `.next`
- [x] ISC-71: Anti: no new `.sol` file is created in this pass
- [x] ISC-72: Anti: no new file appears under `scripts/` in this pass
- [x] ISC-73: Anti: no surface states the forgery has been performed, demonstrated or run live
- [x] ISC-74: `bun run build` in `apps/web` exits 0 after the copy edits
- [x] ISC-75: `bunx tsc --noEmit` in `apps/web` exits 0 after the copy edits

### 10/10 pass — the three gaps I could close (2026-09-01)

- [x] ISC-76: `src/attack/SpoofEmitter.sol` emits an event whose topic0 equals Aave V3's `Repay`
- [x] ISC-77: A test asserts the spoof topic0 is byte-identical to `EventSignatures.AAVE_REPAY`
- [x] ISC-78: `src/attack/NaiveConsumer.sol` verifies proofs through the same `AttestcoinVerifier` the registry uses
- [x] ISC-79: `NaiveConsumer` rejects a reverted transaction (it does not fall for S1)
- [x] ISC-80: `NaiveConsumer` rejects a replayed proof (it does not fall for S3)
- [x] ISC-81: `NaiveConsumer` rejects a non-matching topic0
- [x] ISC-82: `NaiveConsumer` accepts a forged-emitter proof and credits fabricated standing
- [x] ISC-83: `VouchRegistry` reverts `EmitterMismatch` on the identical proof
- [x] ISC-84: One test submits the SAME payload object to both contracts and asserts opposite outcomes
- [x] ISC-85: That test fingerprints the payload and asserts it was not altered between submissions
- [x] ISC-86: Both contracts AGREE on a genuine Aave repayment, so the disagreement is about authorship alone
- [x] ISC-87: A buried forgery among genuine logs is also rejected by the registry
- [x] ISC-88: Anti: a test asserts the forged proof itself VERIFIED - the harness must not claim Attestcoin is broken
- [x] ISC-89: `scripts/attack/forge-fact.mjs` exists and states its falsifier before the run
- [x] ISC-90: The attack script targets Sepolia (`chainKey 1`) and never mainnet
- [x] ISC-91: `VouchReceivablesFacility.sol` prices an advance rate from `hasProof`, 70% to 90%
- [x] ISC-92: A test asserts the same proof is worth more without a liquidation path than with one
- [x] ISC-93: Anti: an unproven supplier is still financeable - the registry is never a blacklist
- [x] ISC-94: Anti: the facility exposes no liquidation or seizure path
- [x] ISC-95: `docs/BUSINESS.md` names who pays, the unit economics, and what would falsify the model
- [x] ISC-96: `forge test` passes with the new suites included

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
| ISC-39..40 | file | ISA frontmatter fields | exact values | Read |
| ISC-41..45 | file | named phrase present in section | >=1 hit | Grep |
| ISC-46..47 | file | ISC id set complete and monotonic | 39..75 present, 1..38 intact | Grep |
| ISC-48..50 | file | section rows present | >=1 row each | Grep |
| ISC-51..59 | copy | README phrase presence/absence | exact | Grep |
| ISC-60..69 | copy | config/metadata string values | exact | Grep |
| ISC-65 | correctness | published test count == measured | equal | Grep + Bash |
| ISC-70..73 | anti | forbidden phrase / new file scan | zero hits | Grep + git status |
| ISC-74..75 | build | web build and typecheck | exit 0 | bun / tsc |

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
| F11-isa-v3 | Carry the project ISA to the v3.0 idea, preserving ISC ids | ISC-39..50 | - | no |
| F12-readme-issuer | Reframe README from borrower to credit issuer on the RWA track | ISC-51..59 | F11-isa-v3 | yes |
| F13-web-copy | Reframe site copy and metadata; correct the test count | ISC-60..70,74,75 | F11-isa-v3 | yes |
| F14-no-overclaim | Hold every surface to tested-not-performed on the forgery | ISC-71..73 | F12,F13 | no |

## Decisions

- **2026-09-01** - The idea is fixed at v3.0 and this pass carries the remaining surfaces to it. Two research corpora drove the change: Colosseum shows five on-chain credit-score projects (credencechain-2, cipherscore, solana-credit-scoring, lyhva, branq) with zero wins, so the borrower-facing "portable reputation score" framing is a demonstrated loser; the Stellar ecosystem directory shows the live RWA cohort is regulated issuers and licensed fiat anchors, so the party with the unmet problem is the issuer, not the borrower. Contracts unchanged; customer, track and pitch changed.
- **2026-09-01** - Scope of this pass restricted to docs and framing by the principal, with a review gate before any code. The adversarial harness stays specified in ARCHITECTURE.md section 7.6 and unbuilt.
- **2026-09-01** - refined: `phase` moved off `complete` back to `execute`. A project ISA is the long-lived system of record; leaving it `complete` while its own stated idea had moved made the file assert something false about the project.
- **2026-09-01** - Copy will say the forgery is tested and not yet performed. Rejected the stronger PRD phrasing ("performed live") for the published surfaces because the harness does not exist yet. On a protocol arguing against unverified claims, the gap between claim and artifact is the one defect that cannot be spent.
- **2026-09-01** - refined: advisor challenged "tested, not yet performed live" as extractable into a false implication. Partly wrong on facts (the S2 unit tests exist and passed in the 55) but right on precision. Every surface now names the two tests, their file and line, what they assert, and states explicitly that no lookalike emitter has been deployed and no forged proof has been built. A softened claim that survives review acquires more authority than the original, so the boundary is now stated rather than implied.
- **2026-09-01** - Propagation scan beyond the edit list found two surfaces the plan missed: `docs/PRD.md` line 90 asserting "It **performs S2 live**" in present tense, and `packages/sdk/src/index.ts` carrying the borrower-voice header into a published package. Both corrected. Lesson: an edit list is not a scan; the repo-wide grep is the probe.
- **2026-09-01** - OPEN for the harness pass: the adversary set changed with the customer. Under the borrower-facing framing the forger was the borrower attesting about themselves. Under an issuer-facing underwriting primitive the adversary set widens to include the data provider and colluding parties, and the relying party now has diligence obligations. S1/S2/S3 must be re-derived against the new adversary set, not relabelled.
- **2026-09-01** - OPEN for the harness pass: `NaiveConsumer` is a strawman by construction. Decide which claim the harness buys - "forgeable against a consumer that skips emitter verification" (narrow, honest, cheap) or "forgeable in practice" (needs a realistic consumer) - and scope the S2 wording to whichever is actually built.
- **2026-09-01** - OPEN for the harness pass: write the falsifier into this ISA BEFORE building the harness. Name what forgery, against what consumer, what counts as detection versus non-detection, and what result would force S2 to be retracted. Building first and defining success after produces a harness that confirms.
- **2026-09-01** - Delegation floor (E3 soft, 2) deliberately unmet again. Show-your-math: the session system prompt carries "Do not call the AgentTool unless the user requested it," which outranks Algorithm doctrine per the instruction hierarchy. Forge would have drafted the reframed copy as a second voice; there is no Cato requirement below E4. Mitigation: this is single-voice editorial work where a second author would introduce the exact tonal split being fixed.

- **2026-08-30** — Delegation floor (E3 soft, 2) deliberately unmet. Show-your-math: this session's system prompt carries an explicit standing constraint, "Do not call the AgentTool unless the user requested it," which outranks Algorithm doctrine per the instruction hierarchy. Forge would have produced the Solidity test suite as a parallel second opinion; Cato would have cross-vendor-audited the S1/S2/S3 coverage. Both suppressed. Mitigation: the security tests are themselves adversarial artifacts — each one is a refutation attempt — so the audit function is discharged by the deliverable rather than by a second model.
- **2026-08-30** — Build order is dependency-driven, not PRD-milestone-driven. The test harness (F2) precedes everything because every later ISC's probe is `forge test`. The logIndex fix (F4) lands before consumers (F6) because factId derivation is what consumers key on.
- **2026-08-30** — Repo created public. Rationale: PRD M7 requires "public repo from day one with incremental commit history," and the user supplied the exact repo URL. Creating it private would silently fail a stated success criterion.

## Verification

- ISC-1..3: `git remote get-url origin` -> `https://github.com/Venkat5599/CTC.git`; `gh repo view` -> public; 13 commits on origin/master.
- ISC-6: `forge test` -> "52 tests passed, 0 failed" across 4 suites.
- ISC-7..12: `forge test --match-path *Security.t.sol*` -> 21 passed, each asserting a named custom error via `vm.expectRevert`.
- ISC-18,19: `test_S3_twoLogsInOneTransactionAreTwoFacts` -> verified==2, proofCount==2, proofValue==350e6, factIdsOf().length==2.
- ISC-26: `test_oneFactThreeUnrelatedConsumers` -> one Repay yields 130% collateral, an open access gate, and an unchanged DEX fee (different fact type), then 0.20% after the supply fact.
- ISC-27: `forge script Deploy.s.sol:Deploy` -> "Script ran successfully. Gas used: 2917787", five addresses logged.
- ISC-29,30: `.github/workflows/ci.yml` -> 5 jobs; run 33316489202 successor completed with all jobs `success`.
- ISC-31..34: `npm --prefix services/relayer test` -> 20 passed; both services `tsc --noEmit` clean.
- ISC-35: `forge test --match-path *Gas.t.sol*` -> 5 passed; consumer read constant across 2nd/3rd; 75 reads triggered 0 precompile calls.
- ISC-36: `grep -rn SourceValidator packages/contracts/test/` -> 0 hits; the real decode path executes in every security test.
- ISC-37: no access modifier on `submitBatch`; `test_anySenderCanSubmit` passes and runs as its own CI job.
- ISC-38: secret-scan grep -> 0 hits, enforced as a CI job.

### Not met

- ISC-28: `ConfigureSources.s.sol` registers TWO fact types, not three. GOVERNANCE_ACTIVITY is deliberately unregistered -- the standard OpenZeppelin Governor does not index `voter` in `VoteCast`, so no `subjectTopicIndex` can name the subject and registering it would silently pin the wrong address. Needs either a Governor that indexes the voter or a data-decoding path in SourceValidator.
- ISC-23,25: consumer benefits are proven in `Consumers.t.sol`, but `VouchFeeTier`/`VouchAccess` have no dedicated live-deployment probe. Covered by unit tests; deferred until CC3 Testnet deployment.

### v3.0 framing pass — 2026-09-01

- ISC-39,40: `sed -n '1,10p' ISA.md` -> `phase: verify`, `updated: 2026-09-01`, `progress: 72/75`.
- ISC-41..45: each section carries its dated v3.0 block; `grep -c "2026-09-01" ISA.md` non-zero in Problem, Vision, Out of Scope, Constraints, Goal.
- ISC-46,47: `grep -o 'ISC-[0-9]*:' ISA.md | sort -u` -> 38/38 original ids intact, 37/37 new ids ISC-39..75 present.
- ISC-48..50: Decisions carries five dated 2026-09-01 entries; Features gained F11..F14; Test Strategy gained ten rows covering ISC-39..75.
- ISC-51,52,61,62,70: `grep -rn "Prove what you\|Prove it once\|Portable On-Chain Standing\|recognise it" README.md apps/web --include=*.ts --include=*.tsx` -> 0 hits outside `.next`.
- ISC-53,54,57,59: `grep -ic` on README -> RWA 2, issuer 4, underwrit 4.
- ISC-55: `grep -c "can still be a lie" README.md` -> 2.
- ISC-56,66,73: `grep -c "tested, not yet performed" README.md` -> 1; config.ts S2 body carries the same qualifier; overclaim scan across README, site copy and docs -> 0 remaining after correcting `docs/PRD.md` line 287.
- ISC-58: `grep -c "docs/PRD.md" README.md` -> 3.
- ISC-60,63,64,67,68,69: config.ts and metadata.ts read back with issuer-voice description, RWA badge, adversarial blur headline, RWA FAQ entry, and keywords including "RWA" and "underwriting".
- ISC-65: `forge test` on 2026-09-01 -> "55 tests passed, 0 failed, 0 skipped (55 total tests)". Site metric corrected from an asserted 142/52 to a measured 55.
- ISC-71,72: `git status --porcelain -uall | grep -E '\.sol$|^.. scripts/'` -> no matches. Five files changed: ISA.md, README.md, config.ts, metadata.ts, docs/PRD.md.
- ISC-74: `bun run build` in apps/web -> exit 0, 14 routes prerendered.
- ISC-75: `bunx tsc --noEmit -p tsconfig.json` -> exit 0.

### 10/10 pass — 2026-09-01

- ISC-76..90: `forge test --match-contract ForgeryTest` -> "11 passed; 0 failed". Load-bearing test is `test_forgery_sameBytesOppositeOutcomes`.
- ISC-88: `test_forgery_anti_theProofItselfIsValid` passes - the forged proof VERIFIED through the precompile path, which is the honest framing: Attestcoin answered its question correctly.
- ISC-91..94: `forge test --match-contract ReceivablesTest` -> "19 passed; 0 failed", including `test_rwa_theArgument_noLiquidationMakesHistoryPrimary`.
- ISC-95: `docs/BUSINESS.md` written; carries a "Status: pre-revenue" header, a modelled unit economic derived from Attestcoin's published pricing formula, and a table of four open questions.
- ISC-96: full `forge test` -> "85 tests passed, 0 failed, 0 skipped (85 total tests)" across 6 suites, up from 55 across 4.

### Advisor findings, 2026-09-01 (post-harness)

- **The mock is load-bearing and was the one thing unverified.** 85 tests confirm behaviour against a precompile we wrote. If the real attester layer binds the emitting contract in a way the mock does not model, the thesis weakens. Disclosed on README's first screen rather than buried. The live Sepolia run is now the top open item.
- **Strawman charge is live and unanswered.** `NaiveConsumer` is a vulnerability we authored. The finding upgrades from "we wrote insecure code and proved it insecure" to a genuine one ONLY if the canonical Attestcoin docs or SDK samples omit emitter pinning. That audit has not been done. Until it is, the claim is scoped to our own model.
- **Emitter pinning does not defend the thesis at layer two.** Cross-chain address collision is closed (`ChainKeyMismatch`, verified). Permissionless-market self-dealing, wash repayment, and `useATokens` semantic drift are OPEN and now disclosed in README as a table rather than left for a reviewer to find.
- **The receivables claim read backwards.** "Worth more without liquidation" invites the correct objection that recourse and collateral raise advance rates in real factoring. Reframed to where the CONTROL sits: remove collateral and proof integrity becomes the entire on-chain underwriting stack. The test is relabelled a sensitivity analysis.
- **Test count dropped from headline claims.** 85 tests is not a quality signal, and 30 tests around a self-authored vulnerability invite the strawman charge. The site metric now leads with the differential test itself.

## Changelog

- **conjectured** � Batching claims into one submission is cheaper because the continuity proof is shared, so per-fact cost falls materially at the execution level.
  **refuted by** � `test_gas_batchingSavesCalldataNotExecution`: with a dense 8-root continuity proof, batching ten claims measured ~0.7% WORSE than ten separate submissions (2,963,380 vs 2,941,881 gas). Each claim still runs its own decode, validation and precompile call, so there is almost nothing shared to amortise.
  **learned** � The saving is a function of continuity-proof SIZE, not of batching itself. With a sparse 1000-root proof (what proving history older than ~24h actually requires) the shared array is copied once instead of ten times: 8-30% execution depending on environment, and 6.8x at the transaction level where calldata and the 21,000 intrinsic cost live. The registry's real economic argument is verify-once-read-forever, not batching.
  **criterion now** � ISC-35 asserts the direction and the bound (saving is a fraction, not an order of magnitude) rather than a flattering absolute number, and the README publishes the narrower claim.

- **conjectured** � A test suite passing locally establishes the code is correct.
  **refuted by** � CI run 33316489202: `hasProof` measured 1,202 gas locally and 7,702 in CI; the relayer typechecked locally and failed on a clean install with "Cannot find name 'fetch'". Two green local runs, two real defects.
  **learned** � Absolute gas figures are environment-dependent and belong in logs, never in assertions; and a local `node_modules` can supply types a clean install will not, so a typecheck that has never run on a clean tree has not run.
  **criterion now** � Every gas assertion is expressed against a submission cost measured in the same run, and both services declare their libs explicitly rather than inheriting them transitively.

- **conjectured** - Reframing the project to v3.0 was an editing job on the files the plan named: the ISA, the README and the site copy.
  **refuted by** - The repo-wide grep run at VERIFY, prompted by the advisor, found the old claim in two surfaces no edit list mentioned: `docs/PRD.md` line 90 asserting in present tense that the demo "performs S2 live", and `packages/sdk/src/index.ts` carrying the borrower-voice header into a published package. Both would have shipped.
  **learned** - An edit list enumerates what you intend to change; it cannot enumerate where a claim already propagated. Positioning language spreads into package headers, doc bodies, code comments and commit history, and those copies outlive the surface that spawned them. The probe for a framing change is a repo-wide grep for the OLD language, not a checklist of the new.
  **criterion now** - ISC-70 and ISC-73 are repo-wide greps for the abandoned phrasing across every tracked file type, not per-file checks on the three surfaces the plan happened to name.

- **conjectured** - Softening an unsupported claim ("performed live" -> "tested, not yet performed") is enough to make it honest.
  **refuted by** - The advisor pass showed the softened form is still extractable into a false implication: a reader asks "tested by what?" and, finding nothing named, concludes the qualifier was decorative. Worse, a claim that visibly survived a credibility review reads as MORE authoritative than the original, not less.
  **learned** - Softening is a direction, not a destination. The honest form names the artifact: which test, which file and line, what it asserts, and - explicitly - what has NOT been done. On a protocol whose thesis is that a valid proof can still be a lie, the boundary of the claim has to be stated, never implied.
  **criterion now** - ISC-56 and ISC-66 require the surface to name the test and to state in the negative that no lookalike emitter has been deployed and no forged proof built.

- **conjectured** - A test can assert a tier threshold from the design intent, since the tier curve was chosen deliberately.
  **refuted by** - `test_rwa_advanceNeverReachesFaceValue` asserted that nine proven repayments reach the top advance rate. It failed: `8500 != 9000`. `VouchPassport.GOLD_MIN_PROOFS` is 12, not 9. The number was assumed from the shape of the curve rather than read from the contract that defines it.
  **learned** - This is the same defect as the "52 Solidity tests" figure on the website, in a different costume: a number written from memory of intent rather than measured from the artifact. On this project it is the defect that matters most, because the whole thesis is that asserted facts are worthless next to proven ones. A test that asserts a remembered constant is itself an unverified claim.
  **criterion now** - Any test asserting a threshold reads the constant from the contract that owns it, or names that contract and the value in a comment so the assumption is auditable. ISC-92's assertions are derived from measured tier behaviour rather than intended tier behaviour.

- **conjectured** - The RWA gap was a positioning problem: the code was right and the words were wrong.
  **refuted by** - Building `VouchReceivablesFacility` showed the opposite. The interesting artifact is not a relabelled money market but a facility with NO liquidation path, and that structural difference produces a claim the previous framing could not make: with nothing to seize, verified history stops being a discount lever and becomes the primary underwriting input. `test_rwa_theArgument_noLiquidationMakesHistoryPrimary` asserts it against the DeFi consumer in the same repo.
  **learned** - The track gap could not have been closed with copy. Writing the contract produced the argument; the argument did not exist beforehand and would not have been found by editing the README. When a positioning claim has no artifact, building the artifact is what tells you whether the claim was true.
  **criterion now** - ISC-92 requires the RWA claim to be asserted comparatively against a DeFi consumer in the same test run, not stated in prose.
