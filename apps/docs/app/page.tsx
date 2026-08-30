import Link from 'next/link';
import { SectionHeading, Section, Snippet } from '@vouch/ui';

/**
 * Documentation.
 *
 * Short on purpose. The integration surface is one view call, so a documentation
 * site that ran to twenty pages would be describing something other than the
 * protocol. What earns space here is the part an integrator can get wrong in a
 * way that fails silently, which is why the caveats section is longer than the
 * API section.
 */

const SECTIONS = [
  { href: '#install', label: 'Install' },
  { href: '#read', label: 'Read standing' },
  { href: '#caveats', label: 'Getting it wrong' },
  { href: '#reference', label: 'Reference' },
];

export default function DocsHome() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 md:px-10">
      <div className="grid gap-16 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-20">
        {/* Contents rail. Sticky, quiet, no active-dot decoration. */}
        <nav className="pt-20 lg:sticky lg:top-20 lg:self-start">
          <div className="font-mono text-[15px] text-[--color-ink]">vouch/docs</div>
          <ul className="mt-8 space-y-3">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="text-[13px] text-[--color-ink-faint] transition-colors hover:text-[--color-ink]"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pb-24">
          <Section className="!px-0 !pt-20">
            <SectionHeading lead="Vouch proves facts about activity on other chains. It does not decide what they mean: whether a proven repayment is worth lower collateral, a fee tier or a game unlock is your contract's decision, and Vouch never needs to know you made it.">
              Integrating Vouch
            </SectionHeading>
          </Section>

          <section id="install" className="border-t border-[--color-line] py-14">
            <h2 className="text-[19px] tracking-[-0.01em] text-[--color-ink]">Install</h2>
            <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-muted]">
              On chain you need nothing but the interface. Off chain, the SDK is
              optional and only wraps the same public view calls.
            </p>
            <div className="mt-6">
              <Snippet>{`npm install @vouch/sdk`}</Snippet>
            </div>
          </section>

          <section id="read" className="border-t border-[--color-line] py-14">
            <h2 className="text-[19px] tracking-[-0.01em] text-[--color-ink]">Read standing</h2>
            <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-muted]">
              One call. The first consumer to verify a fact pays for the proof;
              every consumer after that reads a storage slot.
            </p>

            <div className="mt-6 space-y-6">
              <Snippet caption="Solidity. The whole integration.">
{`if (IVouchRegistry(VOUCH).hasProof(user, FactTypes.AAVE_REPAYMENT)) {
    collateralBps = 11_500;
}`}
              </Snippet>

              <Snippet caption="TypeScript. Standing is proven or unknown, never a bare boolean.">
{`const standing = await vouch.standing(user, AAVE_REPAYMENT.id);

if (standing.state === 'proven') {
  // standing.count, standing.value
}`}
              </Snippet>
            </div>
          </section>

          <section id="caveats" className="border-t border-[--color-line] py-14">
            <h2 className="text-[19px] tracking-[-0.01em] text-[--color-ink]">
              Three ways to get this wrong
            </h2>
            <p className="mt-3 max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-muted]">
              All three fail silently. Nothing reverts, nothing logs, and the
              result looks like a working integration.
            </p>

            <div className="mt-10 space-y-10">
              <div>
                <div className="text-[13px] text-[--color-ink]">
                  Reading unknown as clean
                </div>
                <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
                  Inclusion proofs prove positive facts only. Vouch can prove an
                  address repaid; it can never prove one was not liquidated,
                  because absence of an event is not enumerable. Never deny
                  something to an unproven address that a brand new address would
                  have received.
                </p>
              </div>

              <div>
                <div className="text-[13px] text-[--color-ink]">
                  Treating chainKey as chainId
                </div>
                <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
                  Attestcoin keeps its own key space and the mapping differs per
                  Creditcoin network: on CC3 Testnet key 3 is Ethereum mainnet,
                  on CC3 Mainnet key 1 is. Passing the wrong number proves facts
                  about a different chain without complaining.
                </p>
              </div>

              <div>
                <div className="text-[13px] text-[--color-ink]">
                  Trusting the relayer
                </div>
                <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
                  Grant benefits on `hasProof`, never on a relayer API response.
                  The relayer is untrusted by design: it decides which proofs get
                  submitted and when, so it can stall, and anyone can run their
                  own. It cannot make the registry believe something false.
                </p>
              </div>
            </div>
          </section>

          <section id="reference" className="border-t border-[--color-line] py-14">
            <h2 className="text-[19px] tracking-[-0.01em] text-[--color-ink]">Reference</h2>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ['Architecture', 'docs/architecture/overview.md'],
                ['Registry', 'docs/architecture/registry.md'],
                ['Relayer', 'docs/architecture/relayer.md'],
                ['Threat model', 'docs/security/threat-model.md'],
                ['Assumptions', 'docs/security/assumptions.md'],
                ['Benchmarks', 'docs/benchmarks/results.md'],
              ].map(([label, path]) => (
                <Link
                  key={label}
                  href={`https://github.com/Venkat5599/CTC/blob/master/${path}`}
                  className="prose-link text-[13px] text-[--color-ink-muted]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
