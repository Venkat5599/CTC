'use client';

import { Pill, Empty } from '@vouch/ui';
import { PageHeader } from '@/components/dashboard/primitives';
import { CreditTerms } from '@/components/dashboard/credit-terms';
import { useWallet } from '@/hooks/useWallet';

export default function CreditPage() {
  const { address, isConnected, connect, canConnect } = useWallet();

  return (
    <section>
      <PageHeader label="Consumers" title="Credit" description="Collateral priced from proven standing." />

      <div className="mt-12">
        {isConnected && address ? (
          <CreditTerms address={address} />
        ) : (
          <Empty
            title="Connect to see your terms"
            body="Terms are priced from proven standing. Connecting tells this page which address to quote for; it never asks you to sign."
            action={
              canConnect ? (
                <button
                  type="button"
                  onClick={connect}
                  className="rounded-lg bg-accent px-4 py-2.5 font-mono text-[13px] text-black"
                >
                  Connect wallet
                </button>
              ) : (
                <Pill href="/apps">See how consumers read the registry</Pill>
              )
            }
          />
        )}
      </div>
    </section>
  );
}
