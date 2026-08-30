# Seeding

Populating a local or testnet registry with facts, for demos and for developing
the frontend against something that is not empty.

## Against a real proof flow

The honest path. Pick an Ethereum address with real Aave history, point the
indexer at it, and let the relayer prove its facts. Slow, and it is the only
seeding that exercises the thing the submission actually claims.

```bash
SEED_ADDRESS=0x... npm --prefix services/indexer run seed
```

## Against a mocked precompile

For frontend work, where waiting on the real proof builder is a tax on every
iteration. Deploy the registry to a local Anvil node with the mock verifier
etched at `0x...0FD2`, then submit fixtures.

This is **development only** and the distinction matters: a registry seeded this
way contains facts that were never proven. It must never be pointed at anything
a person would read as real standing.

## What not to seed

Never seed a passport directly. The passport is a pure function of the registry
and holds no state of its own, so writing to it would require inventing a write
path that does not exist -- and that write path would be the exact hole the
monotonicity guarantee depends on not having.
