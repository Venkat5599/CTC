/**
 * BatchPacker
 *
 * Groups pending fact claims into Attestcoin batches.
 *
 * The protocol allows one continuity proof to be shared across up to
 * MAX_BATCH_SIZE claims, provided every claim falls inside the same
 * CONTINUITY_WINDOW_BLOCKS window on the source chain. Building a continuity
 * proof is the expensive part of a submission -- for history older than about a
 * day, attestations are replaced by sparse one-per-1000-block checkpoints, so
 * the proof carries roughly a thousand roots and the payload runs to tens of
 * kilobytes. Sharing it is the entire economic argument for a shared registry.
 *
 * The property worth stating plainly: nothing requires the claims in a batch to
 * belong to the same USER. That is what makes cross-user packing possible, and
 * it is why Vouch amortises verification in a way a single-application
 * integration cannot. Ten users' facts in one window ride one proof.
 */

/** Attestcoin protocol limit: claims sharing one continuity proof. */
export const MAX_BATCH_SIZE = 10;

/** Attestcoin protocol limit: source-chain span one continuity proof covers. */
export const CONTINUITY_WINDOW_BLOCKS = 1000n;

export interface PendingClaim {
  /** Attestcoin chain key. NOT an EVM chainId. */
  chainKey: number;
  blockNumber: bigint;
  txHash: `0x${string}`;
  /** Receipt-wide index of the log being claimed. */
  logIndex: number;
  factType: `0x${string}`;
  /** The address the fact is about, read from the log rather than supplied. */
  subject: `0x${string}`;
}

export interface Batch {
  chainKey: number;
  /** Inclusive lower bound of the window this batch's continuity proof covers. */
  windowStart: bigint;
  /** Exclusive upper bound. */
  windowEnd: bigint;
  claims: PendingClaim[];
}

/**
 * Deterministically group claims into batches.
 *
 * Determinism matters more than it looks. Two relayers running concurrently
 * against the same pending set produce identical batches, so the second one's
 * submissions revert on the replay guard rather than writing duplicate facts or
 * racing to a different partition. The relayer is untrusted and replaceable by
 * design; making its output a pure function of its input is what lets anyone run
 * one without coordinating.
 */
export function packBatches(claims: readonly PendingClaim[]): Batch[] {
  if (claims.length === 0) return [];

  const byChain = new Map<number, PendingClaim[]>();
  for (const claim of claims) {
    const bucket = byChain.get(claim.chainKey);
    if (bucket) bucket.push(claim);
    else byChain.set(claim.chainKey, [claim]);
  }

  const batches: Batch[] = [];

  for (const chainKey of [...byChain.keys()].sort((a, b) => a - b)) {
    const sorted = [...byChain.get(chainKey)!].sort(compareClaims);

    // Windows are anchored to absolute multiples of CONTINUITY_WINDOW_BLOCKS
    // rather than to the first claim seen. Anchoring to the first claim would
    // make the partition depend on which claims happen to be pending, so the
    // same block could land in different windows on different runs and the
    // determinism above would be lost.
    let current: Batch | null = null;

    for (const claim of sorted) {
      const windowStart = (claim.blockNumber / CONTINUITY_WINDOW_BLOCKS) * CONTINUITY_WINDOW_BLOCKS;

      const fits =
        current !== null &&
        current.windowStart === windowStart &&
        current.claims.length < MAX_BATCH_SIZE;

      if (!fits) {
        current = {
          chainKey,
          windowStart,
          windowEnd: windowStart + CONTINUITY_WINDOW_BLOCKS,
          claims: [],
        };
        batches.push(current);
      }

      current!.claims.push(claim);
    }
  }

  return batches;
}

/**
 * Continuity proofs required for a set of claims, versus submitting each alone.
 *
 * This is the number the gas table is built from. It is reported rather than
 * estimated in CTC, because the per-proof cost depends on how far the source
 * block sits from an attestation and that is not knowable from the claim set.
 */
export function continuityProofsRequired(claims: readonly PendingClaim[]): {
  batched: number;
  unbatched: number;
  saved: number;
} {
  const batched = packBatches(claims).length;
  const unbatched = claims.length;
  return { batched, unbatched, saved: unbatched - batched };
}

/**
 * Stable ordering: block, then transaction, then log.
 *
 * Sorting by txHash rather than by arrival time is what makes the partition
 * independent of the order the indexer happened to discover things in.
 */
function compareClaims(a: PendingClaim, b: PendingClaim): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  if (a.txHash !== b.txHash) return a.txHash < b.txHash ? -1 : 1;
  return a.logIndex - b.logIndex;
}

/**
 * A claim's identity, matching `ReplayGuard._factId` on chain.
 *
 * Used to drop claims the registry has already consumed before spending a proof
 * on them. Deliberately mirrors the contract's key including factType, so a log
 * legitimately registered under two fact types is two entries here as well.
 */
export function claimKey(claim: PendingClaim): string {
  return [claim.chainKey, claim.blockNumber, claim.txHash, claim.factType, claim.logIndex].join(':');
}

/** Drop claims already verified on chain. */
export function excludeVerified(
  claims: readonly PendingClaim[],
  isVerified: (key: string) => boolean,
): PendingClaim[] {
  return claims.filter((claim) => !isVerified(claimKey(claim)));
}
