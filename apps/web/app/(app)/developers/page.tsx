import { KeyValue, Section, Snippet } from "@/components/dashboard/data";
import { Button, PageHeader } from "@/components/dashboard/primitives";
import { NETWORK, addresses } from "@/lib/contracts";

/**
 * Integration guide.
 *
 * The claim is that a third party integrates in under twenty lines, so the page
 * shows the twenty lines rather than describing them. Nothing here is a
 * tutorial; it is the whole surface.
 *
 * The three rules below are not style notes. Each one is a mistake that cost a
 * real bug during this build, and the reason is attached to each because the
 * reason is what makes a rule stick.
 */

const ON_CHAIN = `import {IVouchRegistry} from "vouch/interfaces/IVouchRegistry.sol";
import {FactTypes} from "vouch/core/FactTypes.sol";

contract YourProtocol {
    IVouchRegistry constant VOUCH =
        IVouchRegistry(${addresses.registry ?? "0x..."});

    function feeFor(address user) public view returns (uint16) {
        if (VOUCH.hasProof(user, FactTypes.LONG_TERM_LP)) {
            return 10;   // 0.10%
        }
        return 30;       // 0.30%
    }
}`;

const OFF_CHAIN = `import { createVouchClient, AAVE_REPAYMENT } from '@vouch/sdk';

const vouch = createVouchClient({
  registry: '${addresses.registry ?? "0x..."}',
  publicClient,
});

const standing = await vouch.standing(user, AAVE_REPAYMENT.id);

if (standing.state === 'proven') {
  // standing.count, standing.value
}`;

const RULES = [
  {
    title: "An unproven address is unknown, not clean",
    body: "Inclusion proofs prove positive facts only. Never read the absence of a proof as evidence of bad behaviour, and never let a low tier deny something a fresh address would have received.",
  },
  {
    title: "Standing only rises",
    body: "The registry is append-only and the passport is a pure function of it, so a tier can never fall. Cache it as long as you like: a stale tier can only ever be too low.",
  },
  {
    title: "chainKey is not chainId",
    body: "Attestcoin keeps its own key space, and the mapping differs per Creditcoin network. Passing the wrong one does not throw; it proves facts about a different chain. Read it from the ChainInfo precompile, never from memory.",
  },
];

const LINKS = [
  { label: "Architecture", href: "https://github.com/Venkat5599/CTC/blob/master/docs/architecture/overview.md" },
  { label: "Threat model", href: "https://github.com/Venkat5599/CTC/blob/master/docs/security/threat-model.md" },
  { label: "Source", href: "https://github.com/Venkat5599/CTC" },
];

export default function DevelopersPage() {
  return (
    <>
      <PageHeader
        label="Develop"
        title="Developers"
        description="Reading standing is one view call. No registration, no allowlist, no key, no fee."
      />

      <div className="space-y-4">
        <Section
          title="On chain"
          description="Any Creditcoin contract. Nothing else is required."
        >
          <Snippet code={ON_CHAIN} caption="One interface, one view call." />
        </Section>

        <Section
          title="Off chain"
          description="The SDK returns standing as proven or unknown rather than a boolean, so an unproven address cannot be silently rendered as a negative one."
        >
          <Snippet code={OFF_CHAIN} caption="@vouch/sdk. The client holds no key and sends no transaction." />
        </Section>

        <Section title="Three rules that are easy to get wrong">
          <dl>
            {RULES.map((rule) => (
              <div key={rule.title} className="border-b border-white/[0.05] px-6 py-5 last:border-0">
                <dt className="text-[13.5px] text-[var(--vouch-text)]">{rule.title}</dt>
                <dd className="mt-1.5 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--vouch-text-muted)]">
                  {rule.body}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title={`Addresses on ${NETWORK}`}>
          <dl>
            <KeyValue label="Registry">
              <span className="font-mono text-[12px]">{addresses.registry ?? "Not deployed"}</span>
            </KeyValue>
            <KeyValue label="Passport">
              <span className="font-mono text-[12px]">{addresses.passport ?? "Not deployed"}</span>
            </KeyValue>
            <KeyValue label="Block Prover precompile">
              <span className="font-mono text-[12px]">
                0x0000000000000000000000000000000000000FD2
              </span>
            </KeyValue>
          </dl>
        </Section>

        <Section title="Reference">
          <div className="flex flex-wrap gap-2 px-6 py-5">
            {LINKS.map((link) => (
              <Button key={link.href} href={link.href} variant="secondary" external>
                {link.label}
              </Button>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
