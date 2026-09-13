# Demo script — the website walkthrough

**Target 2:30.** Spoken lines are in bold. Everything else is a click or a
hover. Nothing on this run submits a transaction — every panel below is a
live read, so the demo works without a signature.

The entire video is the deployed website. No terminal, no slides, no
repository. If a panel comes up blank, that is the product being honest —
say so and move on rather than narrating a number that is not there.

---

## Before you press record

**1. Deploy is on `master`.** The live URL is
`https://ctc-web-coral.vercel.app` and rebuilds on every push.

**2. Wallet.** MetaMask (or any injected wallet) with Creditcoin CC3 Testnet
added, so **Connect wallet** succeeds — you will *not* be signing anything.
Chain id is 102031; the site adds and switches the network on connect.

**3. Browser.** 1440×900, one tab, bookmarks bar hidden. Dark theme is the
default and is the theme the interface is designed against.

**4. Warm once.** Open the site, click **/dashboard → Load demo borrower**
and confirm it shows *Verified facts 1* and *Standing Tier 1*. If it shows
*Registry read failed*, reload — that is a public-RPC hiccup, not a broken
registry. Then refresh the tab so the first frame on camera is the landing.

---

## 0:00 — 0:15 · Landing

Open `https://ctc-web-coral.vercel.app`. Do not scroll for a moment; let the
hero settle.

> **"Every credit decision on Creditcoin starts with somebody's word. This
> one starts with a proof."**

Point at the headline, then the sub-headline.

> **"Underwrite the proof, not the claim. A shared standing registry: one
> Attestcoin proof of what a borrower actually did on another chain, stored
> once, and readable from any contract for the cost of a storage read."**

Hover the **Connect wallet** button in the top right. Click it and let the
wallet approve; the button flips to the truncated address.

> **"Wallet is in — no signature yet. Every number you'll see is a live read
> off Creditcoin CC3."**

---

## 0:15 — 0:35 · The finding

Scroll down one screen to **"Three ways a valid proof lies, each one
silent"**. Stop on the middle card — S2.

> **"This is the finding the project rests on. A valid Attestcoin proof can
> still be a lie."**

> **"An attacker deploys a contract that emits Aave's Repay event — byte for
> byte, same signature, same field layout — naming themselves. The
> transaction succeeds. The prover proves it. And it proves it correctly,
> because the transaction really is in that block."**

> **"Only one thing separates that from a real repayment: the pinned emitter
> address. Miss that check and a valid proof is a lie."**

---

## 0:35 — 1:00 · Dashboard — what an address can prove

Click **Dashboard** in the sidebar, then click **Load demo borrower**.

> **"This is the underwriting console. Every number here is a live call to
> Creditcoin, or it is blank. There is no sample data in this product."**

Read the four figures as they settle: **Verified facts 1**, **Standing Tier
1**, **Consumers deployed 5**, **Registry read 1,202 gas**.

> **"Tier 1, off one real repayment. Five contracts on this chain already
> read that entry. And a read costs twelve hundred and two gas — flat,
> whoever asks and however often."**

Hover slowly through the fact panel below (subject, source transaction,
source block, emitter, log index, chain key, fact id).

> **"One entry, and every field of it comes off the chain."**

---

## 1:00 — 1:25 · Proofs — what the registry asked first

Click **Proofs** in the sidebar, then click **Load an address with a real
proven fact**.

> **"Before the registry believed anything, it asked four questions. The
> precompile answers the first one — the transaction is included in a block
> on the confirmed source chain. It answers that correctly."**

Hover the emitter, log index, and chain key fields in order.

> **"It does not answer whether the transaction succeeded. It does not
> answer who emitted the log inside it. And it does not answer whether this
> same log has already been submitted."**

Scroll to the **Proof integrity** panel.

> **"Same proof bytes into two contracts. A naive consumer credited a
> million dollars that never moved. This registry rejected it. Performed
> live on Sepolia against the real prover, not simulated."**

---

## 1:25 — 2:00 · Credit — one fact, five consumers, one calculator

Click **Credit** in the sidebar, then click **Load an address with a real
proven fact**.

> **"One proven fact, five consumers, and none of them registered with
> anything. Each asks the registry its own question."**

Read the terms as they change: **VouchCredit 150% → 130%**, **VouchReceivables
70% → 80%**, the access gate open.

Then scroll to **VouchFeeTier** and stop on **0.30%**.

> **"And the exchange fee does not move. Not by a basis point. It reads a
> different fact type, so a repayment cannot touch it. Standing does not
> leak between domains — that is what separates a registry from a credit
> score."**

Scroll down one section to **Financing calculator**. Click the **$10,000**
preset.

> **"And this is what an issuer sees. Ten thousand dollar invoice against
> this supplier — advanceFor is called against the deployed receivables
> facility, retentionFor beside it. The registry decided the terms; the
> calculator renders what the contract would pay on drawdown, live."**

Click the **$100,000** preset. Watch the advance and retention update.

> **"Same math, one order of magnitude larger. The number is real."**

---

## 2:00 — 2:20 · Verify — the surface, without submitting

Click **Verify** in the sidebar. Do not paste anything; hover the
**Verify this address** button, the source-event panel and the four numbered
steps (discovery → proof → simulation → submit).

> **"This is the honest path in production: paste any Sepolia address,
> the site scans for an Aave repayment, calls the Attestcoin prover, and
> simulates against the registry before asking your wallet for anything."**

Hover the *submitBatch* step.

> **"On a real run, step four is the only signature — permissionless, and
> the subject is read from the proven log, not from the sender. Nothing
> here needs a privileged key."**

Scroll down to the **One fact, every consumer** table.

> **"And the moment a fact lands, every consumer reads it. No registration,
> no proof gas, no relationship with the registry at all."**

---

## 2:20 — 2:30 · Close

Scroll to the **Proof integrity** panel at the bottom of the page.

> **"A valid proof can still be a lie. Every team in this field can consume
> an Attestcoin proof. This is the layer that notices when the proof is
> genuine and the fact is not."**

> **"Verify once. Underwrite everywhere."**

Hold on the URL for two seconds. End.

---

## If something fails on camera

**"Registry read failed"** on a panel that held data a minute ago — the
public CC3 RPC refused that call. Reload the page. If it persists, cut to
a different panel rather than narrating a blank.

**Ledger metrics on Borrowers and Registry take about forty-five seconds.**
Those two panels rebuild the registry's whole event history through CC3's
public RPC, which answers log queries slowly. The flow above never needs
them — do not stand on those two pages waiting.

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
| Proof integrity: accepted / rejected on identical bytes | performed live on 2026-09-05 against the real prover |

The three addresses worth having to hand, if asked:

| | |
|---|---|
| Registry (v2, CC3 Testnet) | `0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46` |
| Passport | `0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6` |
| Block Prover precompile | `0x0000000000000000000000000000000000000FD2` |

---

## Never say, never show

- **"142 tests."** The suite reports 128. The landing page says 128 and
  points at `forge test`.
- **The console illustration on the landing page.** It shows an example
  address (`0x8f3a…c21b`), four facts and a Bronze tier. It is a drawn
  illustration of the product, not a read. Do not point at it while quoting
  product numbers.
- **"Reviews", "customers", "partners".** There are none, and the site no
  longer claims any.
- **Anything about grant or prize logistics.**
