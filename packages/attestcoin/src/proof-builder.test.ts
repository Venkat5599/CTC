import { describe, expect, it, vi } from 'vitest';
import type { Batch } from '@vouch/proof-engine';
import {
  type ProofBuilderClient,
  ProofBuilderError,
  buildSubmission,
  createProofBuilderClient,
} from './proof-builder.js';

function stubClient(): ProofBuilderClient & { continuityCalls: number; txCalls: number } {
  const client = {
    continuityCalls: 0,
    txCalls: 0,
    async continuityProof() {
      client.continuityCalls++;
      return { lowerEndpointDigest: '0xlower' as const, roots: ['0xa', '0xb'] as `0x${string}`[] };
    },
    async transactionProof(_chainKey: number, _blockNumber: bigint, txHash: `0x${string}`) {
      client.txCalls++;
      return {
        encodedTransaction: `${txHash}ff` as `0x${string}`,
        merkleRoot: '0xroot' as const,
        siblings: [{ hash: '0xsib' as const, isLeft: true }],
      };
    },
  };
  return client as never;
}

function batchOf(count: number): Batch {
  return {
    chainKey: 3,
    windowStart: 20_000_000n,
    windowEnd: 20_001_000n,
    claims: Array.from({ length: count }, (_, i) => ({
      chainKey: 3,
      blockNumber: 20_000_000n + BigInt(i),
      txHash: `0x${i.toString(16).padStart(64, '0')}` as `0x${string}`,
      logIndex: i,
      factType: '0xaaaa' as `0x${string}`,
      subject: '0xa11ce' as `0x${string}`,
    })),
  };
}

describe('buildSubmission', () => {
  // The batching argument in one assertion: ten claims, one continuity proof.
  it('requests exactly one continuity proof for the whole batch', async () => {
    const client = stubClient();

    await buildSubmission(client, batchOf(10));

    expect(client.continuityCalls).toBe(1);
    expect(client.txCalls).toBe(10);
  });

  it('covers the full continuity window, inclusive of its last block', async () => {
    const client = stubClient();
    const spy = vi.spyOn(client, 'continuityProof');

    await buildSubmission(client, batchOf(3));

    expect(spy).toHaveBeenCalledWith(3, 20_000_000n, 20_000_999n);
  });

  it('preserves the packer ordering so a competing relayer loses on the replay guard', async () => {
    const batch = batchOf(4);

    const payload = await buildSubmission(stubClient(), batch);

    expect(payload.claims.map((c) => c.txHash)).toEqual(batch.claims.map((c) => c.txHash));
  });

  // The regression the contracts were fixed for: the index must survive the
  // pipeline untouched, never be recomputed by position in the batch.
  it('passes the receipt-wide log index through unchanged', async () => {
    const batch = batchOf(3);
    batch.claims[0]!.logIndex = 7;
    batch.claims[1]!.logIndex = 0;
    batch.claims[2]!.logIndex = 42;

    const payload = await buildSubmission(stubClient(), batch);

    expect(payload.claims.map((c) => c.logIndex)).toEqual([7, 0, 42]);
  });

  it('pairs each claim with its own transaction proof', async () => {
    const batch = batchOf(3);

    const payload = await buildSubmission(stubClient(), batch);

    for (const [i, claim] of payload.claims.entries()) {
      expect(claim.encodedTransaction).toBe(`${batch.claims[i]!.txHash}ff`);
    }
  });
});

describe('createProofBuilderClient', () => {
  // A proof that cannot be built is a fact that will never land. Swallowing the
  // failure would make it indistinguishable downstream from "this user has no
  // history", which is the worst possible confusion for a standing registry.
  it('throws rather than returning a partial result on a failed request', async () => {
    const failing = vi.fn(async () => new Response('upstream down', { status: 503 }));
    const client = createProofBuilderClient('https://example.invalid', failing as never);

    await expect(client.continuityProof(3, 1n, 2n)).rejects.toBeInstanceOf(ProofBuilderError);
  });

  it('serialises block numbers as strings, since JSON has no bigint', async () => {
    const capture = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ lowerEndpointDigest: '0x0', roots: [] }),
    );
    const client = createProofBuilderClient('https://example.invalid', capture as never);

    await client.continuityProof(3, 20_000_000n, 20_000_999n);

    const body = JSON.parse(capture.mock.calls[0]![1].body as string);
    expect(body).toEqual({ chainKey: 3, fromBlock: '20000000', toBlock: '20000999' });
  });
});
