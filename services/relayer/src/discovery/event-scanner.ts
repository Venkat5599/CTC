/**
 * Event discovery.
 *
 * A stateful cursor over the source chain, so the relayer can run unattended.
 * Two decisions carry the weight.
 *
 * OVERLAP ON PURPOSE. Each pass re-scans a small span behind the last cursor
 * position. Logs can surface late from a node that was briefly behind its peers,
 * and a strictly forward cursor would skip those permanently and never know. The
 * re-scan is nearly free, because duplicates are dropped by identity downstream
 * and again by the on-chain replay guard. Missing a fact costs a user their
 * standing and nothing anywhere reports it.
 *
 * CONFIRMATIONS, NOT FINALITY. The cursor never advances past a head held back
 * by a confirmation depth. A reorged-away fact is not a security problem -- the
 * precompile would decline to prove it, the block no longer belonging to the
 * confirmed chain -- but building a proof for one wastes the expensive resource
 * in this system, which is proofs rather than gas.
 */

export interface ScanRange {
  fromBlock: bigint;
  toBlock: bigint;
}

/** Whatever the indexer returns for one matched log. */
export interface Candidate {
  chainKey: number;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  factType: `0x${string}`;
  subject: `0x${string}`;
}

export interface ScanBackend {
  /** Confirmed head, already backed off by the caller's confirmation depth. */
  confirmedHead(): Promise<bigint>;
  /** Every matching log in the range, in deterministic order. */
  scan(range: ScanRange): Promise<Candidate[]>;
}

export interface ScannerOptions {
  /** Blocks re-scanned behind the cursor each pass. */
  overlapBlocks?: bigint;
  /** Largest span requested in one pass, to stay inside RPC provider caps. */
  maxSpanBlocks?: bigint;
}

export class EventScanner {
  private cursor: bigint;
  private readonly overlap: bigint;
  private readonly maxSpan: bigint;

  constructor(
    private readonly backend: ScanBackend,
    startBlock: bigint,
    options: ScannerOptions = {},
  ) {
    this.cursor = startBlock;
    this.overlap = options.overlapBlocks ?? 32n;
    this.maxSpan = options.maxSpanBlocks ?? 10_000n;
  }

  get position(): bigint {
    return this.cursor;
  }

  /** One pass. Returns candidates and advances the cursor past what it read. */
  async next(): Promise<Candidate[]> {
    const head = await this.backend.confirmedHead();
    if (head < this.cursor) return [];

    const from = this.cursor > this.overlap ? this.cursor - this.overlap : 0n;
    const to = head - from > this.maxSpan ? from + this.maxSpan : head;

    const found = await this.backend.scan({ fromBlock: from, toBlock: to });

    this.cursor = to + 1n;
    return found;
  }

  /** True once the scanner has reached the confirmed head. */
  async caughtUp(): Promise<boolean> {
    return this.cursor > (await this.backend.confirmedHead());
  }
}
