'use client';

/**
 * Verification progress.
 *
 * The read side of Vouch is instant; the write side is not. A fact has to be
 * discovered, queued, batched, proven and submitted before `hasProof` turns
 * true, and depending on how full the batch is that runs from seconds to
 * minutes. A page that polls silently and shows nothing in the meantime looks
 * broken while working correctly, so the pipeline is exposed as stages.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VerificationStatus } from '@vouch/sdk';
import { fetchStatus, requestVerification } from '@/lib/api';

export function useProofStatus(address?: string, factType?: string) {
  return useQuery<VerificationStatus[]>({
    queryKey: ['proof-status', address, factType],
    enabled: Boolean(address),
    // Polls only while something is genuinely in flight. A terminal state stops
    // the interval rather than hammering an endpoint whose answer cannot change.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.length === 0) return false;
      const inFlight = data.some(
        (s) => s.stage !== 'verified' && s.stage !== 'rejected',
      );
      return inFlight ? 5_000 : false;
    },
    queryFn: () => fetchStatus(address!, factType),
  });
}

export function useRequestProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ address, factType }: { address: string; factType: string }) =>
      requestVerification(address, factType),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proof-status', variables.address] });
    },
  });
}
