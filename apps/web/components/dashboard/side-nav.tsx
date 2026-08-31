"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useWallet } from "@/hooks/useWallet";

/**
 * Side navigation.
 *
 * The only navigation. There is no top row: two navigations for six links was
 * the thing that made the app feel like a documentation site wearing a product
 * costume, so the panel carries everything -- brand, routes, network, wallet.
 *
 * Kept narrow (208px) and quiet. A sidebar earns its width by being scannable
 * at a glance and then getting out of the way; the previous one was wide,
 * triple-headed, and louder than the data it framed.
 */

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/passport", label: "Passport" },
  { href: "/proofs", label: "Proofs" },
  { href: "/verify", label: "Verification" },
  { href: "/apps", label: "Applications" },
  { href: "/credit", label: "Credit" },
  { href: "/developers", label: "Developers" },
] as const;

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");

  const { address, isConnected, isConnecting, canConnect, connect, disconnect } = useWallet();

  const onKey = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPalette((p) => !p);
    }
    if (event.key === "Escape") setPalette(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // Route change closes the mobile drawer. Without this the panel stays open
  // over the page the user just asked for.
  useEffect(() => setOpen(false), [pathname]);

  const matches = NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  const panel = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
        <span className="text-[15px] font-medium tracking-tight">Vouch</span>
      </Link>

      <button
        type="button"
        onClick={() => setPalette(true)}
        className="mt-5 flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        Search
        <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
      </button>

      <nav aria-label="Main" className="mt-5 flex-1">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "block rounded-lg bg-muted px-3 py-2 text-[13px] font-medium text-foreground"
                      : "block rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-1.5 px-3 text-[12px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          CC3 Testnet
        </div>

        {isConnected && address ? (
          <button
            type="button"
            onClick={() => disconnect()}
            title={address}
            className="w-full rounded-lg border border-border px-3 py-2 text-left font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {address.slice(0, 6)}…{address.slice(-4)}
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
            {!canConnect ? "No wallet found" : isConnecting ? "Connecting…" : "Connect wallet"}
          </button>
        )}

        <p className="px-3 text-[11px] leading-relaxed text-muted-foreground/70">
          Reading standing is a public view call. Vouch never asks you to sign.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: a fixed rail. */}
      <aside className="fixed inset-y-0 left-0 hidden w-52 border-r border-border bg-background px-3 py-5 lg:flex lg:flex-col">
        {panel}
      </aside>

      {/* Mobile: a bar that opens the same panel as a drawer, so there is one
          navigation at every width rather than two that can disagree. */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="rounded-lg border border-border p-1.5 text-muted-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          <span className="text-[15px] font-medium tracking-tight">Vouch</span>
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-y-0 left-0 w-64 border-r border-border bg-background px-3 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            {panel}
          </div>
        </div>
      ) : null}

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
            className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-frame shadow-2xl"
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages…"
              aria-label="Search pages"
              className="w-full border-b border-border bg-transparent px-4 py-3 text-[14px] outline-none placeholder:text-muted-foreground"
            />
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {matches.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">
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
                      className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
