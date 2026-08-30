import { DEPLOYED, type CreditcoinNetwork } from '@vouch/config';

export const NETWORK: CreditcoinNetwork = 'cc3-testnet';
export const addresses = DEPLOYED[NETWORK];
export const isDeployed = addresses.registry !== null;

export function explorerUrl(kind: 'tx' | 'address', value: string): string {
  return `https://creditcoin-testnet.blockscout.com/${kind}/${value}`;
}
