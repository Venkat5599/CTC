import type { Metadata } from "next";

import { KeyValue, Section, Snippet } from "@/components/dashboard/data";
import { PageHeader } from "@/components/dashboard/primitives";
import { NETWORK, addresses } from "@/lib/contracts";

export const metadata: Metadata = {
  title: "Docs",
  description: "How to read the Vouch registry, and the three rules that make a proof safe.",
};

/**
 * Docs.
 *
 * Reference, not a tour. Developers is the integration walkthrough; this is the
 * page you keep open beside the editor: the read call, the three security rules
 * a naive integration gets wrong, and the addresses.
 *
 * Every rule carries its reason, because each of these three cost a real bug
 * during this build and the reason is what makes the rule stick.
 */

const RULES = [
  {
    id: "S1",
    title: "The precompile proves inclusion, not success",
    body: "A transaction that reverted is still included in its block, and the Block Prover will happily prove it. Check receiptStatus == 1 before believing anything the receipt contains. Skipping this lets a reverted repayment count as a repayment.",
  },
  {
    id: "S2",
    title: "A valid proof of a lookalike event is still valid",
    body: "Anybody can deploy a contract emitting an event with your topic0 and your field layout, and a proof of that event is cryptographically sound. Pin the emitter address in the source definition, or you are trusting an event signature, which is public.",
  },
  {
    id: "S3",
    title: "Proofs are public and replayable",
    body: "Once a proof exists on chain anybody can resubmit it. The replay guard is keyed on the log, meaning the transaction hash plus the receipt-wide log index, never on the transaction alone, because one transaction can carry several claimable events.",
  },
];

const READ_SNIPPET = `// One storage read. No signature, no proof, no fee.
import { createVouchClient } from "@vouch/sdk";

const vouch = createVouchClient({
  registry: "${addresses.registry ?? "0x..."}",
  publicClient,
});

// Three states, never two. An address with no proof is UNKNOWN,
// which is not the same claim as CLEAN.
const standing = await vouch.standing(user, "aave.repay.v1");`;

export default function DocsPage() {
  return (
    <>
      <PageHeader
        label="Reference"
        title="Docs"
        description="Reading standing costs a storage read. Writing a fact is where the rules live."
      />

      <div className="space-y-4">
        <Section
          title="Reading standing"
          description="The registry is append-only and the passport is a pure function of it, so standing rises and never falls. That is a property of the data model, not a policy somebody enforces."
        >
          <Snippet code={READ_SNIPPET} />
        </Section>

        <Section
          title="Three rules for writing a fact"
          description="Each of these is a mistake that produced a real bug in this codebase."
        >
          <dl>
            {RULES.map((rule) => (
              <div key={rule.id} className="border-b border-white/[0.05] px-6 py-5 last:border-0">
                <dt className="flex items-baseline gap-3">
                  <span
                    className="font-mono text-[12px]"
                    style={{ color: "var(--vouch-primary)" }}
                  >
                    {rule.id}
                  </span>
                  <span className="text-[13.5px] text-[var(--vouch-text)]">{rule.title}</span>
                </dt>
                <dd className="mt-1.5 max-w-[72ch] pl-8 text-[12.5px] leading-relaxed text-[var(--vouch-text-muted)]">
                  {rule.body}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="chainKey is not chainId">
          <p className="max-w-[72ch] px-6 py-5 text-[13px] leading-relaxed text-[var(--vouch-text-muted)]">
            Attestcoin addresses source chains through its own key space. On CC3 Testnet,{" "}
            <code className="font-mono text-[var(--vouch-text)]">1</code> is Ethereum Sepolia and{" "}
            <code className="font-mono text-[var(--vouch-text)]">3</code> is Ethereum mainnet.
            Neither matches the chain id you would reach for. Passing a chain id where a chainKey
            belongs does not revert. It proves against the wrong chain and fails silently, which is
            why the SDK brands the two types apart so the compiler catches the swap.
          </p>
        </Section>

        <Section title={`Addresses on ${NETWORK}`}>
          <dl>
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
              <KeyValue key={label} label={label}>
                <span className="font-mono text-[12px]">{value ?? "Not deployed"}</span>
              </KeyValue>
            ))}
          </dl>
        </Section>
      </div>
    </>
  );
}
