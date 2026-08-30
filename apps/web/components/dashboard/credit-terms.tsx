'use client';

/**
 * Live loan terms, priced from proven standing.
 *
 * The one screen where the abstraction becomes money. It shows the baseline and
 * the improved figure together, because a number on its own says nothing: 130%
 * collateral only means something next to the 150% it replaced.
 */

import { Metric, Panel, Skeleton, StandingBadge } from '@vouch/ui';
import { usePassport } from '@/hooks/usePassport';

const COLLATERAL_BPS = [15_000, 13_000, 11_500, 10_000] as const;
const TIER_NAMES = ['Unproven', 'Bronze', 'Silver', 'Gold'] as const;

export function CreditTerms({ address, amount = 10_000 }: { address: string; amount?: number }) {
  const { data: passport, isLoading } = usePassport(address);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const tier = passport?.tier ?? 0;
  const bps = COLLATERAL_BPS[tier];
  const required = (amount * bps) / 10_000;
  const baseline = (amount * COLLATERAL_BPS[0]) / 10_000;
  const saved = baseline - required;

  return (
    <Panel className="p-8">
      <div className="flex items-baseline justify-between gap-6">
        <div className="text-[13px] text-[--color-ink-muted]">
          Borrowing {amount.toLocaleString()} USDC
        </div>
        <StandingBadge state={tier > 0 ? 'proven' : 'unknown'}>{TIER_NAMES[tier]}</StandingBadge>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-3">
        <Metric value={`${(bps / 100).toFixed(0)}%`} label="Collateral required" />
        <Metric value={required.toLocaleString()} unit="USDC" label="You post" />
        <Metric
          value={saved > 0 ? saved.toLocaleString() : '0'}
          unit="USDC"
          label="Freed by standing"
          note={
            saved > 0
              ? 'Capital that would otherwise sit locked against this loan.'
              : 'No proven history yet, so this quote is the baseline everyone starts from.'
          }
        />
      </div>

      <p className="mt-8 max-w-[62ch] border-t border-[--color-line] pt-6 text-[13px] leading-relaxed text-[--color-ink-faint]">
        {/* Stated on the screen where it matters most, not only in the docs.
            An underwriter reading tier 0 as a risk signal has misread the
            protocol, and the interface should say so where the decision is
            being made. */}
        Collateral floors at 100%. Standing reduces what you post and never
        removes it, because Vouch can prove that you repaid and can never prove
        that you were not liquidated. An unproven address is unknown, not risky.
      </p>
    </Panel>
  );
}
