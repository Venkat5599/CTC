'use client';

import { useState } from 'react';
import { Empty, Heading, Section } from '@vouch/ui';
import { FactList } from '@/components/proofs/fact-list';
import { useWallet } from '@/hooks/useWallet';

export default function ProofsPage() {
  const { address } = useWallet();
  const [lookup, setLookup] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <Section>
      <Heading lead="Each fact links to the transaction it was drawn from and the verification that recorded it. Nothing here asks to be believed.">
        Proofs
      </Heading>

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
          className="w-full rounded-[--radius-sm] border border-[--color-line-strong] bg-[--color-surface] px-4 py-2.5 font-mono text-[13px] text-[--color-ink] placeholder:text-[--color-ink-faint] focus:border-[--color-accent] focus:outline-none sm:max-w-md"
        />
        <button
          type="submit"
          className="rounded-[--radius-sm] border border-[--color-line-strong] px-4 py-2.5 font-mono text-[13px] text-[--color-ink-muted] transition-colors hover:border-[--color-ink-faint] hover:text-[--color-ink]"
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
    </Section>
  );
}
