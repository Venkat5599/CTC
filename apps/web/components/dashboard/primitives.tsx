"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Dashboard primitives.
 *
 * The vocabulary every inner page composes from. Written once so a page is a
 * arrangement of these rather than its own private layout, which is what keeps
 * six routes looking like one product.
 *
 * The restraint here is deliberate. Accent is reserved for one meaning --
 * verified, active, primary action -- so that when it appears the eye knows what
 * it means. Borders are hairlines, cards are quiet, and nothing glows. A
 * registry asking to be trusted with financial history should look like
 * infrastructure, not like a launch page.
 */

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
  label = "Back to Dashboard",
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
      className="group inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-150 group-hover:-translate-x-0.5"
      >
        <path
          d="M10 12L6 8l4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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
 * Label, title, one line of explanation, optional action. Consistent across all
 * six routes so a page always begins the same way and the eye knows where to
 * land.
 */
export function PageHeader({
  label,
  title,
  description,
  action,
  back = true,
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
    <header className="mb-10">
      {back ? (
        <div className="mb-6">
          <BackButton {...(backHref ? { href: backHref } : {})} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {label ? (
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </div>
          ) : null}

          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[30px]">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
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
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mb-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type Status = "verified" | "pending" | "unknown" | "failed";

const STATUS: Record<Status, { dot: string; text: string; label: string }> = {
  // Accent means verified and almost nothing else. That discipline is what
  // makes it readable at a glance.
  verified: { dot: "bg-accent", text: "text-accent", label: "Verified" },
  pending: { dot: "bg-amber-400", text: "text-amber-400", label: "Pending" },
  // Neutral, never a warning. An address with no proof has not been judged --
  // the absence of evidence is not evidence, and the colour should not imply
  // otherwise.
  unknown: { dot: "bg-muted-foreground/50", text: "text-muted-foreground", label: "Unknown" },
  failed: { dot: "bg-red-400", text: "text-red-400", label: "Failed" },
};

export function StatusBadge({ status, children }: { status: Status; children?: ReactNode }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px]">
      <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className={s.text}>{children ?? s.label}</span>
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
    <div className="rounded-xl border border-border bg-card-secondary p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {status ? <StatusBadge status={status} /> : null}
      </div>

      <div className="mt-3 font-mono text-[26px] leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </div>

      {hint ? <div className="mt-2.5 text-[12px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** A hash or address. Monospace, truncated in the middle so both ends survive. */
export function Mono({ value, chars = 6 }: { value: string; chars?: number }) {
  const short =
    value.length > chars * 2 + 4 ? `${value.slice(0, chars + 2)}…${value.slice(-chars)}` : value;
  return (
    <span className="font-mono text-[12px] text-muted-foreground" title={value}>
      {short}
    </span>
  );
}

/** A labelled technical value. The unit of a proof-details page. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-0">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

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
    <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <p className="text-[15px] text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** Shaped like the content it stands in for, so nothing shifts on load. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} aria-hidden="true" />;
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

export function Button({
  href,
  onClick,
  variant = "primary",
  children,
  disabled,
  type = "button",
}: {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

  const styles = {
    primary: "bg-accent text-black hover:opacity-90",
    secondary: "border border-border text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:text-foreground",
  }[variant];

  // A link when it navigates, a button when it acts. Never a clickable div.
  if (href) {
    return (
      <Link href={href} className={`${base} ${styles}`}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
