# CONTINUE — session handoff

**Read this first in a new session.** Written 2026-09-01. Deadline **2026-09-13 23:59 ET** (12 days).

---

## 1. What this is

**Vouch** — verified borrower history on Creditcoin, proven through the Attestcoin Protocol rather than asserted by an operator. Submission for BUIDL CTC 2026 Fall.

- **Track:** RWA
- **Customer:** the credit issuer, not the borrower
- **Headline claim:** *a valid Attestcoin proof can still be a lie — and we prove it live*

Canonical docs, both current as of v3.0:
- `docs/PRD.md` — positioning, goals, milestones, judging alignment
- `docs/ARCHITECTURE.md` — system design, §7 security, §7.6 the adversarial harness

Read `docs/PRD.md` §2 before doing anything. It explains why v3.0 exists.

---

## 2. Where things stand

**Built, deployed, working.** Milestones M1–M8 are done. Contracts are live on CC3 Testnet, one real Sepolia Aave repayment has been proven end to end through the real Block Prover precompile, three consumers read one registry, S1/S2/S3 are implemented and tested, and the frontend is deployed.

### Deployed — CC3 Testnet (chainId 102031)

| Contract | Address |
|---|---|
| VouchRegistry | `0xb6e0497dfd8fdbffb25f6ae3dc8104c46bbe8329` |
| VouchPassport | `0xbfb2e062cc9098a68c60cb00d9f0731aab7cb20a` |
| VouchCredit | `0x68e495fd8d43ff1aa443eb0689f4f2f5cccb3622` |
| VouchFeeTier | `0xf1ed0bc7a5f9dd5aa98cf5b63a2a51ecf70f3bd8` |
| VouchAccess | `0x46ecf42ff86e564fe4ffa086451a6f9dbd8f64be` |
| Block Prover precompile | `0x0000000000000000000000000000000000000FD2` |
| ChainInfo precompile | `0x0000000000000000000000000000000000000fd3` |

### The one address with a real proven fact

```
0x83900c0EDA960A31899d51aae9B9C180A7e21711
```

Reads live, and this is the demo:

| call | returns | why it matters |
|---|---|---|
| `registry.totalProofs` | `1` | one real Sepolia Aave repayment |
| `passport.tierOf` | `1` | Tier 1 |
| `credit.collateralBpsFor` | `13000` | 130%, down from 150% |
| `access.isAdmitted` | `true` | gate open |
| `feeTier.feeBpsFor` | `30` | **0.30%, unchanged** |

The unchanged fee is the point: the exchange reads a different fact type, so a repayment cannot move it. Standing does not leak between facts.

### Live

- App: https://vouch-registry.vercel.app
- Vercel project is **`vouch-web`**, not `vouch-registry` (that is only an alias)

---

## 3. Do this next — day 1

**Prove one real Ethereum *mainnet* Aave repayment via `chainKey 3`.**

This is the riskiest unknown in the plan. Settle it before anything else. If it works, the demo gets real mainnet history, which no competing entry is likely to have. If it fails, fall back to Sepolia proofs and lose nothing but a day.

**Blocker:** `.env.local` has no Ethereum mainnet RPC. It currently holds only `ETH_SEPOLIA_RPC`. Add:

```
ETH_MAINNET_RPC=<any free Alchemy or Infura mainnet endpoint>
```

Then adapt `scripts/seed/prove-fact.mjs`, which currently hardcodes `CHAIN_KEY = 1` and the Sepolia Aave pool. Mainnet needs:
- `chainKey` **3** (already typed in `packages/config/src/chains.ts` as `ethereum`)
- Aave V3 mainnet Pool — **verify against the deployed contract, do not take from memory** (PRD Q2)

### Then days 2–3 — the forgery

Spec is in `docs/ARCHITECTURE.md` §7.6. Four pieces:

1. `SpoofEmitter.sol` on **Sepolia** — emits Aave's exact `Repay` signature
2. `NaiveConsumer.sol` on CC3 — checks `topic0` only
3. `VouchRegistry` — the real verifier
4. `scripts/attack/forge-fact.mjs` — proves the forged event, submits identical bytes to both

Assertions: naive accepts, Vouch reverts with `EmitterMismatch`.

