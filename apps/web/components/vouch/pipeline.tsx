"use client";

import { motion, useReducedMotion } from "motion/react";

import { Mono, StatusBadge } from "@/components/dashboard/primitives";

/**
 * Cross-chain pipeline.
 *
 * The signature artifact, and the one component that explains the protocol
 * without a paragraph: a fact starts on another chain, passes through Attestcoin
 * once, and lands in the Vouch registry where many applications read it.
 *
 * The composition IS the argument. One line in, one verification, many lines
 * out. A competitor's version of this picture has one line out, and the
 * difference is visible before anybody reads a word.
 *
 * Motion is motivated rather than decorative: a pulse travels the path in the
 * direction a proof actually moves, so the animation carries the sequence. Every
 * node and edge is fully drawn before it runs, so reduced motion or a failed
 * hydration costs the emphasis and none of the meaning. Nothing here is ever
 * hidden behind an entrance animation.
 *
 * It renders as a full-height panel so it can anchor a column rather than sit
 * as one more band in a vertical stack.
 */

export interface PipelineFact {
  factType: string;
  sourceChain: string;
  txHash: string;
  blockNumber: string;
  factId?: string;
}

// The four consumers actually deployed against the registry. Not a wish list.
const CONSUMERS = ["Passport", "Credit", "Access", "Fee tier"] as const;

export function CrossChainPipeline({ fact }: { fact?: PipelineFact }) {
  const reduce = useReducedMotion();

  const stages = [
    {
      chain: fact?.sourceChain ?? "Ethereum Sepolia",
      title: fact?.factType ?? "Aave repayment",
      detail: fact ? `Block ${fact.blockNumber}` : "Source chain event",
      hash: fact?.txHash,
    },
    {
      chain: "Attestcoin",
      title: "Inclusion proven",
      detail: "Block Prover 0x…0FD2",
    },
    {
      chain: "Creditcoin",
      title: "Fact recorded",
      detail: "Written once, read forever",
      hash: fact?.factId,
    },
  ];

  return (
    <div className="h-full rounded-[22px] border border-white/[0.055] bg-white/[0.018] p-1.5">
      <div className="glass flex h-full flex-col rounded-[16px] p-6 sm:p-7">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] tracking-[-0.015em] text-[var(--vouch-text)]">
              Cross-chain verification
            </h2>
            <p className="mt-1.5 text-[12.5px] text-[var(--vouch-text-muted)]">
              {fact ? "The path your most recent fact travelled." : "The path every fact travels."}
            </p>
          </div>

          <StatusBadge status={fact ? "verified" : "unknown"}>
            {fact ? "Live" : "Example"}
          </StatusBadge>
        </div>

        <ol className="flex-1">
          {stages.map((stage, i) => (
            <li key={stage.chain} className="flex items-stretch gap-4">
              {/* Rail: node plus the edge down to the next stage. */}
              <div className="flex flex-col items-center">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: "var(--vouch-primary)" }}
                  aria-hidden="true"
                />

                {i < stages.length - 1 ? (
                  <div className="relative my-1.5 w-px flex-1 bg-white/[0.09]">
                    {!reduce && (
                      <motion.div
                        className="absolute inset-x-0 h-7 w-px"
                        style={{
                          background:
                            "linear-gradient(to bottom, transparent, var(--vouch-primary), transparent)",
                        }}
                        initial={{ top: "-14%", opacity: 0 }}
                        animate={{ top: ["-14%", "100%"], opacity: [0, 1, 0] }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.55,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatDelay: 1.7,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-8 last:pb-0">
                <div className="text-[13.5px] text-[var(--vouch-text)]">{stage.chain}</div>
                <div className="mt-1 text-[13px] text-[var(--vouch-text-muted)]">{stage.title}</div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-mono text-[11.5px] text-[var(--vouch-text-faint)]">
                    {stage.detail}
                  </span>
                  {stage.hash ? <Mono value={stage.hash} chars={5} /> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* The fan-out. One write above, many reads below. This is the part a
            single-application integration cannot draw. */}
        <div className="mt-4 border-t border-white/[0.06] pt-6">
          <p className="mb-3.5 text-[12px] text-[var(--vouch-text-faint)]">
            Read by every application, for one storage read each
          </p>

          <ul className="flex flex-wrap gap-2">
            {CONSUMERS.map((consumer, i) => (
              <motion.li
                key={consumer}
                initial={reduce ? false : { opacity: 0.5 }}
                animate={reduce ? {} : { opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 2.6,
                  delay: i * 0.3,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1.1,
                }}
                className="rounded-full border border-white/[0.08] px-3 py-1 text-[12px] text-[var(--vouch-text-muted)]"
              >
                {consumer}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
