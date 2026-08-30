'use client';

/**
 * A passport.
 *
 * The layout leads with the tier, then the facts that produced it, because a
 * number without its evidence is a score and a score is exactly what this
 * protocol refuses to be. Every tier here can be traced to proofs the visitor
 * can open on a block explorer.
 */

import { Empty, Metric, Panel, Skeleton, StandingRow, Action } from '@vouch/ui';
import { REGISTERED_FACTS } from '@vouch/schemas';
import { useStanding } from '@/hooks/useFacts';
import { usePassport } from '@/hooks/usePassport';

const TIER_NAMES = ['Unproven', 'Bronze', 'Silver', 'Gold'] as const;

export function PassportView({ address }: { address: string }) {
  const passport = usePassport(address);
  const standing = useStanding(address);

  if (passport.isLoading || standing.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const total = passport.data?.totalProofs ?? 0;

  if (total === 0) {
    return (
      <Empty
        title="Nothing proven yet"
        // The wording matters. Not "no history" and not "unverified" -- both
        // read as a verdict. This address simply has not been proven, which is
        // the default state of every address on earth.
        body="This address has no proofs in the registry. That is not a judgement about it: Vouch can only ever prove that something happened, never that it did not."
        action={<Action href="/verify">Prove a fact</Action>}
      />
    );
  }

  const tier = passport.data?.tier ?? 0;

  return (
    <div className="space-y-12">
      <Panel className="p-8">
        <div className="grid gap-10 md:grid-cols-3">
          <Metric value={TIER_NAMES[tier]} label="Tier" note="Rises with proven history. Never falls." />
          <Metric value={String(total)} label="Facts proven" />
          <Metric
            value={
              passport.data?.firstSeenBlock && passport.data.lastSeenBlock
                ? String(passport.data.lastSeenBlock - passport.data.firstSeenBlock)
                : '0'
            }
            unit="blocks"
            label="Proven tenure"
            note="The span Vouch can prove, not the age of the account."
          />
        </div>
      </Panel>

      <div>
        {REGISTERED_FACTS.map((fact) => {
          const value = standing.data?.[fact.id];
          return (
            <StandingRow
              key={fact.id}
              label={fact.label}
              meaning={fact.meaning}
              state={value?.state === 'proven' ? 'proven' : 'unknown'}
              count={value?.count}
            />
          );
        })}
      </div>
    </div>
  );
}
