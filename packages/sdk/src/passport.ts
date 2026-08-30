/**
 * Aggregated standing.
 *
 * Two ways to read Vouch, both first-class. A consumer that wants precision
 * calls `registry.hasProof` for the exact fact it cares about. A consumer that
 * wants one number reads a tier from here. Neither is the "real" API -- the
 * lending market wants a tier, the access gate wants a specific fact, and
 * forcing either through the other's shape would make one of them worse.
 */

import type { Address, Passport, ReadContract, Tier } from './types';
import { TIER_NAMES, VouchError } from './types';
import type { Registry } from './registry';

export const PASSPORT_ABI = [
  {
    type: 'function',
    name: 'tierOf',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'passportOf',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'totalProofs', type: 'uint32' },
          { name: 'earliestFact', type: 'uint64' },
          { name: 'latestFact', type: 'uint64' },
          { name: 'tier', type: 'uint8' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'provenTenureBlocks',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint64' }],
  },
] as const;

export class PassportReader {
  constructor(
    private readonly address: Address,
    private readonly client: ReadContract,
  ) {}

  /**
   * Tier for an address.
   *
   * Safe to cache indefinitely in the upward direction and never safe to
   * invalidate downwards, because tier is monotonic by construction: the
   * registry cannot decrement, and the passport is a pure function of the
   * registry. A cached tier can only ever be stale-low, never stale-high.
   */
  async tierOf(user: Address): Promise<Tier> {
    const tier = Number(await this.read('tierOf', [user]));
    if (tier < 0 || tier > 3) {
      throw new VouchError(`VouchPassport returned an unexpected tier: ${tier}`);
    }
    return tier as Tier;
  }

  async tierName(user: Address): Promise<string> {
    return TIER_NAMES[await this.tierOf(user)];
  }

  async passportOf(user: Address): Promise<Passport> {
    const raw = (await this.read('passportOf', [user])) as Record<string, unknown>;

    const first = raw.earliestFact as bigint;
    const last = raw.latestFact as bigint;

    return {
      address: user,
      totalProofs: Number(raw.totalProofs),
      firstSeenBlock: first === 0n ? null : first,
      lastSeenBlock: last === 0n ? null : last,
      tier: Number(raw.tier) as Tier,
    };
  }

  /**
   * Span in source-chain blocks between the earliest and latest proven fact.
   *
   * Not a claim about account age. It is only what Vouch can actually prove --
   * an address active since 2019 whose first proof is from last month has a
   * proven tenure of one month, and saying otherwise would be inventing history.
   */
  async provenTenureBlocks(user: Address): Promise<bigint> {
    return (await this.read('provenTenureBlocks', [user])) as bigint;
  }

  private async read(functionName: string, args: readonly unknown[]): Promise<unknown> {
    try {
      return await this.client.readContract({
        address: this.address,
        abi: PASSPORT_ABI,
        functionName,
        args,
      });
    } catch (error) {
      throw new VouchError(`VouchPassport.${functionName} failed at ${this.address}`, error);
    }
  }
}

/**
 * Build a passport without a deployed VouchPassport contract.
 *
 * The passport is a pure function of the registry, so it can be computed
 * client-side from registry reads alone. Useful before the passport is deployed,
 * and useful as a check that the on-chain aggregation agrees with the facts it
 * aggregates.
 */
export async function passportFromRegistry(
  registry: Registry,
  user: Address,
  tierThresholds: readonly [number, number, number] = [1, 5, 12],
  tierFactType?: `0x${string}`,
): Promise<Passport> {
  const [total, bounds] = await Promise.all([registry.totalProofs(user), registry.bounds(user)]);

  let tier: Tier = 0;
  if (tierFactType) {
    const count = await registry.proofCount(user, tierFactType);
    const [bronze, silver, gold] = tierThresholds;
    tier = count >= gold ? 3 : count >= silver ? 2 : count >= bronze ? 1 : 0;
  }

  return {
    address: user,
    totalProofs: total,
    firstSeenBlock: bounds.first,
    lastSeenBlock: bounds.last,
    tier,
  };
}
