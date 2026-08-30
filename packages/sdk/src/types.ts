/**
 * Public SDK types.
 *
 * The whole SDK exists to make one thing easy and one thing hard.
 *
 * Easy: asking whether an address has proven a fact. That is a single view call
 * and the API should not dress it up as anything more.
 *
 * Hard: mistaking the absence of a proof for the absence of the behaviour.
 * Inclusion proofs prove POSITIVE facts only -- Vouch can prove "this address
 * repaid", and can never prove "this address was never liquidated", because
 * absence of an event is not enumerable. So an unproven address is UNKNOWN, not
 * CLEAN, and the types below make that distinction impossible to lose: standing
 * is a three-state answer, never a boolean dressed as one.
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

/**
 * What Vouch can say about an address and a fact type.
 *
 * `unknown` is not a failure state and not a "no". It means Vouch has never been
 * shown a proof, which is the default condition of every address on earth.
 * A consumer that reads it as evidence of bad behaviour has misused the
 * protocol, and the name is chosen to make that misuse read as obviously wrong.
 */
export type StandingState = 'proven' | 'unknown';

export interface Standing {
  state: StandingState;
  /** How many proofs of this fact type exist. Zero when unknown. */
  count: number;
  /** Summed primary value across those proofs, in source-token units. */
  value: bigint;
}

export interface VerifiedFact {
  factId: Hex;
  subject: Address;
  factType: Hex;
  sourceChainKey: number;
  blockNumber: bigint;
  txHash: Hex;
  logIndex: number;
  emitter: Address;
  value: bigint;
  payloadHash: Hex;
  verifiedAt: Date;
}

export interface Passport {
  address: Address;
  totalProofs: number;
  /** Source-block bounds of proven activity. Null when nothing is proven. */
  firstSeenBlock: bigint | null;
  lastSeenBlock: bigint | null;
  tier: Tier;
}

/**
 * Tier is monotonic. The registry has no code path that removes or decrements a
 * fact, the passport is a pure function of the registry, and therefore no
 * sequence of operations can lower a tier. That is a structural guarantee rather
 * than a convention, which is why it is safe to cache a tier and never
 * invalidate downwards.
 */
export type Tier = 0 | 1 | 2 | 3;

export const TIER_NAMES: Record<Tier, string> = {
  0: 'Unproven',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
};

export interface VouchClientConfig {
  /** Deployed VouchRegistry. */
  registry: Address;
  /**
   * Deployed VouchPassport. Optional: the registry alone answers hasProof.
   *
   * Explicitly `| undefined` so a caller can pass through a value that may not
   * be deployed yet. `DEPLOYED` reports null for an undeployed contract rather
   * than a zero address, and a consumer forwarding that should not have to
   * branch before constructing a client.
   */
  passport?: Address | undefined;
  /** A viem PublicClient, or anything with the same readContract shape. */
  publicClient: ReadContract;
}

/** The minimum surface the SDK needs from a chain client. */
export interface ReadContract {
  readContract(args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
}

export class VouchError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'VouchError';
  }
}
