"use client";

import { useState } from "react";

import { EmptyState, PageHeader, SectionLabel } from "@/components/dashboard/primitives";
import { FactList } from "@/components/proofs/fact-list";
import { NETWORK, addresses, explorerUrl } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";

/**
 * Registry explorer.
 *
 * Looks up any address against the deployed registry and shows the contracts
 * that hold it. There is no global "latest facts" feed here, and the omission is
 * deliberate: the registry emits per-subject, and a live firehose would need an
 * indexer this deployment does not run. Rather than fill the page with plausible
 * rows, the explorer answers exactly the question the chain can answer -- what
 * has been proven for this address -- and links out to Blockscout for the rest.
 */

const CONTRACTS = [
  { key: "registry", label: "VouchRegistry", role: "Append-only store of verified facts" },
  { key: "passport", label: "VouchPassport", role: "Pure function of the registry" },
  { key: "credit", label: "VouchCredit", role: "Prices collateral from standing" },
  { key: "feeTier", label: "VouchFeeTier", role: "Reads a different fact type" },
  { key: "access", label: "VouchAccess", role: "Gates on a proven fact" },
] as const;

export default function ExplorerPage() {
  const { address } = useWallet();
  const [lookup, setLookup] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const active = subject ?? address ?? null;

  return (
    <section>
      <PageHeader
        label="Registry"
        title="Explorer"
        description="Read the registry directly. Every answer here is a public view call against CC3 Testnet."
      />

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const value = lookup.trim();
          // Validate before querying. A malformed address would otherwise
          // return an empty result that reads as "nothing proven", which is a
          // different and much worse claim than "that is not an address".
          if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
            setSubject(value.toLowerCase());
            setInvalid(false);
          } else {
            setInvalid(true);
          }
        }}
      >
        <label htmlFor="explorer-address" className="sr-only">
          Ethereum address
        </label>
        <input
          id="explorer-address"
          value={lookup}
          onChange={(event) => {
            setLookup(event.target.value);
            setInvalid(false);
          }}
          placeholder="0x…"
          spellCheck={false}
          aria-invalid={invalid}
          {...(invalid ? { "aria-describedby": "explorer-error" } : {})}
          className="border-border bg-card-secondary text-foreground placeholder:text-muted-foreground focus:border-muted-foreground w-full rounded-lg border px-4 py-2.5 font-mono text-[13px] focus:outline-none sm:max-w-md"
        />
        <button
          type="submit"
          className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground rounded-lg border px-4 py-2.5 font-mono text-[13px] transition-colors"
        >
          Look up
        </button>
      </form>

      {invalid ? (
        <p id="explorer-error" className="mt-3 text-[12px] text-[var(--vouch-danger)]">
          That is not a 20-byte address. Paste a full 0x-prefixed address.
        </p>
      ) : null}

      <div className="mt-12">
        {active ? (
          <FactList address={active} />
        ) : (
          <EmptyState
            title="No address selected"
            description="Paste an address above, or connect a wallet. Proven facts are public: anybody can read anybody's."
          />
        )}
      </div>

      <section className="mt-16" aria-labelledby="contracts">
        <SectionLabel>
          <span id="contracts">Deployed contracts on {NETWORK}</span>
        </SectionLabel>

        <ul className="divide-border border-border mt-4 divide-y rounded-xl border">
          {CONTRACTS.map((contract) => {
            const deployed = addresses[contract.key];
            return (
              <li
                key={contract.key}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[14px]">{contract.label}</div>
                  <div className="text-muted-foreground mt-0.5 text-[12px]">{contract.role}</div>
                </div>

                {/* `null` means not deployed, never a zero address. A zero
                    address would answer false to everything and look live. */}
                {deployed ? (
                  <a
                    href={explorerUrl("address", deployed)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground font-mono text-[12px] transition-colors"
                  >
                    {deployed.slice(0, 10)}…{deployed.slice(-6)}
                  </a>
                ) : (
                  <span className="text-muted-foreground/70 font-mono text-[12px]">
                    Not deployed
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
