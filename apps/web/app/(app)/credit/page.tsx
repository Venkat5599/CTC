"use client";

import { Nothing, Section } from "@/components/dashboard/data";
import { Button, PageHeader } from "@/components/dashboard/primitives";
import { CreditTerms } from "@/components/dashboard/credit-terms";
import { useWallet } from "@/hooks/useWallet";

/**
 * Credit.
 *
 * One consumer of the registry, shown as terms rather than as a promise. The
 * collateral figure here is read from VouchCredit on chain, not computed in the
 * browser, so what the page shows is what the contract would quote.
 */
export default function CreditPage() {
  const { address, isConnected, connect, canConnect, isConnecting } = useWallet();

  return (
    <>
      <PageHeader
        label="Applications"
        title="Credit"
        description="Collateral priced from proven standing. One of several contracts reading the same registry, each for its own purpose."
      />

      {isConnected && address ? (
        <CreditTerms address={address} />
      ) : (
        <Section title="Connect to see your terms">
          <div className="px-6 py-6">
            <Nothing
              action={
                canConnect ? (
                  <Button onClick={connect} disabled={isConnecting}>
                    {isConnecting ? "Connecting…" : "Connect wallet"}
                  </Button>
                ) : (
                  <Button href="/apps" variant="secondary">
                    See how consumers read the registry
                  </Button>
                )
              }
            >
              Terms are priced from proven standing. Connecting tells this page which address to
              quote for. It never asks you to sign, because quoting is a view call.
            </Nothing>
          </div>
        </Section>
      )}
    </>
  );
}
