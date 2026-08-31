import Link from 'next/link';
import { SectionHeading, Snippet } from '@vouch/ui';

/**
 * Consumers.
 *
 * The page that carries the whole competitive argument, so it shows three
 * contracts reading one registry and grants that differ. The point is not that
 * three applications exist; it is that none of them knows the others do.
 */

const CONSUMERS = [
  {
    name: 'VouchCredit',
    domain: 'Lending',
    reads: 'Repayment history',
    grants: 'Collateral from 150% down to 100%',
    note: 'Floors at 100%. Standing reduces collateral and never removes it, because negative history is unprovable.',
  },
  {
    name: 'VouchFeeTier',
    domain: 'Exchange',
    reads: 'Supply history',
    grants: 'Taker fee from 0.30% down to 0.10%',
    note: 'Counts events rather than value, so a single large deposit cannot buy the deepest tier.',
  },
  {
    name: 'VouchAccess',
    domain: 'Access',
    reads: 'Any registered fact',
    grants: 'A gate that opens, permanently',
    note: 'Configured by constructor argument. A fourth application is a deployment, not a new contract type.',
  },
];

export default function AppsPage() {
  return (
    <>
      <section>
        <SectionHeading align="left" lead="Three contracts read the same registry. They share no storage, were never registered with it, and do not know each other exists. The only thing they have in common is an address passed at construction.">
          One registry, many consumers
        </SectionHeading>

        <div className="mt-14">
          {CONSUMERS.map((consumer) => (
            <div
              key={consumer.name}
              className="grid gap-5 border-t border-[--color-line] py-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] lg:gap-12"
            >
              <div>
                <div className="font-mono text-[13px] text-[--color-ink]">{consumer.name}</div>
                <div className="mt-1 text-[13px] text-[--color-ink-faint]">{consumer.domain}</div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
                  <span className="text-[--color-ink-faint]">
                    Reads <span className="text-[--color-ink-muted]">{consumer.reads}</span>
                  </span>
                  <span className="text-[--color-ink-faint]">
                    Grants <span className="text-[--color-ink-muted]">{consumer.grants}</span>
                  </span>
                </div>
                <p className="max-w-[58ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
                  {consumer.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
          <SectionHeading align="left" lead="A test asserts it rather than a README claiming it. One proven repayment lowers collateral, opens the access gate, and leaves the exchange fee untouched, because the exchange reads a different fact type entirely.">
            Proven in the test suite
          </SectionHeading>

          <Snippet caption="test_oneFactThreeUnrelatedConsumers, in Consumers.t.sol.">
{`_submit(_repayClaim(ALICE, 5_000e6, 25_000_000, "thesis"));

assertEq(credit.collateralBpsFor(ALICE), 13_000);   // 130%
assertTrue(accessGate.isAdmitted(ALICE));           // gate open
assertEq(feeTier.feeBpsFor(ALICE), 30);             // unchanged`}
          </Snippet>
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-16">
        <div className="max-w-[58ch]">
          <SectionHeading align="left" lead="Nothing needs to be registered with Vouch. A consumer deployed after a fact was proven reads that fact immediately, which is what makes this a primitive rather than a platform with a waiting list.">
            Building a fourth
          </SectionHeading>
          <div className="mt-8">
            <Link href="/developers" className="prose-link text-[13px] text-[--color-ink-muted]">
              Integration guide
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
