"use client";

import { useState } from "react";

import { AddressField, Nothing, Section } from "@/components/dashboard/data";
import { Button, PageHeader } from "@/components/dashboard/primitives";
import { PassportView } from "@/components/passport/passport-view";
import { useWallet } from "@/hooks/useWallet";

/**
 * Passport.
 *
 * Standing for one address. The lookup sits in a framed section above the
 * result rather than floating loose under the title, so the page has the same
 * shape whether an address is loaded or not and nothing jumps when one is.
 */
export default function PassportPage() {
  const { address, isConnected, connect, canConnect, isConnecting } = useWallet();
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <>
      <PageHeader
        label="Registry"
        title="Passport"
        description="Standing for a single address, derived from the registry. Reading it is a public view call, so Vouch never asks you to sign."
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
            <AddressField id="passport-address" onSubmit={setSubject} />
          </div>
        </Section>

        {active ? (
          <PassportView address={active} />
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
                Paste an address above, or connect a wallet to read your own. Standing is public:
                anybody can read any address, and reading never requires a signature.
              </Nothing>
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
