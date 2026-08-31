"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useWallet } from "@/hooks/useWallet";

/**
 * Top navigation.
 *
 * Replaces the documentation-style sidebar. The sidebar grouped six links under
 * three headings and took a fifth of the viewport to do it, which made the
 * navigation the loudest thing on every page. Six links fit on one line, so
 * they should be on one line, and the data gets the room instead.
 *
 * Command menu is hand-rolled rather than pulled from a package. It is a filter
 * over six routes; a combobox dependency would be more code than the feature.
 */

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/passport", label: "Passport" },
  { href: "/proofs", label: "Proofs" },
  { href: "/apps", label: "Applications" },
  { href: "/credit", label: "Credit" },
] as const;

const COMMANDS = [
  { href: "/dashboard", label: "Go to Dashboard" },
  { href: "/passport", label: "Go to Passport" },
  { href: "/proofs", label: "View Proofs" },
  { href: "/apps", label: "View Applications" },
  { href: "/credit", label: "Open Credit" },
  { href: "/verify", label: "Verification pipeline" },
  { href: "/developers", label: "Developer docs" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { address, isConnected, isConnecting, canConnect, connect, disconnect } = useWallet();

  const togglePalette = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPaletteOpen((open) => !open);
    }
    if (event.key === "Escape") setPaletteOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", togglePalette);
    return () => window.removeEventListener("keydown", togglePalette);
  }, [togglePalette]);

  const matches = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <nav
          aria-label="Dashboard"
          className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-6 px-4 sm:px-6"
        >
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-[15px] font-medium tracking-tight">Vouch</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-lg bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground"
                        : "rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command menu"
              className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
            >
              Search
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
            </button>

            <span className="hidden items-center gap-1.5 text-[12px] text-muted-foreground xl:inline-flex">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              CC3 Testnet
            </span>

            <WalletButton
              {...{ address, isConnected, isConnecting, canConnect, connect, disconnect }}
            />

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="rounded-lg border border-border p-1.5 text-muted-foreground md:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d={mobileOpen ? "M4 4l8 8M12 4l-8 8" : "M2 4h12M2 8h12M2 12h12"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <ul className="space-y-0.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={
                      pathname === item.href
                        ? "block rounded-lg bg-muted px-3 py-2 text-[14px] font-medium"
                        : "block rounded-lg px-3 py-2 text-[14px] text-muted-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
              Network: CC3 Testnet
            </div>
          </div>
        ) : null}
      </header>

      {paletteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[18vh]"
          onClick={() => setPaletteOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-frame shadow-2xl"
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages…"
              aria-label="Search pages"
              className="w-full border-b border-border bg-transparent px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
            />

            <ul className="max-h-72 overflow-y-auto p-1.5">
              {matches.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                  Nothing matches “{query}”.
                </li>
              ) : (
                matches.map((c) => (
                  <li key={c.href}>
                    <button
                      type="button"
                      onClick={() => {
                        setPaletteOpen(false);
                        setQuery("");
                        router.push(c.href);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {c.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

function WalletButton({
  address,
  isConnected,
  isConnecting,
  canConnect,
  connect,
  disconnect,
}: {
  address?: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  canConnect: boolean;
  connect: () => void;
  disconnect: () => void;
}) {
  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        title={address}
        className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={!canConnect || isConnecting}
      className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {/* A wallet may genuinely be absent. Saying so beats opening something
          that cannot resolve. */}
      {!canConnect ? "No wallet" : isConnecting ? "Connecting…" : "Connect"}
    </button>
  );
}
