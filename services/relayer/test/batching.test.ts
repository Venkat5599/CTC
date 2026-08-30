import { describe, expect, it } from 'vitest';
import { BatchQueue } from '../src/scheduler/queue.js';
import { MAX_BATCH_SIZE, type PendingClaim } from '../src/scheduler/batcher.js';

const AAVE_REPAYMENT = '0xaaaa' as `0x${string}`;

function claim(blockNumber: bigint, seed: number, overrides: Partial<PendingClaim> = {}): PendingClaim {
  return {
    chainKey: 3,
    blockNumber,
    txHash: `0x${seed.toString(16).padStart(64, '0')}` as `0x${string}`,
    logIndex: 0,
    factType: AAVE_REPAYMENT,
    subject: `0x${seed.toString(16).padStart(40, '0')}` as `0x${string}`,
    ...overrides,
  };
}

describe('BatchQueue', () => {
  it('groups claims in one window into a single job', () => {
    const queue = new BatchQueue();

    queue.enqueue(Array.from({ length: 5 }, (_, i) => claim(20_000_000n + BigInt(i), i)));

    expect(queue.size).toBe(1);
    expect(queue.pendingClaims).toBe(5);
  });

  // Discovery re-scans an overlap behind its cursor on every pass, so the same
  // claim arriving twice is normal operation rather than a bug. Deduplicating
  // here means a restart does not spend proofs re-proving what is already
  // queued.
  it('ignores a claim it has already seen', () => {
    const queue = new BatchQueue();
    const duplicate = claim(20_000_000n, 1);

    queue.enqueue([duplicate]);
    queue.enqueue([duplicate]);

    expect(queue.pendingClaims).toBe(1);
  });

  it('splits at a continuity window boundary even when the batch is not full', () => {
    const queue = new BatchQueue();

    queue.enqueue([claim(20_000_999n, 1), claim(20_001_000n, 2)]);

    expect(queue.size).toBe(2);
  });

  // The property only a shared registry has: ten strangers' facts ride one
  // continuity proof, where ten separate integrations would need ten.
  it('packs claims from different subjects into one job', () => {
    const queue = new BatchQueue();

    queue.enqueue(
      Array.from({ length: MAX_BATCH_SIZE }, (_, i) =>
        claim(20_000_000n + BigInt(i), i, {
          subject: `0x${`${i}`.repeat(40)}` as `0x${string}`,
        }),
    ));

    expect(queue.size).toBe(1);
    expect(queue.pendingClaims).toBe(MAX_BATCH_SIZE);
  });

  it('ships a full batch immediately, without waiting for the deadline', () => {
    const queue = new BatchQueue({ urgency: 'backfill' });

    queue.enqueue(Array.from({ length: MAX_BATCH_SIZE }, (_, i) => claim(20_000_000n + BigInt(i), i)));

    expect(queue.ready()).toHaveLength(1);
  });

  it('holds a partial backfill batch open', () => {
    const queue = new BatchQueue({ urgency: 'backfill' });

    queue.enqueue([claim(20_000_000n, 1)]);

    expect(queue.ready()).toHaveLength(0);
  });

  it('drops a job once it lands', () => {
    const queue = new BatchQueue({ urgency: 'interactive' });
    queue.enqueue([claim(20_000_000n, 1)]);

    const [job] = queue.ready();
    queue.complete(job!.id);

    expect(queue.size).toBe(0);
  });
});
