/**
 * Pipeline integration.
 *
 * Drives the whole off-chain half end to end: a source-chain log enters
 * discovery and a submission comes out the other side, through the real
 * scanner, the real queue, the real packer, the real proof assembly and the
 * real settlement classifier.
 *
 * Only the two genuine boundaries are faked -- the RPC that returns logs and
 * the chain that accepts a transaction -- because those are the two things a
 * test cannot own. Every decision between them is the production code path.
 *
 * The unit suites cover each stage in isolation. What this covers is the seams,
 * which is where the interesting failures actually live: a log index that
 * survives discovery but is recomputed during packing, a batch that groups
 * correctly but loses its ordering before submission, an outcome classified
 * right but applied to the wrong job.
 */

import { describe, expect, it } from 'vitest';

import { Relayer } from '../../services/relayer/src/main';
import { EventScanner, type Candidate } from '../../services/relayer/src/discovery/event-scanner';
import { SourceMonitor } from '../../services/relayer/src/discovery/source-monitor';
import { Keeper } from '../../services/relayer/src/settlement/keeper';
import { packBatches, MAX_BATCH_SIZE } from '@vouch/proof-engine';
import { buildSubmission, type ProofBuilderClient } from '@vouch/attestcoin';
import { AAVE_REPAYMENT } from '@vouch/schemas';

const CHAIN_ETHEREUM = 3;

function log(seed: number, block: bigint, logIndex = 0): Candidate {
  return {
    chainKey: CHAIN_ETHEREUM,
    blockNumber: block,
    txHash: `0x${seed.toString(16).padStart(64, '0')}` as `0x${string}`,
    logIndex,
    factType: AAVE_REPAYMENT.id,
    subject: `0x${seed.toString(16).padStart(40, '0')}` as `0x${string}`,
  };
}

/** A proof builder that records exactly what it was asked for. */
function recordingBuilder() {
  const continuityCalls: Array<[number, bigint, bigint]> = [];
  const txCalls: string[] = [];

  const client: ProofBuilderClient = {
    async continuityProof(chainKey, fromBlock, toBlock) {
      continuityCalls.push([chainKey, fromBlock, toBlock]);
      return {
        lowerEndpointDigest: '0xlower' as const,
        roots: Array.from({ length: 1000 }, (_, i) => `0x${i.toString(16)}` as `0x${string}`),
      };
    },
    async transactionProof(_chainKey, _block, txHash) {
      txCalls.push(txHash);
      return {
        encodedTransaction: `${txHash}ee` as `0x${string}`,
        merkleRoot: '0xroot' as const,
        siblings: [{ hash: '0xsib' as const, isLeft: true }],
      };
    },
  };

  return { client, continuityCalls, txCalls };
}

function pipeline(candidates: Candidate[][], settle?: () => Promise<never>) {
  const builder = recordingBuilder();
  const submitted: unknown[] = [];
  let call = 0;

  const relayer = new Relayer(
    {
      scanner: new EventScanner(
        { confirmedHead: async () => 30_000_000n, scan: async () => candidates[call++] ?? [] },
        20_000_000n,
      ),
      monitor: new SourceMonitor([
        { factType: AAVE_REPAYMENT.id, emitter: '0xpool', chainKey: CHAIN_ETHEREUM },
      ]),
      proofBuilder: builder.client,
      keeper: new Keeper(
        settle ??
          (async (payload) => {
            submitted.push(payload);
            return { txHash: '0xsettled', verifiedCount: 1, gasUsed: 100_000n };
          }),
      ),
      isVerified: async () => false,
    },
    { urgency: 'interactive' },
  );

  return { relayer, builder, submitted };
}

