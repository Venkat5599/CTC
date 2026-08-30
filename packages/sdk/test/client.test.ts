import { describe, expect, it, vi } from 'vitest';
import { createVouchClient } from '../src/client.js';
import { VouchError } from '../src/types.js';
import type { Address, Hex } from '../src/types.js';

const REGISTRY = '0x1111111111111111111111111111111111111111' as Address;
const PASSPORT = '0x2222222222222222222222222222222222222222' as Address;
const ALICE = '0xa11ce00000000000000000000000000000000000' as Address;
const REPAYMENT = `0x${'aa'.repeat(32)}` as Hex;
const LIQUIDITY = `0x${'bb'.repeat(32)}` as Hex;

/** A public client that answers from a fixture map. */
function stubClient(answers: Record<string, unknown>) {
  return {
    readContract: vi.fn(async ({ functionName, args }: { functionName: string; args?: readonly unknown[] }) => {
      const key = `${functionName}:${(args ?? []).join(',')}`;
      if (key in answers) return answers[key];
      if (functionName in answers) return answers[functionName];
      throw new Error(`unstubbed call: ${key}`);
    }),
  };
}

describe('hasProof', () => {
  it('is the whole integration', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      publicClient: stubClient({ [`hasProof:${ALICE},${REPAYMENT}`]: true }),
    });

    await expect(vouch.hasProof(ALICE, REPAYMENT)).resolves.toBe(true);
  });

  it('does not leak standing across fact types', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      publicClient: stubClient({
        [`hasProof:${ALICE},${REPAYMENT}`]: true,
        [`hasProof:${ALICE},${LIQUIDITY}`]: false,
      }),
    });

    await expect(vouch.hasProof(ALICE, REPAYMENT)).resolves.toBe(true);
    await expect(vouch.hasProof(ALICE, LIQUIDITY)).resolves.toBe(false);
  });
});

describe('standing', () => {
  // The distinction the whole SDK exists to protect. Inclusion proofs prove
  // positive facts only, so an address with no proofs is UNKNOWN -- a clean
  // history and an unproven one are indistinguishable, and a consumer must
  // never read the absence of a proof as evidence of bad behaviour.
  it('reports unknown rather than false when nothing is proven', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      publicClient: stubClient({ proofCount: 0, proofValue: 0n }),
    });

    const standing = await vouch.standing(ALICE, REPAYMENT);

    expect(standing.state).toBe('unknown');
    expect(standing.state).not.toBe('proven');
  });

  it('reports proven with count and summed value', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      publicClient: stubClient({ proofCount: 3, proofValue: 7_500_000n }),
    });

    await expect(vouch.standing(ALICE, REPAYMENT)).resolves.toEqual({
      state: 'proven',
      count: 3,
      value: 7_500_000n,
    });
  });
});

describe('passport', () => {
  // A silent tier 0 would be indistinguishable from a real one, so a consumer
  // would grant nothing while believing it had checked.
  it('throws rather than defaulting when no passport is configured', async () => {
    const vouch = createVouchClient({ registry: REGISTRY, publicClient: stubClient({}) });

    await expect(vouch.passportOf(ALICE)).rejects.toBeInstanceOf(VouchError);
  });

  it('maps zeroed block bounds to null rather than block zero', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      passport: PASSPORT,
      publicClient: stubClient({
        passportOf: { totalProofs: 0, earliestFact: 0n, latestFact: 0n, tier: 0 },
      }),
    });

    const passport = await vouch.passportOf(ALICE);

    expect(passport.firstSeenBlock).toBeNull();
    expect(passport.lastSeenBlock).toBeNull();
  });

  it('reads a real passport', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      passport: PASSPORT,
      publicClient: stubClient({
        passportOf: { totalProofs: 6, earliestFact: 19_000_000n, latestFact: 20_500_000n, tier: 2 },
      }),
    });

    await expect(vouch.passportOf(ALICE)).resolves.toEqual({
      address: ALICE,
      totalProofs: 6,
      firstSeenBlock: 19_000_000n,
      lastSeenBlock: 20_500_000n,
      tier: 2,
    });
  });
});

describe('multi-fact helpers', () => {
  it('hasAllProofs requires every fact', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      publicClient: stubClient({
        [`hasProof:${ALICE},${REPAYMENT}`]: true,
        [`hasProof:${ALICE},${LIQUIDITY}`]: false,
      }),
    });

    await expect(vouch.hasAllProofs(ALICE, [REPAYMENT, LIQUIDITY])).resolves.toBe(false);
    await expect(vouch.hasAnyProof(ALICE, [REPAYMENT, LIQUIDITY])).resolves.toBe(true);
  });
});

describe('error handling', () => {
  it('wraps an RPC failure with the contract and function that failed', async () => {
    const vouch = createVouchClient({
      registry: REGISTRY,
      publicClient: { readContract: vi.fn(async () => { throw new Error('rpc down'); }) },
    });

    await expect(vouch.hasProof(ALICE, REPAYMENT)).rejects.toThrow(/VouchRegistry\.hasProof/);
  });
});
