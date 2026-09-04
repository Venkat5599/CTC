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
 * staying one cheap call.
 */
const LOOKBACK_BLOCKS = 500_000n;

export function useRegistryLog() {
  return useQuery<LedgerEntry[]>({
    queryKey: ["registry-log"],
    enabled: Boolean(addresses.registry),
    staleTime: 30_000,
    queryFn: async () => {
      const registry = addresses.registry;
      if (!registry) return [];

      const head = await creditcoinClient.getBlockNumber();
      const fromBlock = head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n;

      const logs = await creditcoinClient.getLogs({
        address: registry,
        event: FACT_VERIFIED,
        fromBlock,
        toBlock: head,
      });

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
