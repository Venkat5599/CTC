/**
 * Deployed addresses and ABIs.
 *
 * Reads from @vouch/config, which reports `null` for anything not yet deployed
 * rather than substituting a zero address. That distinction matters in the UI:
 * a zero address would read as a contract that exists and answers false to
 * everything, so the page would show "no standing" for every visitor and look
 * like it was working.
 */

import { DEPLOYED, type CreditcoinNetwork } from '@vouch/config';

export const NETWORK: CreditcoinNetwork = 'cc3-testnet';

export const addresses = DEPLOYED[NETWORK];

export const isDeployed = addresses.registry !== null;

/** Explorer link for a transaction or address on CC3 Testnet. */
export function explorerUrl(kind: 'tx' | 'address', value: string): string {
  return `https://creditcoin-testnet.blockscout.com/${kind}/${value}`;
}

/** Etherscan link, for the source-chain side of a fact. */
export function sourceExplorerUrl(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}
