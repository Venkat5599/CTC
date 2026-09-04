"use client";

/**
 * Console primitives — the dense, instrument-panel layer of the dashboard.
 *
 * These exist because the dashboard has one job a marketing page does not: show
 * an underwriter the evidence behind a number, in the same view as the number.
 * So everything here is built to sit close together at small sizes without
 * turning into noise -- tight rules, monospace for anything that came off a
 * chain, and a single accent used only where a value actually moved.
 *
 * NOTHING HERE INVENTS A VALUE. Every component takes what it renders. When a
 * figure is unavailable the component says so rather than substituting a
 * placeholder, because a plausible-looking number on a protocol whose thesis is
 * "stop taking claims on trust" is the one bug that would discredit everything
 * else on the page.
 */

import type { ReactNode } from "react";

/** Small tracked-caps label. The only place caps are used. */
export function Eyebrow({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
        tone === "accent" ? "text-[var(--vouch-primary)]" : "text-[var(--vouch-text-faint)]"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * A metric with its own top rule.
 *
 * `value` is required and nullable rather than optional: a metric that cannot
 * be read must render as unavailable, and making the caller pass null forces
 * that decision at every call site instead of letting an undefined slip through
 * as an empty string.
 */
export function Metric({
  label,
  value,
  unit,
  caption,
  detail,
  accent = false,
  reason,
}: {
  label: string;
  value: string | null;
  unit?: string | undefined;
  caption: string;
  detail?: string | undefined;
  accent?: boolean | undefined;
  /**
   * Why `value` is null. REQUIRED whenever it is, because "unavailable" with no
   * reason is worse than no metric at all -- it reads as broken rather than as
   * empty, and a reader cannot tell a loading RPC from a missing address from a
   * genuine zero. Every null on this page has a cause, and the cause is the
   * thing worth showing.
   */
  reason?: string | undefined;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-4">
      <div
        className={`absolute inset-x-0 top-0 h-px ${
          accent ? "bg-[var(--vouch-primary)]" : "bg-[var(--vouch-border-strong)]"
        }`}
      />
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-3 flex items-baseline gap-2">
        {value === null ? (
          <span className="font-mono text-[13px] leading-[1.4] text-[var(--vouch-text-faint)]">
            {reason ?? "unavailable"}
          </span>
        ) : (
          <>
            <span
              className={`font-mono text-[26px] leading-none font-semibold tracking-[-0.02em] ${
                accent ? "text-[var(--vouch-primary)]" : "text-[var(--vouch-text)]"
              }`}
            >
              {value}
            </span>
            {unit ? (
              <span className="font-mono text-[11px] text-[var(--vouch-text-faint)]">{unit}</span>
            ) : null}
          </>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--vouch-border)] pt-2.5">
        <span className="text-[12px] text-[var(--vouch-text-muted)]">{caption}</span>
        {detail ? (
          <span className="shrink-0 font-mono text-[11px] text-[var(--vouch-text-faint)]">
            {detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A labelled field of chain data. Monospace, because it came off a chain. */
export function DataField({
  label,
  children,
  href,
}: {
  label: string;
  children: ReactNode;
  href?: string | undefined;
}) {
  const body = (
    <span className="block truncate font-mono text-[12px] text-[var(--vouch-text)]">
      {children}
    </span>
  );
  return (
    <div className="min-w-0 flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      {href ? (
        <a
          className="block min-w-0 text-[var(--vouch-primary)] hover:underline"
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}

/** A pass/fail check. Used for the three guards, never for decoration. */
export function Check({ children, passed = true }: { children: ReactNode; passed?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
      <span
        aria-hidden
        className={`mt-[5px] block h-1.5 w-1.5 shrink-0 rounded-full ${
          passed ? "bg-[var(--vouch-success)]" : "bg-[var(--vouch-danger)]"
        }`}
      />
      <span className="font-mono text-[11.5px] leading-[1.5] text-[var(--vouch-text-muted)]">
        {children}
      </span>
    </div>
  );
}

/**
 * One step of the verification pipeline.
 *
 * `value` is the real datum this step produced. When it is null the step still
 * renders -- the path is real even when this particular address has not walked
 * it -- but the slot reads "no fact yet" rather than showing a sample.
 */
export function PipelineStep({
  index,
  title,
  body,
  footLabel,
  footValue,
}: {
  index: string;
  title: string;
  body: ReactNode;
  footLabel: string;
  footValue: string | null;
}) {
  return (
    <div className="flex flex-col justify-between rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-4">
      <div>
        <div className="flex items-center justify-between">
          <Eyebrow tone="accent">Step {index}</Eyebrow>
        </div>
        <h4 className="mt-2 text-[14px] font-semibold tracking-[-0.01em] text-[var(--vouch-text)]">
          {title}
        </h4>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">{body}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-2.5 py-2">
        <span className="font-mono text-[10.5px] text-[var(--vouch-text-faint)]">{footLabel}</span>
        <span className="truncate font-mono text-[11px] text-[var(--vouch-text)]">
          {footValue ?? <span className="text-[var(--vouch-text-faint)]">no fact yet</span>}
        </span>
      </div>
    </div>
  );
}

/**
 * A before/after pair for a consumer decision.
 *
 * The baseline is struck through only when the value actually moved. Striking
 * an unchanged baseline would imply a change that did not happen, which on this
 * page is not a styling detail.
 */
export function TermsShift({
  baselineLabel,
  baseline,
  provenLabel,
  proven,
  moved,
  note,
}: {
  baselineLabel: string;
  baseline: string;
  provenLabel: string;
  proven: string | null;
  moved: boolean;
  note: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{baselineLabel}</Eyebrow>
        <span
          className={`font-mono text-[16px] ${
            moved
              ? "text-[var(--vouch-text-faint)] line-through"
              : "text-[var(--vouch-text-muted)]"
          }`}
        >
          {baseline}
        </span>
        <span className="text-[11.5px] text-[var(--vouch-text-faint)]">
          {moved ? "superseded" : "current"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Eyebrow tone={moved ? "accent" : "muted"}>{provenLabel}</Eyebrow>
        <span
          className={`font-mono text-[16px] font-semibold ${
            moved ? "text-[var(--vouch-primary)]" : "text-[var(--vouch-text-muted)]"
          }`}
        >
          {proven ?? "—"}
        </span>
        <span
          className={`text-[11.5px] ${
            moved ? "text-[var(--vouch-primary)]" : "text-[var(--vouch-text-faint)]"
          }`}
        >
          {note}
        </span>
      </div>
    </div>
  );
}
