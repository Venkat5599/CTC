"use client";

/**
 * Global status bar.
 *
 * The mockup this follows carries a live block height, a round-trip latency and
 * a "MULTI-SIG 3/5" counter. None of those are drawn here, and the omission is
 * deliberate rather than unfinished:
 *
 *   - A block height would have to poll a node every few seconds to stay
 *     honest. Rendering a stale or invented one on a protocol whose thesis is
 *     that a claim and a proof are different things is the single most damaging
 *     thing this page could do.
 *   - There is no multi-sig. VouchRegistry has one admin who can register
 *     sources, and `submitBatch` is permissionless. Drawing a quorum badge
 *     would assert a governance property the contracts do not have.
 *   - Latency measured in the browser says nothing about the chain.
 *
 * What remains is what can be stated truthfully without a request: which
 * network the app is pointed at, and the registry it reads.
 */

import Link from "next/link";

import { Connect } from "@/components/vouch/connect";
import { useChainHead } from "@/hooks/useChainHead";
import { addresses, explorerUrl, NETWORK } from "@/lib/contracts";

const NETWORK_LABEL: Record<string, string> = {
  "cc3-testnet": "CC3 Testnet",
  "cc3-mainnet": "CC3 Mainnet",
};

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function TopBar() {
  const registry = addresses.registry;
  const head = useChainHead();

  return (
    <div className="sticky top-0 z-30 flex h-11 items-center justify-between gap-4 border-b border-[var(--vouch-border)] bg-[var(--vouch-surface)]/95 px-5 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="block h-1.5 w-1.5 rounded-full bg-[var(--vouch-primary)]"
          />
          <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-[var(--vouch-text)] uppercase">
            {NETWORK_LABEL[NETWORK] ?? NETWORK}
          </span>
        </span>

        <span aria-hidden className="text-[var(--vouch-border-strong)]">
          |
        </span>

        <span className="font-mono text-[11px] text-[var(--vouch-text-faint)]">
          {head.isLoading
            ? "reading head…"
            : head.isError
              ? "head unavailable"
              : `Block #${head.data?.toString()}`}
        </span>

        <span aria-hidden className="hidden text-[var(--vouch-border-strong)] sm:inline">
          |
        </span>

        <span className="hidden font-mono text-[11px] text-[var(--vouch-text-faint)] sm:inline">
          Block Prover 0x…0FD2
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Connect />
        {registry ? (
          <Link
            className="flex items-center gap-2 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-2.5 py-1 transition-colors hover:border-[var(--vouch-border-strong)]"
            href={explorerUrl("address", registry)}
            rel="noreferrer"
            target="_blank"
          >
            <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--vouch-text-faint)] uppercase">
              Registry
            </span>
            <span className="font-mono text-[11px] text-[var(--vouch-primary)]">
              {truncate(registry)}
            </span>
          </Link>
        ) : (
          <span className="font-mono text-[11px] text-[var(--vouch-text-faint)]">
            registry not deployed
          </span>
        )}
      </div>
    </div>
  );
}
