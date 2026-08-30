/**
 * Verification status and submission tracking.
 *
 * The read side of Vouch is instant. The write side is not: a fact has to be
 * discovered, queued, batched, proven and submitted before `hasProof` turns
 * true, and that takes anywhere from seconds to minutes depending on how full
 * the batch is. An integration that polls `hasProof` in a loop and shows nothing
 * in the meantime produces the worst user experience available -- a page that
 * looks broken while working correctly.
 *
 * So this module exposes the pipeline as observable stages. It is the only part
 * of the SDK that talks to the relayer rather than to the chain, and it is
 * deliberately optional: nothing here is required to consume Vouch, only to show
 * someone what is happening while they wait.
 */

import type { Address, Hex } from './types.js';
import { VouchError } from './types.js';

/**
 * Where a fact is in the pipeline:
 *
 *   Ethereum event -> discovery -> queue -> batch scheduler -> proof builder
 *   -> Attestcoin -> Creditcoin
 */
export type VerificationStage =
  | 'discovered'
  | 'queued'
  | 'building-proof'
  | 'submitting'
  | 'verified'
  /** The claim can never land. `reason` says which guard rejected it. */
  | 'rejected';

export interface VerificationStatus {
  stage: VerificationStage;
  subject: Address;
  factType: Hex;
  txHash: Hex | null;
  /** Creditcoin transaction, once submitted. */
  creditcoinTxHash: Hex | null;
  /** Position in the batch, so a UI can say "waiting for 3 more". */
  batchClaimCount: number | null;
  /** When the batch ships even if it never fills. */
  deadlineAt: Date | null;
  reason: string | null;
}

export interface RelayerClient {
  status(subject: Address, factType?: Hex): Promise<VerificationStatus[]>;
  /** Ask the relayer to prioritise this address. Advisory only. */
  request(subject: Address, factType: Hex): Promise<{ accepted: boolean; message: string }>;
}

export function createRelayerClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): RelayerClient {
  return {
    async status(subject, factType) {
      const url = new URL(`${baseUrl}/status`);
      url.searchParams.set('subject', subject);
      if (factType) url.searchParams.set('factType', factType);

      const response = await fetchImpl(url.toString());
      if (!response.ok) {
        throw new VouchError(`Relayer status failed: ${response.status}`);
      }

      const body = (await response.json()) as { statuses: RawStatus[] };
      return body.statuses.map(hydrate);
    },

    async request(subject, factType) {
      const response = await fetchImpl(`${baseUrl}/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subject, factType }),
      });

      if (!response.ok) {
        throw new VouchError(`Relayer request failed: ${response.status}`);
      }

      return (await response.json()) as { accepted: boolean; message: string };
    },
  };
}

interface RawStatus extends Omit<VerificationStatus, 'deadlineAt'> {
  deadlineAt: string | null;
}

function hydrate(raw: RawStatus): VerificationStatus {
  return { ...raw, deadlineAt: raw.deadlineAt ? new Date(raw.deadlineAt) : null };
}

/**
 * Human-readable progress, for a UI that has to say something while waiting.
 *
 * Each string names what the system is doing rather than what the user should
 * feel about it, because "almost there!" on a batch that is waiting for its
 * two-minute deadline is a lie the interface has no way to make true.
 */
export function describeStage(status: VerificationStatus): string {
  switch (status.stage) {
    case 'discovered':
      return 'Found on Ethereum. Not yet queued.';
    case 'queued':
      return status.batchClaimCount !== null
        ? `Queued. Batching with ${status.batchClaimCount} other claim${status.batchClaimCount === 1 ? '' : 's'}.`
        : 'Queued for the next batch.';
    case 'building-proof':
      return 'Building the Attestcoin proof.';
    case 'submitting':
      return 'Submitting to Creditcoin.';
    case 'verified':
      return 'Verified. Every Creditcoin app can now read this.';
    case 'rejected':
      return status.reason ?? 'Rejected.';
  }
}

/**
 * Poll until a fact is verified.
 *
 * Resolves on `verified`, and REJECTS on `rejected` rather than resolving false,
 * because the two outcomes need different handling and a boolean would let a
 * caller treat a permanently-invalid claim as merely slow.
 */
export async function waitForVerification(
  relayer: RelayerClient,
  subject: Address,
  factType: Hex,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<VerificationStatus> {
  const intervalMs = options.intervalMs ?? 5_000;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const [status] = await relayer.status(subject, factType);

    if (status?.stage === 'verified') return status;
    if (status?.stage === 'rejected') {
      throw new VouchError(`Verification rejected: ${status.reason ?? 'unknown reason'}`);
    }
    if (Date.now() >= deadline) {
      throw new VouchError(
        `Verification did not complete within ${timeoutMs}ms. The claim may still land later.`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
