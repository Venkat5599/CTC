"use client";

/**
 * Creditcoin's current head.
 *
 * The mockups this follows print a block height in the chrome. That is only
 * honest if it is actually read and actually refreshed -- a hardcoded height is
 * a fabricated on-chain value in the most visible place on the page.
 *
 * So it is read, on a 12s interval that roughly matches block time, and it
 * renders as unknown while it is loading or if the RPC is unreachable. A stale
 * number is never shown as current.
 */

import { useQuery } from "@tanstack/react-query";

import { creditcoinClient } from "@/lib/viem";

export function useChainHead() {
  return useQuery<bigint>({
    queryKey: ["chain-head"],
    queryFn: () => creditcoinClient.getBlockNumber(),
    refetchInterval: 12_000,
    staleTime: 10_000,
  });
}
