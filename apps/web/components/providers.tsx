"use client";

import { ReducedMotionProvider } from "@/lib/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
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
      })
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
            {/*
              RainbowKit is themed to the app rather than the reverse. Its
              default accent is a saturated blue that belongs to no palette
              here, and a wallet modal that looks like a different product
              undermines the one thing this interface is selling.

              `modalSize="compact"` because connecting is a step on the way to
              something, never the point of the page.
            */}
            <RainbowKitProvider
              modalSize="compact"
              theme={darkTheme({
                accentColor: "#4edea3",
                accentColorForeground: "#003824",
                borderRadius: "small",
                overlayBlur: "small",
              })}
            >
              <SmoothScroll>{children}</SmoothScroll>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ReducedMotionProvider>
    </ThemeProvider>
  );
}
