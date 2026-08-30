import { describe, expect, it } from 'vitest';
import {
  DEADLINE_POLICIES,
  deadlineFor,
  proofsPerFact,
  shouldShip,
} from '../src/scheduler/deadline.js';
import { MAX_BATCH_SIZE } from '../src/scheduler/batcher.js';

const T0 = new Date('2026-08-30T12:00:00Z');
const at = (msFromT0: number) => new Date(T0.getTime() + msFromT0);

describe('shouldShip', () => {
  it('ships a full batch regardless of time remaining', () => {
    const decision = shouldShip(
      { claimCount: MAX_BATCH_SIZE, deadlineAt: at(3_600_000), urgency: 'backfill' },
      T0,
    );

    expect(decision).toMatchObject({ ship: true, reason: 'full' });
  });

  // An empty batch has nothing to amortise. Shipping one spends a continuity
  // proof -- the expensive resource here -- on nothing at all.
  it('never ships an empty batch, even past its deadline', () => {
    const decision = shouldShip(
      { claimCount: 0, deadlineAt: at(-60_000), urgency: 'interactive' },
      T0,
    );

    expect(decision.ship).toBe(false);
  });

  it('ships a partial batch once the deadline passes', () => {
    const decision = shouldShip(
      { claimCount: 3, deadlineAt: at(-1), urgency: 'standard' },
      T0,
    );

    expect(decision).toMatchObject({ ship: true, reason: 'deadline' });
  });

  it('holds a partial standard batch while time remains', () => {
    const decision = shouldShip(
      { claimCount: 3, deadlineAt: at(60_000), urgency: 'standard' },
      T0,
    );

    expect(decision).toMatchObject({ ship: false, reason: 'waiting' });
  });

  // Someone is watching a spinner. Latency beats cost per fact, and the policy
  // says so out loud rather than hiding it in a magic number.
  it('ships an interactive batch at the first claim', () => {
    const decision = shouldShip(
      { claimCount: 1, deadlineAt: at(15_000), urgency: 'interactive' },
      T0,
    );

    expect(decision).toMatchObject({ ship: true, reason: 'threshold' });
  });
});

describe('deadlineFor', () => {
  it('gives interactive work the shortest wait and backfill the longest', () => {
    const interactive = deadlineFor('interactive', T0).getTime();
    const standard = deadlineFor('standard', T0).getTime();
    const backfill = deadlineFor('backfill', T0).getTime();

    expect(interactive).toBeLessThan(standard);
    expect(standard).toBeLessThan(backfill);
  });

  it('keeps the interactive wait inside human patience', () => {
    // Past roughly two minutes a person assumes the thing is broken.
    expect(DEADLINE_POLICIES.interactive.maxWaitMs).toBeLessThanOrEqual(30_000);
  });
});

describe('proofsPerFact', () => {
  // The number the whole deadline policy is trading against. At one claim per
  // batch it is 1.0, meaning batching has bought precisely nothing.
  it('is 1.0 for a single claim and 0.1 for a full batch', () => {
    expect(proofsPerFact(1)).toBe(1);
    expect(proofsPerFact(MAX_BATCH_SIZE)).toBeCloseTo(0.1);
  });

  it('cannot improve past a full batch', () => {
    expect(proofsPerFact(MAX_BATCH_SIZE * 5)).toBeCloseTo(proofsPerFact(MAX_BATCH_SIZE));
  });

  it('is zero for an empty batch', () => {
    expect(proofsPerFact(0)).toBe(0);
  });
});
