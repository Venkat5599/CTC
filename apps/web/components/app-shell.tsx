"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useWallet } from "@/hooks/useWallet";

/**
 * Application shell.
 *
 * The marketing pages get a centred header; these get a sidebar, because they
 * are a different kind of surface. Someone on /passport is looking up an
 * address, then checking its proofs, then seeing which consumers read it --
 * that is navigation between views of one subject, and a top nav makes it feel
 * like leaving one page for another.
 *
 * The wallet control sits at the bottom rather than the top for the same
 * reason it sits nowhere on the marketing pages: Vouch never asks for a
 * signature. Connecting only tells the page which address to read, so it
 * belongs with the utilities, not above the content.
 */

const NAV = [
  {
    group: "Registry",
    items: [
      { label: "Passport", href: "/passport", hint: "Standing for an address" },
      { label: "Proofs", href: "/proofs", hint: "Every verified fact" },
      { label: "Verification", href: "/verify", hint: "Facts in flight" },
    ],
  },
  {
    group: "Consumers",
    items: [
      { label: "Applications", href: "/apps", hint: "Three, one registry" },
      { label: "Credit", href: "/credit", hint: "Collateral from standing" },
    ],
  },
  {
    group: "Build",
    items: [{ label: "Developers", href: "/developers", hint: "Integrate in one call" }],
  },
];

export function AppShell({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, canConnect, connect, disconnect } = useWallet();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-0 px-4 md:px-6">
      <aside className="sticky top-24 hidden h-[calc(100dvh-8rem)] w-60 shrink-0 flex-col border-r border-border pr-6 lg:flex">
        <div className="flex-1 space-y-7 overflow-y-auto">
          {NAV.map((section) => (
            <div key={section.group}>
              <div className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground/60">
                {section.group}
              </div>

              <div className="mt-2 space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      // Active state is a weight and colour shift, not a dot or
                      // a growing underline bolted on beneath the label.
                      className={
                        active
                          ? "block rounded-lg bg-muted px-3 py-2 text-[13px] font-medium text-foreground"
                          : "block rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      }
                    >
                      {item.label}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/60">
                        {item.hint}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          {isConnected && address ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="w-full rounded-lg border border-border px-3 py-2 text-left font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={!canConnect || isConnecting}
              className="w-full rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {/* A wallet can genuinely be absent. Saying so beats opening
                  something that cannot resolve. */}
              {!canConnect ? "No wallet found" : isConnecting ? "Connecting" : "Connect wallet"}
            </button>
          )}

          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground/60">
            Reading standing is a public view call. Vouch never asks you to sign.
          </p>
        </div>
      </aside>

      {/* Mobile: the sidebar collapses to a scrollable rail rather than
          disappearing, so the same navigation exists at every width. */}
      <div className="min-w-0 flex-1 lg:pl-10">
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-3 lg:hidden">
          {NAV.flatMap((s) => s.items).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "shrink-0 rounded-lg bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground"
                    : "shrink-0 rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
