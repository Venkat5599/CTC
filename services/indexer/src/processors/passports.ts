/**
 * Passport processor.
 *
 * Maintains the join between a subject and the facts that constitute their
 * standing, so a passport page answers in one query instead of fanning out over
 * RPC.
 *
 * Two invariants this file exists to preserve.
 *
 * Rows are never removed. Standing is monotonic on chain, and a join table that
 * could shrink would quietly reintroduce the falling tier the contracts went to
 * some trouble to make structurally impossible.
 *
 * `sequence` is assigned per fact type in source-block order, not arrival order.
 * The relayer submits whatever it discovers whenever it discovers it, so a 2019
 * repayment can land after a 2024 one; numbering by arrival would produce a
 * timeline that reorders itself as history is backfilled.
 */

import { prisma, normalizeAddress } from '../database/client';

const TIER_THRESHOLDS = [1, 5, 12] as const;

export async function linkFactToPassport(
  address: string,
  factId: string,
  factType: string,
  sourceBlockNumber: bigint,
): Promise<void> {
  const userAddress = normalizeAddress(address);

  const existing = await prisma.passportFact.findUnique({
    where: { userAddress_factId: { userAddress, factId } },
  });
  if (existing) return;

  // Position among this address's facts of this type, ordered by source block.
  const earlier = await prisma.passportFact.count({
    where: { userAddress, factType, sourceBlockNumber: { lt: sourceBlockNumber } },
  });

  await prisma.$transaction(async (tx) => {
    // A backfilled older fact takes a sequence number that later facts already
    // hold, so everything at or after it shifts up. Costly on paper, rare in
    // practice, and correct -- which matters more than fast for a timeline
    // somebody reads.
    await tx.passportFact.updateMany({
      where: { userAddress, factType, sequence: { gte: earlier } },
      data: { sequence: { increment: 1 } },
    });

    await tx.passportFact.create({
      data: {
        userAddress,
        factId,
        factType,
        sequence: earlier,
        sourceBlockNumber,
        contributesToTier: true,
      },
    });
  });
}

/**
 * Recompute a cached tier.
 *
 * Mirrors `VouchPassport.tierOf` exactly. If the two ever disagree the chain
 * wins, so this is written to be recomputed rather than trusted, and the
 * assertion below catches a regression rather than papering over it.
 */
export async function recomputeTier(address: string, tierFactType: string): Promise<number> {
  const userAddress = normalizeAddress(address);

  const count = await prisma.passportFact.count({
    where: { userAddress, factType: tierFactType, contributesToTier: true },
  });

  const [bronze, silver, gold] = TIER_THRESHOLDS;
  const tier = count >= gold ? 3 : count >= silver ? 2 : count >= bronze ? 1 : 0;

  const current = await prisma.user.findUnique({
    where: { address: userAddress },
    select: { tier: true },
  });

  // A recomputed tier below the stored one means either the join table lost a
  // row or the thresholds changed. Both are bugs worth surfacing rather than
  // silently writing a lower number into a field the whole design promises can
  // only rise.
  if (current && tier < current.tier) {
    throw new Error(
      `Tier for ${userAddress} would fall from ${current.tier} to ${tier}. Standing is monotonic; this is a bug, not a downgrade.`,
    );
  }

  await prisma.user.update({ where: { address: userAddress }, data: { tier } });
  return tier;
}
