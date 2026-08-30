/**
 * Deadline policy.
 *
 * Batching is a tradeoff, not a free optimisation, and this file is where the
 * tradeoff is made explicit.
 *
 * Holding a batch open until it fills amortises one continuity proof across ten
 * claims. Holding it open too long means a user who just connected their wallet
 * watches an empty passport while their proof waits for nine strangers. Sending
 * immediately means paying for a continuity proof to carry a single claim --
 * roughly ten times the per-fact cost, and the proof is the expensive resource.
 *
 * So a batch ships when it is FULL or when its deadline passes, whichever comes
 * first, and the deadline is chosen by how much someone is waiting on it.
 *
 * The asymmetry worth noticing: being late is recoverable and being early is
 * not. A late batch still lands, just less promptly. An early batch has already
 * spent the proof.
 */

import { MAX_BATCH_SIZE } from './batcher.js';

/** Why a batch is being assembled, which is what decides how long it may wait. */
export type BatchUrgency =
  /** Someone is watching a spinner. Ship fast, pay more per fact. */
  | 'interactive'
  /** Normal discovery. The default. */
  | 'standard'
  /** Historical sweep with nobody waiting. Fill every batch completely. */
  | 'backfill';

export interface DeadlinePolicy {
  /** How long a batch may wait for more claims. */
  maxWaitMs: number;
  /** Ship early once this many claims are present, even before the deadline. */
  shipAtCount: number;
}

/**
 * Wait times chosen against what the user is doing, not against a throughput
 * target. Two minutes is roughly the ceiling before a person assumes something
 * is broken; an hour is fine when nothing is watching.
 */
export const DEADLINE_POLICIES: Record<BatchUrgency, DeadlinePolicy> = {
  interactive: { maxWaitMs: 15_000, shipAtCount: 1 },
  standard: { maxWaitMs: 120_000, shipAtCount: MAX_BATCH_SIZE },
  backfill: { maxWaitMs: 3_600_000, shipAtCount: MAX_BATCH_SIZE },
};

export function deadlineFor(urgency: BatchUrgency, now: Date = new Date()): Date {
  return new Date(now.getTime() + DEADLINE_POLICIES[urgency].maxWaitMs);
}

export interface BatchState {
  claimCount: number;
  deadlineAt: Date;
  urgency: BatchUrgency;
}

export type ShipReason = 'full' | 'deadline' | 'threshold';

export interface ShipDecision {
  ship: boolean;
  reason: ShipReason | 'waiting';
  /** Milliseconds until the deadline. Negative once it has passed. */
  msRemaining: number;
}

/**
 * Should this batch ship now?
 *
 * Full always wins: a batch at MAX_BATCH_SIZE cannot accept another claim, so
 * waiting past that point buys nothing and costs latency.
 */
export function shouldShip(state: BatchState, now: Date = new Date()): ShipDecision {
  const msRemaining = state.deadlineAt.getTime() - now.getTime();

  if (state.claimCount >= MAX_BATCH_SIZE) {
    return { ship: true, reason: 'full', msRemaining };
  }
  if (state.claimCount === 0) {
    // An empty batch has nothing to amortise and would spend a continuity proof
    // on nothing at all. Never ship one, deadline or not.
    return { ship: false, reason: 'waiting', msRemaining };
  }
  if (msRemaining <= 0) {
    return { ship: true, reason: 'deadline', msRemaining };
  }

  const policy = DEADLINE_POLICIES[state.urgency];
  if (state.claimCount >= policy.shipAtCount) {
    return { ship: true, reason: 'threshold', msRemaining };
  }

  return { ship: false, reason: 'waiting', msRemaining };
}

/**
 * Continuity proofs spent per fact, at a given batch fill level.
 *
 * The number the deadline policy is really trading against. At one claim per
 * batch it is 1.0 -- every fact pays for its own proof, and batching has bought
 * nothing.
 */
export function proofsPerFact(claimCount: number): number {
  if (claimCount <= 0) return 0;
  return 1 / Math.min(claimCount, MAX_BATCH_SIZE);
}

/**
 * Retry backoff after a failed submission.
 *
 * Exponential with a ceiling, because the failures worth retrying are transient
 * (a dropped transaction, a busy proof builder) and the ones that are not will
 * not be fixed by trying harder. The cap keeps a permanently broken job from
 * drifting into a retry interval measured in hours, where nobody notices it.
 */
export function retryDelayMs(attempt: number, baseMs = 5_000, capMs = 300_000): number {
  return Math.min(baseMs * 2 ** Math.max(0, attempt - 1), capMs);
}
