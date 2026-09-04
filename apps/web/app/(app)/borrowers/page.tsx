"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Eyebrow, Metric } from "@/components/dashboard/console";
import { AddressField } from "@/components/dashboard/data";
import { SkeletonRows } from "@/components/dashboard/primitives";
import { useRegistryLog } from "@/hooks/useRegistryLog";
import { explorerUrl } from "@/lib/contracts";
import { factById } from "@vouch/schemas";

/**
 * Borrowers — every subject the registry knows about.
 *
 * Derived from the registry's own event log rather than a database, so this
 * page has no dependency on the indexer and cannot drift from chain state.
 *
 * "Borrowers" is the institutional word for it, but the registry has no concept
 * of a borrower: it stores facts about addresses. An address appears here
 * because something was proven about it, never because it registered, opted in,
 * or was approved. There is no onboarding, and there is no list to be admitted
 * to.
 *
 * NOT SHOWN, because it does not exist: a sybil score, a credit rating, a
 * default probability, a KYC status. Every one of those would be an opinion
 * dressed as a field. The registry deals in events that happened.
 */

const TIER_THRESHOLDS = [1, 5, 12] as const;

function tierFor(repayments: number): number {
  const [bronze, silver, gold] = TIER_THRESHOLDS;
  if (repayments >= gold) return 3;
  if (repayments >= silver) return 2;
  if (repayments >= bronze) return 1;
  return 0;
}

const TIER_NAMES = ["Unproven", "Tier 1", "Tier 2", "Tier 3"] as const;

export default function BorrowersPage() {
  const log = useRegistryLog();
  const [filter, setFilter] = useState("");

  const borrowers = useMemo(() => {
    const bySubject = new Map<
      string,
      { subject: string; facts: number; types: Set<string>; latestBlock: bigint }
    >();

    for (const e of log.data ?? []) {
      const key = e.subject.toLowerCase();
      const row = bySubject.get(key);
      if (row) {
        row.facts += 1;
        row.types.add(e.factType);
        if (e.recordedAtBlock > row.latestBlock) row.latestBlock = e.recordedAtBlock;
      } else {
        bySubject.set(key, {
          subject: key,
          facts: 1,
          types: new Set([e.factType]),
          latestBlock: e.recordedAtBlock,
        });
      }
    }

    return [...bySubject.values()].sort((a, b) => b.facts - a.facts);
  }, [log.data]);

  const shown = filter
    ? borrowers.filter((b) => b.subject.includes(filter.toLowerCase()))
    : borrowers;

  const totalFacts = (log.data ?? []).length;

  return (
    <>
      <header className="mb-8">
        <Eyebrow tone="accent">Directory</Eyebrow>
        <h1 className="mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em]">
          Borrowers
        </h1>
        <p className="mt-3 max-w-[70ch] text-[14px] leading-[1.6] text-[var(--vouch-text-muted)]">
          Every address something has been proven about. Nobody registers to appear here, and
          nobody can be removed. An address absent from this list is unknown — which is not the
          same claim as clean.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric
          accent
          caption="Addresses with at least one proven fact"
          label="Known subjects"
          value={log.isLoading ? null : String(borrowers.length)}
        />
        <Metric
          caption="Across every subject"
          label="Facts recorded"
          value={log.isLoading ? null : String(totalFacts)}
        />
        <Metric
          caption="Facts per subject, where any exist"
          label="Mean depth"
          value={
            log.isLoading || borrowers.length === 0
              ? null
              : (totalFacts / borrowers.length).toFixed(1)
          }
        />
      </section>

      <section className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.015em]">Registry subjects</h2>
            <p className="mt-1 text-[12.5px] text-[var(--vouch-text-muted)]">
              Tier is computed the way <code>VouchPassport</code> computes it: proven repayments
              only.
            </p>
          </div>
          <div className="w-full max-w-[380px]">
            <AddressField id="borrower-filter" onSubmit={(v) => setFilter(v ?? "")} />
          </div>
        </div>

        {log.isLoading ? <SkeletonRows rows={4} /> : null}

        {!log.isLoading && shown.length === 0 ? (
          <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-4 py-10 text-center">
            <p className="text-[13px] text-[var(--vouch-text-muted)]">
              {filter ? "No subject matches that address." : "No subjects in the scanned window."}
            </p>
          </div>
        ) : null}

        {!log.isLoading && shown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[var(--vouch-bg)]">
                  {["Address", "Facts", "Domains", "Standing", "Latest", ""].map((h) => (
                    <th
                      className="px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[var(--vouch-text-faint)] uppercase"
                      key={h}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => {
                  const names = [...b.types]
                    .map((t) => factById(t)?.label ?? "Unregistered")
                    .join(", ");
                  const tier = tierFor(b.facts);
                  return (
                    <tr
                      className="border-t border-[var(--vouch-border)] transition-colors hover:bg-[var(--vouch-surface-high)]"
                      key={b.subject}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text)]">
                        {b.subject.slice(0, 10)}…{b.subject.slice(-6)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-muted)] tabular-nums">
                        {b.facts}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-[12px] text-[var(--vouch-text-muted)]">
                        {names}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-[var(--vouch-radius-sm)] px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase ${
                            tier > 0
                              ? "bg-[var(--vouch-primary)]/10 text-[var(--vouch-primary)]"
                              : "bg-[var(--vouch-bg)] text-[var(--vouch-text-faint)]"
                          }`}
                        >
                          {TIER_NAMES[tier]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-faint)] tabular-nums">
                        #{b.latestBlock.toString()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          className="font-mono text-[11.5px] text-[var(--vouch-primary)] hover:underline"
                          href={explorerUrl("address", b.subject)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
