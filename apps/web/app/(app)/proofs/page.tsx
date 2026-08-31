"use client";

import { useState } from "react";

import { AddressField, Nothing, Section } from "@/components/dashboard/data";
import { Button, PageHeader } from "@/components/dashboard/primitives";
import { FactList } from "@/components/proofs/fact-list";
import { useWallet } from "@/hooks/useWallet";

/**
 * Proofs.
 *
 * Every verified fact for an address, each one traceable to both chains. This
 * is the evidence behind the number the passport shows, which is why the two
 * pages are separate: one answers "what is my standing", this one answers
 * "why".
 */
export default function ProofsPage() {
  const { address, isConnected, connect, canConnect, isConnecting } = useWallet();
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <>
      <PageHeader
        label="Registry"
        title="Proofs"
        description="Every verified fact, traceable to the source transaction on one chain and the registry entry on the other."
      />

      <div className="space-y-4">
        <Section
          title="Look up an address"
          action={
            !isConnected && canConnect ? (
              <Button onClick={connect} disabled={isConnecting} variant="secondary">
                {isConnecting ? "Connecting…" : "Use my wallet"}
              </Button>
            ) : null
          }
        >
          <div className="px-6 py-5">
            <AddressField id="proofs-address" onSubmit={setSubject} />
          </div>
        </Section>

        {active ? (
          <FactList address={active} />
        ) : (
          <Section title="No address selected">
            <div className="px-6 py-6">
              <Nothing
                action={
                  <Button href="/explorer" variant="secondary">
                    Open the explorer
                  </Button>
                }
              >
                Paste an address above, or connect a wallet. Proven facts are public, so anybody can
                read anybody&rsquo;s.
              </Nothing>
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
