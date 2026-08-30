# End-to-end tests

Playwright, against a running frontend and a seeded registry.

```bash
npm --prefix tests/e2e exec playwright test
```

## Journeys worth covering

1. **Connect and see nothing.** An address with no proofs shows UNKNOWN, not a
   zero score. The distinction is the protocol's central honesty and the UI must
   not quietly collapse it.
2. **Watch a fact land.** Request verification, see the pipeline stages, see
   standing appear. This is the flow that justifies the relayer status endpoint
   existing at all.
3. **One fact, three consumers.** The same proven repayment lowering collateral,
   opening an access gate, and leaving the DEX fee unchanged because that reads
   a different fact type.
4. **A tier that cannot fall.** Reload after new facts; the tier only ever rises.

## The trap

Every one of these journeys can be faked with seeded data. A passing e2e suite
against a registry seeded through a mock precompile proves the frontend works
and proves nothing about the protocol. Keep the two claims separate when
reporting.
