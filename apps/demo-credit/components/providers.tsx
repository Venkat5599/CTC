'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { CREDITCOIN_TESTNET } from '@vouch/config';

const creditcoin = defineChain(CREDITCOIN_TESTNET);

const wagmiConfig = createConfig({
  chains: [creditcoin],
  connectors: [injected()],
  transports: { [creditcoin.id]: http() },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
