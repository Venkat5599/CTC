"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useWallet } from "@/hooks/useWallet";

/**
 * Application sidebar.
 *
 * The only navigation in the product. There is no top bar and no second nav at
 * any breakpoint -- on mobile this same panel opens as a drawer rather than
 * being replaced by a header, because two navigations built separately drift
 * and the mobile one is always the one that rots.
 *
 * Grouped by what the sections are for. Overview is the protocol's state,
 * Applications is who consumes it, Develop is how to build on it. Passport is
 * deliberately not a top-level item: it is one consumer of the registry, and
 * giving it a slot alongside the protocol made the whole product read as a
 * credit passport with extra pages attached.
 */

interface NavItem {
  href: string;
  label: string;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/explorer", label: "Explorer" },
      { href: "/proofs", label: "Proofs" },
    ],
  },
  {
    label: "Applications",
    items: [
      { href: "/apps", label: "Applications" },
      { href: "/credit", label: "Credit" },
    ],
  },
  {
    label: "Develop",
    items: [
      { href: "/developers", label: "Developers" },
      { href: "/docs", label: "Docs" },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

// Reachable through search though not in the rail, so the sidebar stays a
// hierarchy rather than a list of everything.
const EXTRA: NavItem[] = [
  { href: "/passport", label: "Passport" },
  { href: "/verify", label: "Verification" },
];

export function Sidebar() {
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

  // Otherwise the drawer stays open over the page just requested.
  useEffect(() => setOpen(false), [pathname]);

  const matches = [...ALL, ...EXTRA].filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase()),
  );

  const panel = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: "var(--vouch-primary)" }}
      >
        <span
          className="size-2 rounded-full"
          style={{ background: "var(--vouch-primary)" }}
          aria-hidden="true"
        />
        <span className="text-[15px] font-medium tracking-tight text-[var(--vouch-text)]">
          Vouch
        </span>
      </Link>

      <button
        type="button"
        onClick={() => setPalette(true)}
        className="mt-5 flex items-center justify-between rounded-lg border border-[var(--vouch-border)] px-3 py-1.5 text-[12px] text-[var(--vouch-text-muted)] transition-colors hover:text-[var(--vouch-text)]"
      >
        Search
        <kbd className="rounded border border-[var(--vouch-border)] px-1 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <nav aria-label="Main" className="mt-6 flex-1 space-y-6 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 text-[10px] font-medium tracking-[0.14em] uppercase text-[var(--vouch-text-faint)]">
              {group.label}
            </div>

            <ul className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "block rounded-lg bg-[var(--vouch-surface-raised)] px-3 py-2 text-[13px] font-medium text-[var(--vouch-text)]"
                          : "block rounded-lg px-3 py-2 text-[13px] text-[var(--vouch-text-muted)] transition-colors hover:bg-[var(--vouch-surface)] hover:text-[var(--vouch-text)]"
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-[var(--vouch-border)] pt-4">
        <div className="flex items-center gap-1.5 px-3 text-[12px] text-[var(--vouch-text-muted)]">
          <span
            className="size-1.5 rounded-full"
            style={{ background: "var(--vouch-primary)" }}
            aria-hidden="true"
          />
          CC3 Testnet
        </div>

        {isConnected && address ? (
          <button
            type="button"
            onClick={() => disconnect()}
            title={`${address} — click to disconnect`}
            className="w-full truncate rounded-lg border border-[var(--vouch-border)] px-3 py-2 text-left font-mono text-[12px] text-[var(--vouch-text-muted)] transition-colors hover:text-[var(--vouch-text)]"
          >
            {address.slice(0, 6)}…{address.slice(-4)}
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={!canConnect || isConnecting}
            className="w-full rounded-lg px-3 py-2 text-[13px] font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--vouch-primary)" }}
          >
            {/* A wallet can genuinely be absent. Saying so beats opening
                something that cannot resolve. */}
            {!canConnect ? "No wallet found" : isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col border-r border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-5 lg:flex">
        {panel}
      </aside>

      {/* Mobile: a hamburger that opens the same panel. Not a top navigation --
          it carries no destinations of its own. */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--vouch-border)] bg-[var(--vouch-bg)]/90 px-5 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="rounded-lg border border-[var(--vouch-border)] p-1.5 text-[var(--vouch-text-muted)]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ background: "var(--vouch-primary)" }}
            aria-hidden="true"
          />
          <span className="text-[15px] font-medium tracking-tight">Vouch</span>
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="absolute inset-y-0 left-0 w-[260px] border-r border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            {panel}
          </div>
        </div>
      ) : null}

      {palette ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[18vh]"
          role="presentation"
          onClick={() => setPalette(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--vouch-border)] bg-[var(--vouch-surface)] shadow-2xl"
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, proofs, addresses…"
              aria-label="Search"
              className="w-full border-b border-[var(--vouch-border)] bg-transparent px-4 py-3 text-[14px] text-[var(--vouch-text)] outline-none placeholder:text-[var(--vouch-text-faint)]"
            />
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {matches.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-[var(--vouch-text-muted)]">
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
                      className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--vouch-text-muted)] transition-colors hover:bg-[var(--vouch-surface-raised)] hover:text-[var(--vouch-text)]"
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
