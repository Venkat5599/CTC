# Demo recording script

**Target: 3:00.** Read the bold lines aloud; everything else is stage direction.

The whole video is two live runs and one diagram. Nothing is mocked, nothing is
pre-rendered, and every number that appears on screen came off a chain during
the take. If a command fails on camera, that is information too — say what
happened and move on rather than cutting, because a protocol whose thesis is
"stop taking claims on trust" cannot ship a demo that hides its own failures.

---

## Before you press record

```bash
cd C:/Users/ksubh/OneDrive/Documents/CTC
set -a && source .env.local && set +a
```

Three forged events are already emitted and attested — one per take. Each is a
separate proof key, so each can be credited by the naive consumer exactly once.
**Use a fresh one for every take.**

| Take | Sepolia transaction |
|---|---|
| ~~1~~ | ~~`0x742943…dca6e5e2`~~ — used in a rehearsal, will print ALREADY CONSUMED |
| 2 | `0x886cef88a6d6277ac7bf0dbc0a44296e758db854f4b7100dc0479ee179087dd4` |
| 3 | `0xc5b8ae72ac724f1633683bbf22b9f98c9e8b6a40e961eb4ec6d5e8d95ca74288` |

Need more? `cast send 0xBB0C0BeAF600B205d44f267E0D7586A543f609CF "mintHistory(address,uint256)" 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8 1000000000000 --rpc-url "$ETH_SEPOLIA_RPC" --private-key "$CREDITCOIN_PRIVATE_KEY"`
then wait ~10 minutes for the block to be attested before proving it.

**Have open:** a terminal at ~16pt, and `https://vouch-registry.vercel.app/create`
with the wallet already connected to Creditcoin CC3 and gas in it.

---

## 0:00 — 0:35 · Cold open: the forgery

No title card. No logo. Start on the terminal, already typed, and hit enter.

```bash
node scripts/attack/prove-existing.mjs 0x886cef88a6d6277ac7bf0dbc0a44296e758db854f4b7100dc0479ee179087dd4
```

Say nothing for the first ten seconds. Let it print.

When `PROVEN` appears:

> **"That's a real proof. Not a fixture — the actual Attestcoin prover just
> proved a real transaction on Sepolia."**

When `ACCEPTED` appears:

> **"And that consumer just credited a one-million-dollar repayment that never
> happened."**

When `REVERTED` appears — pause on it:

> **"Same proof. Same bytes. The registry threw it out."**

Then the line the whole video exists for:

> **"A valid Attestcoin proof can still be a lie."**

---

## 0:35 — 1:10 · Why

Stay in the terminal. Scroll up to the header block showing `topic0` twice.

> **"The precompile proves this transaction is in a block on Sepolia. It proves
> that correctly. What it does not prove is who emitted the event inside it."**

Point at the two identical `topic0` values.

> **"I deployed a contract that emits Aave's Repay signature, byte for byte,
> naming myself. The transaction succeeded. The proof is genuine. Everything a
> careful integration checks — inclusion, receipt status, replay — all pass."**

Point at the emitter line.

> **"One field is wrong. And the only contract that noticed is the one that
> pinned the emitter address."**

---

## 1:10 — 2:05 · The live pipeline

Switch to `https://vouch-registry.vercel.app/create`. Click **Run the demo**.

While step 01 runs:

> **"This is the honest path. It's scanning Sepolia for a real Aave repayment —
> somebody else's, not mine. That distinction matters: a registry that can only
> record its own operator's transactions is a database with extra steps."**

When the proof lands (step 02):

> **"Real proof, real continuity roots."**

When the wallet prompt appears:

> **"I'm submitting this myself. submitBatch is permissionless, and the subject
> is read from the proven log rather than from whoever sent it — so submitting
> gains me nothing. No relayer, no server key, no trusted operator. Anyone
> watching can run this and get the same answer."**

Confirm in the wallet. While it confirms:

> **"Every check — receipt status, emitter, replay — runs inside that one call
> as a revert. So a confirmed transaction is the verification result."**

When before/after appears:

> **"Zero facts before. One after. Permanently."**

---

## 2:05 — 2:40 · One fact, five consumers

Scroll to the consumer table. Let it fill.

> **"Five independent contracts now read that one entry. None of them verified
> anything. None paid proof gas. None registered with the registry — the
> registry doesn't know they exist."**

Read them off: collateral 150 → 130, invoice advance 70 → 80, gate open,
Tier 1. Then stop on the fee tier.

> **"And the exchange fee doesn't move. It reads a different fact type, so a
> repayment can't touch it."**

Pause here. This is the second most important line in the video.

> **"Standing doesn't leak between domains. That's what separates a registry
> from a credit score."**

---

## 2:40 — 3:00 · Close

Back to the dashboard, or the deck's title.

> **"Ninety-five tests, eight of them against the deployed contracts on a
> forked chain. Six contracts live on CC3 Testnet. The forgery is in the
> repository and it runs against the real prover."**

> **"Verify once. Underwrite everywhere."**

Hold on the URL for two seconds. End.

---

## If something fails on camera

**The prover returns 404** — the block isn't attested yet. Use a different
take's hash, or say so and move to the pipeline section.

**`ReserveAssetMismatch`** — should not happen. Discovery now prefers a
repayment whose reserve matches the pinned asset, because roughly one in six on
Sepolia settles in some other token and the registry correctly refuses those. If
you see it, the scanner found no USDC repayment in its window; rerun.

**The naive consumer prints ALREADY CONSUMED** — that hash was used in an
earlier take. Switch hashes. This is the guard working correctly, not a
refutation, and the script now says so.

**The registry ACCEPTS the forged proof** — stop. That refutes the claim, and
the honest response is to withdraw it from every surface rather than reshoot.
It has not happened in any run so far.

---

## What is on screen, and where it came from

Say any of these if a judge asks; all are checkable during the video.

| Claim | Source |
|---|---|
| Lookalike emitter | `0xBB0C0BeAF600B205d44f267E0D7586A543f609CF` on Sepolia |
| Naive consumer | `0x791CbBCb6837F2eFbEbA77c7218C4695d3e17e82` on CC3 |
| Registry | `0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329` on CC3 |
| Proven subject | `0x83900c0EDA960A31899d51aae9B9C180A7e21711` |
| 1,202 gas per read | `Gas.t.sol`, measured not estimated |
| 95 tests | `forge test` |
| 8 live tests | `forge test --match-contract LiveTest --fork-url …` |
