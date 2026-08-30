'use client';

/**
 * Wallet connection.
 *
 * The wallet answers exactly one question here: which address is this. Vouch
 * never asks it to sign, because reading standing is a public view call and
 * submitting a proof is permissionless work the relayer does. A site that
 * demanded a signature to show you your own public history would be asking for
 * something it does not need.
 */

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { disconnect } = useDisconnect();

  const injected = connectors[0];

  return {
    address: address?.toLowerCase() as `0x${string}` | undefined,
    isConnected,
    isConnecting,
    error,
    // A wallet may genuinely be absent. Say so rather than opening a modal that
    // cannot resolve.
    canConnect: Boolean(injected),
    connect: () => injected && connect({ connector: injected }),
    disconnect,
  };
}
