# Deployment

Two steps, deliberately separate.

```bash
# 1. Contracts
forge script packages/contracts/script/Deploy.s.sol:Deploy \
  --rpc-url creditcoin_testnet --broadcast --verify

# 2. Sources
VOUCH_REGISTRY_ADDRESS=0x... forge script \
  packages/contracts/script/ConfigureSources.s.sol:ConfigureSources \
  --rpc-url creditcoin_testnet --broadcast
```

## Why the split

Everything `ConfigureSources` writes is a trust decision, and every one of them
fails **silently** when wrong:

| Wrong value | What happens | What you see |
|---|---|---|
| `topic0` | Matches no logs | Registry looks empty |
| `emitter` | Matches no logs | Registry looks empty |
| `chainKey` | Trusts a different chain | Faucet transactions credited as real history |
| `subjectTopicIndex` | Pins the wrong address | Someone else's history on your wallet |

Nothing reverts in any of those cases. So source registration is a separate,
deliberate step that a human runs after checking the values against a real
receipt from the source chain.

## chainKey is not chainId

On CC3 Testnet, `1` is Sepolia and `3` is Ethereum mainnet. On CC3 Mainnet, `1`
is Ethereum mainnet. The same number means a different chain depending on which
Creditcoin network you are on, which is why `@vouch/config` gives the two
incompatible branded types and why this value is never copied between
environments.

Read it from the ChainInfo precompile (`0x...0fd3`), never from memory.

## After deploying

Record the addresses in `packages/config/src/chains.ts` under `DEPLOYED`, and in
the README. Consumers read `null` as "not deployed" rather than substituting a
zero address, which would read as a contract that exists and answers false to
everything.
