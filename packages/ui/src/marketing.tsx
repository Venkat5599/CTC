/**
 * Marketing primitives.
 *
 * The section vocabulary the landing page composes from: a centred hero, a
 * chain strip, an asymmetric bento, and a closing call to action. Each one
 * exists because it appears on more than one surface; anything used once lives
 * in the app that uses it.
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Pill action.
 *
 * Fully rounded, accent-filled, near-black label. Contrast measured rather than
 * eyeballed: #1a0316 on #f99fea is roughly 13:1, well past AA.
 *
 * Does not lift or scale on hover -- a button that hops is a template reflex.
 * The state change is tonal and the label stays where the cursor left it.
 */
export function Pill({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ComponentPropsWithoutRef<'a'> & { variant?: 'primary' | 'quiet' }) {
  const base =
    'inline-flex items-center justify-center rounded-full px-6 py-3 text-[14px] transition-colors duration-150';

  const styles =
    variant === 'primary'
      ? 'bg-[--color-accent] text-[--color-accent-ink] hover:bg-[--color-accent-soft]'
      : 'border border-[--color-line-strong] text-[--color-ink-muted] hover:border-[--color-ink-faint] hover:text-[--color-ink]';

  return (
    <a className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </a>
  );
}

/**
 * Centred hero.
 *
 * Display type is weight 500, not light. That correction came from measuring
 * the reference rather than eyeballing it: at this scale a 300 reads as thin
 * and washed out against black, where a medium holds its edge. The largest step
 * is 64px for the same reason -- past that the line breaks badly at common
 * laptop widths and the headline stops being two lines.
 *
 * Four elements at most: headline, subline, one action, and the artifact below.
 * No eyebrow, no version badge, no trust micro-strip, no tagline under the
 * button. The headline is held to two lines by scale rather than by hoping the
 * copy is short enough.
 */
export function Hero({
  headline,
  subline,
  action,
  children,
}: {
  headline: ReactNode;
  subline: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden px-6 pt-24 md:px-10">
      <div className="mx-auto w-full max-w-[1120px]">
        <h1 className="mx-auto max-w-[16ch] text-center text-[clamp(2.25rem,6vw,4rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[--color-ink]">
          {headline}
        </h1>

        <p className="mx-auto mt-7 max-w-[52ch] text-center text-[16px] leading-relaxed text-[--color-ink-muted]">
          {subline}
        </p>

        {action ? <div className="mt-10 flex justify-center">{action}</div> : null}
      </div>

      {/* The artifact sits below the fold line and bleeds downward, so the first
          screen shows the claim and the top of the thing that proves it. */}
      {children ? <div className="mt-20 px-0">{children}</div> : null}
    </section>
  );
}

export function Section({
  children,
  className = '',
  ...rest
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section className={`px-6 py-24 md:px-10 md:py-32 ${className}`} {...rest}>
      <div className="mx-auto w-full max-w-[1120px]">{children}</div>
    </section>
  );
}

/** Centred section headline. No kicker above it, deliberately. */
export function SectionHeading({
  children,
  lead,
  align = 'center',
}: {
  children: ReactNode;
  lead?: ReactNode;
  align?: 'center' | 'left';
}) {
  const centred = align === 'center';

  return (
    <div className={centred ? 'mx-auto max-w-[62ch] text-center' : 'max-w-[52ch]'}>
      <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-medium leading-[1.14] tracking-[-0.025em] text-[--color-ink]">
        {children}
      </h2>
      {lead ? (
        <p
          className={`mt-5 text-[15px] leading-relaxed text-[--color-ink-muted] ${
            centred ? 'mx-auto max-w-[58ch]' : 'max-w-[54ch]'
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Panel.
 *
 * Elevation from tone plus a self-coloured hairline and a single top inner
 * highlight, never a drop shadow. Depth here is a surface a shade lighter than
 * the page with light catching its upper lip, which is how a real edge behaves.
 */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[--radius-lg] border border-[--color-line] bg-[--color-surface] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

/** A measured number. Mono, tabular, with the unit given its own air. */
export function Stat({
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
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-tight tabular-nums text-[--color-ink]">
          {value}
        </span>
        {unit ? <span className="text-[13px] text-[--color-ink-faint]">{unit}</span> : null}
      </div>
      <div className="mt-3 text-[14px] text-[--color-ink-muted]">{label}</div>
      {note ? (
        <p className="mt-2 max-w-[40ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Closing call to action.
 *
 * The headline takes the accent because this is the last thing read and the one
 * place a colour shift is doing work rather than decorating.
 */
export function ClosingCta({
  headline,
  accent,
  subline,
  action,
}: {
  headline: string;
  accent: string;
  subline: ReactNode;
  action: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden px-6 py-32 md:px-10 md:py-40">
      <div className="ambient bottom-0" aria-hidden />

      <div className="relative mx-auto w-full max-w-[1120px] text-center">
        <h2 className="mx-auto max-w-[18ch] text-[clamp(2rem,5.5vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.03em]">
          <span className="text-[--color-accent]">{accent}</span>
          <br />
          <span className="text-[--color-ink]">{headline}</span>
        </h2>

        <p className="mx-auto mt-7 max-w-[48ch] text-[15px] leading-relaxed text-[--color-ink-muted]">
          {subline}
        </p>

        <div className="mt-10 flex justify-center">{action}</div>
      </div>
    </section>
  );
}
