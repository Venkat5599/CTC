/**
 * Layout and control primitives.
 *
 * Small on purpose. Everything here earns its place by being used on three or
 * more surfaces; anything used once lives in the app that uses it.
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export function Section({
  children,
  className = '',
  ...rest
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section className={`px-6 py-20 md:px-10 md:py-28 ${className}`} {...rest}>
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  );
}

/**
 * Section heading.
 *
 * No eyebrow parameter, deliberately. A small uppercase label above every
 * heading is the most recognisable machine-made rhythm there is, and where a
 * section sits on the page already says what it is.
 */
export function Heading({
  children,
  lead,
}: {
  children: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="max-w-[46ch]">
      <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] leading-[1.15] tracking-[-0.02em] text-[--color-ink]">
        {children}
      </h2>
      {lead ? (
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[--color-ink-muted]">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

type ButtonProps = ComponentPropsWithoutRef<'a'> & {
  variant?: 'primary' | 'quiet';
};

/**
 * Action.
 *
 * Two variants, and they are never used side by side as a pair. The filled
 * primary plus outlined ghost couplet is a preset, so a section gets one clear
 * action and the secondary path is a plain link in the copy.
 *
 * Does not lift or scale on hover. A button that hops is a template reflex; the
 * state change is tonal, and the label stays put where the cursor left it.
 */
export function Action({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center gap-2 rounded-[--radius-sm] px-4 py-2.5 font-mono text-[13px] transition-colors duration-150';

  const styles =
    variant === 'primary'
      ? // Accent fill with near-black ink. Contrast measured, not eyeballed:
        // #04211d on #4dd4c4 is well past AA.
        'bg-[--color-accent] text-[--color-accent-ink] hover:bg-[#5fe0d0]'
      : 'border border-[--color-line-strong] text-[--color-ink-muted] hover:border-[--color-ink-faint] hover:text-[--color-ink]';

  return (
    <a className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </a>
  );
}

/**
 * Code, shown as the integration it is.
 *
 * The one place a fake-window chrome would be tempting and is refused: no
 * traffic-light dots, no filename tab. The snippet is the artifact.
 */
export function Snippet({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="overflow-hidden rounded-[--radius] border border-[--color-line] bg-[--color-surface]">
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.7] text-[--color-ink-muted]">
        <code>{children}</code>
      </pre>
      {caption ? (
        <figcaption className="border-t border-[--color-line] px-5 py-3 text-[12px] text-[--color-ink-faint]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** A monospace address, truncated in the middle so both ends stay readable. */
export function AddressLabel({ address }: { address: string }) {
  const short = address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  return (
    <span className="font-mono text-[13px] text-[--color-ink-muted]" title={address}>
      {short}
    </span>
  );
}

/**
 * Panel.
 *
 * Elevation by tone plus a self-coloured hairline, never a drop shadow. Depth
 * here comes from the surface being a shade lighter than the page, which is how
 * a real edge catches light.
 */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[--radius-lg] border border-[--color-line] bg-[--color-surface] ${className}`}
    >
      {children}
    </div>
  );
}

/** Empty state. Says what is true and what to do, never apologises. */
export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border-t border-[--color-line] py-16 text-center">
      <p className="text-[15px] text-[--color-ink]">{title}</p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-[--color-ink-faint]">
        {body}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** Loading placeholder shaped like the content it replaces. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[--radius-sm] bg-[--color-raised] ${className}`}
      aria-hidden
    />
  );
}
