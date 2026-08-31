import type { Metadata } from "next";

import { PageHeader, SectionLabel } from "@/components/dashboard/primitives";
import { NETWORK, addresses } from "@/lib/contracts";

export const metadata: Metadata = {
  title: "Docs",
  description: "How to read the Vouch registry, and the three rules that make a proof safe.",
};

/**
 * Docs.
 *
 * Reference, not a tour. Developers is the integration walkthrough; this page is
 * what you keep open beside your editor: the read call, the three security rules
 * that a naive integration gets wrong, and the addresses.
 *
 * Everything here is stated as a rule with the reason attached, because each of
 * these three cost a real bug during this build and the reason is what makes the
 * rule stick.
 */

const RULES = [
  {
    id: "S1",
    title: "The precompile proves inclusion, not success",
    body: "A transaction that reverted is still included in its block, and the Block Prover will happily prove it. Check receiptStatus == 1 before you believe anything the receipt contains. Skipping this lets a reverted repayment count as a repayment.",
  },
  {
    id: "S2",
    title: "A valid proof of a lookalike event is still valid",
    body: "Anybody can deploy a contract that emits an event with your topic0 and your field layout. The proof of that event is cryptographically sound. Pin the emitter address as part of the source definition, or you are trusting an event signature, which is public.",
  },
  {
    id: "S3",
    title: "Proofs are public and replayable",
    body: "Once a proof exists on chain, anybody can resubmit it. The replay guard is keyed on the log (transaction hash plus the receipt-wide log index), never on the transaction alone, because one transaction can carry several claimable events.",
  },
] as const;

const READ_SNIPPET = `// One storage read. No signature, no proof, no fee.
import { createVouchClient } from "@vouch/sdk";

const vouch = createVouchClient({
  registry: "${addresses.registry ?? "0x…"}",
  publicClient,
});

// Three states, never two. An address with no proof is UNKNOWN,
// which is not the same claim as CLEAN.
const standing = await vouch.standing(user, "aave.repay.v1");`;

export default function DocsPage() {
  return (
    <section>
      <PageHeader
        label="Reference"
        title="Docs"
        description="Reading standing costs a storage read. Writing a fact is where the rules live."
      />

      <section className="mb-16" aria-labelledby="read">
        <SectionLabel>
          <span id="read">Reading standing</span>
        </SectionLabel>

        <pre className="border-border bg-card-secondary mt-4 overflow-x-auto rounded-xl border p-5 font-mono text-[12.5px] leading-relaxed">
          <code>{READ_SNIPPET}</code>
        </pre>

        <p className="text-muted-foreground mt-4 max-w-[68ch] text-[13px] leading-relaxed">
          The registry is append-only and the passport is a pure function of it,
          so standing rises and never falls. That is a property of the data
          model, not a policy somebody has to enforce.
        </p>
      </section>

      <section className="mb-16" aria-labelledby="rules">
        <SectionLabel>
          <span id="rules">Three rules for writing a fact</span>
        </SectionLabel>

        <ul className="mt-4 space-y-px">
          {RULES.map((rule) => (
            <li key={rule.id} className="border-border rounded-xl border p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[12px] text-[var(--vouch-primary)]">{rule.id}</span>
                <h2 className="text-foreground text-[15px]">{rule.title}</h2>
              </div>
              <p className="text-muted-foreground mt-2 max-w-[68ch] text-[13px] leading-relaxed">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-16" aria-labelledby="chainkey">
        <SectionLabel>
          <span id="chainkey">chainKey is not chainId</span>
        </SectionLabel>

        <p className="text-muted-foreground mt-4 max-w-[68ch] text-[13px] leading-relaxed">
          Attestcoin addresses source chains through its own key space. On CC3
          Testnet, <code className="font-mono">1</code> is Ethereum Sepolia and{" "}
          <code className="font-mono">3</code> is Ethereum mainnet. Neither
          matches the chain id you would reach for. Passing a chain id where a
          chainKey belongs does not revert; it proves against the wrong chain and
          fails silently. The SDK brands the two types apart so the compiler
          catches the swap.
        </p>
      </section>

      <section aria-labelledby="addresses">
        <SectionLabel>
          <span id="addresses">Addresses on {NETWORK}</span>
        </SectionLabel>

        <dl className="divide-border border-border mt-4 divide-y rounded-xl border">
          {(
            [
              ["Registry", addresses.registry],
              ["Passport", addresses.passport],
              ["Credit", addresses.credit],
              ["Fee tier", addresses.feeTier],
              ["Access", addresses.access],
              ["Block Prover precompile", "0x0000000000000000000000000000000000000FD2"],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 sm:px-5"
            >
              <dt className="text-muted-foreground text-[13px]">{label}</dt>
              <dd className="text-foreground font-mono text-[12px] break-all">
                {value ?? "Not deployed"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
