/**
 * Chain clients.
 *
 * Two chains matter here and they do different jobs. Creditcoin is where the
 * registry lives and where every read happens. Ethereum is only ever read from
 * to show a user what their own history looks like before it is proven.
 */

import { createPublicClient, defineChain, http } from 'viem';
import { mainnet } from 'viem/chains';
import { CREDITCOIN_TESTNET } from '@vouch/config';

export const creditcoinTestnet = defineChain(CREDITCOIN_TESTNET);

export const creditcoinClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(),
});

export const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_ETH_RPC),
});
