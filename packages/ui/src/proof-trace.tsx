'use client';

/**
 * ProofTrace — the signature artifact.
 *
 * One custom object the whole site is built around, rather than a stack of
 * generic sections. It draws the actual claim Vouch makes: a fact starts on one
 * chain, passes through a single verification, and is then read by many
 * applications that know nothing about each other.
 *
 * The composition IS the argument. One line in on the left, one verification
 * node, many lines out on the right. A competitor's diagram would be one line in
 * and one line out, and the difference is visible at a glance without reading a
 * word.
 *
 * Motion is motivated: the consumer lines pulse outward in sequence to show that
 * reads happen repeatedly and independently after a single write. It communicates
 * hierarchy (the write is the event, the reads are consequences) rather than
 * decorating. Everything is fully visible before any animation runs, so a
 * reduced-motion viewer or a failed hydration loses nothing but the emphasis.
 */

import { motion, useReducedMotion } from 'motion/react';

export interface ProofTraceConsumer {
  label: string;
  benefit: string;
}

export function ProofTrace({
  source = 'Ethereum',
  fact = 'Aave repayment',
  consumers,
}: {
  source?: string;
  fact?: string;
  consumers: ProofTraceConsumer[];
}) {
  const reduce = useReducedMotion();

  const height = Math.max(220, consumers.length * 76);
  const midY = height / 2;
  const nodeX = 300;
  const outX = 560;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 820 ${height}`}
        className="h-auto w-full min-w-[640px]"
        role="img"
        aria-label={`One ${fact} proven from ${source}, read by ${consumers.length} independent applications.`}
      >
        <defs>
          <linearGradient id="pt-in" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--color-line-strong)" />
            <stop offset="100%" stopColor="var(--color-accent-dim)" />
          </linearGradient>
        </defs>

        {/* Source */}
        <text
          x="0"
          y={midY - 10}
          className="fill-[--color-ink-muted] font-mono"
          fontSize="13"
        >
          {source}
        </text>
        <text x="0" y={midY + 10} className="fill-[--color-ink-faint] font-mono" fontSize="12">
          {fact}
        </text>

        {/* One line in */}
        <line
          x1="120"
          y1={midY}
          x2={nodeX - 46}
          y2={midY}
          stroke="url(#pt-in)"
          strokeWidth="1.5"
        />

        {/* The verification node. A diamond rather than a circle, because a
            circle here would read as a generic node in a generic diagram. */}
        <g transform={`translate(${nodeX}, ${midY})`}>
          <rect
            x="-32"
            y="-32"
            width="64"
            height="64"
            transform="rotate(45)"
            className="fill-[--color-surface] stroke-[--color-accent]"
            strokeWidth="1.5"
            rx="4"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-[--color-accent] font-mono"
            fontSize="11"
          >
            once
          </text>
        </g>

        {/* Many lines out, one per consumer */}
        {consumers.map((consumer, i) => {
          const y = height / 2 + (i - (consumers.length - 1) / 2) * 68;
          const path = `M ${nodeX + 46} ${midY} C ${nodeX + 140} ${midY}, ${outX - 90} ${y}, ${outX} ${y}`;

          return (
            <g key={consumer.label}>
              {/* Base path, always drawn. The animation below only adds a
                  travelling highlight on top of a line that is already there. */}
              <path
                d={path}
                fill="none"
                stroke="var(--color-line-strong)"
                strokeWidth="1.25"
              />

              {!reduce && (
                <motion.path
                  d={path}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 0.9, 0] }}
                  transition={{
                    duration: 2.4,
                    times: [0, 0.45, 1],
                    delay: i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: consumers.length * 0.5,
                    ease: 'easeInOut',
                  }}
                />
              )}

              <circle cx={outX} cy={y} r="3" className="fill-[--color-accent]" />
              <text
                x={outX + 16}
                y={y - 5}
                className="fill-[--color-ink] font-mono"
                fontSize="13"
              >
                {consumer.label}
              </text>
              <text
                x={outX + 16}
                y={y + 13}
                className="fill-[--color-ink-faint] font-mono"
                fontSize="12"
              >
                {consumer.benefit}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
