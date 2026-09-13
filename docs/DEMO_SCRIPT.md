# Demo script — the website walkthrough

**Target 3:00.** Spoken lines are in bold. Everything else is a click.

The entire video is the deployed website. No terminal, no slides, no repository.
Every figure on screen is a live read of Creditcoin CC3 or it is absent, so if a
panel comes up blank, that is the product being honest — say so and move on
rather than narrating a number that is not there.

---

## Before you press record

**1. Deploy current `master` first.** The commit that ships with this script
(`d12f333` and later) adds three things you will show on camera: address-driven
verification on `/verify`, a live receivables calculator on `/credit`, and a
"Your recent submissions" panel on `/dashboard`. Any earlier deployment is
missing them.

**2. Wallet.** MetaMask (or any injected wallet) with Creditcoin CC3 Testnet
added, CTC in it for gas, and Ethereum Sepolia added too (you never send from
it — the site only reads Sepolia to find repayments). Chain id is 102031; the
site's **Connect wallet** button adds and switches the network for you.

**3. Browser.** 1440×900, one tab, bookmarks bar hidden. Dark theme is the
default and is the theme the interface is designed against.

**4. Warm the flow once, then reset.** Open the site, then:

- **/dashboard** → click **Load demo borrower**. It must show *Verified facts 1*
  and *Standing Tier 1*. If it shows *Registry read failed*, stop — that means
  a public-RPC read was refused, not that the registry is down. Reload.
- **/verify** → paste any Sepolia address you know has Aave activity (yours, or
  the demo address `0x2d39338894d7d3be4908d6fbfc3500440c788f01`), connect the
  wallet, click **Verify this address**, confirm in the wallet, let the run
  land. If the address you chose has no unproven repayment, the page tells you
  the exact block range it scanned; try another address, or leave the input
  blank and let the scanner pick anyone. Reset before the take.

**5. Have open:** the site in one tab, wallet unlocked. Nothing else on screen.

---

## 0:00 — 0:18 · Landing

Open `https://vouch-registry.vercel.app`. Do not scroll for a moment; let the
hero settle.

> **"Every credit decision on Creditcoin starts with somebody's word. This one
> starts with a proof."**

Point at the headline, then the sub-headline.

> **"Underwrite the proof, not the claim. A shared standing registry: one
> Attestcoin proof of what a borrower actually did on another chain, stored
> once, and readable from any contract for the cost of a storage read."**

The top-right button now reads **Verify an address**. Point at it.

> **"And in a moment I'll click that against an address on the internet."**

---

## 0:18 — 0:40 · The finding

Scroll down one screen to **"Three ways a valid proof lies, each one silent"**.
Stop on the middle card — S2.

> **"This is the finding the project rests on. A valid Attestcoin proof can
> still be a lie."**

> **"An attacker deploys a contract that emits Aave's Repay event — byte for
> byte, same signature, same field layout — naming themselves. The transaction
> succeeds. The prover proves it. And it proves it correctly, because the
> transaction really is in that block."**

> **"Only one thing separates that from a real repayment: the pinned emitter
> address. Miss that check and a valid proof is a lie."**

Do not read the test names aloud; they are on screen for anyone who wants them.

---

## 0:40 — 1:05 · Dashboard — what an address can prove

Click **Dashboard** in the sidebar, then click **Load demo borrower**.

> **"This is the underwriting console. Every number here is a live call to
> Creditcoin, or it is blank. There is no sample data in this product."**

Read the four figures as they settle: **Verified facts 1**, **Standing Tier 1**,
**Consumers deployed 5**, **Registry read 1,202 gas**.

> **"Tier 1, off one real repayment. Five contracts on this chain already read
> that entry. And a read costs twelve hundred and two gas — flat, whoever asks
> and however often. The tenth application to ask pays what the first one
> paid."**

Scroll slowly through the fact panel below (subject, source transaction, source
block, emitter, log index, chain key, fact id).

> **"One entry, and every field of it comes off the chain."**

If a **Your recent submissions** panel is visible from the warm-up run, point
at it briefly.

> **"And this browser remembers every submission it has ever sent — reconciled
> against Creditcoin every time the page loads, so a pending row cannot lie
> about a receipt that already landed."**

