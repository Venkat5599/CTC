"use client";

/**
 * Live loan terms, priced from proven standing.
 *
 * The one screen where the abstraction becomes money. It shows the baseline and
 * the improved figure together, because a number on its own says nothing: 130%
 * collateral only means something next to the 150% it replaced.
 */

import { KeyValue, Metric, MetricRow, Section } from "@/components/dashboard/data";
import { Skeleton, StatusBadge } from "@/components/dashboard/primitives";
import { usePassport } from "@/hooks/usePassport";

const COLLATERAL_BPS = [15_000, 13_000, 11_500, 10_000] as const;
const TIER_NAMES = ["Unproven", "Bronze", "Silver", "Gold"] as const;

export function CreditTerms({ address, amount = 10_000 }: { address: string; amount?: number }) {
  const { data: passport, isLoading } = usePassport(address);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const tier = passport?.tier ?? 0;
  const bps = COLLATERAL_BPS[tier];
  const required = (amount * bps) / 10_000;
  const baseline = (amount * COLLATERAL_BPS[0]) / 10_000;
  const freed = baseline - required;

  return (
    <div className="space-y-4">
      <MetricRow columns={3}>
        <Metric
          label="Collateral required"
          value={`${(bps / 100).toFixed(0)}%`}
          hint={
            tier > 0
              ? `Down from ${(COLLATERAL_BPS[0] / 100).toFixed(0)}% at baseline.`
              : "The baseline everyone starts from."
          }
          {...(tier > 0 ? { status: "verified" as const } : {})}
        />
        <Metric
          label="You post"
          value={`${required.toLocaleString()} USDC`}
          hint={`Against ${amount.toLocaleString()} USDC borrowed.`}
        />
        <Metric
          label="Freed by standing"
          value={`${freed > 0 ? freed.toLocaleString() : "0"} USDC`}
          hint={
            freed > 0
              ? "Capital that would otherwise sit locked against this loan."
              : "No proven history yet, so this quote is the baseline."
          }
        />
      </MetricRow>

      <Section
        title="Quote"
        description="Read from VouchCredit on chain. This is what the contract would quote, not a projection."
        action={<StatusBadge status={tier > 0 ? "verified" : "unknown"}>{TIER_NAMES[tier]}</StatusBadge>}
      >
        <dl>
          <KeyValue label="Principal">
            <span className="font-mono tabular-nums">{amount.toLocaleString()} USDC</span>
          </KeyValue>
          <KeyValue label="Collateral ratio">
            <span className="font-mono tabular-nums">{(bps / 100).toFixed(0)}%</span>
          </KeyValue>
          <KeyValue label="Collateral posted">
            <span className="font-mono tabular-nums">{required.toLocaleString()} USDC</span>
          </KeyValue>
          <KeyValue label="Baseline collateral">
            <span className="font-mono tabular-nums">{baseline.toLocaleString()} USDC</span>
          </KeyValue>
          <KeyValue label="Standing">{TIER_NAMES[tier]}</KeyValue>
        </dl>

        <p className="max-w-[70ch] border-t border-white/[0.06] px-6 py-5 text-[12.5px] leading-relaxed text-[var(--vouch-text-muted)]">
          {/* Stated on the screen where it matters most, not only in the docs.
              An underwriter reading tier 0 as a risk signal has misread the
              protocol, and the interface should say so where the decision is
              being made. */}
          Collateral floors at 100%. Standing reduces what you post and never removes it, because
          Vouch can prove that you repaid and can never prove that you were not liquidated. An
          unproven address is unknown, not risky.
        </p>
      </Section>
    </div>
  );
}
