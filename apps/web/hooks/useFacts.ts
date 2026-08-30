'use client';

/**
 * Standing per fact type, and the full proven history.
 *
 * `useStanding` returns the three-state answer rather than a boolean, so the UI
 * cannot accidentally render an unproven address as a negative one. That
 * distinction is the protocol's central honesty and the type carries it all the
 * way to the component.
 */

import { useQuery } from '@tanstack/react-query';
import { createVouchClient, type Standing, type VerifiedFact } from '@vouch/sdk';
import { REGISTERED_FACTS } from '@vouch/schemas';
import { creditcoinClient } from '@/lib/viem';
import { addresses } from '@/lib/contracts';

function client() {
  if (!addresses.registry) return null;
  return createVouchClient({
    registry: addresses.registry,
    passport: addresses.passport ?? undefined,
    publicClient: creditcoinClient as never,
  });
}

export function useStanding(address?: string) {
  return useQuery<Record<string, Standing>>({
    queryKey: ['standing', address],
    enabled: Boolean(address) && Boolean(addresses.registry),
    staleTime: 30_000,
    queryFn: async () => {
      const vouch = client();
      if (!vouch || !address) return {};

      const entries = await Promise.all(
        REGISTERED_FACTS.map(async (fact) => {
          const standing = await vouch.standing(address as `0x${string}`, fact.id);
          return [fact.id, standing] as const;
        }),
      );

      return Object.fromEntries(entries);
    },
  });
}

export function useFacts(address?: string) {
  return useQuery<VerifiedFact[]>({
    queryKey: ['facts', address],
    enabled: Boolean(address) && Boolean(addresses.registry),
    staleTime: 30_000,
    queryFn: async () => {
      const vouch = client();
      if (!vouch || !address) return [];
      // Append-only, so newest first is a stable ordering that never reshuffles.
      const facts = await vouch.facts(address as `0x${string}`);
      return facts.sort((a, b) => Number(b.blockNumber - a.blockNumber));
    },
  });
}