describe('discovery to submission', () => {
  it('carries a discovered log all the way to a submitted claim', async () => {
    const { relayer, builder, submitted } = pipeline([[log(1, 20_000_100n)]]);

    const result = await relayer.tick();

    expect(result).toEqual({ discovered: 1, shipped: 1 });
    expect(builder.txCalls).toHaveLength(1);
    expect(submitted).toHaveLength(1);
  });

  // The regression the contracts were fixed for. An index recomputed anywhere
  // along this path names nothing on the source chain, and the fact becomes
  // unclaimable rather than wrong -- which is worse, because nothing reports it.
  it('preserves the receipt-wide log index end to end', async () => {
    const { relayer, submitted } = pipeline([[log(1, 20_000_100n, 7)]]);

    await relayer.tick();

    const payload = submitted[0] as { claims: Array<{ logIndex: number }> };
    expect(payload.claims[0]?.logIndex).toBe(7);
  });

  // The economic argument, exercised rather than asserted: ten claims, one
  // continuity proof, and the ten need not belong to the same user.
  it('amortises one continuity proof across a full batch of different subjects', async () => {
    const claims = Array.from({ length: MAX_BATCH_SIZE }, (_, i) => log(i + 1, 20_000_000n + BigInt(i)));
    const { relayer, builder } = pipeline([claims]);

    await relayer.tick();

    expect(builder.continuityCalls).toHaveLength(1);
    expect(builder.txCalls).toHaveLength(MAX_BATCH_SIZE);
    expect(new Set(claims.map((c) => c.subject)).size).toBe(MAX_BATCH_SIZE);
  });

  it('asks for a continuity proof spanning the whole window, inclusive', async () => {
    const { relayer, builder } = pipeline([[log(1, 20_000_500n)]]);

    await relayer.tick();

    expect(builder.continuityCalls[0]).toEqual([CHAIN_ETHEREUM, 20_000_000n, 20_000_999n]);
  });

  // A window boundary is a protocol limit, not a heuristic: one continuity
  // proof cannot cover both sides of it, so a batch that straddled one would be
  // rejected on chain.
  it('splits across a window boundary and pays for two proofs', async () => {
    const { relayer, builder } = pipeline([[log(1, 20_000_999n), log(2, 20_001_000n)]]);

    await relayer.tick();

    expect(builder.continuityCalls).toHaveLength(2);
  });
});

describe('packing determinism across the seam', () => {
  // Two relayers running concurrently must partition identically, so the loser
  // reverts on the replay guard rather than writing a different set of facts.
  // That property is what makes the relayer safely replaceable by anyone.
  it('produces the same batches regardless of discovery order', () => {
    const claims = Array.from({ length: 25 }, (_, i) => log(i, 20_000_000n + BigInt(i * 41)));

    const forward = packBatches(claims);
    const reverse = packBatches([...claims].reverse());

    const shape = (batches: typeof forward) =>
      batches.map((b) => [b.windowStart.toString(), b.claims.map((c) => c.txHash)]);

    expect(shape(forward)).toEqual(shape(reverse));
  });
});

describe('settlement across the seam', () => {
  // Not a failure. Another relayer landed the fact first, which is what
  // permissionless submission means -- and the loop must clear the job rather
  // than retry against a fact that is already on chain.
  it('clears the job when another relayer wins the race', async () => {
    const { relayer } = pipeline([[log(1, 20_000_100n)]], async () => {
      throw new Error('execution reverted: FactAlreadyVerified(0xabc)');
    });

    const result = await relayer.tick();

    expect(result.shipped).toBe(1);
    expect(relayer.snapshot().jobs).toBe(0);
  });

  it('drops a claim rejected by an S2 guard rather than burning proofs on it', async () => {
    const { relayer } = pipeline([[log(1, 20_000_100n)]], async () => {
      throw new Error('execution reverted: EmitterMismatch(0xpool, 0xbad)');
    });

    await relayer.tick();

    expect(relayer.snapshot().jobs).toBe(0);
  });

  it('holds a transiently failed claim for another attempt', async () => {
    const { relayer } = pipeline([[log(1, 20_000_100n)]], async () => {
      throw new Error('ETIMEDOUT');
    });

    await relayer.tick();

    expect(relayer.snapshot().jobs).toBe(1);
    expect(relayer.snapshot().pendingClaims).toBe(1);
  });
});

describe('proof assembly', () => {
  it('pairs every claim in a batch with its own inclusion proof', async () => {
    const claims = Array.from({ length: 4 }, (_, i) => log(i + 1, 20_000_000n + BigInt(i)));
    const [batch] = packBatches(claims);
    const builder = recordingBuilder();

    const payload = await buildSubmission(builder.client, batch!);

    expect(payload.claims).toHaveLength(4);
    for (const [i, claim] of payload.claims.entries()) {
      expect(claim.encodedTransaction).toBe(`${batch!.claims[i]!.txHash}ee`);
    }
  });

  // Sparse checkpoints are the realistic case for old history, and they are
  // where batching actually pays: the 1000-root array is carried once per
  // transaction instead of once per claim.
  it('shares a sparse 1000-root proof across the batch', async () => {
    const claims = Array.from({ length: MAX_BATCH_SIZE }, (_, i) => log(i + 1, 20_000_000n + BigInt(i)));
    const [batch] = packBatches(claims);
    const builder = recordingBuilder();

    const payload = await buildSubmission(builder.client, batch!);

    expect(payload.continuity.roots).toHaveLength(1000);
    expect(builder.continuityCalls).toHaveLength(1);
  });
});
