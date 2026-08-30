import Link from 'next/link';
import { SectionHeading, Section, Snippet } from '@vouch/ui';

/**
 * Integration guide.
 *
 * The claim is that a third party integrates in under twenty lines, so the page
 * shows the twenty lines rather than describing them. Nothing here is a
 * tutorial; it is the whole surface.
 */

export default function DevelopersPage() {
  return (
    <>
      <Section>
        <SectionHeading lead="Vouch proves facts. It does not decide what they mean. Whether a proven repayment is worth lower collateral, a fee tier or a game unlock is your contract's decision, and Vouch never needs to know you made it.">
          Integrate
        </SectionHeading>
      </Section>

      <Section className="border-t border-[--color-line]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <SectionHeading lead="One interface, one view call. No registration, no allowlist, no key.">
            On chain
          </SectionHeading>

          <Snippet caption="Any Creditcoin contract. Nothing else is required.">
{`import {IVouchRegistry} from "vouch/interfaces/IVouchRegistry.sol";
import {FactTypes} from "vouch/core/FactTypes.sol";

contract YourProtocol {
    IVouchRegistry constant VOUCH =
        IVouchRegistry(0x...);

    function feeFor(address user) public view returns (uint16) {
        if (VOUCH.hasProof(user, FactTypes.LONG_TERM_LP)) {
            return 10;   // 0.10%
        }
        return 30;       // 0.30%
    }
}`}
          </Snippet>
        </div>
      </Section>

      <Section className="border-t border-[--color-line]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <SectionHeading lead="The SDK returns standing as proven or unknown rather than a boolean, so an unproven address cannot be silently rendered as a negative one.">
            Off chain
          </SectionHeading>

          <Snippet caption="@vouch/sdk. The client holds no key and sends no transaction.">
{`import { createVouchClient, AAVE_REPAYMENT } from '@vouch/sdk';

const vouch = createVouchClient({
  registry: '0x...',
  publicClient,
});

const standing = await vouch.standing(user, AAVE_REPAYMENT.id);

if (standing.state === 'proven') {
  // standing.count, standing.value
}`}
          </Snippet>
        </div>
      </Section>

      <Section className="border-t border-[--color-line]">
        <div className="max-w-[62ch]">
          <SectionHeading>Three things worth knowing before you ship</SectionHeading>

          <div className="mt-8 space-y-8">
            <div>
              <div className="text-[13px] text-[--color-ink]">
                An unproven address is unknown, not clean
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[--color-ink-faint]">
                Inclusion proofs prove positive facts only. Never read the
                absence of a proof as evidence of bad behaviour, and never let a
                low tier deny something a fresh address would have received.
              </p>
            </div>

            <div>
              <div className="text-[13px] text-[--color-ink]">Standing only rises</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[--color-ink-faint]">
                The registry is append-only and the passport is a pure function
                of it, so a tier can never fall. Cache it as long as you like: a
                stale tier can only ever be too low.
              </p>
            </div>

            <div>
              <div className="text-[13px] text-[--color-ink]">
                chainKey is not chainId
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[--color-ink-faint]">
                Attestcoin keeps its own key space, and the mapping differs per
                Creditcoin network. Passing the wrong one does not throw; it
                proves facts about a different chain. Read it from the ChainInfo
                precompile, never from memory.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-6">
            <Link
              href="https://github.com/Venkat5599/CTC/blob/master/docs/architecture/overview.md"
              className="prose-link text-[13px] text-[--color-ink-muted]"
            >
              Architecture
            </Link>
            <Link
              href="https://github.com/Venkat5599/CTC/blob/master/docs/security/threat-model.md"
              className="prose-link text-[13px] text-[--color-ink-muted]"
            >
              Threat model
            </Link>
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
