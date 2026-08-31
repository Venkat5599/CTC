import Link from 'next/link';
import { SectionHeading, Metric, Section, Empty } from '@vouch/ui';
import { REGISTERED_FACTS } from '@vouch/schemas';
import { addresses, isDeployed } from '@/lib/contracts';

/**
 * Proof explorer.
 *
 * Every fact the registry holds, traceable to both chains. The reason this
 * exists as its own surface rather than a tab on the main site: an explorer is
 * how a claim stops being a claim. A judge should be able to pick any row, open
 * the source transaction on Etherscan, open the verification on the Creditcoin
 * explorer, and confirm the two describe the same event without taking a single
 * word here on trust.
 */

export default function ExplorerHome() {
  return (
    <>
      <Section>
        <SectionHeading lead="Every fact in the registry, with the source transaction it was drawn from and the verification that recorded it. Nothing here asks to be believed.">
          Explorer
        </SectionHeading>
      </Section>

      <Section className="border-t border-[--color-line]">
        {isDeployed ? (
          <div className="grid gap-12 md:grid-cols-3">
            <Metric value="--" label="Facts verified" note="Live from the registry." />
            <Metric value={String(REGISTERED_FACTS.length)} label="Fact types registered" />
            <Metric value="--" label="Addresses with standing" />
          </div>
        ) : (
          <Empty
            title="Registry not yet deployed"
            // Says which state this is rather than rendering zeros. A zeroed
            // dashboard and an undeployed one look identical, and only one of
            // them means something.
            body="Contracts are written, tested and ready. Once VouchRegistry is deployed to CC3 Testnet and its address recorded in @vouch/config, this page reads live data. Until then there is nothing to show, which is different from there being nothing."
          />
        )}
      </Section>

      <Section className="border-t border-[--color-line]">
        <SectionHeading lead="A fact type is a contract, an event signature and the topic that carries the subject. Adding one is a registry entry rather than a code change, which is the property that makes this infrastructure rather than an application.">
          Registered facts
        </SectionHeading>

        <div className="mt-12">
          {REGISTERED_FACTS.map((fact) => (
            <div
              key={fact.id}
              className="grid gap-4 border-t border-[--color-line] py-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-10"
            >
              <div>
                <div className="text-[13px] text-[--color-ink]">{fact.label}</div>
                <div className="mt-1 font-mono text-[12px] text-[--color-ink-faint]">
                  {fact.domain}
                </div>
              </div>
              <div className="space-y-2">
                <p className="max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-muted]">
                  {fact.meaning}
                </p>
                <div className="font-mono text-[12px] text-[--color-ink-faint]">
                  {fact.eventSignature}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-[62ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
          Three domains, deliberately. Shipping only repayment history would
          collapse Vouch into a credit score; the point of a registry is that it
          is domain-agnostic, and adding a fourth is a row in SourceRegistry
          rather than a code change.
        </p>
      </Section>

      <Section className="border-t border-[--color-line]">
        <div className="max-w-[58ch]">
          <SectionHeading>Contracts</SectionHeading>
          <dl className="mt-8">
            {Object.entries(addresses).map(([name, value]) => (
              <div
                key={name}
                className="flex items-baseline justify-between gap-6 border-t border-[--color-line] py-4"
              >
                <dt className="font-mono text-[13px] text-[--color-ink-muted]">{name}</dt>
                <dd className="font-mono text-[12px] text-[--color-ink-faint]">
                  {value ?? 'not deployed'}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            <Link
              href="https://github.com/Venkat5599/CTC"
              className="prose-link text-[13px] text-[--color-ink-muted]"
            >
              Source
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
