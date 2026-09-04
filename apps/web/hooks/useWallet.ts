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

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWallet() {
  const { address, isConnected, status } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const injected = connectors[0];

  // `Boolean(injected)` is not a wallet check. wagmi always constructs the
  // injected connector from config, present wallet or not, so testing it
  // reported "can connect" on every machine and the "No wallet found" branch was
  // unreachable. The provider itself is the only honest signal, and it only
  // exists after mount -- reading it during render would differ between server
  // and client and desync hydration.
  const [hasProvider, setHasProvider] = useState(false);
  useEffect(() => {
    setHasProvider(
      typeof window !== 'undefined' &&
        typeof (window as { ethereum?: unknown }).ethereum !== 'undefined',
    );
  }, []);

  return {
    address: address?.toLowerCase() as `0x${string}` | undefined,
    isConnected,

    // `useAccount().isConnecting` is ALSO true during wagmi's automatic
    // reconnect on page load, which never resolves when no wallet answers --
    // that is what left every connect button reading "Connecting..." forever on
    // a machine with no extension. `useConnect().isPending` is true only for a
    // connect the user actually initiated, which is the state a button should
    // reflect.
    isConnecting: isPending,

    /** Session restore in progress. Distinct from a user-initiated connect. */
    isReconnecting: status === 'reconnecting',

    error,
    canConnect: Boolean(injected) && hasProvider,
    connect: () => injected && connect({ connector: injected }),
    disconnect,
  };
}
