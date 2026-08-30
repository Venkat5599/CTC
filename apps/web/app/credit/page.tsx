'use client';

import { Action, Empty, Heading, Section } from '@vouch/ui';
import { CreditTerms } from '@/components/dashboard/credit-terms';
import { useWallet } from '@/hooks/useWallet';

export default function CreditPage() {
  const { address, isConnected, connect, canConnect } = useWallet();

  return (
    <Section>
      <Heading lead="A reference consumer, not the product. VouchCredit reads the registry through the same public view functions any third party would call, and holds no privileged relationship with it.">
        Credit
      </Heading>

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
                  className="rounded-[--radius-sm] bg-[--color-accent] px-4 py-2.5 font-mono text-[13px] text-[--color-accent-ink]"
                >
                  Connect wallet
                </button>
              ) : (
                <Action href="/apps">See how consumers read the registry</Action>
              )
            }
          />
        )}
      </div>
    </Section>
  );
}
