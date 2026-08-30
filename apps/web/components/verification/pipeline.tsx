'use client';

/**
 * Verification progress.
 *
 * Stages are always rendered, and the current one is marked. A progress display
 * that hides future steps until they arrive tells the visitor nothing about how
 * long this will take, which is the only question they actually have.
 */

import { StandingBadge } from '@vouch/ui';
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
      <div className="border-t border-[--color-line] py-8">
        <StandingBadge state="rejected" />
        <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
          {/* A rejection is permanent and the copy says so, because a visitor
              watching a spinner forever is worse than being told to stop. */}
          {status.reason ?? 'This claim cannot be verified and will not be retried.'}
        </p>
      </div>
    );
  }

  return (
    <ol className="border-t border-[--color-line]">
      {STAGES.map((stage, i) => {
        const done = currentIndex > i;
        const active = currentIndex === i;

        return (
          <li
            key={stage.key}
            className="flex items-baseline justify-between gap-6 border-b border-[--color-line] py-4"
          >
            <span
              className={
                done || active
                  ? 'text-[13px] text-[--color-ink]'
                  : 'text-[13px] text-[--color-ink-faint]'
              }
            >
              {stage.label}
            </span>

            {active ? (
              <StandingBadge state={stage.key === 'verified' ? 'proven' : 'pending'} />
            ) : done ? (
              <span className="font-mono text-[12px] text-[--color-ink-faint]">done</span>
            ) : null}
          </li>
        );
      })}

      {status?.batchClaimCount != null && status.stage === 'queued' ? (
        <li className="py-4 text-[13px] text-[--color-ink-faint]">
          Batching with {status.batchClaimCount} other claim
          {status.batchClaimCount === 1 ? '' : 's'}. One continuity proof covers
          up to ten, which is why waiting briefly is cheaper than proving alone.
        </li>
      ) : null}
    </ol>
  );
}
