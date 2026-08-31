"use client";

import { motion, useReducedMotion } from "motion/react";

import { HashText, ProofStatus, SectionLabel } from "@/components/vouch/kit";

/**
 * Cross-chain pipeline.
 *
 * The centrepiece, and the one component that explains the protocol without a
 * paragraph: a fact starts on Ethereum, passes through Attestcoin once, and
 * lands in the Vouch registry where many applications read it.
 *
 * The composition IS the argument. One line in, one verification, many lines
 * out -- a competitor's version of this picture has one line out, and the
 * difference is visible before anybody reads a word.
 *
 * Motion is motivated rather than decorative: a pulse travels the path in the
 * direction a proof actually moves, so the animation carries the sequence. Every
 * node and edge is fully drawn before it runs, so reduced motion or a failed
 * hydration costs the emphasis and none of the meaning.
 */

export interface PipelineFact {
  factType: string;
  sourceChain: string;
  txHash: string;
  blockNumber: string;
  factId?: string;
  consumers?: string[];
}

const CONSUMERS = ["Passport", "Credit", "Access", "Fee tier"] as const;

export function CrossChainPipeline({ fact }: { fact?: PipelineFact }) {
  const reduce = useReducedMotion();

  const stages = [
    {
      chain: fact?.sourceChain ?? "Ethereum Sepolia",
      title: fact?.factType ?? "Aave Repay",
      detail: fact ? `Block ${fact.blockNumber}` : "Source chain event",
      hash: fact?.txHash,
    },
    {
      chain: "Attestcoin",
      title: "Inclusion proven",
      detail: "Precompile 0x…0FD2",
    },
    {
      chain: "Creditcoin",
      title: fact?.factId ? `Fact ${fact.factId.slice(0, 10)}…` : "Fact recorded",
      detail: "Written once, read forever",
    },
  ];

  return (
    <section aria-label="Cross-chain verification pipeline">
      <SectionLabel className="mb-5">Live verification pipeline</SectionLabel>

      <div className="rounded-xl border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5 sm:p-7">
        <ol className="space-y-0">
          {stages.map((stage, i) => (
            <li key={stage.chain}>
              <div className="flex items-start gap-4">
                {/* Rail: node plus the edge down to the next stage. */}
                <div className="flex flex-col items-center self-stretch">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: "var(--vouch-primary)" }}
                    aria-hidden="true"
                  />
                  {i < stages.length - 1 ? (
                    <div className="relative my-1 w-px flex-1 bg-[var(--vouch-border-strong)]">
                      {!reduce && (
                        <motion.div
                          className="absolute inset-x-0 h-6 w-px"
                          style={{
                            background:
                              "linear-gradient(to bottom, transparent, var(--vouch-primary), transparent)",
                          }}
                          initial={{ top: "-10%", opacity: 0 }}
                          animate={{ top: ["-10%", "100%"], opacity: [0, 1, 0] }}
                          transition={{
                            duration: 1.6,
                            delay: i * 0.5,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatDelay: 1.6,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 pb-7 last:pb-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[13px] text-[var(--vouch-text)]">{stage.chain}</span>
                    <ProofStatus state="verified" />
                  </div>

                  <div className="mt-1 text-[13px] text-[var(--vouch-text-muted)]">
                    {stage.title}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-[12px] text-[var(--vouch-text-faint)]">
                      {stage.detail}
                    </span>
                    {stage.hash ? <HashText value={stage.hash} /> : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* The fan-out. One write above, many reads below -- this is the part a
            single-application integration cannot draw. */}
        <div className="mt-2 border-t border-[var(--vouch-border)] pt-6">
          <div className="mb-3 text-[12px] text-[var(--vouch-text-faint)]">
            Readable by every application, for a storage read each
          </div>

          <ul className="flex flex-wrap gap-2">
            {CONSUMERS.map((consumer, i) => (
              <motion.li
                key={consumer}
                initial={reduce ? false : { opacity: 0.55 }}
                animate={reduce ? {} : { opacity: [0.55, 1, 0.55] }}
                transition={{
                  duration: 2.4,
                  delay: i * 0.28,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1.2,
                }}
                className="rounded-lg border border-[var(--vouch-border)] px-2.5 py-1 text-[12px] text-[var(--vouch-text-muted)]"
              >
                {consumer}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
