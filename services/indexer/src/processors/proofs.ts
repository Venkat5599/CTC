/**
 * Proof processor.
 *
 * Caches proof artifacts and records what each submission cost.
 *
 * Proofs are cached because they are expensive to build and cheap to store, so
 * a failed submission should be retryable without paying the builder twice.
 * They carry an expiry because a continuity proof is only valid against the
 * attestation range it was built for -- serving a stale one would produce a
 * submission that fails at the precompile for reasons the logs would not
 * explain.
 */

import { prisma } from '../database/client';

export interface ProofArtifact {
  jobId: string;
  kind: 'INCLUSION' | 'CONTINUITY';
  txHash?: string;
  encodedTransaction?: string;
  merkleRoot?: string;
  siblings?: unknown;
  lowerEndpointDigest?: string;
  roots?: string[];
  sizeBytes?: number;
}

export async function storeProof(artifact: ProofArtifact, ttlMs = 30 * 60 * 1000) {
  return prisma.proof.create({
    data: {
      jobId: artifact.jobId,
      kind: artifact.kind,
      txHash: artifact.txHash,
      encodedTransaction: artifact.encodedTransaction,
      merkleRoot: artifact.merkleRoot,
      siblings: artifact.siblings as never,
      lowerEndpointDigest: artifact.lowerEndpointDigest,
      roots: artifact.roots as never,
      // The single best predictor of verification cost. A recent block sits
      // around ten hashes from a dense attestation; past roughly a day the
      // attestations become 1-per-1000-block checkpoints and the same proof
      // needs a thousand. Recorded so the gas table is built from real data
      // rather than from the docs.
      rootCount: artifact.roots?.length,
      sizeBytes: artifact.sizeBytes,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
}

/** A cached, unexpired continuity proof for a job, if one exists. */
export async function cachedContinuity(jobId: string) {
  return prisma.proof.findFirst({
    where: { jobId, kind: 'CONTINUITY', expiresAt: { gt: new Date() } },
    orderBy: { builtAt: 'desc' },
  });
}

export async function recordSubmission(input: {
  jobId: string;
  hash: string;
  submitter: string;
  claimCount: number;
}) {
  return prisma.transaction.create({
    data: {
      jobId: input.jobId,
      hash: input.hash,
      // Pays gas, grants nothing. The registry reads every subject from the
      // proven log, so this address cannot claim standing by submitting.
      submitter: input.submitter.toLowerCase(),
      claimCount: input.claimCount,
      status: 'PENDING',
    },
  });
}

export async function settleTransaction(
  hash: string,
  outcome: { status: 'CONFIRMED' | 'REVERTED'; blockNumber?: bigint; gasUsed?: bigint; verifiedCount?: number; revertReason?: string },
) {
  return prisma.transaction.update({
    where: { hash },
    data: {
      status: outcome.status,
      blockNumber: outcome.blockNumber,
      gasUsed: outcome.gasUsed,
      verifiedCount: outcome.verifiedCount ?? 0,
      revertReason: outcome.revertReason,
      confirmedAt: new Date(),
    },
  });
}

/**
 * Measured cost per fact, from real submissions.
 *
 * Reported rather than estimated. The benchmark harness measures against a mock
 * precompile and therefore excludes the real verification cost, so these are
 * the only numbers that describe what actually happened on chain.
 */
export async function costPerFact(): Promise<{
  submissions: number;
  facts: number;
  proofsPerFact: number;
} | null> {
  const confirmed = await prisma.transaction.findMany({
    where: { status: 'CONFIRMED' },
    select: { verifiedCount: true },
  });

  if (confirmed.length === 0) return null;

  const facts = confirmed.reduce((sum, tx) => sum + tx.verifiedCount, 0);
  if (facts === 0) return null;

  return {
    submissions: confirmed.length,
    facts,
    // One continuity proof per submission, so this is literally proofs over
    // facts. 1.0 means batching amortised nothing.
    proofsPerFact: confirmed.length / facts,
  };
}
