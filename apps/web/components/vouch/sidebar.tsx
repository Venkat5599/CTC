"use client";

import {
  ArrowsLeftRight,
  Cube,
  FileCode,
  Gauge,
  IdentificationBadge,
  List,
  MagnifyingGlass,
  Receipt,
  ShieldCheck,
  Stack,
  X,
  type Icon,
} from "@phosphor-icons/react";
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
 * The rail floats: inset from all four edges as a glass panel over the page
 * atmosphere rather than welded to the viewport edge. That gap is what makes it
 * read as an object resting on the page instead of as browser chrome.
 *
 * Grouped by what the sections are for. Overview is the protocol's state,
 * Applications is who consumes it, Develop is how to build on it. Passport is
 * deliberately not a top-level item: it is one consumer of the registry, and
 * giving it a slot alongside the protocol made the whole product read as a
 * credit passport with extra pages attached.
 */

// Real-world mass, matching the primitives. Nothing in this product moves on
// the browser's default ease.
const EASE = "cubic-bezier(0.32,0.72,0,1)";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge },
      { href: "/explorer", label: "Explorer", icon: MagnifyingGlass },
      { href: "/proofs", label: "Proofs", icon: ShieldCheck },
    ],
  },
  {
    label: "Applications",
    items: [
      { href: "/apps", label: "Applications", icon: Stack },
      { href: "/credit", label: "Credit", icon: Receipt },
    ],
  },
  {
    label: "Develop",
    items: [
      { href: "/developers", label: "Developers", icon: Cube },
      { href: "/docs", label: "Docs", icon: FileCode },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

// Reachable through search though not in the rail, so the sidebar stays a
// hierarchy rather than a list of everything.
const EXTRA: NavItem[] = [
  { href: "/passport", label: "Passport", icon: IdentificationBadge },
  { href: "/verify", label: "Verification", icon: ArrowsLeftRight },
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
    <div className="flex h-full flex-col px-3 py-5">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-2.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ outlineColor: "var(--vouch-primary)" }}
      >
        <Mark />
        <span className="text-[15px] font-medium tracking-[-0.01em] text-[var(--vouch-text)]">
          Vouch
        </span>
      </Link>

      <button
        type="button"
        onClick={() => setPalette(true)}
        className="mt-6 flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12.5px] text-[var(--vouch-text-faint)] transition-[color,border-color,background-color] duration-300 hover:border-white/[0.12] hover:text-[var(--vouch-text-muted)]"
        style={{ transitionTimingFunction: EASE }}
      >
        <MagnifyingGlass size={14} weight="regular" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded-md border border-white/[0.08] px-1.5 py-px font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <nav aria-label="Main" className="mt-7 flex-1 space-y-7 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 text-[10px] font-medium tracking-[0.16em] text-[var(--vouch-text-faint)] uppercase">
              {group.label}
            </div>

            <ul className="mt-2.5 space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Glyph = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-[color,background-color] duration-300 ${
                        active
                          ? "bg-white/[0.06] font-medium text-[var(--vouch-text)]"
                          : "text-[var(--vouch-text-muted)] hover:bg-white/[0.03] hover:text-[var(--vouch-text)]"
                      }`}
                      style={{ transitionTimingFunction: EASE }}
                    >
                      {/* The active marker is a short capped bar rather than a
                          full-height rule: it points at the item without
                          drawing a second border down the rail. */}
                      {active ? (
                        <span
                          className="absolute top-1/2 -left-px h-4 w-[2px] -translate-y-1/2 rounded-full"
                          style={{ background: "var(--vouch-primary)" }}
                          aria-hidden="true"
                        />
                      ) : null}

                      <Glyph
                        size={16}
                        weight={active ? "fill" : "regular"}
                        className="shrink-0 opacity-70"
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2.5 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-2 px-3 text-[12px] text-[var(--vouch-text-muted)]">
          {/* Real state, not decoration: this says which chain every number on
              the page was read from. */}
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
            title={`${address} (click to disconnect)`}
            className="w-full truncate rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-left font-mono text-[12px] text-[var(--vouch-text-muted)] transition-[color,border-color] duration-300 hover:border-white/[0.14] hover:text-[var(--vouch-text)]"
            style={{ transitionTimingFunction: EASE }}
          >
            {address.slice(0, 6)}…{address.slice(-4)}
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={!canConnect || isConnecting}
            className="w-full rounded-full px-3.5 py-2 text-[13px] font-medium text-black transition-[filter,transform] duration-300 hover:brightness-[1.08] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            style={{ background: "var(--vouch-primary)", transitionTimingFunction: EASE }}
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
      {/* Floating rail. Inset on every side so it reads as a panel resting on
          the page rather than as a border welded to the window. */}
      <aside className="glass fixed top-4 bottom-4 left-4 z-30 hidden w-[216px] flex-col rounded-[20px] lg:flex">
        {panel}
      </aside>

      {/* Mobile: a control that opens the same panel. Not a top navigation --
          it carries no destinations of its own. */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[var(--vouch-bg)]/80 px-5 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="rounded-xl border border-white/[0.08] p-2 text-[var(--vouch-text-muted)]"
        >
          <List size={16} weight="regular" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-medium tracking-[-0.01em]">Vouch</span>
        </Link>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="glass absolute top-3 bottom-3 left-3 w-[254px] rounded-[20px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute top-5 right-3 rounded-lg p-1.5 text-[var(--vouch-text-faint)] hover:text-[var(--vouch-text)]"
            >
              <X size={15} weight="regular" />
            </button>
            {panel}
          </div>
        </div>
      ) : null}

      {palette ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[16vh] backdrop-blur-sm"
          role="presentation"
          onClick={() => setPalette(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            onClick={(event) => event.stopPropagation()}
            className="glass-raised w-full max-w-md overflow-hidden rounded-[20px]"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
              <MagnifyingGlass size={15} className="shrink-0 text-[var(--vouch-text-faint)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages, proofs, addresses"
                aria-label="Search"
                className="w-full bg-transparent py-3.5 text-[14px] text-[var(--vouch-text)] outline-none placeholder:text-[var(--vouch-text-faint)]"
              />
            </div>

            <ul className="max-h-72 overflow-y-auto p-2">
              {matches.length === 0 ? (
                <li className="px-3 py-8 text-center text-[13px] text-[var(--vouch-text-muted)]">
                  Nothing matches that.
                </li>
              ) : (
                matches.map((m) => {
                  const Glyph = m.icon;
                  return (
                    <li key={m.href}>
                      <button
                        type="button"
                        onClick={() => {
                          setPalette(false);
                          setQuery("");
                          router.push(m.href);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-[var(--vouch-text-muted)] transition-colors duration-200 hover:bg-white/[0.05] hover:text-[var(--vouch-text)]"
                      >
                        <Glyph size={15} weight="regular" className="opacity-70" />
                        {m.label}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * The mark.
 *
 * Two blocks and a bridge: a fact on one chain, a fact on another, joined by
 * the proof that carries it across. The bridge is the only part in accent,
 * because the crossing is the product. It reads as a glyph at 18px and could
 * not sit unchanged on another company's page.
 */
function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="4.5" width="5" height="9" rx="1.75" fill="currentColor" opacity="0.34" />
      <rect x="12" y="4.5" width="5" height="9" rx="1.75" fill="currentColor" opacity="0.34" />
      <path d="M6.4 9h5.2" stroke="var(--vouch-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
