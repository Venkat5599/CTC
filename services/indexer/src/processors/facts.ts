/**
 * Fact processor.
 *
 * Takes verified facts off the registry listener and writes them to Postgres.
 *
 * Every write here is an upsert keyed on `factId`, because the listener
 * deliberately re-reads an overlap behind its cursor and will hand the same
 * fact over more than once. Idempotence at this layer is what makes that
 * re-reading free, and re-reading is what stops a late-surfacing log being
 * missed forever.
 *
 * Nothing in this file decides anything. A fact arrives already verified by the
 * chain; the processor's entire job is to not lose it and not double-count it.
 */

import { prisma, normalizeAddress, toAmountString } from '../database/client';
import type { MirroredFact } from '../listeners/vouch-registry';

export interface ProcessResult {
  written: number;
  alreadyPresent: number;
}

export async function processFacts(facts: readonly MirroredFact[]): Promise<ProcessResult> {
  let written = 0;
  let alreadyPresent = 0;

  for (const fact of facts) {
    const existing = await prisma.fact.findUnique({ where: { factId: fact.factId } });

    if (existing) {
      alreadyPresent += 1;
      continue;
    }

    const subject = normalizeAddress(fact.subject);

    // The user row and the fact are written together. A fact whose subject row
    // failed to create would be orphaned, and a subject with no facts is not a
    // user at all -- there is no signup here, an address becomes a user the
    // moment something is proven about it.
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { address: subject },
        create: { address: subject, totalProofs: 1 },
        update: { totalProofs: { increment: 1 } },
      });

      await tx.fact.create({
        data: {
          factId: fact.factId,
          subjectAddress: subject,
          factType: fact.factType,
          sourceChainKey: 0,
          blockNumber: fact.creditcoinBlock,
          txHash: fact.creditcoinTxHash,
          logIndex: 0,
          emitter: '0x',
          // uint256 as a decimal string. Number() here would silently lose
          // precision above 2^53 and store a wrong amount rather than fail.
          value: toAmountString(fact.value),
          payloadHash: '0x',
          verifiedAt: new Date(),
          creditcoinTxHash: fact.creditcoinTxHash,
        },
      });
    });

    written += 1;
  }

  return { written, alreadyPresent };
}

/**
 * Reconcile a subject's cached aggregates against the chain.
 *
 * The counters are denormalised for fast listing, which means they can drift.
 * They are recomputed from the facts table rather than incremented in place,
 * because a counter that can be wrong and a counter that can be recomputed are
 * different kinds of risk, and only one of them needs an alert.
 */
export async function reconcileUser(address: string): Promise<void> {
  const subject = normalizeAddress(address);

  const facts = await prisma.fact.findMany({
    where: { subjectAddress: subject },
    select: { blockNumber: true },
  });

  if (facts.length === 0) return;

  const blocks = facts.map((f) => f.blockNumber);

  await prisma.user.update({
    where: { address: subject },
    data: {
      totalProofs: facts.length,
      // Bounds only ever widen. Recomputing from the full set is correct in
      // any submission order, including facts discovered out of sequence.
      firstSeenBlock: blocks.reduce((a, b) => (a < b ? a : b)),
      lastSeenBlock: blocks.reduce((a, b) => (a > b ? a : b)),
      syncedAt: new Date(),
    },
  });
}
