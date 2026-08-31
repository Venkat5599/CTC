"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * Vouch component kit.
 *
 * One vocabulary for the whole product. Pages are arrangements of these rather
 * than private layouts, which is what keeps eight routes reading as one company
 * instead of eight hackathon pages.
 *
 * Restraint is the design. Primary green means verified, active, or primary
 * action -- never decoration. Borders are hairlines. Nothing glows, nothing
 * gradients, nothing animates unless the motion carries information.
 */

// ---------------------------------------------------------------------------
// Identity chips
// ---------------------------------------------------------------------------

/** A hash or address. Monospace, middle-truncated so both ends stay readable. */
export function HashText({ value, chars = 4 }: { value: string; chars?: number }) {
  const short =
    value.length > chars * 2 + 6 ? `${value.slice(0, chars + 2)}…${value.slice(-chars)}` : value;
  return (
    <span className="font-mono text-[12px] text-[var(--vouch-text-muted)]" title={value}>
      {short}
    </span>
  );
}

export function AddressChip({ address, href }: { address: string; href?: string }) {
  const body = (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vouch-border)] px-2 py-1 font-mono text-[12px] text-[var(--vouch-text-muted)] transition-colors hover:border-[var(--vouch-border-strong)] hover:text-[var(--vouch-text)]">
      {address.slice(0, 6)}…{address.slice(-4)}
    </span>
  );
  return href ? (
    <Link href={href} title={address}>
      {body}
    </Link>
  ) : (
    <span title={address}>{body}</span>
  );
}

/**
 * Copy to clipboard.
 *
 * Confirms in place rather than firing a toast. A toast for copying a hash is
 * more interruption than the action deserves, and the button is already where
 * the user is looking.
 */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard access can be denied outright. Saying nothing is better
          // than claiming a copy that did not happen.
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vouch-border)] px-2.5 py-1.5 text-[12px] text-[var(--vouch-text-muted)] transition-colors hover:text-[var(--vouch-text)]"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type ProofState = "verified" | "pending" | "unknown" | "failed";

const STATES: Record<ProofState, { color: string; label: string }> = {
  verified: { color: "var(--vouch-primary)", label: "Verified" },
  pending: { color: "var(--vouch-warning)", label: "Pending" },
  // Neutral, never a warning. An address with no proof has not been judged:
  // the absence of evidence is not evidence, and the colour must not imply it.
  unknown: { color: "var(--vouch-text-faint)", label: "Unknown" },
  failed: { color: "var(--vouch-danger)", label: "Failed" },
};

export function ProofStatus({ state, children }: { state: ProofState; children?: ReactNode }) {
  const s = STATES[state];
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

/** A fact type. Quiet by default; these appear many to a row. */
export function FactBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--vouch-border)] px-2 py-0.5 text-[11px] text-[var(--vouch-text-muted)]">
      {children}
    </span>
  );
}

export function ProtocolBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--vouch-text-muted)]">
      <span className="size-1.5 rounded-full bg-[var(--vouch-border-strong)]" aria-hidden="true" />
      {name}
    </span>
  );
}

export function NetworkIndicator({ name = "CC3 Testnet" }: { name?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--vouch-text-muted)]">
      <span
        className="size-1.5 rounded-full"
        style={{ background: "var(--vouch-primary)" }}
        aria-hidden="true"
      />
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--vouch-border)] bg-[var(--vouch-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  action,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex flex-col bg-[var(--vouch-bg)] p-5">
      <span className="text-[12px] text-[var(--vouch-text-muted)]">{label}</span>

      <div className="mt-3 font-mono text-[26px] leading-none tracking-tight tabular-nums text-[var(--vouch-text)]">
        {value}
      </div>

      {hint ? <div className="mt-2 text-[12px] text-[var(--vouch-text-faint)]">{hint}</div> : null}

      {href && action ? (
        <Link
          href={href}
          className="mt-5 text-[12px] text-[var(--vouch-text-muted)] transition-colors hover:text-[var(--vouch-text)]"
        >
          {action} →
        </Link>
      ) : null}
    </div>
  );
}

/** A group of stat cells sharing one border, so it reads as an instrument panel. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--vouch-border)] bg-[var(--vouch-border)] sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

export function BackButton({ href = "/dashboard", label = "Back to Dashboard" }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        // History when there is history; an explicit destination otherwise. A
        // back control that dead-ends on a shared link looks navigable and is
        // not.
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(href);
      }}
      className="group inline-flex items-center gap-1.5 text-[13px] text-[var(--vouch-text-muted)] transition-colors hover:text-[var(--vouch-text)]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-150 group-hover:-translate-x-0.5"
      >
        <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

export function PageHeader({
  label,
  title,
  description,
  action,
  back = true,
}: {
  label?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  back?: boolean;
}) {
  return (
    <header className="mb-9">
      {back ? (
        <div className="mb-6">
          <BackButton />
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {label ? (
            <div className="mb-2 text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--vouch-text-faint)]">
              {label}
            </div>
          ) : null}

          <h1 className="text-[26px] leading-tight font-medium tracking-[-0.02em] text-[var(--vouch-text)] sm:text-[30px]">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-[var(--vouch-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--vouch-text-faint)] ${className}`}
    >
      {children}
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
    <div className="rounded-xl border border-dashed border-[var(--vouch-border)] px-6 py-14 text-center">
      <p className="text-[15px] text-[var(--vouch-text)]">{title}</p>
      <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-[var(--vouch-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3, height = "h-14" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-lg bg-[var(--vouch-surface)]`} />
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
  external,
}: {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
  disabled?: boolean;
  external?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  const styles = {
    primary: "text-black hover:opacity-90",
    secondary:
      "border border-[var(--vouch-border)] text-[var(--vouch-text)] hover:border-[var(--vouch-border-strong)]",
    ghost: "text-[var(--vouch-text-muted)] hover:text-[var(--vouch-text)]",
  }[variant];

  const style = variant === "primary" ? { background: "var(--vouch-primary)" } : undefined;

  // A link when it navigates, a button when it acts. Never a clickable div.
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={`${base} ${styles}`} style={style}>
        {children}
      </a>
    ) : (
      <Link href={href} className={`${base} ${styles}`} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`} style={style}>
      {children}
    </button>
  );
}
