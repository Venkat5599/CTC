"use client";

/**
 * A passport.
 *
 * Leads with the tier, then the facts that produced it, because a number
 * without its evidence is a score and a score is exactly what this protocol
 * refuses to be. Every tier here traces to proofs the visitor can open on a
 * block explorer.
 *
 * The standing table is the honest part. It lists every registered fact type,
 * including the ones this address has not proven, and marks those Unknown
 * rather than omitting them or marking them clear. Hiding the unproven rows
 * would let an empty passport read as a clean one.
 */

import { DataTable, Metric, MetricRow, Nothing, Section, type Column } from "@/components/dashboard/data";
import { Button, SkeletonRows, StatusBadge } from "@/components/dashboard/primitives";
import { useStanding } from "@/hooks/useFacts";
import { usePassport } from "@/hooks/usePassport";
import { REGISTERED_FACTS } from "@vouch/schemas";

const TIER_NAMES = ["Unproven", "Bronze", "Silver", "Gold"] as const;

interface StandingRow {
  id: string;
  label: string;
  meaning: string;
  proven: boolean;
  count: number;
}

export function PassportView({ address }: { address: string }) {
  const passport = usePassport(address);
  const standing = useStanding(address);

  const loading = passport.isLoading || standing.isLoading;

  const rows: StandingRow[] = REGISTERED_FACTS.map((fact) => {
    const value = standing.data?.[fact.id];
    return {
      id: fact.id,
      label: fact.label,
      meaning: fact.meaning,
      proven: value?.state === "proven",
      count: value?.count ?? 0,
    };
  });

  const columns: Column<StandingRow>[] = [
    {
      key: "fact",
      header: "Fact type",
      cell: (row) => (
        <div className="min-w-0">
          <div className="text-[13.5px] text-[var(--vouch-text)]">{row.label}</div>
          <div className="mt-0.5 max-w-[52ch] text-[12px] text-[var(--vouch-text-muted)]">
            {row.meaning}
          </div>
        </div>
      ),
    },
    {
      key: "state",
      header: "State",
      width: "w-[120px]",
      cell: (row) => <StatusBadge status={row.proven ? "verified" : "unknown"} />,
    },
    {
      key: "count",
      header: "Proofs",
      align: "right",
      width: "w-[90px]",
      secondary: true,
      cell: (row) => (
        <span className="font-mono text-[13px] tabular-nums text-[var(--vouch-text-muted)]">
          {row.count}
        </span>
      ),
    },
  ];

  if (loading) {
    return <SkeletonRows rows={4} height="h-20" />;
  }

  const total = passport.data?.totalProofs ?? 0;
  const tier = passport.data?.tier ?? 0;

  const tenure =
    passport.data?.firstSeenBlock && passport.data.lastSeenBlock
      ? String(passport.data.lastSeenBlock - passport.data.firstSeenBlock)
      : "0";

  return (
    <div className="space-y-4">
      <MetricRow columns={3}>
        <Metric
          label="Standing"
          value={TIER_NAMES[tier]}
          hint="Rises with proven history. Never falls."
          {...(tier > 0 ? { status: "verified" as const } : {})}
        />
        <Metric
          label="Facts proven"
          value={String(total)}
          hint={total === 0 ? "Unknown, which is not the same as clean." : "Append-only."}
        />
        <Metric
          label="Proven tenure"
          value={`${tenure} blocks`}
          hint="The span Vouch can prove, not the age of the account."
        />
      </MetricRow>

      <Section
        title="Standing by fact type"
        description="Every registered fact type, including the ones this address has not proven."
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={<Nothing>No fact types are registered on this deployment.</Nothing>}
        />
      </Section>

      {total === 0 ? (
        <Section title="Nothing proven yet">
          <div className="px-6 py-6">
            {/* The wording matters. Not "no history" and not "unverified":
                both read as a verdict. This address simply has not been
                proven, which is the default state of every address on earth. */}
            <Nothing
              action={
                <Button href="/verify" variant="secondary">
                  Prove a fact
                </Button>
              }
            >
              This address has no proofs in the registry. That is not a judgement about it. Vouch
              can prove that something happened, never that it did not.
            </Nothing>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
