"use client";

import { ReducedMotionProvider } from "@/lib/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

/**
 * Client providers.
 *
 * Ordering is deliberate. Theme and motion wrap everything because they affect
 * how the page renders at all; the chain providers sit inside because only the
 * routes that read standing need them, and a wagmi failure should never be able
 * to take the marketing pages down with it.
 */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  // Held in state so a re-render never swaps the client and drops the cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Chain reads are cheap and standing is monotonic, so a cached
            // answer can only ever be stale-low. Retrying hard buys latency
            // without buying correctness.
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReducedMotionProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <SmoothScroll>{children}</SmoothScroll>
          </QueryClientProvider>
        </WagmiProvider>
      </ReducedMotionProvider>
    </ThemeProvider>
  );
}
