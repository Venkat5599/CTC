# Demo script — the website walkthrough

**Target 2:50.** Spoken lines are in bold. Everything else is a click.

The entire video is the deployed website. No terminal, no slides, no repository.
Every figure on screen is a live read of Creditcoin CC3 or it is absent, so if a
panel comes up blank, that is the product being honest — say so and move on
rather than narrating a number that is not there.

---

## Before you press record

**1. Deploy current `master` first, with the uncommitted fixes in this tree.**
The deployment live today predates the commit that removed every claim the site
could not back, so it still shows **"4.9 from 48k+ reviews"** and **"142
passing"** on the landing page. There are no reviewers, and the suite reports
128. A captured frame of invented social proof undoes the argument this project
makes, so deploy before recording — and include the working-tree changes to
`apps/web`, which are what make the one-click lookups read the chain at all.

**2. Wallet.** MetaMask (or any injected wallet) with Creditcoin CC3 Testnet
added and CTC in it for gas. Chain id is 102031; the site's **Connect wallet**
button adds and switches the network for you.

**3. Browser.** 1440×900, one tab, bookmarks bar hidden. Dark theme is the
default and is the theme the interface is designed against.

**4. Warm the flow once, then reset.** Open the site, then:

- **/dashboard** → click **Load demo borrower**. It must show *Verified facts 1*
  and *Standing Tier 1*. If it shows *Registry read failed*, stop — that means an
  address literal in the bundle is failing viem's checksum check, not that the
  registry is down.
- **/create** → click **Run the demo** once, confirm in the wallet, let it land
  ("1 fact recorded, permanently"), then click **Reset**. This proves the wallet
  path works before the take, and consumes one Sepolia repayment so the take
  finds a different one.

Then click **Reset** again so the take starts from an empty sequence.

**5. Have open:** the site in one tab, wallet unlocked. Nothing else on screen.

---

## 0:00 — 0:18 · Landing

Open `https://vouch-registry.vercel.app`. Do not scroll for a moment; let the
hero settle.

> **"Every credit decision on Creditcoin starts with somebody's word. This one
> starts with a proof."**

Point at the headline, then the sub-headline.

> **"Underwrite the proof, not the claim. A shared standing registry: one
> Attestcoin proof of what a borrower actually did on another chain, stored once,
> and readable from any contract for the cost of a storage read."**

---

## 0:18 — 0:40 · The finding

Scroll down one screen to **"Three ways a valid proof lies, each one silent"**.
Stop on the middle card — S2.

> **"This is the finding the project rests on. A valid Attestcoin proof can still
> be a lie."**

> **"An attacker deploys a contract that emits Aave's Repay event — byte for
> byte, same signature, same field layout — naming themselves. The transaction
> succeeds. The prover proves it. And it proves it correctly, because the
> transaction really is in that block."**

> **"Only one thing separates that from a real repayment: the pinned emitter
> address."**

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
> and however often. The tenth application to ask pays what the first one paid."**

Scroll slowly through the fact panel below (subject, source transaction, source
block, emitter, log index, chain key, fact id).

> **"One entry, and every field of it comes off the chain."**

---

## 1:05 — 1:35 · Proofs — what the registry asked first

Click **Proofs** in the sidebar, then click **Load an address with a real proven
fact**.

> **"Before the registry believed anything, it asked four questions. The
> precompile answers the first one — the transaction is included in a block on
> the confirmed source chain. It answers that correctly."**

Point at the fields in order: emitter, log index, chain key.

> **"It does not answer whether the transaction succeeded. It does not answer who
> emitted the log inside it. And it does not answer whether this same log has
> already been submitted."**

Scroll to **"The three checks an integration must not skip"**.

> **"Those are S1, S2 and S3. Each one is a revert inside the write, not a
> warning — which is why a fact existing in this registry is itself the evidence
> that all of them passed."**

Stop on the **Proof integrity** panel beside it.

> **"And this is the same proof bytes into two contracts. A naive consumer
> credited a million dollars that never moved. This registry rejected it. That
> was performed live on Sepolia against the real prover, not simulated."**

---

## 1:35 — 2:00 · Credit decisions — one fact, five consumers

Click **Credit decisions** in the sidebar, then click **Load an address with a
real proven fact**.

> **"One proven fact, five consumers, and none of them registered with anything.
> Each asks the registry its own question."**

Read the terms as they change: **VouchCredit 150% → 130%**, **VouchReceivables
70% → 80%**, the access gate open.

Then scroll to **VouchFeeTier** and stop on **0.30%**.

> **"And the exchange fee does not move. Not by a basis point. It reads a
> different fact type, so a repayment cannot touch it."**

> **"Standing does not leak between domains. That is what separates a registry
> from a credit score."**

---

## 2:00 — 2:45 · Create standing — the live run

