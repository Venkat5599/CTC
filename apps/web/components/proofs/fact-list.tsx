"use client";

/**
 * Proven facts for an address.
 *
 * A table, not a list of cards. These arrive ten and twenty at a time and the
 * columns are the point: which fact, on which chain, in which block. A bordered
 * card per row would add twenty containers without adding one unit of
 * hierarchy, and would make the block numbers impossible to compare.
 *
 * Selecting a row opens the full proof beside the table rather than navigating
 * away. An earlier version linked each row straight out to a block explorer,
 * which meant leaving the product in order to inspect the product's own data.
 */

import { useState } from "react";

import { DataTable, Nothing, Section, type Column } from "@/components/dashboard/data";
import { Mono, SkeletonRows, StatusBadge } from "@/components/dashboard/primitives";
import { ProofCaveat, ProofDetail } from "@/components/proofs/proof-detail";
import { useFacts } from "@/hooks/useFacts";
import { factById } from "@vouch/schemas";

export function FactList({ address }: { address: string }) {
  const { data: facts, isLoading } = useFacts(address);
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <SkeletonRows rows={4} height="h-20" />;

  const rows = facts ?? [];
  const active = rows.find((f) => f.factId === selected) ?? null;

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "fact",
      header: "Fact",
      cell: (fact) => {
        const definition = factById(fact.factType);
        return (
          <button
            type="button"
            onClick={() => setSelected(fact.factId === selected ? null : fact.factId)}
            aria-pressed={fact.factId === selected}
            className="focus-visible:outline-accent text-left focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="block text-[13.5px] text-[var(--vouch-text)]">
              {definition?.label ?? "Unknown fact type"}
            </span>
            <span className="mt-0.5 block text-[12px] text-[var(--vouch-text-muted)]">
              Ethereum Sepolia
            </span>
          </button>
        );
      },
    },
    {
      key: "state",
      header: "State",
      width: "w-[110px]",
      cell: () => <StatusBadge status="verified" />,
    },
    {
      key: "block",
      header: "Block",
      align: "right",
      width: "w-[120px]",
      secondary: true,
      cell: (fact) => (
        <span className="font-mono text-[12.5px] tabular-nums text-[var(--vouch-text-muted)]">
          {String(fact.blockNumber)}
        </span>
      ),
    },
    {
      key: "tx",
      header: "Source transaction",
      align: "right",
      width: "w-[160px]",
      secondary: true,
      cell: (fact) => <Mono value={fact.txHash} />,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
      <div className="space-y-4">
        <Section
          title="Fact history"
          description={
            rows.length > 0
              ? `${rows.length} proven ${rows.length === 1 ? "fact" : "facts"}, newest first. Select a row to inspect its proof.`
              : undefined
          }
        >
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(fact) => fact.factId}
            empty={
              <Nothing>
                Nothing has been verified for this address yet. Facts are append-only, so anything
                proven later joins this list and nothing ever leaves it.
              </Nothing>
            }
          />
        </Section>

        {rows.length > 0 ? <ProofCaveat /> : null}
      </div>

      {/* Sticky so the proof stays in view while a long history scrolls past. */}
      <div className="lg:sticky lg:top-6">
        <Section title={active ? "Proof" : "No fact selected"}>
          {active ? (
            <ProofDetail fact={active} />
          ) : (
            <div className="px-6 py-6">
              <Nothing>
                Select any row to see its full proof: source chain, block, emitting contract, and
                links to both transactions.
              </Nothing>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
