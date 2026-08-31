'use client';

/**
 * Proven facts for an address.
 *
 * Rows on hairlines rather than a card each. These arrive in lists of ten or
 * more, and a bordered card per row would add ten containers without adding a
 * single unit of hierarchy.
 *
 * Selecting a row opens the full proof in place. The previous version linked
 * each row straight out to a block explorer, which meant leaving the product to
 * inspect the product's own data.
 */

import { useState } from 'react';

import {
  EmptyState,
  Mono,
  SectionLabel,
  SkeletonRows,
  StatusBadge,
} from '@/components/dashboard/primitives';
import { ProofCaveat, ProofDetail } from '@/components/proofs/proof-detail';
import { useFacts } from '@/hooks/useFacts';
import { factById } from '@vouch/schemas';

export function FactList({ address }: { address: string }) {
  const { data: facts, isLoading } = useFacts(address);
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <SkeletonRows rows={4} />;

  if (!facts || facts.length === 0) {
    return (
      <EmptyState
        title="No proven facts"
        description="Nothing has been verified for this address yet. Facts are append-only, so anything proven later joins this list and nothing ever leaves it."
      />
    );
  }

  const active = facts.find((f) => f.factId === selected) ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
      <div>
        <SectionLabel>Fact history</SectionLabel>

        <ul className="divide-y divide-border rounded-xl border border-border">
          {facts.map((fact) => {
            const definition = factById(fact.factType);
            const isActive = fact.factId === selected;

            return (
              <li key={fact.factId}>
                <button
                  type="button"
                  onClick={() => setSelected(isActive ? null : fact.factId)}
                  aria-pressed={isActive}
                  className={`flex w-full flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-5 ${
                    isActive ? 'bg-muted/50' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-foreground">
                      {definition?.label ?? 'Unknown fact type'}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      Ethereum Sepolia
                    </div>
                  </div>

                  <StatusBadge status="verified" />

                  <div className="hidden text-right sm:block">
                    <div className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      Block {String(fact.blockNumber)}
                    </div>
                    <div className="mt-0.5">
                      <Mono value={fact.txHash} />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <ProofCaveat />
      </div>

      <div className="lg:sticky lg:top-24">
        {active ? (
          <ProofDetail fact={active} />
        ) : (
          <EmptyState
            title="Select a fact"
            description="Open any row to see the full proof: source chain, block, emitter, and links to both transactions."
          />
        )}
      </div>
    </div>
  );
}
