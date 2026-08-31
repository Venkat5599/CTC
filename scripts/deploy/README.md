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


## Choosing a source chain

`ConfigureSources` takes a `SOURCE` flag, and both options can be run against
the same registry -- they write different rows, so a registry can serve a live
Sepolia demo and hold proven mainnet history at the same time.

```bash
# Sepolia (chainKey 1). Lets you trigger a repayment on demand.
SOURCE=sepolia VOUCH_REGISTRY_ADDRESS=0x... forge script   packages/contracts/script/ConfigureSources.s.sol:ConfigureSources   --rpc-url creditcoin_testnet --broadcast

# Ethereum mainnet (chainKey 3). Read-only, free, and what PRD M1 asks for.
SOURCE=mainnet VOUCH_REGISTRY_ADDRESS=0x... forge script   packages/contracts/script/ConfigureSources.s.sol:ConfigureSources   --rpc-url creditcoin_testnet --broadcast
```

### Which to use

**Sepolia** is the demo chain. You control it, so you can borrow and repay on
camera and watch standing appear, which no amount of pre-proven history conveys
as well.

**Mainnet** is the credibility chain. Nothing is deployed there and no
transaction is sent -- the relayer only calls `eth_getLogs`, which is the same
access a block explorer has. It costs a free-tier RPC key and nothing else.

Running only Sepolia is a defensible choice, but it is worth knowing what it
gives up: PRD M1 asks for real mainnet history specifically, and a competing
submission already claims a live testnet loop. Proving a 2023 mainnet repayment
that the submitter has no control over is the harder claim, and it is the one
that separates the two.

Note the pool addresses differ between chains. Aave V3 on Sepolia is a separate
deployment, so reusing the mainnet address would match no logs and the source
would look permanently quiet rather than misconfigured.

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
