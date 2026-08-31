'use client';

/**
 * Verification progress.
 *
 * Stages are always rendered, and the current one is marked. A progress display
 * that hides future steps until they arrive tells the visitor nothing about how
 * long this will take, which is the only question they actually have.
 */

import { StatusBadge } from "@/components/dashboard/primitives";
import type { VerificationStatus } from '@vouch/sdk';

const STAGES = [
  { key: 'discovered', label: 'Found on Ethereum' },
  { key: 'queued', label: 'Queued for a batch' },
  { key: 'building-proof', label: 'Building the proof' },
  { key: 'submitting', label: 'Submitting to Creditcoin' },
  { key: 'verified', label: 'Verified' },
] as const;

export function Pipeline({ status }: { status: VerificationStatus | null }) {
  const currentIndex = status ? STAGES.findIndex((s) => s.key === status.stage) : -1;

  if (status?.stage === 'rejected') {
    return (
      <div className="border-t border-border py-8">
        <StatusBadge status="failed" />
        <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">
          {/* A rejection is permanent and the copy says so, because a visitor
              watching a spinner forever is worse than being told to stop. */}
          {status.reason ?? 'This claim cannot be verified and will not be retried.'}
        </p>
      </div>
    );
  }

  return (
    <ol className="border-t border-border">
      {STAGES.map((stage, i) => {
        const done = currentIndex > i;
        const active = currentIndex === i;

        return (
          <li
            key={stage.key}
            className="flex items-baseline justify-between gap-6 border-b border-border py-4"
          >
            <span
              className={
                done || active
                  ? 'text-[13px] text-foreground'
                  : 'text-[13px] text-muted-foreground'
              }
            >
              {stage.label}
            </span>

            {active ? (
              <StatusBadge status={stage.key === 'verified' ? 'verified' : 'pending'} />
            ) : done ? (
              <span className="font-mono text-[12px] text-muted-foreground">done</span>
            ) : null}
          </li>
        );
      })}

      {status?.batchClaimCount != null && status.stage === 'queued' ? (
        <li className="py-4 text-[13px] text-muted-foreground">
          Batching with {status.batchClaimCount} other claim
          {status.batchClaimCount === 1 ? '' : 's'}. One continuity proof covers
          up to ten, which is why waiting briefly is cheaper than proving alone.
        </li>
      ) : null}
    </ol>
  );
}
