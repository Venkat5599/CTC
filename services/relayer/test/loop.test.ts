import { describe, expect, it, vi } from 'vitest';
import { Relayer } from '../src/main';
import { EventScanner, type Candidate } from '../src/discovery/event-scanner';
import { SourceMonitor } from '../src/discovery/source-monitor';
import { Keeper } from '../src/settlement/keeper';
import type { ProofBuilderClient } from '../src/proof/builder';

const FACT = '0xaaaa' as `0x${string}`;

function candidate(seed: number, block = 20_000_000n): Candidate {
  return {
    chainKey: 3,
    blockNumber: block + BigInt(seed),
    txHash: `0x${seed.toString(16).padStart(64, '0')}` as `0x${string}`,
    logIndex: 0,
    factType: FACT,
    subject: '0xa11ce' as `0x${string}`,
  };
}

function scanner(batches: Candidate[][]) {
  let call = 0;
  return new EventScanner(
    {
      confirmedHead: async () => 30_000_000n,
      scan: async () => batches[call++] ?? [],
    },
    20_000_000n,
  );
}

function proofBuilder(): ProofBuilderClient {
  return {
    async continuityProof() {
      return { lowerEndpointDigest: '0xlower' as const, roots: ['0xa' as const] };
    },
    async transactionProof(_c, _b, txHash) {
      return {
        encodedTransaction: `${txHash}ff` as `0x${string}`,
        merkleRoot: '0xroot' as const,
        siblings: [],
      };
    },
  };
}

function relayer(overrides: {
  batches?: Candidate[][];
  settle?: () => Promise<{ txHash: string; verifiedCount: number; gasUsed: bigint }>;
  isVerified?: (key: string) => Promise<boolean>;
} = {}) {
  const outcomes: string[] = [];

  const instance = new Relayer({
    scanner: scanner(overrides.batches ?? [[candidate(1)]]),
    monitor: new SourceMonitor([{ factType: FACT, emitter: '0xpool', chainKey: 3 }]),
    proofBuilder: proofBuilder(),
    keeper: new Keeper(
      overrides.settle ??
        (async () => ({ txHash: '0xdead', verifiedCount: 1, gasUsed: 1n })),
    ),
    isVerified: overrides.isVerified ?? (async () => false),
    onOutcome: (_job, outcome) => {
      outcomes.push(outcome.kind);
    },
  },
  // Interactive so a single discovered fact ships in this pass. A standard
  // relayer would correctly hold it for two minutes waiting for company, which
  // is the behaviour the deadline suite covers.
  { urgency: "interactive" });

  return { instance, outcomes };
}

describe('relayer loop', () => {
  it('discovers, batches and ships in one pass', async () => {
    const { instance, outcomes } = relayer();

    const result = await instance.tick();

    expect(result.discovered).toBe(1);
    expect(result.shipped).toBe(1);
    expect(outcomes).toEqual(['confirmed']);
  });

  // A proof is the expensive resource. Spending one to re-prove a fact that is
  // already on chain is the single most wasteful thing this loop could do.
  it('never spends a proof on a fact already verified', async () => {
    const { instance, outcomes } = relayer({ isVerified: async () => true });

    const result = await instance.tick();

    expect(result.discovered).toBe(1);
    expect(result.shipped).toBe(0);
    expect(outcomes).toEqual([]);
  });

  // Someone else landed the fact first. That is what permissionless submission
  // means, and treating it as a failure would make the relayer retry forever
  // against a fact that is already there.
  it('treats a replay-guard revert as success and clears the job', async () => {
    const { instance, outcomes } = relayer({
      settle: async () => {
        throw new Error('execution reverted: FactAlreadyVerified(0xabc)');
      },
    });

    const result = await instance.tick();

    expect(outcomes).toEqual(['already-verified']);
    expect(result.shipped).toBe(1);
    expect(instance.snapshot().jobs).toBe(0);
  });

  // Permanent. Keeping it queued would burn a fresh proof on every tick to
  // arrive at the identical revert.
  it('drops a permanently rejected job rather than retrying it', async () => {
    const { instance, outcomes } = relayer({
      settle: async () => {
        throw new Error('execution reverted: EmitterMismatch(0x1, 0x2)');
      },
    });

    await instance.tick();

    expect(outcomes).toEqual(['rejected']);
    expect(instance.snapshot().jobs).toBe(0);
  });

  it('keeps a transiently failed job for retry', async () => {
    const { instance } = relayer({
      settle: async () => {
        throw new Error('socket hang up');
      },
    });

    await instance.tick();

    expect(instance.snapshot().jobs).toBe(1);
  });

  // Discovery failing must not take the process down. The cursor does not
  // advance, so the next tick re-reads the same range and nothing is lost.
  it('survives a discovery failure without crashing', async () => {
    const onError = vi.fn();
    const instance = new Relayer({
      scanner: new EventScanner(
        {
          confirmedHead: async () => {
            throw new Error('rpc down');
          },
          scan: async () => [],
        },
        20_000_000n,
      ),
      monitor: new SourceMonitor([]),
      proofBuilder: proofBuilder(),
      keeper: new Keeper(async () => ({ txHash: '0x', verifiedCount: 0, gasUsed: 0n })),
      isVerified: async () => false,
      onError,
    });

    await expect(instance.tick()).resolves.toEqual({ discovered: 0, shipped: 0 });
    expect(onError).toHaveBeenCalledWith('discovery', expect.any(Error));
  });

  // Every way of misconfiguring a source produces silence, not an error, so
  // silence has to be reported as a condition somebody looks at.
  it('reports a source that has never produced a fact', async () => {
    const { instance } = relayer({ batches: [[]] });

    await instance.tick();

    const [source] = instance.snapshot().sources;
    expect(source?.suspicious).toBe(true);
    expect(source?.note).toMatch(/topic0, emitter and chainKey/);
  });

  it('marks a source healthy once it produces a fact', async () => {
    const { instance } = relayer({ batches: [[candidate(1)]] });

    await instance.tick();

    expect(instance.snapshot().sources[0]?.suspicious).toBe(false);
  });
});
