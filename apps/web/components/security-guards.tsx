"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { securityConfig, testimonialsConfig } from "@/lib/config";

/**
 * The three protocol guards.
 *
 * This section replaces the template's testimonials carousel. That carousel
 * shipped four invented people at invented companies saying invented things,
 * and a protocol whose entire argument is "stop taking claims on trust" cannot
 * open its landing page with fabricated praise. The honest version of social
 * proof here is not a quote -- it is a test somebody can run.
 *
 * So each card states the attack rather than the defence, and names the test
 * that performs it. A reader who does not believe the claim can clone the repo
 * and watch the attack get rejected.
 */
export function SecurityGuards(): ReactNode {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-white/[0.06] px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="mx-auto max-w-[62ch] text-center">
          <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-medium leading-[1.14] tracking-[-0.025em]">
            {testimonialsConfig.title}
          </h2>
          <p className="mx-auto mt-5 max-w-[58ch] text-[15px] leading-relaxed text-white/60">
            Each one returns true from the precompile. Nothing reverts, nothing
            logs, and the registry records something false unless the layer above
            it does its job.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {securityConfig.map((guard, i) => (
            <motion.article
              key={guard.id}
              // Visible by default. The animation only adds emphasis to
              // something already on screen, so a viewer with reduced motion or
              // a failed hydration loses the entrance and none of the content.
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7"
            >
              <div className="font-mono text-[13px] text-[#f99fea]">{guard.id}</div>

              <h3 className="mt-4 text-[17px] font-medium leading-snug tracking-[-0.01em]">
                {guard.title}
              </h3>

              <p className="mt-3 text-[14px] leading-relaxed text-white/55">
                {guard.body}
              </p>

              <div className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-[12px] text-white/35">
                {guard.test}
              </div>
            </motion.article>
          ))}
        </div>

        <p className="mt-12 text-center text-[13px] text-white/40">
          Written as attacks rather than as checks. Clone the repo and run{" "}
          <span className="font-mono text-white/60">forge test</span>.
        </p>
      </div>
    </section>
  );
}
