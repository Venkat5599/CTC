# Integration tests

Flows that cross a package boundary and need real infrastructure.

```bash
npm run infra:up
npm --prefix tests/integration test
```

## What belongs here

- Indexer discovery through relayer batching to a submitted transaction, against
  a local Anvil node with the mock verifier etched at `0x...0FD2`.
- Prisma schema round-trips: a fact written and read back with its uint256 values
  intact as decimal strings.
- The SDK reading a registry that a relayer just wrote to.

## What does not

Anything that would pass with a mocked chain client. That belongs in a unit test
next to its module, where it runs in milliseconds instead of requiring Docker.

## The one that matters most

The end-to-end claim is: a real Ethereum mainnet address with real Aave history
produces verified standing on CC3 Testnet. Until that runs against the actual
Attestcoin precompile rather than a mock, every test in this repository is
testing an architecture rather than a working system. That gap is the largest
open risk in the project and it is named here so it stays visible.
