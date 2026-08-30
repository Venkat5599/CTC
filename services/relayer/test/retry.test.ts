import { describe, expect, it } from 'vitest';
import { BatchQueue } from '../src/scheduler/queue.js';
import { Keeper, classify } from '../src/settlement/keeper.js';
import { retryDelayMs } from '../src/scheduler/deadline.js';
import type { PendingClaim } from '../src/scheduler/batcher.js';

function claim(seed: number): PendingClaim {
  return {
    chainKey: 3,
    blockNumber: 20_000_000n + BigInt(seed),
    txHash: `0x${seed.toString(16).padStart(64, '0')}` as `0x${string}`,
    logIndex: 0,
    factType: '0xaaaa' as `0x${string}`,
    subject: '0xa11ce' as `0x${string}`,
  };
}

describe('classify', () => {
  // Not a failure. Proofs are public and submission is permissionless, so a
  // competing relayer landing the fact first is the design working. Treating it
  // as an error would make the relayer retry forever against a fact that is
  // already on chain.
  it('reads a replay-guard revert as success, not failure', () => {
    const outcome = classify(new Error('execution reverted: FactAlreadyVerified(0xabc)'));

    expect(outcome.kind).toBe('already-verified');
  });

  // Retrying any of these burns a fresh proof to reach the identical revert.
  it.each([
    ['TransactionReverted', 'S1: the source transaction did not succeed'],
    ['EmitterMismatch', 'S2: not the pinned contract'],
    ['TopicMismatch', 'wrong event at the named log'],
    ['ChainKeyMismatch', 'wrong source chain'],
    ['LogIndexOutOfRange', 'no log at that index'],
    ['SourceDisabled', 'source retired'],
  ])('treats %s as permanent', (error) => {
    const outcome = classify(new Error(`execution reverted: ${error}(...)`));

    expect(outcome).toMatchObject({ kind: 'rejected', retryable: false });
  });

  it('treats an unrecognised failure as transient', () => {
    const outcome = classify(new Error('socket hang up'));

    expect(outcome).toMatchObject({ kind: 'failed', retryable: true });
  });

  it('truncates a huge error rather than carrying it into the database', () => {
    const outcome = classify(new Error('x'.repeat(10_000)));

    expect(outcome.kind).toBe('failed');
    expect(outcome.reason.length).toBeLessThanOrEqual(300);
  });
});

describe('Keeper', () => {
  it('reports a confirmed submission', async () => {
    const keeper = new Keeper(async () => ({
      txHash: '0xdeadbeef',
      verifiedCount: 7,
      gasUsed: 123_456n,
    }));

    await expect(keeper.settle({})).resolves.toMatchObject({
      kind: 'confirmed',
      verifiedCount: 7,
    });
  });

  it('classifies a throw rather than propagating it', async () => {
    const keeper = new Keeper(async () => {
      throw new Error('execution reverted: EmitterMismatch(0x1, 0x2)');
    });

    await expect(keeper.settle({})).resolves.toMatchObject({ kind: 'rejected' });
  });
});

describe('retry backoff', () => {
  it('grows exponentially', () => {
    expect(retryDelayMs(1)).toBe(5_000);
    expect(retryDelayMs(2)).toBe(10_000);
    expect(retryDelayMs(3)).toBe(20_000);
  });

  // Without a ceiling a permanently broken job drifts into a retry interval
  // measured in hours, where nobody notices it any more.
  it('caps so a broken job stays visible', () => {
    expect(retryDelayMs(50)).toBe(300_000);
  });
});

describe('BatchQueue failure handling', () => {
  it('schedules a retry and holds the job back until it is due', () => {
    let now = new Date('2026-08-30T12:00:00Z');
    const queue = new BatchQueue({ urgency: 'interactive', now: () => now });

    queue.enqueue([claim(1)]);
    const [job] = queue.ready();
    queue.fail(job!.id, 'socket hang up');

    expect(queue.ready()).toHaveLength(0);

    now = new Date(now.getTime() + 10_000);
    expect(queue.ready()).toHaveLength(1);
  });

  // A job past its retry budget is KEPT, not dropped. Dropping it would make a
  // permanently failing job invisible, and an invisible failure in a system
  // whose entire value is "the fact eventually lands" is the worst outcome
  // available.
  it('keeps an exhausted job so it stays visible', () => {
    const queue = new BatchQueue({ urgency: 'interactive', maxAttempts: 2 });
    queue.enqueue([claim(2)]);
    const [job] = queue.ready();

    queue.fail(job!.id, 'boom');
    queue.fail(job!.id, 'boom');

    expect(queue.size).toBe(1);
    expect(queue.stuck()).toHaveLength(1);
    expect(queue.ready()).toHaveLength(0);
  });
});