---

## 1:05 — 1:30 · Proofs — what the registry asked first

Click **Proofs** in the sidebar, then click **Load an address with a real
proven fact**.

> **"Before the registry believed anything, it asked four questions. The
> precompile answers the first one — the transaction is included in a block on
> the confirmed source chain. It answers that correctly."**

Point at the fields in order: emitter, log index, chain key.

> **"It does not answer whether the transaction succeeded. It does not answer
> who emitted the log inside it. And it does not answer whether this same log
> has already been submitted."**

Scroll to **"The three checks an integration must not skip"**.

> **"Those are S1, S2 and S3. Each one is a revert inside the write, not a
> warning — which is why a fact existing in this registry is itself the
> evidence that all of them passed."**

Stop on the **Proof integrity** panel beside it.

> **"Same proof bytes into two contracts. A naive consumer credited a million
> dollars that never moved. This registry rejected it. Performed live on
> Sepolia against the real prover, not simulated."**

---

## 1:30 — 2:00 · Credit — one fact, five consumers, one calculator

Click **Credit** in the sidebar, then click **Load an address with a real
proven fact**.

> **"One proven fact, five consumers, and none of them registered with
> anything. Each asks the registry its own question."**

Read the terms as they change: **VouchCredit 150% → 130%**, **VouchReceivables
70% → 80%**, the access gate open.

Then scroll to **VouchFeeTier** and stop on **0.30%**.

> **"And the exchange fee does not move. Not by a basis point. It reads a
> different fact type, so a repayment cannot touch it. Standing does not leak
> between domains — that is what separates a registry from a credit score."**

Scroll down one section to **Financing calculator**. Type **10000** into the
face-value input, or click the **$10,000** preset.

> **"And this is what an issuer sees. Ten thousand dollar invoice against this
> supplier — advanceFor is called against the deployed receivables facility,
> retentionFor beside it. The registry decided the terms; the calculator is
> just rendering what the contract would pay on drawdown, live."**

Change the preset to **$100,000**. Watch the advance and retention update.

> **"Same math, one order of magnitude larger. The number is real, and no
> underwriter here is guessing it."**

---

## 2:00 — 2:45 · Verify — the live run against any address

Click **Verify** in the sidebar. Click **Connect wallet** and approve the
network switch if the wallet asks.

Paste a Sepolia address you have never touched. If you don't have one on hand,
grab one from a recent Sepolia Aave transaction — the point is that the
demonstration works on somebody else's history, not yours. Or leave the input
blank and let the scanner pick.

> **"Now the honest path, with nothing pre-baked. I'm handing this page an
> address off the internet — nobody here controls it — and asking the site to
> find one of their Aave repayments."**

Click **Verify this address** (or **Prove any repayment** if the input is
blank). While steps 01–03 run, stay quiet and let the source-event panel fill:
transaction, block, emitter, subject, receipt status, log index.

> **"A real repayment, at a real block, on a chain nobody here controls."**

When the Attestcoin proof lands:

> **"And there is the proof — the continuity roots the prover returned,
> verified by the Block Prover precompile."**

Read the root count off the screen if you want to name it; it varies per
transaction (23 in one run, 32 in another), so do not say a number you are not
looking at.

The site now runs a **simulation** against the registry before asking your
wallet for anything. If the simulation reverts, the page names the exact
custom error — say so and move on rather than clicking through.

> **"The site simulates the write first. If the registry would reject it, we
> see the reason before spending gas."**

Confirm the wallet prompt when step 04 asks. (Say nothing while it is open.)

> **"The submission is permissionless. The subject is read from the proven log,
> never from the sender — so submitting gains me nothing, and no key of ours
> is anywhere in this."**

When the before/after figures appear:

> **"Zero facts before. One after. Permanently. And notice — the fact was
> written for the *borrower*, not for the address that paid gas."**

Let the **One fact, every consumer** table fill underneath.

> **"And every consumer reads it immediately. No registration, no proof gas,
> no relationship with the registry at all."**

Point at the two links at the bottom of the section.

> **"From here I can run underwriting on this address, or open the full
> verification trace. Same address the wallet just signed for."**

---

## 2:45 — 3:00 · Close

Scroll to the **Proof integrity** panel at the bottom of this page.

