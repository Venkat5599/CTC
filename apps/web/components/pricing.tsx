"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { metricsConfig, pricingConfig } from "@/lib/config";

/**
 * What it costs.
 *
 * The template shipped three pricing tiers. Vouch does not have tiers, or a
 * subscription, or a plan to sell -- it is a registry anyone can read. So the
 * slot keeps its position in the page and carries the thing a reader in a
 * pricing frame of mind actually wants: the measured cost of using it.
 *
 * Every figure comes from Gas.t.sol. The comparison row is the honest one --
 * verification is genuinely expensive, and the argument is not that Vouch made
 * it cheap but that it made it happen once.
 */

const COMPARISON = [
  {
    label: "Verifying a fact",
    cost: "~120,000 gas",
    who: "Paid once, by whoever submits it",
    accent: false,
  },
  {
    label: "Reading a fact",
    cost: "1,202 gas",
    who: "Paid by every consumer, forever",
    accent: true,
  },
];

export function Pricing(): ReactNode {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-border px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="mx-auto max-w-[58ch] text-center">
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.12] tracking-[-0.025em]">
            {pricingConfig.title}
          </h2>
          <p className="mx-auto mt-5 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
            {pricingConfig.description}
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {COMPARISON.map((row, i) => (
            <motion.div
              key={row.label}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={
                row.accent
                  ? "rounded-4xl bg-accent p-8 text-black md:p-10"
                  : "rounded-4xl border border-border bg-card-secondary p-8 md:p-10"
              }
            >
              <div
                className={
                  row.accent
                    ? "text-[14px] text-black/70"
                    : "text-[14px] text-muted-foreground"
                }
              >
                {row.label}
              </div>

              <div className="mt-4 font-mono text-[clamp(2rem,4vw,2.75rem)] leading-none tracking-tight tabular-nums">
                {row.cost}
              </div>

              <div
                className={
                  row.accent
                    ? "mt-5 text-[14px] text-black/70"
                    : "mt-5 text-[14px] text-muted-foreground"
                }
              >
                {row.who}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 grid gap-10 border-t border-border pt-14 md:grid-cols-3">
          {metricsConfig.map((metric) => (
            <div key={metric.label}>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[clamp(1.75rem,3.5vw,2.5rem)] leading-none tracking-tight tabular-nums">
                  {metric.value}
                </span>
                {metric.unit ? (
                  <span className="text-[13px] text-muted-foreground">{metric.unit}</span>
                ) : null}
              </div>
              <div className="mt-3 text-[14px]">{metric.label}</div>
              <p className="mt-2 max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">
                {metric.note}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-[13px] text-muted-foreground">
          {pricingConfig.billingNote}.{" "}
          <Link
            href="https://github.com/Venkat5599/CTC/blob/master/docs/benchmarks/results.md"
            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            Method and caveats
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
