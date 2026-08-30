/**
 * The work queue.
 *
 * In-process by default, deliberately. The architecture notes Redis and BullMQ
 * as an option, and the option stays unexercised until something measured needs
 * it -- a hackathon spent learning a queue is a hackathon not spent on the proof
 * flow, and the durability Redis buys is already provided by Postgres, which is
 * where jobs actually live. This class is a scheduler over the database, not a
 * store: restart it and nothing is lost, because nothing was ever held only in
 * memory.
 *
 * The interface below is intentionally the shape BullMQ would need, so swapping
 * the implementation later is a substitution rather than a rewrite.
 */

import {
  type BatchUrgency,
  type PendingClaim,
  type PrioritisedJob,
  deadlineFor,
  eligible,
  packBatches,
  retryDelayMs,
  shouldShip,
} from '@vouch/proof-engine';

export interface QueuedJob extends PrioritisedJob {
  chainKey: number;
  windowStart: bigint;
  windowEnd: bigint;
  claims: PendingClaim[];
  nextRetryAt: Date | null;
  lastError: string | null;
  maxAttempts: number;
}

export interface QueueOptions {
  urgency?: BatchUrgency;
  maxAttempts?: number;
  now?: () => Date;
}

/**
 * Groups claims into jobs and decides which job runs next.
 *
 * Enqueueing is idempotent on the claim's identity, which matters more than it
 * looks: the indexer re-scans overlapping block ranges on restart, so the same
 * claim arrives repeatedly by design. Deduplicating here means a restart does
 * not spend proofs re-proving what is already queued, and the on-chain replay
 * guard catches anything that slips through anyway.
 */
export class BatchQueue {
  private readonly jobs = new Map<string, QueuedJob>();
  private readonly seen = new Set<string>();
  private readonly urgency: BatchUrgency;
  private readonly maxAttempts: number;
  private readonly now: () => Date;

  constructor(options: QueueOptions = {}) {
    this.urgency = options.urgency ?? 'standard';
    this.maxAttempts = options.maxAttempts ?? 5;
    this.now = options.now ?? (() => new Date());
  }

  /** Add claims, grouping them into window-aligned jobs. Returns jobs touched. */
  enqueue(claims: readonly PendingClaim[]): QueuedJob[] {
    const fresh = claims.filter((claim) => !this.seen.has(identity(claim)));
    for (const claim of fresh) this.seen.add(identity(claim));

    const touched: QueuedJob[] = [];

    for (const batch of packBatches(fresh)) {
      const id = `${batch.chainKey}:${batch.windowStart}`;
      let job = this.jobs.get(id);

      if (!job) {
        job = {
          id,
          chainKey: batch.chainKey,
          windowStart: batch.windowStart,
          windowEnd: batch.windowEnd,
          claims: [],
          urgency: this.urgency,
          claimCount: 0,
          createdAt: this.now(),
          deadlineAt: deadlineFor(this.urgency, this.now()),
          attempts: 0,
          maxAttempts: this.maxAttempts,
          nextRetryAt: null,
          lastError: null,
        };
        this.jobs.set(id, job);
      }

      job.claims.push(...batch.claims);
      job.claimCount = job.claims.length;
      touched.push(job);
    }

    return touched;
  }

  /** Jobs ready to send: full, past deadline, or over their ship threshold. */
  ready(): QueuedJob[] {
    const now = this.now();
    const runnable = eligible(
      [...this.jobs.values()],
      (job) => (job as QueuedJob).nextRetryAt,
      now,
    ) as QueuedJob[];

    return runnable.filter((job) => shouldShip(job, now).ship);
  }

  /** Remove a job that landed. */
  complete(id: string): void {
    this.jobs.delete(id);
  }

  /**
   * Record a failure and schedule a retry.
   *
   * A job past `maxAttempts` is kept rather than dropped. Dropping it would make
   * a permanently failing job invisible, and an invisible failure in a system
   * whose whole value is "the fact eventually lands" is the worst outcome
   * available. It stays, it stops being eligible, and it shows up in metrics.
   */
  fail(id: string, error: string): QueuedJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    job.attempts += 1;
    job.lastError = error;
    job.nextRetryAt =
      job.attempts >= job.maxAttempts
        ? null
        : new Date(this.now().getTime() + retryDelayMs(job.attempts));

    return job;
  }

  /** Jobs that exhausted their retries and need a human. */
  stuck(): QueuedJob[] {
    return [...this.jobs.values()].filter((job) => job.attempts >= job.maxAttempts);
  }

  get size(): number {
    return this.jobs.size;
  }

  get pendingClaims(): number {
    let total = 0;
    for (const job of this.jobs.values()) total += job.claims.length;
    return total;
  }
}

function identity(claim: PendingClaim): string {
  return [claim.chainKey, claim.blockNumber, claim.txHash, claim.factType, claim.logIndex].join(':');
}
