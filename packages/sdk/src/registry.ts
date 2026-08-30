/**
 * The registry read surface.
 *
 * This is the whole integration for most consumers:
 *
 *     if (await vouch.hasProof(user, AAVE_REPAYMENT.id)) {
 *       // grant the benefit
 *     }
 *
 * No ASC to write, no off-chain worker to run, no proof gas to pay. The first
 * consumer to verify a fact pays for it; every consumer after that reads an
 * SLOAD. On chain the same call is a single view function, which is why the
 * contracts deliberately expose `hasProof` rather than making callers reconstruct
 * standing from an event log.
 */

import type { Address, Hex, ReadContract, Standing, VerifiedFact } from './types.js';
import { VouchError } from './types.js';

/** Minimal ABI: only what the SDK reads. Kept narrow so a contract change that
 *  matters here fails loudly rather than being absorbed by an over-broad ABI. */
export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'hasProof',
    stateMutability: 'view',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'factType', type: 'bytes32' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'proofCount',
    stateMutability: 'view',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'factType', type: 'bytes32' },
    ],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'proofValue',
    stateMutability: 'view',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'factType', type: 'bytes32' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'factIdsOf',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ type: 'bytes32[]' }],
  },
  {
    type: 'function',
    name: 'getFact',
    stateMutability: 'view',
    inputs: [{ name: 'factId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'factId', type: 'bytes32' },
          { name: 'sourceChain', type: 'uint64' },
          { name: 'blockNumber', type: 'uint64' },
          { name: 'txHash', type: 'bytes32' },
          { name: 'logIndex', type: 'uint32' },
          { name: 'subject', type: 'address' },
          { name: 'emitter', type: 'address' },
          { name: 'factType', type: 'bytes32' },
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'value', type: 'uint256' },
          { name: 'verifiedAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'firstSeen',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'lastSeen',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'totalProofs',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ type: 'uint32' }],
  },
] as const;

export class Registry {
  constructor(
    private readonly address: Address,
    private readonly client: ReadContract,
  ) {}

  /** The primitive. One view call. */
  async hasProof(subject: Address, factType: Hex): Promise<boolean> {
    return (await this.read('hasProof', [subject, factType])) as boolean;
  }

  async proofCount(subject: Address, factType: Hex): Promise<number> {
    return Number(await this.read('proofCount', [subject, factType]));
  }

  async proofValue(subject: Address, factType: Hex): Promise<bigint> {
    return (await this.read('proofValue', [subject, factType])) as bigint;
  }

  /**
   * Standing as a three-state answer.
   *
   * Returns `unknown` rather than `false` when nothing is proven, because the
   * two are genuinely different claims and collapsing them is the single most
   * likely way to misuse this protocol. See the note in types.ts.
   */
  async standing(subject: Address, factType: Hex): Promise<Standing> {
    const [count, value] = await Promise.all([
      this.proofCount(subject, factType),
      this.proofValue(subject, factType),
    ]);

    return count > 0
      ? { state: 'proven', count, value }
      : { state: 'unknown', count: 0, value: 0n };
  }

  async factIdsOf(subject: Address): Promise<Hex[]> {
    return (await this.read('factIdsOf', [subject])) as Hex[];
  }

  async getFact(factId: Hex): Promise<VerifiedFact> {
    const raw = (await this.read('getFact', [factId])) as Record<string, unknown>;

    if (!raw || (raw.factId as string) === `0x${'0'.repeat(64)}`) {
      throw new VouchError(`No fact with id ${factId}`);
    }

    return {
      factId: raw.factId as Hex,
      subject: raw.subject as Address,
      factType: raw.factType as Hex,
      sourceChainKey: Number(raw.sourceChain),
      blockNumber: raw.blockNumber as bigint,
      txHash: raw.txHash as Hex,
      logIndex: Number(raw.logIndex),
      emitter: raw.emitter as Address,
      value: raw.value as bigint,
      payloadHash: raw.payloadHash as Hex,
      verifiedAt: new Date(Number(raw.verifiedAt) * 1000),
    };
  }

  /** Every fact proven for an address, resolved. */
  async factsOf(subject: Address): Promise<VerifiedFact[]> {
    const ids = await this.factIdsOf(subject);
    return Promise.all(ids.map((id) => this.getFact(id)));
  }

  /**
   * Proven source-block bounds.
   *
   * Both only ever widen -- backwards when an older fact is discovered late,
   * forwards when a newer one lands -- because the registry is append-only.
   * Null means nothing has been proven, not that the address is new.
   */
  async bounds(subject: Address): Promise<{ first: bigint | null; last: bigint | null }> {
    const [first, last] = (await Promise.all([
      this.read('firstSeen', [subject]),
      this.read('lastSeen', [subject]),
    ])) as [bigint, bigint];

    return { first: first === 0n ? null : first, last: last === 0n ? null : last };
  }

  async totalProofs(subject: Address): Promise<number> {
    return Number(await this.read('totalProofs', [subject]));
  }

  private async read(functionName: string, args: readonly unknown[]): Promise<unknown> {
    try {
      return await this.client.readContract({
        address: this.address,
        abi: REGISTRY_ABI,
        functionName,
        args,
      });
    } catch (error) {
      throw new VouchError(`VouchRegistry.${functionName} failed at ${this.address}`, error);
    }
  }
}