Click **Create standing** in the sidebar. Click **Connect wallet** and approve
the network switch if the wallet asks.

> **"Now the honest path, with nothing pre-baked. It is scanning Sepolia for
> somebody else's Aave repayment — somebody who has never heard of this project.
> That matters: a registry that can only record its own operator's transactions
> is a database with extra steps."**

Click **Run the demo**. While steps 01–03 run, stay quiet and let the source
event panel fill: transaction, block, emitter, subject, receipt status, log
index.

> **"A real repayment, at a real block, on a chain nobody here controls."**

When the Attestcoin proof lands:

> **"And there is the proof — the continuity roots the prover returned, verified
> by the precompile."**

Read the root count off the screen if you want to name it; it varies per
transaction (23 in one run, 32 in another), so do not say a number you are not
looking at.

Confirm the wallet prompt when step 04 asks. (Say nothing while it is open.)

> **"The submission is permissionless. The subject is read from the proven log,
> never from the sender — so submitting gains me nothing, and no key of ours is
> anywhere in this."**

When the before/after figures appear:

> **"Zero facts before. One after. Permanently."**

Let the **One fact, every consumer** table fill underneath.

> **"And every consumer reads it immediately. No registration, no proof gas, no
> relationship with the registry at all."**

---

## 2:45 — 3:00 · Close

Scroll to the **Proof integrity** panel at the bottom of this page.

> **"A valid proof can still be a lie. Every team in this field can consume an
> Attestcoin proof. This is the layer that notices when the proof is genuine and
> the fact is not."**

> **"Verify once. Underwrite everywhere."**

Hold on the URL for two seconds. End.

---

## If something fails on camera

**"No Aave repayment found on Sepolia…"** — the scanner walked its whole window
without a candidate. Click **Reset**, then **Run the demo** again.

**The submission reverts** — the registry's replay guard has already recorded
that exact log. Say so plainly: *"That's the replay guard working — this log has
already been proven, so the same proof cannot be submitted twice."* Then
**Reset** → **Run the demo**, which now skips the consumed repayment and finds
another.

**"Registry read failed"** on a panel that held data a minute ago — the public
CC3 RPC refused that call. Reload the page. If it persists, cut to a different
panel rather than narrating a blank.

**The prover refuses the transaction** — the source block is not attested yet.
**Run the demo** again; discovery reaches further back each time.

**Ledger metrics on Borrowers and Registry take about forty-five seconds.** Those
two panels rebuild the registry's whole event history through CC3's public RPC,
which answers log queries slowly. The panels load correctly, then, and they are
all-or-nothing, so a failed chunk renders "unavailable" rather than a half-drawn
ledger. Do not stand on those two pages on camera waiting for them: the demo
below never needs them.

---

## What is on screen, and where it came from

Say any of this if a judge asks. Every line is checkable from the video itself.

| On screen | Read live from |
|---|---|
| Verified facts **1**, Standing **Tier 1** | `hasProof` / `proofCount` / `totalProofs` on the registry, plus the passport tier |
| Registry read **1,202 gas** | measured in `Gas.t.sol`, not estimated |
| Consumers deployed **5** | counted from the configured consumer addresses |
| Fact panel (subject, tx, block, emitter, log index, chain key, fact id) | `getFact` on the registry |
| Consumer terms 150% → 130%, 70% → 80%, gate open | `collateralBpsFor`, `advanceRateBpsFor`, `isAdmitted` |
| Exchange fee **unchanged at 0.30%** | `feeBpsFor`, which reads `LONG_TERM_LP` — a different fact type |
| Live run: discovery, proof, receipt, before/after | `/api/prove` (real Sepolia log scan + real Attestcoin proof builder), then your own wallet's `submitBatch` |
| Proof integrity: accepted / rejected on identical bytes | performed live on 2026-09-05 against the real prover |

The two addresses worth having to hand, if asked:

| | |
|---|---|
| Registry (v2, CC3 Testnet) | `0xc5c70bc6cb61ad5c2370c69c8410d3d988e82d46` |
| Passport | `0xd9ac99ece77b6bd8c51c00ff4c42af9c212bf3a6` |
| Block Prover precompile | `0x0000000000000000000000000000000000000FD2` |

---

## Never say, never show

- **"142 tests."** The suite reports 128. The landing page says 128 and points at
  `forge test`.
- **The console illustration on the landing page.** It shows an example address
  (`0x8f3a…c21b`), four facts and a Bronze tier. It is a drawn illustration of
  the product, not a read. Do not point at it while quoting product numbers.
- **"Reviews", "customers", "partners".** There are none, and the site no longer
  claims any.
- **The footer's external links.** They leave the product for the repository;
  keep the video inside the app.
- **Anything about grant or prize logistics.**
