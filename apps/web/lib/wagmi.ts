'use client';

/**
 * Wallet configuration.
 *
 * The injected connector only. WalletConnect needs a project id and a hosted
 * relay, and this application never asks a wallet to sign anything -- reading
 * standing is a public view call, and submitting a proof is permissionless and
 * done by the relayer. The wallet is here to answer "which address am I", so
 * the lightest possible connector is the right one.
 */

import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { creditcoinTestnet } from './viem';

export const wagmiConfig = createConfig({
  chains: [creditcoinTestnet],
  connectors: [injected()],
  transports: { [creditcoinTestnet.id]: http() },
  ssr: true,
});
