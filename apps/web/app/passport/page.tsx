'use client';

import { useState } from 'react';
import { Heading, Section, Empty, Action } from '@vouch/ui';
import { PassportView } from '@/components/passport/passport-view';
import { useWallet } from '@/hooks/useWallet';

export default function PassportPage() {
  const { address, isConnected, connect, canConnect } = useWallet();
  const [lookup, setLookup] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <Section>
      <Heading lead="Standing is public. Any address can be looked up by anyone, because a fact proven on chain is not a private one.">
        Passport
      </Heading>

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
                  className="rounded-[--radius-sm] bg-[--color-accent] px-4 py-2.5 font-mono text-[13px] text-[--color-accent-ink]"
                >
                  Connect wallet
                </button>
              ) : (
                <Action href="/proofs">Browse proven facts</Action>
              )
            }
          />
        )}
      </div>
    </Section>
  );
}
