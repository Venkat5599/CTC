/**
 * Creditcoin chain listener.
 *
 * Chain-level state: head, finality backoff, and whether the node is answering
 * at all. Separate from the registry listener because these are different
 * failure modes with different responses. A silent registry means nobody is
 * submitting; a silent node means we are blind, and conflating the two would
 * report a healthy chain as an empty one.
 */

import type { PublicClient } from 'viem';

export interface ChainHealth {
  reachable: boolean;
  head: bigint | null;
  /** Seconds since the head last moved. Rising means the chain or the node stalled. */
  headAgeSeconds: number | null;
  error: string | null;
}

export class CreditcoinListener {
  private lastHead: bigint | null = null;
  private lastHeadAt: number | null = null;

  constructor(
    private readonly client: PublicClient,
    private readonly now: () => number = Date.now,
  ) {}

  async health(): Promise<ChainHealth> {
    try {
      const head = await this.client.getBlockNumber();

      if (head !== this.lastHead) {
        this.lastHead = head;
        this.lastHeadAt = this.now();
      }

      return {
        reachable: true,
        head,
        headAgeSeconds:
          this.lastHeadAt === null ? null : Math.floor((this.now() - this.lastHeadAt) / 1000),
        error: null,
      };
    } catch (error) {
      // Reachability and progress are reported separately. A node that answers
      // with a stale head is a different problem from one that does not answer,
      // and a single boolean would hide which.
      return {
        reachable: false,
        head: this.lastHead,
        headAgeSeconds: null,
        error: error instanceof Error ? error.message.slice(0, 200) : String(error),
      };
    }
  }

  /**
   * A head backed off far enough to be worth acting on.
   *
   * Reorg protection for the Creditcoin side. Facts written in a block that
   * later reorgs away would be mirrored and then wrong, and since the mirror is
   * append-only there is no clean path to unwrite them. Waiting is cheaper than
   * reconciling.
   */
  async confirmedHead(confirmations = 12n): Promise<bigint> {
    const head = await this.client.getBlockNumber();
    return head > confirmations ? head - confirmations : 0n;
  }

  /** Whether a submitted transaction has landed and succeeded. */
  async settled(txHash: `0x${string}`): Promise<'confirmed' | 'reverted' | 'pending'> {
    try {
      const receipt = await this.client.getTransactionReceipt({ hash: txHash });
      return receipt.status === 'success' ? 'confirmed' : 'reverted';
    } catch {
      // Not an error. An unmined transaction has no receipt yet, and treating
      // that as a failure would make the relayer abandon work still in flight.
      return 'pending';
    }
  }
}
