/**
 * Standing display primitives.
 *
 * The whole component library exists to protect one distinction, and it is the
 * same distinction the SDK's types protect: an address with no proofs is
 * UNKNOWN, never CLEAN. Inclusion proofs prove positive facts only, so absence
 * of a proof is absence of evidence and nothing more.
 *
 * A UI that renders "no proofs" in red, or with a warning icon, or as a zero
 * score, has quietly turned that into an accusation. So `unknown` is styled as
 * neutral and its copy says what is actually true: nothing has been proven yet.
 */

import type { ReactNode } from 'react';

export type StandingState = 'proven' | 'unknown' | 'pending' | 'rejected';

const STATE_STYLES: Record<StandingState, { dot: string; text: string; label: string }> = {
  // The accent appears here and almost nowhere else, so proof reads as the
  // meaningful event on the page.
  proven: { dot: 'bg-[--color-proven]', text: 'text-[--color-proven]', label: 'Proven' },
  // Neutral on purpose. Not a warning, not a failure.
  unknown: { dot: 'bg-[--color-unknown]', text: 'text-[--color-ink-faint]', label: 'Unknown' },
  pending: { dot: 'bg-[--color-ink-muted]', text: 'text-[--color-ink-muted]', label: 'Verifying' },
  rejected: { dot: 'bg-[--color-rejected]', text: 'text-[--color-rejected]', label: 'Rejected' },
};

export function StandingBadge({
  state,
  children,
}: {
  state: StandingState;
  children?: ReactNode;
}) {
  const style = STATE_STYLES[state];
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[13px]">
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
      <span className={style.text}>{children ?? style.label}</span>
    </span>
  );
}

/**
 * A fact type and what is known about it.
 *
 * Laid out as a row on a hairline rather than a card, because these appear in
 * lists of three to five and a stack of bordered cards would add containers
 * without adding hierarchy.
 */
export function StandingRow({
  label,
  meaning,
  state,
  count,
  value,
}: {
  label: string;
  meaning: string;
  state: StandingState;
  // Explicitly `| undefined` rather than only optional. Under
  // exactOptionalPropertyTypes a caller passing an undefined count is a type
  // error unless the property admits it, and callers legitimately do: standing
  // for an unproven address has no count to pass.
  count?: number | undefined;
  value?: string | undefined;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-[--color-line] py-6 md:grid-cols-[1fr_auto] md:items-baseline md:gap-8">
      <div className="min-w-0">
        <div className="font-mono text-[13px] text-[--color-ink]">{label}</div>
        <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
          {meaning}
        </p>
      </div>
      <div className="flex items-center gap-6 md:justify-end">
        <StandingBadge state={state}>
          {state === 'proven' && count !== undefined
            ? `${count} proof${count === 1 ? '' : 's'}`
            : undefined}
        </StandingBadge>
        {value ? (
          <span className="font-mono text-[13px] tabular-nums text-[--color-ink-muted]">
            {value}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A single measured number.
 *
 * Mono, tabular, and given room. Display numbers crammed against their unit
 * read as cramped no matter how good the typeface is, so the unit sits on its
 * own line rather than being jammed alongside.
 */
export function Metric({
  value,
  unit,
  label,
  note,
}: {
  value: string;
  unit?: string;
  label: string;
  note?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[clamp(2rem,5vw,3.25rem)] leading-[1.1] tracking-tight tabular-nums text-[--color-ink]">
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-[13px] text-[--color-ink-faint]">{unit}</span>
        ) : null}
      </div>
      <div className="mt-2 text-[13px] text-[--color-ink-muted]">{label}</div>
      {note ? (
        <p className="mt-1.5 max-w-[38ch] text-[12px] leading-relaxed text-[--color-ink-faint]">
          {note}
        </p>
      ) : null}
    </div>
  );
}
