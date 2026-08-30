import { describe, expect, it } from 'vitest';
import {
  CONTINUITY_WINDOW_BLOCKS,
  MAX_BATCH_SIZE,
  type PendingClaim,
  claimKey,
  continuityProofsRequired,
  excludeVerified,
  packBatches,
} from './BatchPacker.js';

const AAVE_REPAYMENT = '0xaaaa' as `0x${string}`;
const LONG_TERM_LP = '0xbbbb' as `0x${string}`;

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

describe('packBatches', () => {
  it('returns nothing for an empty set', () => {
    expect(packBatches([])).toEqual([]);
  });

  it('collapses N claims in one window to ceil(N / MAX_BATCH_SIZE) batches', () => {
    const claims = Array.from({ length: 25 }, (_, i) => claim(20_000_000n + BigInt(i), i));

    const batches = packBatches(claims);

    expect(batches).toHaveLength(Math.ceil(25 / MAX_BATCH_SIZE));
    expect(batches.every((b) => b.claims.length <= MAX_BATCH_SIZE)).toBe(true);
    expect(batches.flatMap((b) => b.claims)).toHaveLength(25);
  });

  it('reports the continuity proofs saved, which is the gas argument', () => {
    const claims = Array.from({ length: 1000 }, (_, i) => claim(20_000_000n + BigInt(i % 900), i));

    const { batched, unbatched, saved } = continuityProofsRequired(claims);

    expect(unbatched).toBe(1000);
    expect(batched).toBe(100);
    expect(saved).toBe(900);
  });

  // The protocol shares one continuity proof across a 1000-block window. A batch
  // spanning a window boundary would be rejected on chain, so the packer must
  // split there even when the batch is nowhere near full.
  it('never lets a batch straddle a continuity window boundary', () => {
    const claims = [claim(20_000_999n, 1), claim(20_001_000n, 2)];

    const batches = packBatches(claims);

    expect(batches).toHaveLength(2);
    expect(batches[0].windowStart).toBe(20_000_000n);
    expect(batches[1].windowStart).toBe(20_001_000n);
    for (const batch of batches) {
      for (const c of batch.claims) {
        expect(c.blockNumber >= batch.windowStart).toBe(true);
        expect(c.blockNumber < batch.windowEnd).toBe(true);
      }
    }
  });

  it('keeps every window span within the protocol limit', () => {
    const claims = Array.from({ length: 200 }, (_, i) => claim(20_000_000n + BigInt(i * 37), i));

    for (const batch of packBatches(claims)) {
      expect(batch.windowEnd - batch.windowStart).toBe(CONTINUITY_WINDOW_BLOCKS);
    }
  });

  // The point of a shared registry: ten different users' facts ride one proof.
  // A per-user packer would need ten.
  it('packs claims from different users into one batch', () => {
    const claims = Array.from({ length: MAX_BATCH_SIZE }, (_, i) =>
      claim(20_000_000n + BigInt(i), i, { subject: `0x${`${i}`.repeat(40)}` as `0x${string}` }),
    );

    const batches = packBatches(claims);

    expect(batches).toHaveLength(1);
    expect(new Set(batches[0].claims.map((c) => c.subject)).size).toBe(MAX_BATCH_SIZE);
  });

  it('separates claims from different source chains', () => {
    const batches = packBatches([
      claim(20_000_000n, 1, { chainKey: 3 }),
      claim(20_000_001n, 2, { chainKey: 1 }),
    ]);

    expect(batches).toHaveLength(2);
    expect(batches.map((b) => b.chainKey).sort()).toEqual([1, 3]);
  });

  // Two relayers running concurrently must produce identical batches, so the
  // loser's submissions revert on the replay guard rather than partitioning
  // differently and writing duplicates. Determinism is what makes the relayer
  // safely replaceable by anyone.
  it('is deterministic regardless of input order', () => {
    const claims = Array.from({ length: 40 }, (_, i) => claim(20_000_000n + BigInt(i * 13), i));
    const shuffled = [...claims].reverse();

    const a = packBatches(claims);
    const b = packBatches(shuffled);

    expect(JSON.stringify(a, replacer)).toBe(JSON.stringify(b, replacer));
  });

  it('anchors windows to absolute block multiples, not to the first claim seen', () => {
    // If windows were anchored to the first claim, dropping it would move every
    // later claim into a different window.
    const withEarly = packBatches([claim(20_000_500n, 1), claim(20_000_900n, 2)]);
    const withoutEarly = packBatches([claim(20_000_900n, 2)]);

    expect(withEarly[0].windowStart).toBe(20_000_000n);
    expect(withoutEarly[0].windowStart).toBe(20_000_000n);
  });

  it('orders claims within a batch by block, then transaction, then log', () => {
    const batch = packBatches([
      claim(20_000_005n, 9, { logIndex: 1 }),
      claim(20_000_005n, 9, { logIndex: 0 }),
      claim(20_000_001n, 3),
    ])[0];

    expect(batch.claims.map((c) => [c.blockNumber, c.logIndex])).toEqual([
      [20_000_001n, 0],
      [20_000_005n, 0],
      [20_000_005n, 1],
    ]);
  });
});

describe('claimKey', () => {
  // Mirrors ReplayGuard._factId, including factType. One log registered under
  // two fact types is two legitimate facts, so it must be two keys here too.
  it('distinguishes the same log claimed under different fact types', () => {
    const a = claim(20_000_000n, 1, { factType: AAVE_REPAYMENT });
    const b = claim(20_000_000n, 1, { factType: LONG_TERM_LP });

    expect(claimKey(a)).not.toBe(claimKey(b));
  });

  it('distinguishes different logs in the same transaction', () => {
    const a = claim(20_000_000n, 1, { logIndex: 0 });
    const b = claim(20_000_000n, 1, { logIndex: 1 });

    expect(claimKey(a)).not.toBe(claimKey(b));
  });
});

describe('excludeVerified', () => {
  it('drops claims already consumed on chain before a proof is spent on them', () => {
    const kept = claim(20_000_000n, 1);
    const already = claim(20_000_001n, 2);
    const verified = new Set([claimKey(already)]);

    const out = excludeVerified([kept, already], (key) => verified.has(key));

    expect(out).toEqual([kept]);
  });
});

function replacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}
