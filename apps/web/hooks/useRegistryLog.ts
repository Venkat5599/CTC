"use client";

/**
 * Every fact the registry has ever written, read from its own event log.
 *
 * The per-address hooks answer "what can this address prove". A ledger view
 * asks the opposite question -- what is in here at all -- and there is no
 * on-chain enumeration for that: `factIdsOf` is keyed by subject, and iterating
 * every possible subject is not a thing. So this reads `FactVerified` logs
 * directly.
 *
 * That makes the chain the only source. There is no seeded row, no sample
 * ledger, and no "coming soon" placeholder: an empty registry renders as an
 * empty registry, which is the honest state of a system whose first fact was
 * proven days ago.
 */

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Log } from "viem";

import { addresses } from "@/lib/contracts";
import { creditcoinClient } from "@/lib/viem";

export const FACT_VERIFIED = parseAbiItem(
  "event FactVerified(bytes32 indexed factId, address indexed subject, bytes32 indexed factType, uint256 value)",
);

export interface LedgerEntry {
  factId: `0x${string}`;
  subject: `0x${string}`;
  factType: `0x${string}`;
  value: bigint;
  /** Creditcoin block that recorded it, not the source-chain block. */
  recordedAtBlock: bigint;
  creditcoinTxHash: `0x${string}`;
}

/**
 * CC3 rejects an unbounded `eth_getLogs`, and scanning from genesis on every
 * page load would be slow and rude regardless. The registry was deployed
 * recently, so a bounded window back from the head covers its whole life while
 * staying cheap.
 *
 * THE SCAN IS CHUNKED BECAUSE THE CEILING IS A TIME BUDGET, NOT A RANGE. CC3's
 * public RPC kills a log query at ten seconds: 500,000 blocks -- the first value
 * here -- returns `query timeout of 10 seconds exceeded`, and so does 100,000,
 * which is why this page rendered "unavailable" while the registry held two
 * facts it could have shown. Ten-thousand-block chunks, measured at 4-11s each
 * against that ten-second budget, keep every individual request inside it and
 * cover the registry's whole life -- deployed at block 5,429,984, head around
 * 5,481,000 -- in six calls.
 *
 * THE SCAN IS ALL-OR-NOTHING ON PURPOSE. A chunk that fails throws, so the
 * panels say "unavailable" rather than drawing a ledger that is missing whatever
 * sat in the failed range. A partial ledger that looks complete is a worse lie
 * than an empty one on a page whose entire job is to be checkable.
 */
const CHUNK_BLOCKS = 10_000n;
const LOOKBACK_BLOCKS = 60_000n;

/**
 * Every FactVerified log in the window, newest chunk first.
 *
 * Throws if any chunk fails, deliberately: the caller renders that as
 * "unavailable" instead of a truncated ledger.
 */
async function scanLedger(registry: `0x${string}`, head: bigint): Promise<Log[]> {
  const oldest = head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n;
  const logs: Log[] = [];

  let toBlock = head;
  while (toBlock > oldest) {
    const fromBlock =
      toBlock > oldest + CHUNK_BLOCKS - 1n ? toBlock - CHUNK_BLOCKS + 1n : oldest;

    logs.push(
      ...(await creditcoinClient.getLogs({
        address: registry,
        event: FACT_VERIFIED,
        fromBlock,
        toBlock,
      })),
    );

    toBlock = fromBlock - 1n;
  }

  return logs;
}

export function useRegistryLog() {
  return useQuery<LedgerEntry[]>({
    queryKey: ["registry-log"],
    enabled: Boolean(addresses.registry),
    staleTime: 30_000,
    queryFn: async () => {
      const registry = addresses.registry;
      if (!registry) return [];

      const head = await creditcoinClient.getBlockNumber();
      const logs = await scanLedger(registry, head);

      return logs
        .flatMap((log) => {
          const entry = toEntry(log);
          return entry ? [entry] : [];
        })
        .sort((a, b) => Number(b.recordedAtBlock - a.recordedAtBlock));
    },
  });
}

function toEntry(log: Log): LedgerEntry | null {
  const args = (log as unknown as { args?: Record<string, unknown> }).args;
  if (!args) return null;

  const { factId, subject, factType, value } = args;
  if (
    typeof factId !== "string" ||
    typeof subject !== "string" ||
    typeof factType !== "string"
  ) {
    return null;
  }
  if (log.blockNumber === null || log.transactionHash === null) return null;

  return {
    factId: factId as `0x${string}`,
    subject: subject as `0x${string}`,
    factType: factType as `0x${string}`,
    value: typeof value === "bigint" ? value : 0n,
    recordedAtBlock: log.blockNumber,
    creditcoinTxHash: log.transactionHash,
  };
}