> **"A valid proof can still be a lie. Every team in this field can consume an
> Attestcoin proof. This is the layer that notices when the proof is genuine
> and the fact is not."**

> **"Verify once. Underwrite everywhere."**

Hold on the URL for two seconds. End.

---

## If something fails on camera

**"No unproven Aave repayment found for 0x…"** — this address either has no
Aave history on Sepolia in the last ~200k blocks, or every match is already on
Vouch. Try another address, or clear the input and click **Prove any
repayment** to let the scanner pick.

**"The registry has already recorded this log"** — the simulation caught a
replay before you spent gas. Say so plainly: *"That's the replay guard
working — this log has already been proven, so the same proof cannot be
submitted twice."* Then paste a different address, or reset and try again.

**A custom error name in red** (`EmitterMismatch`, `ReceiptStatusFail`,
`ReserveAssetMismatch`) — the registry rejected the claim. That is the system
working. The one-line explanation on screen is the exact reason. Move on.

**"You rejected the request in your wallet"** — you closed the wallet prompt.
Click **Run** again and confirm.

**"Registry read failed"** on a panel that held data a minute ago — the public
CC3 RPC refused that call. Reload the page. If it persists, cut to a different
panel rather than narrating a blank.

**The prover refuses the transaction** — the source block is not attested yet.
Try a different address (its repayments are likely older) or run again;
discovery reaches further back each time.

**Ledger metrics on Borrowers and Registry take about forty-five seconds.**
Those two panels rebuild the registry's whole event history through CC3's
public RPC, which answers log queries slowly. The panels load correctly, then,
and they are all-or-nothing, so a failed chunk renders "unavailable" rather
than a half-drawn ledger. Do not stand on those two pages on camera waiting
for them: the flow above never needs them.

---

## What is on screen, and where it came from

Say any of this if a judge asks. Every line is checkable from the video
itself.

| On screen | Read live from |
|---|---|
| Verified facts **1**, Standing **Tier 1** | `hasProof` / `proofCount` / `totalProofs` on the registry, plus the passport tier |
| Registry read **1,202 gas** | measured in `Gas.t.sol`, not estimated |
| Consumers deployed **5** | counted from the configured consumer addresses |
| Fact panel (subject, tx, block, emitter, log index, chain key, fact id) | `getFact` on the registry |
| Consumer terms 150% → 130%, 70% → 80%, gate open | `collateralBpsFor`, `advanceRateBpsFor`, `isAdmitted` |
| Exchange fee **unchanged at 0.30%** | `feeBpsFor`, which reads `LONG_TERM_LP` — a different fact type |
| Financing calculator (advance / retention / rail status) | `advanceFor(supplier, faceValue)`, `retentionFor(...)`, `fundedRail()`, `liquidity()` on the receivables facility |
| Verify: discovery, proof, simulation, receipt, before/after | `/api/prove?subject=…` (real Sepolia log scan + real Attestcoin proof builder), `simulateContract` against the registry, then your own wallet's `submitBatch` |
| Your recent submissions panel | localStorage per wallet, reconciled against Creditcoin on load |
| Proof integrity: accepted / rejected on identical bytes | performed live on 2026-09-05 against the real prover |

The three addresses worth having to hand, if asked:

| | |
|---|---|
| Registry (v2, CC3 Testnet) | `0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46` |
| Passport | `0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6` |
| Block Prover precompile | `0x0000000000000000000000000000000000000FD2` |

---

## Never say, never show

- **"142 tests."** The suite reports 128. The landing page says 128 and points
  at `forge test`.
- **The console illustration on the landing page.** It shows an example
  address (`0x8f3a…c21b`), four facts and a Bronze tier. It is a drawn
  illustration of the product, not a read. Do not point at it while quoting
  product numbers.
- **"Reviews", "customers", "partners".** There are none, and the site no
  longer claims any.
- **The footer's external links.** They leave the product for the repository;
  keep the video inside the app.
- **A hardcoded borrower on the live run.** `/verify` accepts any address on
  purpose. Do not paste the demo address twice — the replay guard will reject
  the second submission on camera, and the argument is that this works for
  addresses the operator has never seen.
- **Anything about grant or prize logistics.**
