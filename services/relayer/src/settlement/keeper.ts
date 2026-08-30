/**
 * Settlement.
 *
 * Submits a built batch to Creditcoin and interprets the outcome.
 *
 * The interpretation is the interesting part, because "the transaction reverted"
 * is not one condition.
 *
 * A revert on the replay guard means somebody else submitted the same proof
 * first, and that is a SUCCESS. The fact is on chain, submission is
 * permissionless, and a competing relayer landing it is the system working
 * exactly as designed. Treating it as a failure would make the relayer retry
 * forever against a fact that is already there.
 *
 * A revert on the emitter check or the receipt status means the claim itself was
 * wrong and will be wrong every time. Retrying burns a fresh proof to arrive at
 * the identical revert.
 *
 * A dropped transaction means nothing happened at all, and should be retried.
 *
 * Collapsing those three into one "it failed" is how a relayer either spins
 * forever on an impossible claim or abandons one that merely needed another
 * attempt.
 */

export type SettlementOutcome =
  | { kind: 'confirmed'; txHash: string; verifiedCount: number; gasUsed: bigint }
  /** Already on chain, submitted by someone else. Not an error. */
  | { kind: 'already-verified'; reason: string }
  /** The claim itself is invalid. Never retry. */
  | { kind: 'rejected'; reason: string; retryable: false }
  /** Transient. Retry with backoff. */
  | { kind: 'failed'; reason: string; retryable: true };

/**
 * Errors that mean the claim can never succeed.
 *
 * Matched by name because custom errors are what the contracts actually raise,
 * and the decoded error name is the only signal that survives the RPC boundary
 * intact. Every entry here corresponds to a guard with a test in Security.t.sol.
 */
const PERMANENT_ERRORS = [
  'TransactionReverted', // S1: the source transaction did not succeed
  'EmitterMismatch', // S2: not the pinned contract
  'TopicMismatch', // wrong event sitting at the named log
  'ChainKeyMismatch', // wrong source chain
  'SourceNotRegistered',
  'SourceDisabled',
  'LogIndexOutOfRange',
  'SubjectTopicMissing',
  'UnsupportedTransactionType',
] as const;

export function classify(error: unknown): SettlementOutcome {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('FactAlreadyVerified')) {
    return { kind: 'already-verified', reason: 'FactAlreadyVerified' };
  }

  for (const name of PERMANENT_ERRORS) {
    if (message.includes(name)) {
      return { kind: 'rejected', reason: name, retryable: false };
    }
  }

  return { kind: 'failed', reason: message.slice(0, 300), retryable: true };
}

export interface SubmitReceipt {
  txHash: string;
  verifiedCount: number;
  gasUsed: bigint;
}

export type SubmitFn = (payload: unknown) => Promise<SubmitReceipt>;

export class Keeper {
  constructor(private readonly submit: SubmitFn) {}

  async settle(payload: unknown): Promise<SettlementOutcome> {
    try {
      const receipt = await this.submit(payload);
      return { kind: 'confirmed', ...receipt };
    } catch (error) {
      return classify(error);
    }
  }
}
