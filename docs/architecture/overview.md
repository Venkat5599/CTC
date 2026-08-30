# Overview

Vouch is a shared standing registry for Creditcoin.

```
   Ethereum                     Creditcoin
      |                             |
  real activity                     |
      |                             |
      v                             |
  ATTESTCOIN  --- proof --->   VOUCH REGISTRY
                                    |
                        +-----------+-----------+
                        v           v           v
                     Lending       DEX        Gaming
```

Attestcoin proves the fact. Vouch makes the fact reusable. Applications decide
what the fact is worth.

---

## The claim

CrossCredit and Spark both demonstrate cross-chain credit on Creditcoin. A
working Attestcoin integration is therefore table stakes rather than a
differentiator. The argument for Vouch is structural:

> They are *one application consuming cross-chain history*. Vouch is *the shared
> layer many applications consume*.

That is testable rather than rhetorical, so it is tested:
`test_oneFactThreeUnrelatedConsumers` proves one Aave repayment granting three
different benefits from three contracts that share no storage, were never
registered anywhere, and do not know each other exists.

---

## Why a registry rather than an application

Attestcoin verification is priced against repetition — roughly
`2.3e-5 + 2.9e-7 * continuityHashCount` CTC per proof. Every application that
verifies the same history pays again.

Vouch verifies once and stores canonically. The first consumer pays; every
subsequent consumer reads an `SLOAD`. Measured: a consumer read is flat
regardless of how many came before it, and 75 consumer reads trigger zero
precompile calls.

---

## The components

| Layer | What it is |
|---|---|
| `VouchRegistry` | The ASC. Sole writer of verified facts. Permissionless submission. |
| `VouchPassport` | Aggregation. Holds no state; a pure function of the registry. |
| `VouchCredit` / `VouchFeeTier` / `VouchAccess` | Three unrelated consumers, proving the thesis. |
| `services/indexer` | Finds candidate facts on the source chain. Decides nothing. |
| `services/relayer` | Batches, proves, submits. Untrusted; affects liveness only. |
| `packages/sdk` | One call: `hasProof(user, factType)`. |

---

## The integration

```solidity
if (IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)) {
    collateralBps = 11_500; // 115% instead of 150%
}
```

No ASC to write, no off-chain worker to run, no proof gas to pay.

---

## Further reading

- [`registry.md`](./registry.md) — the contract layer
- [`relayer.md`](./relayer.md) — the off-chain pipeline
- [`data-flow.md`](./data-flow.md) — event to standing, end to end
- [`../security/threat-model.md`](../security/threat-model.md) — S1, S2, S3
- [`../security/assumptions.md`](../security/assumptions.md) — the honest limitation
- [`../benchmarks/results.md`](../benchmarks/results.md) — measured numbers
