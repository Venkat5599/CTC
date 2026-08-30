'use client';

/**
 * Aggregated standing for an address.
 *
 * Cached hard, because a tier is monotonic: the registry cannot decrement, the
 * passport is a pure function of the registry, so a cached tier can only ever be
 * stale-LOW. Refetching aggressively would buy nothing except RPC load.
 */

import { useQuery } from '@tanstack/react-query';
import { createVouchClient, type Passport } from '@vouch/sdk';
import { creditcoinClient } from '@/lib/viem';
import { addresses } from '@/lib/contracts';

export function usePassport(address?: string) {
  return useQuery<Passport | null>({
    queryKey: ['passport', address],
    enabled: Boolean(address) && Boolean(addresses.registry),
    // A tier that only rises does not need a tight refetch window.
    staleTime: 60_000,
    queryFn: async () => {
      if (!address || !addresses.registry) return null;

      const vouch = createVouchClient({
        registry: addresses.registry,
        passport: addresses.passport ?? undefined,
        publicClient: creditcoinClient as never,
      });

      // Without a deployed passport the tier is unknowable, but the underlying
      // facts are not -- so report what the registry can answer rather than
      // failing the whole query.
      if (!addresses.passport) {
        const total = await vouch.registry.totalProofs(address as `0x${string}`);
        const bounds = await vouch.registry.bounds(address as `0x${string}`);
        return {
          address: address as `0x${string}`,
          totalProofs: total,
          firstSeenBlock: bounds.first,
          lastSeenBlock: bounds.last,
          tier: 0,
        };
      }

      return vouch.passportOf(address as `0x${string}`);
    },
  });
}
