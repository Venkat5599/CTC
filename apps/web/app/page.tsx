import Link from 'next/link';

import { Action, Heading, Metric, Section, Snippet } from '@vouch/ui';
import { ProofTrace } from '@vouch/ui';

/**
 * Landing.
 *
 * The composition is built around one artifact rather than a stack of default
 * sections. The hero is not headline-subtext-two-buttons with a panel on the
 * right; it is a claim and the diagram that proves the claim, because the
 * diagram IS the differentiator. One line in, one verification, many lines out.
 * A competitor's version of that picture has one line out.
 */

const CONSUMERS = [
  { label: 'Lending', benefit: 'Lower collateral' },
  { label: 'Exchange', benefit: 'Lower fee tier' },
  { label: 'Access', benefit: 'Gate opens' },
];

export default function Home() {
  return (
    <>
      {/* Hero. Owns the fold, asymmetric, no eyebrow. */}
      <section className="px-6 pt-20 pb-16 md:px-10 md:pt-24 md:pb-24">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
            <div>
              <h1 className="text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] tracking-[-0.03em] text-[--color-ink]">
                Prove it once.
                <br />
                Every app can read it.
              </h1>

              <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[--color-ink-muted]">
                Vouch is a shared standing registry for Creditcoin. One
                Attestcoin proof, stored on chain, readable by every application
                for the cost of a storage read.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-6">
                <Action href="/passport">Check an address</Action>
                <Link href="/developers" className="prose-link text-[13px] text-[--color-ink-muted]">
                  Read the integration
                </Link>
              </div>
            </div>

            <ProofTrace consumers={CONSUMERS} />
          </div>
        </div>
      </section>

      {/* The measured claim. Three numbers, no cards, no icons in tiles. */}
      <Section className="border-t border-[--color-line]">
        <div className="grid gap-12 md:grid-cols-3">
          <Metric
            value="1,202"
            unit="gas"
            label="Cost of a consumer read"
            note="Flat. The tenth application to ask pays exactly what the first paid."
          />
          <Metric
            value="0"
            label="Precompile calls per read"
            note="Measured across 75 consecutive consumer reads of the same fact."
          />
          <Metric
            value="ceil(N/10)"
            label="Continuity proofs for N facts"
            note="One proof covers ten claims in a window, and they need not share a user."
          />
        </div>
      </Section>

      {/* Why a registry. Prose-led, no bullet grid. */}
      <Section className="border-t border-[--color-line]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <Heading lead="Attestcoin verification is priced against repetition. Every application that proves the same history pays for it again. A lending market, an exchange and a game asking the same question of the same address pay three times for one answer.">
            Verification is expensive. Repeating it is the waste.
          </Heading>

          <div className="space-y-5 text-[15px] leading-relaxed text-[--color-ink-muted]">
            <p>
              Vouch verifies once and stores the fact canonically. The first
              consumer pays the proof cost. Every consumer after that reads a
              storage slot.
            </p>
            <p>
              That is the whole design, and it is why the interface is small
              enough to fit in a sentence: ask whether an address has proven a
              fact, and act on the answer.
            </p>
            <p className="text-[--color-ink-faint]">
              Credit is the flagship use case, not the product. The registry is
              the deliverable.
            </p>
          </div>
        </div>
      </Section>

      {/* The integration, shown rather than described. */}
      <Section className="border-t border-[--color-line]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
          <Heading lead="No Attestcoin Smart Contract to write. No off-chain worker to run. No proof gas to pay. A consumer contract needs the registry address and one view call.">
            The whole integration
          </Heading>

          <Snippet caption="VouchCredit.sol, the reference consumer, in full.">
{`if (IVouchRegistry(VOUCH).hasProof(
      user,
      FactTypes.AAVE_REPAYMENT
    )) {
    collateralBps = 11_500;   // 115% instead of 150%
}`}
          </Snippet>
        </div>
      </Section>

      {/* The honest limitation, stated on the landing page rather than buried. */}
      <Section className="border-t border-[--color-line]">
        <div className="max-w-[62ch]">
          <Heading>What Vouch cannot do</Heading>

          <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-[--color-ink-muted]">
            <p>
              Inclusion proofs prove positive facts only. Vouch can prove that an
              address repaid. It can never prove that an address was never
              liquidated, because the absence of an event is not enumerable.
            </p>
            <p>
              So an address with no proofs is{' '}
              <span className="text-[--color-ink]">unknown</span>, never{' '}
              <span className="text-[--color-ink]">clean</span>. A consumer that
              reads a low tier as evidence of bad behaviour has misused the
              protocol. Standing reduces collateral here; it never eliminates it.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="https://github.com/Venkat5599/CTC/blob/master/docs/security/assumptions.md"
              className="prose-link text-[13px] text-[--color-ink-muted]"
            >
              Assumptions in full
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
