"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { useWallet } from "@/hooks/useWallet";

/**
 * Top navigation.
 *
 * Four destinations, deliberately. Passport is not among them: it is one module
 * of the protocol, and putting it in the primary row made the whole product
 * read as a credit passport with extra pages attached. It is reachable from the
 * Standing card, which is where somebody actually wants it -- you look at your
 * tier and then ask what produced it.
 *
 * Dashboard is the overview. Proofs is the verification layer. Applications is
 * the ecosystem. Credit is one use case. Those four say what Vouch is; a list
 * led by Passport says something narrower and less true.
 */

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/proofs", label: "Proofs" },
  { href: "/apps", label: "Applications" },
  { href: "/credit", label: "Credit" },
] as const;

// Everything reachable, including the secondary destinations kept out of the
// primary row. The command menu is where completeness belongs.
const COMMANDS = [
  ...NAV,
  { href: "/passport", label: "Passport" },
  { href: "/verify", label: "Verification" },
  { href: "/developers", label: "Developers" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");

  const { address, isConnected, isConnecting, canConnect, connect, disconnect } = useWallet();

  const onKey = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPalette((open) => !open);
    }
    if (event.key === "Escape") setPalette(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const matches = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-7 px-5 sm:px-8"
        >
          <Link
            href="/dashboard"
            className="focus-visible:outline-accent flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="bg-accent size-2 rounded-full" aria-hidden="true" />
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
                        ? "text-foreground rounded-lg px-3 py-1.5 text-[13px] font-medium"
                        : "text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-[13px] transition-colors"
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
              onClick={() => setPalette(true)}
              aria-label="Open command menu"
              className="border-border text-muted-foreground hover:text-foreground hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors lg:inline-flex"
            >
              Search
              <kbd className="border-border rounded border px-1 font-mono text-[10px]">⌘K</kbd>
            </button>

            <span className="text-muted-foreground hidden items-center gap-1.5 text-[12px] xl:inline-flex">
              <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
              CC3 Testnet
            </span>

            {isConnected && address ? (
              <button
                type="button"
                onClick={() => disconnect()}
                title={address}
                className="border-border text-muted-foreground hover:text-foreground rounded-lg border px-2.5 py-1.5 font-mono text-[12px] transition-colors"
              >
                {address.slice(0, 6)}…{address.slice(-4)}
              </button>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={!canConnect || isConnecting}
                className="bg-accent rounded-lg px-3 py-1.5 text-[12px] font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {/* A wallet may genuinely be absent. Saying so beats opening
                    something that cannot resolve. */}
                {!canConnect ? "No wallet" : isConnecting ? "Connecting…" : "Connect"}
              </button>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="border-border text-muted-foreground rounded-lg border p-1.5 md:hidden"
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
          <div className="border-border border-t px-5 py-3 md:hidden">
            <ul className="space-y-0.5">
              {COMMANDS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={
                      pathname === item.href
                        ? "bg-muted block rounded-lg px-3 py-2 text-[14px] font-medium"
                        : "text-muted-foreground block rounded-lg px-3 py-2 text-[14px]"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-border text-muted-foreground mt-3 border-t pt-3 text-[12px]">
              Network: CC3 Testnet
            </div>
          </div>
        ) : null}
      </header>

      {palette ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[18vh]"
          role="presentation"
          onClick={() => setPalette(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            onClick={(event) => event.stopPropagation()}
            className="border-border bg-frame w-full max-w-md overflow-hidden rounded-xl border shadow-2xl"
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages…"
              aria-label="Search pages"
              className="border-border placeholder:text-muted-foreground w-full border-b bg-transparent px-4 py-3 text-[14px] outline-none"
            />
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {matches.length === 0 ? (
                <li className="text-muted-foreground px-3 py-6 text-center text-[13px]">
                  Nothing matches “{query}”.
                </li>
              ) : (
                matches.map((m) => (
                  <li key={m.href}>
                    <button
                      type="button"
                      onClick={() => {
                        setPalette(false);
                        setQuery("");
                        router.push(m.href);
                      }}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground block w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors"
                    >
                      {m.label}
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