**Forgery goes on Sepolia, never mainnet.** A mainnet contract whose only purpose is emitting convincing fake Aave events is a live artifact built to deceive third parties. `topic0` is not chain-specific so the demo is identical, and using both chainKeys proves the branded types are real.

---

## 4. Gotchas that already cost real time

Do not rediscover these.

- **`chainKey` is not `chainId`.** Attestcoin's own key space. On CC3 **testnet**: Sepolia = `1`, Ethereum mainnet = `3`. On CC3 **mainnet**: Ethereum mainnet = `1`. Passing a chainId does not revert — it proves against the wrong chain, silently. Branded types in `packages/config/src/chains.ts` exist to stop this.
- **`logIndex` is receipt-scoped, not block-scoped.** `eth_getLogs` returns a block-scoped index; the registry decodes a *receipt*, whose logs are numbered within that one transaction. Convert with `receipt.logs.findIndex(l => l.logIndex === log.logIndex)`. This produced a `LogIndexOutOfRange` (`0x4e729354`) revert that mocked tests could never catch, because the fixtures made both indices identical.
- **`evm_version = "london"`** in `foundry.toml`. CC3 is Frontier-based and has no PREVRANDAO; without this, deploys fail with `prevrandao not set`.
- **Attestcoin writability is NOT live on testnet.** Readability only. No cross-chain execution is possible for anyone this season.
- **Proofs are events and receipts only.** No state proofs, no view-call results, no balances. Ideas needing a balance or a price are not buildable.
- **Vercel: `unset VERCEL_API_TOKEN` before deploying.** The env var holds an OAuth token that passes `whoami` but is rejected by every project API. The CLI's own stored login works. Deploy from repo root:
  ```bash
  unset VERCEL_API_TOKEN && vercel deploy --prod --yes
  unset VERCEL_API_TOKEN && vercel alias set <deployment-url> vouch-registry.vercel.app
  ```
- **CSS: custom classes must live in `@layer components`.** Tailwind v4 emits utilities inside a cascade layer, and unlayered CSS beats every layered rule. An unlayered `.glass { position: relative }` silently overrode `fixed` on the sidebar for several deploys — markup looked correct, computed position was not.

---

## 5. Commands

```bash
# web
cd apps/web && bun run build          # must pass before deploying
cd apps/web && bunx tsc --noEmit -p tsconfig.json
cd apps/web && bun run start --port 3113

# contracts
cd packages/contracts && forge test
cd packages/contracts && forge build

# prove a real fact end to end
node scripts/seed/prove-fact.mjs
```

---

## 6. What NOT to do

- **Do not change the idea again.** It moved from a credit passport to an issuer primitive with an adversarial demo, and that is settled. Two entries this season (**CrossCredit**, **Spark**) already ship working cross-chain credit with real Attestcoin proofs — a working integration is table stakes, and the forgery is the differentiator.
- **Do not cut M10 (the forgery), M6 (security tests) or M2 (the second consumer).** They are the entire argument.
- **Do not fake data.** Every number on every surface is a live chain read. An invented figure on a protocol whose thesis is "stop taking claims on trust" destroys the submission.
- **Do not claim Creditcoin demand from Solana or Stellar data.** Those corpora informed positioning only. See PRD NG9.

---

## 7. Open items

- **M9** — deck and demo video. Only the user can record these.
- **PRD Q2** — pin the exact Aave V3 mainnet Pool address and `Repay` ABI against the deployed contract.
- **PRD Q1** — confirm the deadline in Discord `#buidl-ctc-qna`. The brief says 09-13; the AMA reportedly said 09-06.
- **Colosseum PAT** — was pasted into a chat log several times. Rotate it at https://arena.colosseum.org/copilot.
- Frontend has not been visually verified by the assistant in-browser (Chrome extension was not connected). All UI verification so far has been served HTML and CSS, not rendered pixels.

---

## 8. Recent commits

```
40829b3  docs: v3.0 — adversarial verification, issuer repositioning, RWA track
a8fff4e  web: one enterprise system across every page, and fix the unpinned sidebar
175bd9c  web: compose the dashboard as one frame instead of stacked bands
c087bb2  web: glass product surface over a lit substrate
8b30280  web: sidebar-only shell, explorer and docs routes, pipeline on dashboard
```
