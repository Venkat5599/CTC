# Contract verification

Publishing source for the deployed contracts, so a judge can read what is
actually running rather than trusting a README.

```bash
forge verify-contract <address> VouchRegistry \
  --chain-id 102031 \
  --verifier blockscout \
  --verifier-url https://creditcoin-testnet.blockscout.com/api \
  --constructor-args $(cast abi-encode "constructor(address)" <admin>)
```

Every contract, in dependency order: `VouchRegistry`, `VouchPassport`,
`VouchCredit`, `VouchFeeTier`, `VouchAccess`.

## Constructor arguments

`VouchRegistry` takes an admin. `VouchPassport` takes the registry.
`VouchCredit` takes the registry and the passport. `VouchFeeTier` takes the
registry. `VouchAccess` takes the registry, a fact type and a minimum count.

Note that the consumers take the registry address and the registry takes nothing
from them. That asymmetry is the design: the registry does not know its
consumers exist, which is what lets a fourth one deploy tomorrow without asking
anybody.

## What verification proves, and what it does not

It proves the deployed bytecode matches this source. It says nothing about
whether the SOURCES are configured correctly, which is the part that fails
silently. Verify the contracts, then check `registeredFactTypes()` and read each
one back against a real receipt.
