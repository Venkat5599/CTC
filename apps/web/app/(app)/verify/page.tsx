'use client';

import { Empty, Pill } from '@vouch/ui';
import { PageHeader } from '@/components/dashboard/primitives';
import { REGISTERED_FACTS } from '@vouch/schemas';
import { Pipeline } from '@/components/verification/pipeline';
import { useProofStatus } from '@/hooks/useProof';
import { useWallet } from '@/hooks/useWallet';

export default function VerifyPage() {
  const { address, isConnected, connect, canConnect } = useWallet();
  const { data: statuses } = useProofStatus(address);

  return (
    <section>
      <PageHeader label="Registry" title="Verification" description="Watch a fact move through the pipeline." />

      <div className="mt-12">
        {!isConnected || !address ? (
          <Empty
            title="Connect to see your pipeline"
            body="Verification runs against a public address. Connecting only tells this page which address to watch."
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
                <Pill href="/passport">Look up an address instead</Pill>
              )
            }
          />
        ) : statuses && statuses.length > 0 ? (
          <div className="space-y-12">
            {statuses.map((status) => {
              const fact = REGISTERED_FACTS.find((f) => f.id === status.factType);
              return (
                <div key={`${status.factType}-${status.txHash}`}>
                  <div className="mb-4 text-[13px] text-foreground">
                    {fact?.label ?? status.factType}
                  </div>
                  <Pipeline status={status} />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Nothing in flight"
            body="No facts for this address are currently being proven. If you have activity on a registered source, the relayer will find it on its next pass."
            action={<Pill href="/passport">See current standing</Pill>}
          />
        )}
      </div>
    </section>
  );
}
