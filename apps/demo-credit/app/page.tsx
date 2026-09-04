'use client';

import { useState } from 'react';
import { useAccount, useConnect, useReadContract } from 'wagmi';
import { parseAbi } from 'viem';
import { DEPLOYED } from '@vouch/config';
import { SectionHeading, Metric, Panel, Section, StandingBadge } from '@vouch/ui';

/**
 * A lending market that reads Vouch.
 *
 * Deliberately a separate application rather than a page on the main site,
 * because the argument only lands if this looks like somebody else's product.
 * It shares no storage with the registry, was never registered with it, and
 * knows nothing about the other consumers. All it has is an address and a view
 * call.
 *
 * The screen is built around a comparison rather than a number. "130% collateral"
 * means nothing on its own; "130% instead of 150%, and here is the capital that
 * frees" is the whole pitch, and it is the same pitch whether the reader is a
 * borrower or a judge.
 */

const TIER_NAMES = ['Unproven', 'Bronze', 'Silver', 'Gold'] as const;
const COLLATERAL_BPS = [15_000, 13_000, 11_500, 10_000] as const;

const PASSPORT_ABI = parseAbi(['function tierOf(address user) view returns (uint8)']);

/**
 * Read straight from the deployed passport on CC3.
 *
 * This market shares nothing with the registry -- no storage, no registration,
 * no privileged relationship. One address and one view call is the entire
 * integration, which is the claim this application exists to make checkable.
 */
const PASSPORT = DEPLOYED['cc3-testnet'].passport;

export default function DemoCredit() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [amount, setAmount] = useState(10_000);

  // The live read. An unconnected visitor, an unproven address and an
  // unreachable node all resolve to the baseline tier -- which is the honest
  // answer in each case, because unproven is unknown rather than clean.
  // Inventing a tier to make the screen look better would be exactly the
  // fabrication this protocol exists to remove.
  const { data: onChainTier, isLoading: readingTier } = useReadContract({
    address: PASSPORT ?? undefined,
    abi: PASSPORT_ABI,
    functionName: 'tierOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && PASSPORT) },
  });

  const tier = typeof onChainTier === 'number' ? onChainTier : 0;
  const bps = COLLATERAL_BPS[tier] ?? COLLATERAL_BPS[0];
  const required = (amount * bps) / 10_000;
  const baseline = (amount * COLLATERAL_BPS[0]) / 10_000;

  return (
    <>
      <Section>
        <div className="flex flex-wrap items-baseline justify-between gap-6">
          <SectionHeading lead="An independent lending market. It reads the Vouch registry through the same public view functions any contract can call, holds no privileged relationship with it, and was never registered anywhere.">
            Borrow against what you have already done
          </SectionHeading>

          {!isConnected && connectors[0] ? (
            <button
              type="button"
              onClick={() => connect({ connector: connectors[0]! })}
              className="rounded-[--radius-sm] bg-[--color-accent] px-4 py-2.5 font-mono text-[13px] text-[--color-accent-ink] transition-colors hover:bg-[#5fe0d0]"
            >
              Connect wallet
            </button>
          ) : address ? (
            <span className="font-mono text-[13px] text-[--color-ink-muted]">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          ) : null}
        </div>
      </Section>

      <Section className="border-t border-[--color-line]">
        <Panel className="p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-6">
            <label htmlFor="amount" className="text-[13px] text-[--color-ink-muted]">
              Borrow amount
            </label>
            <StandingBadge state={tier > 0 ? 'proven' : 'unknown'}>
              {/* While the read is in flight the badge says so. Rendering the
                  baseline tier during a load would state a conclusion the
                  contract has not answered yet. */}
              {readingTier ? 'Reading Creditcoin…' : TIER_NAMES[tier]}
            </StandingBadge>
          </div>

          <input
            id="amount"
            type="range"
            min={1_000}
            max={100_000}
            step={1_000}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mt-6 w-full accent-[--color-accent]"
          />

          <div className="mt-2 font-mono text-[13px] tabular-nums text-[--color-ink]">
            {amount.toLocaleString()} USDC
          </div>

          <div className="mt-10 grid gap-10 border-t border-[--color-line] pt-8 md:grid-cols-3">
            <Metric value={`${(bps / 100).toFixed(0)}%`} label="Collateral ratio" />
            <Metric value={required.toLocaleString()} unit="USDC" label="You post" />
            <Metric
              value={(baseline - required).toLocaleString()}
              unit="USDC"
              label="Freed by standing"
              note="Capital that would otherwise sit locked against this position."
            />
          </div>
        </Panel>

        <p className="mt-8 max-w-[62ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
          Collateral floors at 100%. Standing reduces what you post and never
          removes it, because Vouch can prove that you repaid and can never prove
          that you were not liquidated. An address with no proofs is unknown
          rather than risky, and this market treats it exactly as it treats a
          brand new one.
        </p>
      </Section>

      <Section className="border-t border-[--color-line]">
        <div className="max-w-[58ch]">
          <SectionHeading lead="Everything above comes from one function. There is no scoring service, no snapshot, no signature from an off-chain underwriter, and no integration agreement with anybody.">
            What this application actually does
          </SectionHeading>

          <div className="mt-8 overflow-hidden rounded-[--radius] border border-[--color-line] bg-[--color-surface]">
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.7] text-[--color-ink-muted]">
              <code>{`const tier = await vouch.passport.tierOf(borrower);
const collateralBps = COLLATERAL_BPS[tier];`}</code>
            </pre>
          </div>
        </div>
      </Section>
    </>
  );
}
