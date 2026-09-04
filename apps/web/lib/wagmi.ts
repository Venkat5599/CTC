'use client';

import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

import { creditcoinTestnet } from './viem';

/**
 * Two chains, and they do different jobs.
 *
 * Creditcoin is where the registry lives and where every read happens. Those
 * reads are public view calls, so the app never needs a wallet to be on this
 * chain -- or to exist at all.
 *
 * Sepolia is the SOURCE chain. A wallet is required here and only here,
 * because creating new standing means actually performing an activity on
 * another chain: there is nothing to prove until a real transaction exists.
 * That asymmetry is the product, not a limitation, so the wallet is scoped to
 * the one action that genuinely needs it.
 */
export const wagmiConfig = createConfig({
  chains: [creditcoinTestnet, sepolia],
  connectors: [injected()],
  transports: {
    [creditcoinTestnet.id]: http(),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC),
  },
  ssr: true,
});

export const SOURCE_CHAIN_ID = sepolia.id;
