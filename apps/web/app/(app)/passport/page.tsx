'use client';

import { useState } from 'react';
import { Empty, Pill } from '@vouch/ui';
import { PageHeader } from '@/components/dashboard/primitives';
import { PassportView } from '@/components/passport/passport-view';
import { useWallet } from '@/hooks/useWallet';

export default function PassportPage() {
  const { address, isConnected, connect, canConnect } = useWallet();
  const [lookup, setLookup] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <section>
      <PageHeader label="Registry" title="Passport" description="Verified standing for an address." />

      <form
        className="mt-10 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (/^0x[0-9a-fA-F]{40}$/.test(lookup)) setSubject(lookup.toLowerCase());
        }}
      >
        <label htmlFor="address" className="sr-only">
          Ethereum address
        </label>
        <input
          id="address"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="0x..."
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-card-secondary px-4 py-2.5 font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus:border-muted-foreground focus:outline-none sm:max-w-md"
        />
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2.5 font-mono text-[13px] text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
        >
          Look up
        </button>
      </form>

      <div className="mt-12">
        {active ? (
          <PassportView address={active} />
        ) : (
          <Empty
            title="No address selected"
            body="Connect a wallet or paste an address above. Vouch never asks for a signature: reading standing is a public view call."
            action={
              !isConnected && canConnect ? (
                <button
                  type="button"
                  onClick={connect}
                  className="rounded-lg bg-accent px-4 py-2.5 font-mono text-[13px] text-black"
                >
                  Connect wallet
                </button>
              ) : (
                <Pill href="/proofs">Browse proven facts</Pill>
              )
            }
          />
        )}
      </div>
    </section>
  );
}
