"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { useWallet } from "@/hooks/useWallet";

/**
 * Side navigation.
 *
 * The only navigation. Four primary destinations, and Passport is not among
 * them: it is one module of the protocol, and giving it a slot in the main list
 * made the whole product read as a credit passport with extra pages. It is
 * reachable from the Standing card, which is where somebody actually wants it,
 * and from the command menu.
 *
 * Dashboard is the overview, Proofs is the verification layer, Applications is
 * the ecosystem, Credit is one use case. Those four say what Vouch is.
 *
 * Narrow and quiet on purpose. A rail earns its width by being scannable at a
 * glance and then getting out of the way; a wide one with section headings
 * competes with the data it frames.
 */

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/proofs", label: "Proofs" },
  { href: "/apps", label: "Applications" },
  { href: "/credit", label: "Credit" },
] as const;

/** Secondary destinations. Reachable, but not competing for the primary list. */
const SECONDARY = [
  { href: "/passport", label: "Passport" },
  { href: "/verify", label: "Verification" },
  { href: "/developers", label: "Developers" },
] as const;

const ALL = [...NAV, ...SECONDARY];

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

  // Otherwise the drawer stays open over the page the user just asked for.
  useEffect(() => setOpen(false), [pathname]);

  const matches = ALL.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  const item = (href: string, label: string, secondary = false) => {
    const active = pathname === href;
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={
            active
              ? "bg-muted text-foreground block rounded-lg px-3 py-2 text-[13px] font-medium"
              : `hover:bg-muted/40 hover:text-foreground block rounded-lg px-3 py-2 transition-colors ${
                  secondary
                    ? "text-muted-foreground/70 text-[12px]"
                    : "text-muted-foreground text-[13px]"
                }`
          }
        >
          {label}
        </Link>
      </li>
    );
  };

  const panel = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="focus-visible:outline-accent flex items-center gap-2 px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="bg-accent size-2 rounded-full" aria-hidden="true" />
        <span className="text-[15px] font-medium tracking-tight">Vouch</span>
      </Link>

      <button
        type="button"
        onClick={() => setPalette(true)}
        className="border-border text-muted-foreground hover:text-foreground mt-5 flex items-center justify-between rounded-lg border px-3 py-1.5 text-[12px] transition-colors"
      >
        Search
        <kbd className="border-border rounded border px-1 font-mono text-[10px]">⌘K</kbd>
      </button>

      <nav aria-label="Main" className="mt-5 flex-1">
        <ul className="space-y-0.5">{NAV.map((n) => item(n.href, n.label))}</ul>

        {/* Dimmer and set apart, so the four above read as the product and
            these read as places you can also get to. */}
        <ul className="border-border mt-5 space-y-0.5 border-t pt-4">
          {SECONDARY.map((n) => item(n.href, n.label, true))}
        </ul>
      </nav>

      <div className="border-border space-y-3 border-t pt-4">
        <div className="text-muted-foreground flex items-center gap-1.5 px-3 text-[12px]">
          <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
          CC3 Testnet
        </div>

        <div className="flex items-center gap-2">
          {isConnected && address ? (
            <button
              type="button"
              onClick={() => disconnect()}
              title={address}
              className="border-border text-muted-foreground hover:text-foreground min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-left font-mono text-[12px] transition-colors"
            >
              {address.slice(0, 6)}…{address.slice(-4)}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={!canConnect || isConnecting}
              className="bg-accent flex-1 rounded-lg px-3 py-2 text-[13px] font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {/* A wallet can genuinely be absent. Saying so beats opening
                  something that cannot resolve. */}
              {!canConnect ? "No wallet" : isConnecting ? "Connecting…" : "Connect"}
            </button>
          )}

          <ThemeToggle />
        </div>

        <p className="text-muted-foreground/70 px-3 text-[11px] leading-relaxed">
          Reading standing is a public view call. Vouch never asks you to sign.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="border-border bg-background fixed inset-y-0 left-0 hidden w-56 border-r px-3 py-5 lg:flex lg:flex-col">
        {panel}
      </aside>

      {/* One navigation at every width: the same panel opens as a drawer rather
          than being replaced by a second nav that can drift out of sync. */}
      <div className="border-border bg-background/90 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-5 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="border-border text-muted-foreground rounded-lg border p-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="bg-accent size-2 rounded-full" aria-hidden="true" />
          <span className="text-[15px] font-medium tracking-tight">Vouch</span>
        </Link>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="border-border bg-background absolute inset-y-0 left-0 w-64 border-r px-3 py-5"
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
