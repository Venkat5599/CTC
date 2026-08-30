/**
 * Relayer API.
 *
 * Read-only and advisory. Nothing this returns decides whether a benefit is
 * granted -- that is `hasProof` on chain, always. This exists so a page can
 * show what is happening while a fact works its way through discovery,
 * batching, proving and submission, instead of appearing frozen for two
 * minutes and looking broken.
 */

import type { VerificationStatus } from '@vouch/sdk';

const BASE = process.env.NEXT_PUBLIC_RELAYER_URL ?? '';

export async function fetchStatus(
  subject: string,
  factType?: string,
): Promise<VerificationStatus[]> {
  if (!BASE) return [];

  const url = new URL(`${BASE}/status`);
  url.searchParams.set('subject', subject);
  if (factType) url.searchParams.set('factType', factType);

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) return [];

  const body = (await response.json()) as { statuses: VerificationStatus[] };
  return body.statuses;
}

export async function requestVerification(subject: string, factType: string) {
  if (!BASE) throw new Error('No relayer configured.');

  const response = await fetch(`${BASE}/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject, factType }),
  });

  if (!response.ok) throw new Error(`Relayer request failed: ${response.status}`);
  return (await response.json()) as { accepted: boolean; message: string };
}
