"use client";

import { useState, type ReactNode } from "react";

/**
 * The registry, as an interface.
 *
 * Replaces the template's dashboard screenshot, which was a PNG of somebody
 * else's product showing Acme Inc. with $1,250.00 in revenue and 1,234 new
 * customers. None of that is Vouch, and a picture cannot be corrected -- the
 * text is baked into the pixels.
 *
 * So this is real markup instead. The sidebar navigates, the rows are the fact
 * types actually registered on chain, and every figure comes from the test
 * suite. It is the honest version of the "product as artifact" move: the thing
 * on screen is the product rather than a drawing of one.
 */

const NAV = [
  { group: "Registry", items: ["Standing", "Facts", "Sources"] },
  { group: "Consumers", items: ["Credit", "Fee tier", "Access"] },
  { group: "Pipeline", items: ["Discovery", "Verification"] },
] as const;

const FACTS = [
  {
    label: "Aave repayment",
    detail: "Repay(address,address,address,uint256,bool)",
    count: "3 proofs",
    proven: true,
  },
  {
    label: "Liquidity supplied",
    detail: "Supply(address,address,address,uint256,uint16)",
    count: "1 proof",
    proven: true,
  },
  {
    label: "Governance participation",
    detail: "VoteCast(address,uint256,uint8,uint256,string)",
    count: "—",
    proven: false,
  },
];

const METRICS = [
  { label: "Cost to read", value: "1,202", sub: "gas, flat per consumer" },
  { label: "Precompile calls", value: "0", sub: "across 75 reads" },
  { label: "Facts proven", value: "4", sub: "for this address" },
  { label: "Tier", value: "Bronze", sub: "rises, never falls" },
];

export function RegistryDashboard(): ReactNode {
  const [active, setActive] = useState("Standing");

  return (
    <div className="flex min-h-[420px] w-full bg-[#0b0b0d] text-white">
      {/* Left panel */}
      <aside className="hidden w-56 shrink-0 border-r border-white/[0.07] p-4 md:block">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="size-2 rounded-full bg-accent" />
          <span className="text-[13px] font-medium">Vouch Registry</span>
        </div>

        <div className="mt-6 space-y-6">
          {NAV.map((section) => (
            <div key={section.group}>
              <div className="px-2 text-[11px] uppercase tracking-wider text-white/30">
                {section.group}
              </div>
              <div className="mt-2 space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActive(item)}
                    className={
                      item === active
                        ? "w-full rounded-lg bg-white/[0.07] px-2 py-1.5 text-left text-[13px] text-white"
                        : "w-full rounded-lg px-2 py-1.5 text-left text-[13px] text-white/45 transition-colors hover:text-white/75"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-medium">{active}</div>
            <div className="mt-0.5 font-mono text-[12px] text-white/35">
              0x8f3a...c21b &middot; CC3 Testnet
            </div>
          </div>
          <div className="rounded-lg border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/45">
            append-only
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
            >
              <div className="text-[11px] text-white/40">{m.label}</div>
              <div className="mt-1.5 font-mono text-[20px] leading-none tabular-nums">
                {m.value}
              </div>
              <div className="mt-2 text-[11px] text-white/30">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.07]">
          {FACTS.map((fact, i) => (
            <div
              key={fact.label}
              className={
                i === 0
                  ? "flex items-center justify-between gap-4 p-3.5"
                  : "flex items-center justify-between gap-4 border-t border-white/[0.07] p-3.5"
              }
            >
              <div className="min-w-0">
                <div className="text-[13px]">{fact.label}</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-white/30">
                  {fact.detail}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-mono text-[12px] text-white/45">{fact.count}</span>
                {/* Unproven reads "unknown", never a zero or a warning colour.
                    The absence of a proof is not evidence of anything. */}
                <span
                  className={
                    fact.proven
                      ? "font-mono text-[11px] text-accent"
                      : "font-mono text-[11px] text-white/30"
                  }
                >
                  {fact.proven ? "proven" : "unknown"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
