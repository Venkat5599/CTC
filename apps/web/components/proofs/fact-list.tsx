'use client';

/**
 * Proven facts for an address.
 *
 * Rows on hairlines rather than a card per fact. These arrive in lists of ten
 * or more and a bordered card each would add ten containers without adding a
 * single unit of hierarchy.
 *
 * Every row links out to both chains: the source transaction on Etherscan and
 * the verification on the Creditcoin explorer. A registry that asked to be taken
 * on trust would be missing the point of proving anything.
 */

import Link from 'next/link';
import { Empty, Skeleton } from '@vouch/ui';
import { factById } from '@vouch/schemas';
import { useFacts } from '@/hooks/useFacts';
import { explorerUrl, sourceExplorerUrl } from '@/lib/contracts';

export function FactList({ address }: { address: string }) {
  const { data: facts, isLoading } = useFacts(address);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!facts || facts.length === 0) {
    return (
      <Empty
        title="No proven facts"
        body="Nothing has been verified for this address yet. Facts are append-only, so anything proven later joins this list and nothing ever leaves it."
      />
    );
  }

  return (
    <div>
      {facts.map((fact) => {
        const definition = factById(fact.factType);

        return (
          <div
            key={fact.factId}
            className="grid gap-3 border-t border-[--color-line] py-5 md:grid-cols-[1fr_auto] md:items-baseline md:gap-8"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-[--color-ink]">
                {definition?.label ?? 'Unknown fact type'}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[12px] text-[--color-ink-faint]">
                <span>block {String(fact.blockNumber)}</span>
                <span>log {fact.logIndex}</span>
                <span>{fact.verifiedAt.toISOString().slice(0, 10)}</span>
              </div>
            </div>

            <div className="flex items-center gap-5 font-mono text-[12px] md:justify-end">
              <Link
                href={sourceExplorerUrl(fact.txHash)}
                className="prose-link text-[--color-ink-muted]"
                target="_blank"
                rel="noreferrer"
              >
                source
              </Link>
              <Link
                href={explorerUrl('tx', fact.factId)}
                className="prose-link text-[--color-ink-muted]"
                target="_blank"
                rel="noreferrer"
              >
                verification
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
