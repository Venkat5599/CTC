import Link from 'next/link';

import {
  Card,
  ChainStrip,
  ClosingCta,
  Hero,
  Pill,
  RegistryConsole,
  Section,
  SectionHeading,
  Stat,
} from '@vouch/ui';

/**
 * Landing.
 *
 * Composed around one artifact rather than assembled from default sections.
 * The hero states the claim and the console below it shows the claim being
 * true -- an address, the facts proven for it, and three unrelated applications
 * reading those facts to grant three different benefits.
 *
 * Every number on this page is measured. The gas figures come from Gas.t.sol,
 * the test names are real tests, and the empty registry is described as empty
 * rather than filled with invented activity.
 */

const FACTS = [
  {
    label: 'Aave repayment',
    detail: 'Repay(address,address,address,uint256,bool) · Aave V3 Pool',
    value: '3 proofs',
    proven: true,
  },
  {
    label: 'Liquidity supplied',
    detail: 'Supply(address,address,address,uint256,uint16) · Aave V3 Pool',
    value: '1 proof',
    proven: true,
  },
  {
    label: 'Governance participation',
    detail: 'Not registered · the standard Governor does not index the voter',
    value: '—',
    proven: false,
  },
];

const CONSUMERS = [
  {
    name: 'VouchCredit',
    domain: 'Lending market',
    before: '150% collateral',
    after: '130% collateral',
    reads: 'repayment history',
  },
  {
    name: 'VouchFeeTier',
    domain: 'Exchange',
    before: '0.30% taker fee',
    after: '0.20% taker fee',
    reads: 'supply history',
  },
  {
    name: 'VouchAccess',
    domain: 'Access gate',
    before: 'closed',
    after: 'open, permanently',
    reads: 'any registered fact',
  },
];

