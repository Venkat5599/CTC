/**
 * Registry listener.
 *
 * Watches `FactVerified` on Creditcoin and mirrors each fact into Postgres.
 *
 * The direction matters: this reads FROM the chain, never writes to it. The
 * registry is authoritative and this table is a cache, so a disagreement
 * between them is always resolved in the chain's favour by replaying. That is
 * what makes it safe to drop the database entirely and rebuild from block zero.
 *
 * It also does not care who submitted the fact. Our own relayer, a competing
 * one, or somebody hand-crafting a transaction all produce the same event and
 * all get mirrored identically, because submission is permissionless and the
 * registry has no notion of a privileged writer.
 */

import { parseAbiItem, type Log, type PublicClient } from 'viem';

export const FACT_VERIFIED_EVENT = parseAbiItem(
  'event FactVerified(bytes32 indexed factId, address indexed subject, bytes32 indexed factType, uint256 value)',
);

export interface MirroredFact {
  factId: `0x${string}`;
  subject: `0x${string}`;
  factType: `0x${string}`;
  value: bigint;
  creditcoinBlock: bigint;
  creditcoinTxHash: `0x${string}`;
}

export interface RegistryListenerOptions {
  /** Blocks per `getLogs` call. Providers cap this; 2000 is conservative. */
  pageSize?: bigint;
  /** Blocks re-read behind the cursor each pass, to catch late-surfacing logs. */
  overlap?: bigint;
}

export class VouchRegistryListener {
  private cursor: bigint;
  private readonly pageSize: bigint;
  private readonly overlap: bigint;

  constructor(
    private readonly client: PublicClient,
    private readonly registry: `0x${string}`,
    fromBlock: bigint,
    options: RegistryListenerOptions = {},
  ) {
    this.cursor = fromBlock;
    this.pageSize = options.pageSize ?? 2_000n;
    this.overlap = options.overlap ?? 16n;
  }

  get position(): bigint {
    return this.cursor;
  }

  /**
   * Read one page of new facts and advance.
   *
   * Re-reads a small overlap behind the cursor. Duplicates are harmless because
   * `factId` is the primary key and an upsert collapses them; a missed fact
   * would be invisible forever, so the asymmetry favours re-reading.
   */
  async poll(): Promise<MirroredFact[]> {
    const head = await this.client.getBlockNumber();
    if (head < this.cursor) return [];

    const from = this.cursor > this.overlap ? this.cursor - this.overlap : 0n;
    const to = head - from > this.pageSize ? from + this.pageSize : head;

    const logs = await this.client.getLogs({
      address: this.registry,
      event: FACT_VERIFIED_EVENT,
      fromBlock: from,
      toBlock: to,
    });

    this.cursor = to + 1n;

    return logs.flatMap((log) => {
      const decoded = toMirroredFact(log);
      return decoded ? [decoded] : [];
    });
  }

  /** True once the listener has caught up to the chain head. */
  async caughtUp(): Promise<boolean> {
    return this.cursor > (await this.client.getBlockNumber());
  }
}

/**
 * Decode one log, or return null.
 *
 * Returns null rather than throwing on a malformed log. A single unparseable
 * entry should not abort a page of two thousand blocks, and since the registry
 * remains the source of truth, a skipped row is recoverable by replay while a
 * crashed indexer is not.
 */
export function toMirroredFact(log: Log): MirroredFact | null {
  const args = (log as unknown as { args?: Record<string, unknown> }).args;
  if (!args) return null;

  const { factId, subject, factType, value } = args;
  if (typeof factId !== 'string' || typeof subject !== 'string' || typeof factType !== 'string') {
    return null;
  }
  if (log.blockNumber === null || log.transactionHash === null) return null;

  return {
    factId: factId as `0x${string}`,
    // Lowercased at the boundary so lookups are exact-match rather than
    // case-insensitive comparisons. A checksummed address from a wallet and a
    // lowercase one from a log are the same address.
    subject: subject.toLowerCase() as `0x${string}`,
    factType: factType as `0x${string}`,
    value: typeof value === 'bigint' ? value : 0n,
    creditcoinBlock: log.blockNumber,
    creditcoinTxHash: log.transactionHash,
  };
}
