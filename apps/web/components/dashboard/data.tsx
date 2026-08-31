"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button, Panel, StatusBadge, type Status } from "@/components/dashboard/primitives";

/**
 * Data primitives.
 *
 * The parts an enterprise surface is actually made of: tables, framed sections,
 * metric rows, one address field. Kept apart from the presentational primitives
 * because these carry behaviour and validation, not just styling.
 *
 * The reason they exist at all: six pages had each invented their own lookup
 * form, their own empty state and their own list markup, with three different
 * input styles between them. That is how a product starts looking assembled
 * rather than designed.
 */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Tailwind width class, e.g. "w-[180px]". Omit to let the column flex. */
  width?: string;
  /** Hidden below sm, for columns that are detail rather than identity. */
  secondary?: boolean;
  cell: (row: T) => ReactNode;
}

/**
 * A data table.
 *
 * Columns are declared once with their alignment and width, so every table in
 * the product shares one header treatment, one row height, and one behaviour
 * when a cell is empty. Figures are tabular mono, because columns of numbers
 * that do not align cannot be read at a glance.
 *
 * When a row links, the anchor stretches over the row rather than the row being
 * a clickable div: middle-click, open-in-new-tab, hover target and keyboard
 * focus all come free, and the markup stays a valid table.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  href,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="px-6 py-8">{empty}</div>;
  }

  return (
    // The wrapper scrolls, never the page. A wide table must not be able to
    // push the whole document sideways.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-6 py-3 text-[11px] font-medium tracking-[0.1em] text-[var(--vouch-text-faint)] uppercase ${
                  column.align === "right" ? "text-right" : "text-left"
                } ${column.width ?? ""} ${column.secondary ? "hidden sm:table-cell" : ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-white/[0.05]">
          {rows.map((row) => {
            const to = href?.(row);
            return (
              <tr
                key={rowKey(row)}
                className={`relative ${
                  to ? "transition-colors duration-300 hover:bg-white/[0.035]" : ""
                }`}
              >
                {columns.map((column, i) => (
                  <td
                    key={column.key}
                    className={`px-6 py-3.5 align-middle text-[13px] text-[var(--vouch-text)] ${
                      column.align === "right" ? "text-right" : "text-left"
                    } ${column.secondary ? "hidden sm:table-cell" : ""}`}
                  >
                    {to && i === 0 ? (
                      <Link
                        href={to}
                        className="focus-visible:outline-accent before:absolute before:inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
                      >
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A panel that frames a table or a block of content.
 *
 * Title on the left, actions on the right, one hairline, then content flush to
 * the panel edges. Every data surface opens this way, so the eye always knows
 * where the title and the actions are.
 */
export function Section({
  title,
  description,
  action,
  children,
  id,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
  id?: string | undefined;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
        <div className="min-w-0">
          <h2 id={id} className="text-[14px] text-[var(--vouch-text)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[12.5px] text-[var(--vouch-text-muted)]">{description}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </Panel>
  );
}

/**
 * A quiet line of explanation where a table would be.
 *
 * Left-aligned inside the surface, not centred between two rules. Centred
 * explanation text makes an ordinary state look like an error page, and for
 * this protocol "nothing proven" is frequently the correct answer.
 */
export function Nothing({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div>
      <p className="max-w-[70ch] text-[13px] leading-relaxed text-[var(--vouch-text-muted)]">
        {children}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * The address lookup.
 *
 * Validation runs before the query, not after. A malformed address would
 * otherwise return an empty result that renders as "nothing proven", which is a
 * completely different and much worse claim than "that is not an address".
 */
export function AddressField({
  id,
  onSubmit,
  label = "Address",
  action = "Look up",
}: {
  id: string;
  onSubmit: (address: string) => void;
  label?: string;
  action?: string;
}) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        const candidate = value.trim();
        if (/^0x[0-9a-fA-F]{40}$/.test(candidate)) {
          setInvalid(false);
          onSubmit(candidate.toLowerCase());
        } else {
          setInvalid(true);
        }
      }}
    >
      {/* Label above the field, never a placeholder standing in for one. */}
      <label
        htmlFor={id}
        className="mb-2 block text-[12px] font-medium text-[var(--vouch-text-muted)]"
      >
        {label}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
          placeholder="0x0000000000000000000000000000000000000000"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid}
          {...(invalid ? { "aria-describedby": `${id}-error` } : {})}
          className="w-full rounded-xl border border-white/[0.09] bg-black/20 px-3.5 py-2.5 font-mono text-[13px] text-[var(--vouch-text)] transition-colors duration-300 outline-none placeholder:text-[var(--vouch-text-faint)] focus:border-white/[0.2] sm:max-w-[30rem]"
          style={invalid ? { borderColor: "var(--vouch-danger)" } : undefined}
        />

        <Button type="submit" variant="secondary">
          {action}
        </Button>
      </div>

      {invalid ? (
        <p id={`${id}-error`} className="mt-2 text-[12px]" style={{ color: "var(--vouch-danger)" }}>
          That is not a 20-byte address. Paste a full address, starting 0x.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--vouch-text-faint)]">
          Proven facts are public. Anybody can read any address.
        </p>
      )}
    </form>
  );
}

/** A labelled figure for a metric row. Mono and tabular so columns align. */
export function Metric({
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
    <div className="bg-[var(--vouch-surface)] px-6 py-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-[var(--vouch-text-muted)]">{label}</span>
        {status ? <StatusBadge status={status} /> : null}
      </div>

      <div className="mt-3 font-mono text-[24px] leading-none tracking-[-0.02em] tabular-nums text-[var(--vouch-text)]">
        {value}
      </div>

      {hint ? <div className="mt-2 text-[12px] text-[var(--vouch-text-faint)]">{hint}</div> : null}
    </div>
  );
}

/**
 * A row of metrics sharing one surface.
 *
 * gap-px over a filled container gives hairline dividers and a single outer
 * edge, so the group reads as one instrument rather than as a set of tiles.
 */
export function MetricRow({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[
    columns
  ];

  return (
    <Panel className="overflow-hidden">
      <div className={`grid grid-cols-1 gap-px bg-white/[0.06] ${cols}`}>{children}</div>
    </Panel>
  );
}

/**
 * A code block.
 *
 * Scrolls inside its own container so a long line can never widen the page.
 *
 * Renders bare rather than in its own enclosure, because it is nearly always
 * placed inside a Section. Nesting one bezel inside another gives four edges
 * around the same content and the technique stops meaning anything.
 */
export function Snippet({ code, caption }: { code: string; caption?: string }) {
  return (
    <div>
      <pre className="overflow-x-auto px-6 py-5 font-mono text-[12.5px] leading-relaxed text-[var(--vouch-text)]">
        <code>{code}</code>
      </pre>

      {caption ? (
        <div className="border-t border-white/[0.06] px-6 py-3 text-[12px] text-[var(--vouch-text-muted)]">
          {caption}
        </div>
      ) : null}
    </div>
  );
}

/** A labelled technical value. The unit of a detail panel. */
export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/[0.05] px-6 py-3.5 last:border-0">
      <dt className="shrink-0 text-[13px] text-[var(--vouch-text-muted)]">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] break-all text-[var(--vouch-text)]">
        {children}
      </dd>
    </div>
  );
}
