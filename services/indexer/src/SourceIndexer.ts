/**
 * SourceIndexer
 *
 * Finds candidate facts on the source chain.
 *
 * This service has no authority. It reads public logs, decides nothing, and
 * everything it emits is re-derived from the proven payload on chain before it
 * counts. If the indexer returns garbage, the registry rejects it; if the
 * indexer omits something, a fact is merely late. That asymmetry is deliberate
 * -- it is what lets the whole off-chain half of Vouch be untrusted and
 * replaceable, and it is why nothing here signs anything.
 *
 * One subtlety worth naming: the indexer must report the RECEIPT-WIDE log index,
 * not the position within a filtered result set. `eth_getLogs` returns
 * `logIndex` already scoped to the block, so the value is taken from the node
 * rather than computed by enumeration. Computing it would reintroduce exactly
 * the bug the contracts were fixed for.
 */

import { type Address, type Hex, type PublicClient, parseAbiItem } from 'viem';

/** Aave V3 Pool, Ethereum mainnet. */
export const AAVE_V3_POOL: Address = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

export const REPAY_EVENT = parseAbiItem(
  'event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)',
);

export const SUPPLY_EVENT = parseAbiItem(
  'event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)',
);

export interface SourceDefinition {
  /** Attestcoin chain key. NOT an EVM chainId: on CC3 Testnet 3 is mainnet. */
  chainKey: number;
  /** The pinned emitter. Must match the on-chain SourceRegistry entry exactly. */
  emitter: Address;
  /** keccak of the event signature, as registered. */
  topic0: Hex;
  factType: Hex;
  /** Which topic carries the subject. Aave Repay: 2 (user). */
  subjectTopicIndex: number;
}

export interface DiscoveredFact {
  chainKey: number;
  blockNumber: bigint;
  txHash: Hex;
  /** Receipt-wide log index, taken from the node, never enumerated. */
  logIndex: number;
  factType: Hex;
  subject: Address;
}

export interface ScanRange {
  fromBlock: bigint;
  toBlock: bigint;
}

/**
 * Default page size. Public RPC providers commonly cap `eth_getLogs` spans, and
 * a rejected request costs a round trip and a retry, so paging conservatively is
 * faster in practice than paging optimistically.
 */
export const DEFAULT_BLOCK_PAGE = 2_000n;

/**
 * Scan a block range for logs matching a registered source.
 *
 * Returns candidates in deterministic order so that two indexers scanning the
 * same range hand the packer identical input, and therefore identical batches.
 */
export async function scanSource(
  client: PublicClient,
  source: SourceDefinition,
  range: ScanRange,
  pageSize: bigint = DEFAULT_BLOCK_PAGE,
): Promise<DiscoveredFact[]> {
  const found: DiscoveredFact[] = [];

  for (let from = range.fromBlock; from <= range.toBlock; from += pageSize) {
    const to = from + pageSize - 1n > range.toBlock ? range.toBlock : from + pageSize - 1n;

    const logs = await client.getLogs({
      address: source.emitter,
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      // Filter on topic0 here rather than in the RPC call so a source whose
      // event signature is misconfigured shows up as "found nothing" in one
      // place, instead of silently returning an empty page forever.
      if (log.topics[0] !== source.topic0) continue;
      if (log.blockNumber === null || log.logIndex === null) continue;

      const subjectTopic = log.topics[source.subjectTopicIndex];
      if (subjectTopic === undefined) continue;

      found.push({
        chainKey: source.chainKey,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash as Hex,
        logIndex: log.logIndex,
        factType: source.factType,
        subject: topicToAddress(subjectTopic),
      });
    }
  }

  return found.sort(compareDiscovered);
}

/**
 * Scan every registered source over one range.
 *
 * Sources are scanned independently and their results concatenated, so one
 * misconfigured source cannot suppress another's facts.
 */
export async function scanAll(
  client: PublicClient,
  sources: readonly SourceDefinition[],
  range: ScanRange,
): Promise<DiscoveredFact[]> {
  const results = await Promise.all(sources.map((source) => scanSource(client, source, range)));
  return results.flat().sort(compareDiscovered);
}

/**
 * A confirmed head, backed off far enough that a reorg will not retract it.
 *
 * A reorged-away fact is not a security problem -- the precompile would refuse
 * to prove it, since the block is no longer part of the confirmed chain -- but
 * it is a wasted proof, and proofs are the expensive resource here.
 */
export async function confirmedHead(client: PublicClient, confirmations = 64n): Promise<bigint> {
  const head = await client.getBlockNumber();
  return head > confirmations ? head - confirmations : 0n;
}

/** The low 20 bytes of an indexed address topic. */
export function topicToAddress(topic: Hex): Address {
  return `0x${topic.slice(-40)}` as Address;
}

function compareDiscovered(a: DiscoveredFact, b: DiscoveredFact): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  if (a.txHash !== b.txHash) return a.txHash < b.txHash ? -1 : 1;
  return a.logIndex - b.logIndex;
}
