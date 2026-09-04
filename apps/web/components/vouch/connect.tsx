"use client";

/**
 * Wallet connection, via RainbowKit.
 *
 * Deliberately a custom render rather than the stock <ConnectButton />, for one
 * reason that matters to this product: the default assumes the app has ONE
 * chain and that being on any other is an error. Vouch has two, and they mean
 * different things.
 *
 *   Creditcoin CC3 -- where the registry lives. Every read happens here, and
 *   none of them need a wallet at all.
 *   Ethereum Sepolia -- the SOURCE chain. A wallet is required here and only
 *   here, because creating standing means performing a real activity somewhere
 *   that can then be proven.
 *
 * So "wrong network" is only meaningful relative to what the user is trying to
 * do, and this component takes the chain it wants instead of assuming one. On a
 * read-only page it is never rendered at all -- implying that reading needs a
 * signature would contradict the product.
 */

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Connect({
  /** The chain this action needs. Omit when any chain is acceptable. */
  requiredChainId,
  requiredChainName = "the source chain",
}: {
  requiredChainId?: number | undefined;
  requiredChainName?: string | undefined;
}) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        // Until mounted the wallet state is unknown, and rendering a guess
        // would flash the wrong control on every load.
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <span
              aria-hidden
              className="inline-block h-[34px] w-[132px] rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)]"
            />
          );
        }

        if (!connected) {
          return (
            <button
              className="rounded-[var(--vouch-radius-sm)] bg-[var(--vouch-primary)] px-3.5 py-2 text-[13px] font-semibold text-[var(--vouch-on-primary)] transition-colors hover:bg-[var(--vouch-primary-strong)]"
              onClick={openConnectModal}
              type="button"
            >
              Connect wallet
            </button>
          );
        }

        const onWrongChain =
          requiredChainId !== undefined && chain.id !== requiredChainId;

        if (chain.unsupported || onWrongChain) {
          return (
            <button
              className="flex items-center gap-2 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-warning)]/40 bg-[var(--vouch-warning)]/10 px-3 py-2 text-[13px] font-medium text-[var(--vouch-warning)] transition-colors hover:bg-[var(--vouch-warning)]/15"
              onClick={openChainModal}
              type="button"
            >
              <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[var(--vouch-warning)]" />
              Switch to {requiredChainName}
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] px-2.5 py-2 font-mono text-[11px] text-[var(--vouch-text-muted)] transition-colors hover:border-[var(--vouch-border-strong)] hover:text-[var(--vouch-text)]"
              onClick={openChainModal}
              type="button"
            >
              <span
                aria-hidden
                className="block h-1.5 w-1.5 rounded-full bg-[var(--vouch-primary)]"
              />
              {chain.name}
            </button>

            <button
              className="flex items-center gap-2 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] px-2.5 py-2 font-mono text-[11px] text-[var(--vouch-text)] transition-colors hover:border-[var(--vouch-border-strong)]"
              onClick={openAccountModal}
              type="button"
            >
              {account.displayName}
              {account.displayBalance ? (
                <span className="text-[var(--vouch-text-faint)]">{account.displayBalance}</span>
              ) : null}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
