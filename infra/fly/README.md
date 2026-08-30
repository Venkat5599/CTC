# Deploying the services

```bash
fly deploy --config infra/fly/relayer.toml
fly deploy --config infra/fly/indexer.toml
```

## Secrets

Set before the first deploy. None of them are in the repo, and the CI secret
scan fails the build if one ever is.

```bash
fly secrets set --app vouch-relayer \
  DATABASE_URL="postgres://..." \
  ETH_MAINNET_RPC="https://..." \
  CREDITCOIN_RPC="https://rpc.cc3-testnet.creditcoin.network" \
  PROOF_BUILDER_URL="https://proof-gen-api.cc3-testnet.creditcoin.network" \
  VOUCH_REGISTRY_ADDRESS="0x..." \
  CREDITCOIN_PRIVATE_KEY="0x..."
```

## About that private key

It pays gas and grants nothing else. The registry reads every subject from the
proven log, so an attacker holding this key can submit proofs, stall, or censor
which facts get submitted and when. All three are liveness problems, and all
three are fixable by anyone running their own relayer, because `submitBatch` is
permissionless.

What they cannot do with it is mint standing for themselves or forge a fact.
That is worth being precise about, because it is the difference between a hot
key that needs a vault and one that needs a funded testnet account.

Fund it modestly. It should hold enough CTC to submit for a few days and no
more.

## Restarting the relayer

Safe at any moment, but not free. It holds an in-memory queue of discovered
facts that have not yet been batched, and a restart drops those back to being
rediscovered on the next pass. Nothing is lost; a few minutes of latency is
spent. Prefer restarting when the queue is shallow:

```bash
curl https://vouch-relayer.fly.dev/ready
```

## Restarting the indexer

Whenever. Its cursor is in Postgres and every pass re-reads an overlap behind
it.
