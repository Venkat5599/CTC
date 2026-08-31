"use client";

import { Nothing, Section } from "@/components/dashboard/data";
import { Button, PageHeader } from "@/components/dashboard/primitives";
import { Pipeline } from "@/components/verification/pipeline";
import { useProofStatus } from "@/hooks/useProof";
import { useWallet } from "@/hooks/useWallet";
import { REGISTERED_FACTS } from "@vouch/schemas";

/**
 * Verification.
 *
 * What is currently in flight for an address: discovered, batched, proven,
 * submitted. Everything here is advisory. Nothing this page reports decides
 * whether a benefit is granted, which is always `hasProof` on chain. It exists
 * so a fact working its way through the relayer does not look like a frozen
 * page.
 */
export default function VerifyPage() {
  const { address, isConnected, connect, canConnect, isConnecting } = useWallet();
  const { data: statuses } = useProofStatus(address);

  if (!isConnected || !address) {
    return (
      <>
        <Header />
        <Section title="Connect to see your pipeline">
          <div className="px-6 py-6">
            <Nothing
              action={
                canConnect ? (
                  <Button onClick={connect} disabled={isConnecting}>
                    {isConnecting ? "Connecting…" : "Connect wallet"}
                  </Button>
                ) : (
                  <Button href="/passport" variant="secondary">
                    Look up an address instead
                  </Button>
                )
              }
            >
              Verification runs against a public address. Connecting only tells this page which
              address to watch.
            </Nothing>
          </div>
        </Section>
      </>
    );
  }

  if (!statuses || statuses.length === 0) {
    return (
      <>
        <Header />
        <Section title="Nothing in flight">
          <div className="px-6 py-6">
            <Nothing
              action={
                <Button href="/passport" variant="secondary">
                  See current standing
                </Button>
              }
            >
              No facts for this address are being proven right now. If you have activity on a
              registered source, the relayer will find it on its next pass.
            </Nothing>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="space-y-4">
        {statuses.map((status) => {
          const fact = REGISTERED_FACTS.find((f) => f.id === status.factType);
          return (
            <Section
              key={`${status.factType}-${status.txHash}`}
              title={fact?.label ?? status.factType}
              description={fact?.meaning}
            >
              <div className="px-6 py-6">
                <Pipeline status={status} />
              </div>
            </Section>
          );
        })}
      </div>
    </>
  );
}

function Header() {
  return (
    <PageHeader
      label="Registry"
      title="Verification"
      description="Facts currently moving through discovery, proving and submission. Advisory only: what grants a benefit is always the on-chain proof."
    />
  );
}
