'use client';

import { useState } from 'react';
import { Empty } from '@vouch/ui';
import { PageHeader } from '@/components/dashboard/primitives';
import { FactList } from '@/components/proofs/fact-list';
import { useWallet } from '@/hooks/useWallet';

export default function ProofsPage() {
  const { address } = useWallet();
  const [lookup, setLookup] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <section>
      <PageHeader label="Registry" title="Proofs" description="Every verified fact, traceable to both chains." />

      <form
        className="mt-10 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (/^0x[0-9a-fA-F]{40}$/.test(lookup)) setSubject(lookup.toLowerCase());
        }}
      >
        <label htmlFor="proofs-address" className="sr-only">
          Ethereum address
        </label>
        <input
          id="proofs-address"
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
          <FactList address={active} />
        ) : (
          <Empty
            title="No address selected"
            body="Paste an address above, or connect a wallet. Proven facts are public and readable by anyone."
          />
        )}
      </div>
    </section>
  );
}
