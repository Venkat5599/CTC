/**
 * Queue priority.
 *
 * The relayer is untrusted, so ordering is a liveness concern rather than a
 * security one -- a mis-prioritised queue makes someone wait, it cannot make the
 * registry believe something false. That framing is what allows the policy here
 * to be simple and legible instead of defensive.
 *
 * One thing it must get right: a backfill sweep of a decade of Aave history must
 * never starve a person who just connected their wallet. Historical work is
 * unbounded and interactive work is not, so the ordering below is strictly by
 * urgency class first, and only then by age within a class.
 */

import type { BatchUrgency } from './deadline.js';

/** Higher runs first. Gaps left between values so a class can be inserted later. */
export const URGENCY_PRIORITY: Record<BatchUrgency, number> = {
  interactive: 100,
  standard: 50,
  backfill: 10,
};

export interface PrioritisedJob {
  id: string;
  urgency: BatchUrgency;
  claimCount: number;
  createdAt: Date;
  deadlineAt: Date;
  attempts: number;
}

/**
 * Order jobs for execution.
 *
 * Rules, in order:
 *   1. A passed deadline outranks everything. It is already late.
 *   2. Then urgency class, so backfill can never starve interactive work.
 *   3. Then the earlier deadline.
 *   4. Then age, oldest first -- the tiebreak that makes the queue FIFO within a
 *      class and stops a job being perpetually overtaken.
 *
 * Attempt count is deliberately NOT a factor. Demoting a job for having failed
 * would push exactly the jobs that need attention to the back of the queue,
 * where they are least likely to be noticed.
 */
export function prioritise(jobs: readonly PrioritisedJob[], now: Date = new Date()): PrioritisedJob[] {
  return [...jobs].sort((a, b) => {
    const aLate = a.deadlineAt.getTime() <= now.getTime();
    const bLate = b.deadlineAt.getTime() <= now.getTime();
    if (aLate !== bLate) return aLate ? -1 : 1;

    const urgencyDelta = URGENCY_PRIORITY[b.urgency] - URGENCY_PRIORITY[a.urgency];
    if (urgencyDelta !== 0) return urgencyDelta;

    const deadlineDelta = a.deadlineAt.getTime() - b.deadlineAt.getTime();
    if (deadlineDelta !== 0) return deadlineDelta;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Jobs eligible to run right now.
 *
 * A job in backoff is excluded rather than reordered, because a job that is not
 * allowed to run yet is not a low-priority job -- it is a job with a start time,
 * and conflating the two makes the queue's behaviour hard to reason about.
 */
export function eligible(
  jobs: readonly PrioritisedJob[],
  nextRetryAt: (job: PrioritisedJob) => Date | null,
  now: Date = new Date(),
): PrioritisedJob[] {
  return prioritise(
    jobs.filter((job) => {
      const retryAt = nextRetryAt(job);
      return retryAt === null || retryAt.getTime() <= now.getTime();
    }),
    now,
  );
}