export default function Home() {
  return (
    <>
      <Hero
        headline={
          <>
            Prove it once.
            <br />
            Every app reads it.
          </>
        }
        subline="Vouch is a shared standing registry for Creditcoin. One Attestcoin proof, stored on chain, readable by every application for the cost of a storage read."
        action={<Pill href="/passport">Check an address</Pill>}
      >
        <RegistryConsole facts={FACTS} consumers={CONSUMERS} />
      </Hero>

      <Section>
        <ChainStrip note="Prove activity from any chain Attestcoin supports. Adding one is a registry entry, not a code change." />
      </Section>

      {/* The measured claim. Three numbers, no cards, no icons in tiles. */}
      <Section className="border-t border-[--color-line]">
        <div className="grid gap-14 md:grid-cols-3">
          <Stat
            value="1,202"
            unit="gas"
            label="Cost of a consumer read"
            note="Flat. The tenth application to ask pays exactly what the first paid."
          />
          <Stat
            value="0"
            label="Precompile calls per read"
            note="Measured across 75 consecutive reads of the same fact."
          />
          <Stat
            value="142"
            label="Tests passing"
            note="52 Solidity, including one per attack the protocol has to survive."
          />
        </div>
      </Section>

      {/* Why a registry. Prose-led, asymmetric, no bullet grid. */}
      <Section className="border-t border-[--color-line]">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <SectionHeading
            align="left"
            lead="Attestcoin verification is priced against repetition. A lending market, an exchange and a game asking the same question of the same address pay three times for one answer."
          >
            Verification is expensive. Repeating it is the waste.
          </SectionHeading>

          <div className="space-y-5 text-[15px] leading-relaxed text-[--color-ink-muted]">
            <p>
              Vouch verifies once and stores the fact canonically. The first
              consumer pays the proof cost. Every consumer after that reads a
              storage slot.
            </p>
            <p>
              That is the whole design, which is why the interface fits in a
              sentence: ask whether an address has proven a fact, and act on the
              answer.
            </p>
            <p className="text-[--color-ink-faint]">
              Credit is the flagship use case, not the product. The registry is
              the deliverable.
            </p>
          </div>
        </div>
      </Section>

      {/* Bento. Asymmetric, mixed weights, not three equal cards. */}
      <Section className="border-t border-[--color-line]">
        <SectionHeading lead="Three protocol-specific failure modes, each one silent. The precompile returns true, nothing reverts, and the registry records something false unless the layer above it does its job.">
          Security first
        </SectionHeading>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          <Card className="p-8 lg:col-span-2">
            <div className="text-[20px] font-light tracking-tight text-[--color-ink]">
              The precompile proves inclusion, not success
            </div>
            <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-[--color-ink-muted]">
              A reverted transaction is still in its block and still yields a
              completely valid proof, logs and all. An integration that skips the
              receipt check credits actions that never took effect, and it does
              so silently.
            </p>

            <div className="mt-8 grid gap-6 border-t border-[--color-line] pt-6 sm:grid-cols-3">
              {[
                ['S1', 'Receipt status'],
                ['S2', 'Emitter pinned'],
                ['S3', 'Replay guarded'],
              ].map(([id, label]) => (
                <div key={id}>
                  <div className="font-mono text-[13px] text-[--color-accent]">{id}</div>
                  <div className="mt-1.5 text-[13px] text-[--color-ink-muted]">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8">
            <div className="text-[20px] font-light tracking-tight text-[--color-ink]">
              Written as attacks
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[--color-ink-muted]">
              Each guard has a test that performs the attack rather than checking
              the check. A spoofed emitter. A reverted transaction. A replayed
              proof.
            </p>
            <div className="mt-8 font-mono text-[12px] leading-[2] text-[--color-ink-faint]">
              <div>test_S1_revertedTransaction</div>
              <div>test_S2_spoofedEmitter</div>
              <div>test_S3_replayIsRejected</div>
            </div>
          </Card>

          <Card className="p-8">
            <div className="text-[20px] font-light tracking-tight text-[--color-ink]">
              Permissionless
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[--color-ink-muted]">
              Anyone may submit a proof. The relayer is untrusted and affects
              liveness only; if ours stops, yours works. Enforced by a test that
              runs as its own CI job.
            </p>
          </Card>

          <Card className="p-8 lg:col-span-2">
            <div className="text-[20px] font-light tracking-tight text-[--color-ink]">
              Standing only ever rises
            </div>
            <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-[--color-ink-muted]">
              The registry is append-only and the passport is a pure function of
              it, so no sequence of operations can lower a tier. That is
              structural rather than a convention somebody has to remember, which
              is why a tier is safe to cache and never safe to invalidate
              downwards.
            </p>
          </Card>
        </div>
      </Section>

      {/* The honest limitation, on the landing page rather than buried. */}
      <Section className="border-t border-[--color-line]">
        <div className="mx-auto max-w-[64ch] text-center">
          <SectionHeading lead="Inclusion proofs prove positive facts only. Vouch can prove that an address repaid. It can never prove that an address was never liquidated, because the absence of an event is not enumerable.">
            What Vouch cannot do
          </SectionHeading>

          <p className="mx-auto mt-8 max-w-[58ch] text-[15px] leading-relaxed text-[--color-ink-muted]">
            So an address with no proofs is{' '}
            <span className="text-[--color-ink]">unknown</span>, never{' '}
            <span className="text-[--color-ink]">clean</span>. A consumer that
            reads a low tier as evidence of bad behaviour has misused the
            protocol. Standing reduces collateral here; it never eliminates it.
          </p>

          <div className="mt-10">
            <Link
              href="https://github.com/Venkat5599/CTC/blob/master/docs/security/assumptions.md"
              className="prose-link text-[13px] text-[--color-ink-muted]"
            >
              Assumptions in full
            </Link>
          </div>
        </div>
      </Section>

      <ClosingCta
        accent="Read standing"
        headline="in one view call"
        subline="No Attestcoin Smart Contract to write. No off-chain worker to run. No proof gas to pay."
        action={<Pill href="/developers">Integration guide</Pill>}
      />
    </>
  );
}
