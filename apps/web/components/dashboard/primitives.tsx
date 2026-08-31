"use client";

import { ArrowUpRight, CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Product primitives.
 *
 * The vocabulary every page composes from. Written once so a page is an
 * arrangement of these rather than its own private layout, which is what keeps
 * nine routes reading as one product.
 *
 * The material is glass over a lit substrate. Surfaces are translucent, their
 * hairline is set to the surface's own colour rather than a contrasting grey,
 * and a bright inner lip runs along the top edge where the light from the page
 * atmosphere catches. Depth comes from tone and that lip, never from a shadow
 * bloomed on four sides.
 *
 * Two rules hold the whole system together. Accent is reserved for one meaning
 * -- verified, active, primary action -- so when it appears the eye knows what
 * it means without a legend. And nothing's blur or shadow changes on hover:
 * only colour moves, because a blur that pops on interaction is the fastest way
 * for glass to read as cheap.
 */

// Real-world mass. Everything decelerates the way something with weight does,
// rather than on the browser's default ease.
const EASE = "cubic-bezier(0.32,0.72,0,1)";

// ---------------------------------------------------------------------------
// Enclosure
// ---------------------------------------------------------------------------

/**
 * Double-bezel enclosure.
 *
 * A glass plate seated in a machined tray: an outer shell holding a slightly
 * inset inner core, with the inner radius computed from the outer so the curves
 * stay concentric. Two nested edges catch light at different angles, which is
 * what makes a panel read as hardware instead of as a div with a border.
 *
 * Used for anything that should feel like an object. Plain content that merely
 * needs grouping gets spacing, not an enclosure -- bezelling everything is how
 * this technique stops meaning anything.
 */
export function Panel({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.055] bg-white/[0.018] p-1.5">
      <div
        className={`glass ${interactive ? "glass-hover" : ""} rounded-[16px] ${className}`}
        style={{ transitionTimingFunction: EASE }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back
// ---------------------------------------------------------------------------

/**
 * Back to where the user came from.
 *
 * Uses history when there is history to use, and falls back to an explicit href
 * otherwise -- a back control that dead-ends on a fresh tab or a shared link is
 * worse than none, because it looks navigable and is not.
 */
export function BackButton({
  href = "/dashboard",
  label = "Back",
}: {
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(href);
      }}
      className="group focus-visible:outline-accent inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] py-1.5 pr-4 pl-1.5 text-[13px] text-[var(--vouch-text-muted)] transition-[color,border-color,background-color] duration-300 hover:border-white/[0.12] hover:text-[var(--vouch-text)] focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
      style={{ transitionTimingFunction: EASE }}
    >
      {/* The glyph lives in its own well rather than floating naked beside the
          label, so the control reads as one machined object. */}
      <span className="flex size-6 items-center justify-center rounded-full bg-white/[0.06] transition-transform duration-300 group-hover:-translate-x-0.5">
        <CaretLeft size={12} weight="bold" />
      </span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

/**
 * The top of every inner page.
 *
 * Label, title, one line of explanation, optional action. Consistent across the
 * routes so a page always begins the same way and the eye knows where to land.
 *
 * No back control by default. Every top-level destination is one click away in
 * the rail, so a back button there is a second, weaker navigation sitting on top
 * of the real one. Deep pages -- a single proof, one explorer transaction, one
 * application -- pass `back` explicitly, because those are the only places the
 * rail cannot return you to.
 */
export function PageHeader({
  label,
  title,
  description,
  action,
  back = false,
  backHref,
}: {
  label?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  back?: boolean;
  backHref?: string;
}) {
  return (
    <header className="mb-12">
      {back ? (
        <div className="mb-8">
          <BackButton {...(backHref ? { href: backHref } : {})} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          {label ? (
            <div className="mb-3 text-[11px] font-medium tracking-[0.18em] text-[var(--vouch-text-faint)] uppercase">
              {label}
            </div>
          ) : null}

          <h1 className="text-[34px] leading-[1.05] font-medium tracking-[-0.035em] text-[var(--vouch-text)] sm:text-[42px]">
            {title}
          </h1>

          {description ? (
            <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[var(--vouch-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/** Divides a page into labelled bands without drawing a heavy rule. */
export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 text-[11px] font-medium tracking-[0.18em] text-[var(--vouch-text-faint)] uppercase ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type Status = "verified" | "pending" | "unknown" | "failed";

const STATUS: Record<Status, { color: string; label: string }> = {
  // Accent means verified and almost nothing else. That discipline is what
  // makes it readable at a glance.
  verified: { color: "var(--vouch-primary)", label: "Verified" },
  pending: { color: "var(--vouch-warning)", label: "Pending" },
  // Neutral, never a warning. An address with no proof has not been judged --
  // the absence of evidence is not evidence, and the colour should not imply
  // otherwise.
  unknown: { color: "var(--vouch-text-faint)", label: "Unknown" },
  failed: { color: "var(--vouch-danger)", label: "Failed" },
};

export function StatusBadge({ status, children }: { status: Status; children?: ReactNode }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px]">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: s.color }}
        aria-hidden="true"
      />
      <span style={{ color: s.color }}>{children ?? s.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cards and data
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  hint,
  status,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: Status;
}) {
  return (
    <Panel className="p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] text-[var(--vouch-text-muted)]">{label}</span>
        {status ? <StatusBadge status={status} /> : null}
      </div>

      <div className="mt-5 font-mono text-[30px] leading-none tracking-[-0.02em] tabular-nums text-[var(--vouch-text)]">
        {value}
      </div>

      {hint ? (
        <div className="mt-3 text-[12px] leading-relaxed text-[var(--vouch-text-muted)]">{hint}</div>
      ) : null}
    </Panel>
  );
}

/** A hash or address. Monospace, truncated in the middle so both ends survive. */
export function Mono({ value, chars = 6 }: { value: string; chars?: number }) {
  const short =
    value.length > chars * 2 + 4 ? `${value.slice(0, chars + 2)}…${value.slice(-chars)}` : value;
  return (
    <span className="font-mono text-[12px] text-[var(--vouch-text-muted)]" title={value}>
      {short}
    </span>
  );
}

/** A labelled technical value. The unit of a proof-details page. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-white/[0.05] py-3.5 last:border-0">
      <dt className="shrink-0 text-[13px] text-[var(--vouch-text-muted)]">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] text-[var(--vouch-text)]">
        {children}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

/**
 * Nothing here yet.
 *
 * Left-aligned inside a real surface, not centred text floating between two
 * rules. Centring a paragraph of explanation makes an ordinary state look like
 * an error page, and this state is frequently the correct answer: most
 * addresses have proven nothing, and that is not a fault.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="px-7 py-10">
      <p className="text-[17px] tracking-[-0.01em] text-[var(--vouch-text)]">{title}</p>
      <p className="mt-3 max-w-[56ch] text-[13.5px] leading-relaxed text-[var(--vouch-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-7">{action}</div> : null}
    </Panel>
  );
}

/** Shaped like the content it stands in for, so nothing shifts on load. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[16px] bg-white/[0.035] ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * The one action control.
 *
 * A pill that takes a press: it scales down fractionally on `:active`, which is
 * the whole of the physical feedback. It does not rise on hover -- a button that
 * jumps up when the pointer nears it is a template reflex, and the lift reads as
 * decoration rather than as a response.
 */
export function Button({
  href,
  onClick,
  variant = "primary",
  children,
  disabled,
  type = "button",
  external,
}: {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  external?: boolean;
}) {
  const base =
    "group inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-2.5 text-[13px] font-medium transition-[background-color,border-color,color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

  const styles = {
    primary: "text-black hover:brightness-[1.08]",
    secondary:
      "border border-white/[0.09] bg-white/[0.03] text-[var(--vouch-text)] hover:border-white/[0.16] hover:bg-white/[0.06]",
    ghost: "text-[var(--vouch-text-muted)] hover:text-[var(--vouch-text)]",
  }[variant];

  const style = {
    transitionTimingFunction: EASE,
    ...(variant === "primary" ? { background: "var(--vouch-primary)" } : {}),
  };

  // A link when it navigates, a button when it acts. Never a clickable div.
  if (href) {
    return external ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${base} ${styles}`}
        style={style}
      >
        {children}
      </a>
    ) : (
      <Link href={href} className={`${base} ${styles}`} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
      style={style}
    >
      {children}
    </button>
  );
}

/**
 * A trailing glyph for a button, seated in its own well.
 *
 * Never a naked arrow beside the label. The well gives the button an internal
 * structure to move against: on hover the glyph travels inside its own circle
 * rather than the whole control sliding, which is where the kinetic tension
 * comes from.
 */
export function ButtonGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="-mr-2 flex size-7 items-center justify-center rounded-full bg-black/[0.12] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px">
      {children}
    </span>
  );
}

/**
 * The diagonal, reused everywhere an action leads out.
 *
 * Up-and-out rather than the default horizontal right arrow, which is the
 * stock component every product ships. One arrow, one direction, everywhere.
 */
export function ArrowGlyph() {
  return <ArrowUpRight size={12} weight="bold" />;
}
