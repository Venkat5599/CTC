import { prisma, normalizeAddress, toAmountString } from '../database/client';
import type { MirroredFact } from '../listeners/vouch-registry';

export interface ProcessResult {
  written: number;
  alreadyPresent: number;
  /// Facts the registry would not return. Counted, never written.
  unresolved: number;
}

/**
 * The full fact as the registry stores it.
 *
 * `FactVerified` carries only (factId, subject, factType, value) -- it is an
 * index, not a record. Every other column the Fact table requires (source
 * chain, block, txHash, logIndex, emitter, payloadHash) exists ONLY on chain,
 * so the indexer has to go and read it.
 */
export interface RegistryFact {
  sourceChainKey: number;
  blockNumber: bigint;
  txHash: string;
  logIndex: number;
  emitter: string;
  payloadHash: string;
  verifiedAt: Date;
}

/** Reads the canonical fact from the registry. Returns null if absent. */
export type FactReader = (factId: string) => Promise<RegistryFact | null>;

/**
 * Mirror verified facts into Postgres.
 *
 * WHY A READER IS REQUIRED, AND NOT OPTIONAL.
 *
 * The previous version of this function filled the columns the event does not
 * carry with placeholders -- `sourceChainKey: 0`, `logIndex: 0`, `emitter: '0x'`,
 * `payloadHash: '0x'`. Every row it wrote asserted that the fact came from chain
 * 0 and was emitted by `0x`, and nothing anywhere said otherwise. That is the
 * precise failure this protocol exists to argue against: a value that was never
 * verified, stored in the shape of one that was, in a table an operator will
 * later read as truth. `emitter` in particular is the S2 field -- writing `0x`
 * into it inverts the meaning of the only column that distinguishes a real
 * repayment from a self-issued one.
 *
 * So the reader is mandatory. A fact the registry will not return is counted as
 * `unresolved` and left unwritten, because a missing row is recoverable on the
 * next poll and a fabricated one is not.
 */
export async function processFacts(
  facts: readonly MirroredFact[],
  readFact: FactReader,
): Promise<ProcessResult> {
  let written = 0;
  let alreadyPresent = 0;
  let unresolved = 0;

  for (const fact of facts) {
    const detail = await readFact(fact.factId);

    // Absent from the registry means the mirror is ahead of the node it reads,
    // or reading a reorged block. Both resolve on a later poll. Writing a
    // partial row now would make the gap permanent and invisible.
    if (detail === null) {
      unresolved += 1;
      continue;
    }

    const subject = normalizeAddress(fact.subject);

    // The user row and the fact are written together. A fact whose subject row
    // failed to create would be orphaned, and a subject with no facts is not a
    // user at all -- there is no signup here, an address becomes a user the
    // moment something is proven about it.
    //
    // `create` is guarded by `factId` being the primary key rather than by a
    // preceding `findUnique`: the read-then-write version raced two pollers
    // against each other and double-counted `totalProofs`, because the check and
    // the increment were separate round trips. Letting the unique constraint
    // arbitrate makes the poller idempotent and safe to run more than once.
    try {
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
            sourceChainKey: detail.sourceChainKey,
            blockNumber: detail.blockNumber,
            txHash: detail.txHash,
            logIndex: detail.logIndex,
            emitter: normalizeAddress(detail.emitter),
            value: toAmountString(fact.value),
            payloadHash: detail.payloadHash,
            verifiedAt: detail.verifiedAt,
            creditcoinTxHash: fact.creditcoinTxHash,
          },
        });
      });

      written += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        alreadyPresent += 1;
        continue;
      }
      throw error;
    }
  }

  return { written, alreadyPresent, unresolved };
}

/** Prisma's unique-constraint code. A duplicate factId is expected, not an error. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

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
      firstSeenBlock: blocks.reduce((a, b) => (a < b ? a : b)),
      lastSeenBlock: blocks.reduce((a, b) => (a > b ? a : b)),
      syncedAt: new Date(),
    },
  });
}
