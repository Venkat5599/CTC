"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { howItWorksConfig } from "@/lib/config";

/**
 * How a fact becomes standing.
 *
 * The actual pipeline, named honestly: an Ethereum event is discovered,
 * batched, proven through Attestcoin, and written once. Everything after that
 * is a view call.
 *
 * The last step carries the weight. Steps one through four happen once and cost
 * money; step five happens forever and costs a storage read. That asymmetry is
 * the entire reason the registry exists, so the layout gives it its own row
 * rather than burying it as a fifth equal item.
 */

const STEPS = [
  {
    n: "01",
    title: "Discovery",
    body: "The indexer watches a registered source contract on Ethereum and finds qualifying events. It decides nothing; everything it reports is re-derived on chain before it counts.",
  },
  {
    n: "02",
    title: "Batching",
    body: "Claims sharing a chain, a 1000-block window and a deadline are grouped. Nothing requires them to belong to the same user, which is what lets ten strangers' facts ride one proof.",
  },
  {
    n: "03",
    title: "Proof",
    body: "Attestcoin proves the transaction was included in a block belonging to the confirmed source chain. It proves nothing else, which is why the next step exists.",
  },
  {
    n: "04",
    title: "Verification",
    body: "The registry checks the receipt succeeded, that the log came from the pinned emitter, and that this exact log has not been consumed before. Then it writes.",
  },
];

export function HowItWorks(): ReactNode {
  const reduce = useReducedMotion();

  return (
    <section className="px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="max-w-[52ch]">
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.12] tracking-[-0.025em]">
            {howItWorksConfig.title}
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            {howItWorksConfig.description}
          </p>
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="font-mono text-[13px] text-accent">{step.n}</div>
              <h3 className="mt-4 text-[17px] font-medium tracking-[-0.01em]">
                {step.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Given its own row because it is the asymmetry the whole design turns
            on: everything above happens once, this happens forever. */}
        <div className="mt-16 rounded-4xl border border-border bg-card-secondary p-8 md:p-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="font-mono text-[13px] text-accent">05</div>
              <h3 className="mt-4 text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium tracking-[-0.02em]">
                Every read after that is a storage slot
              </h3>
              <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
                Steps one through four happen once and cost a proof. This one
                happens forever and costs 1,202 gas. The first consumer pays for
                verification; every consumer after that reads what it already
                bought.
              </p>
            </div>

            <Link
              href={howItWorksConfig.cta.href}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-6 py-3 text-[14px] font-medium text-black transition-opacity hover:opacity-90"
            >
              {howItWorksConfig.cta.text}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
