'use client';

/**
 * Client providers.
 *
 * Isolated in its own client component so the rest of the tree stays a Server
 * Component. Wagmi and TanStack Query both need browser context; the pages
 * themselves do not.
 */

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so a re-render never swaps the client and drops the cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Chain reads are cheap and standing is monotonic, so retrying hard
            // on a failed read buys latency without buying correctness.
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
