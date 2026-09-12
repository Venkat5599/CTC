"use client";

import { motion, type Transition } from "motion/react";
import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The five checks, not a logo wall.
 *
 * This slot has now been wrong twice. The template stacked four stock headshots
 * here, which reads as a user base Vouch does not have. Replacing them with
 * four chain logos was no better: it read as four supported source chains, and
 * Attestcoin on CC3 Testnet exposes exactly two -- Sepolia (chainKey 1) and
 * Ethereum mainnet (chainKey 3). Polygon, Arbitrum and Optimism were not
 * sources; they were decoration that made a claim.
 *
 * What actually stands behind the test count is the five consumer-layer checks,
 * so that is what goes here. Each one is a real gate in SourceValidator with its
 * own test, and a reader who doubts any of it can run `forge test` and count.
 */
const VERIFICATION_GATES = [
  ["S1", "Receipt status"],
  ["S2", "Emitter pinned"],
  ["S3", "Replay guard"],
  ["S4", "Reserve asset"],
  ["S5", "Distinct payer"],
] as const;

/**
 * Single source of truth for the suite size, so the number on the page and the
 * number `forge test` prints cannot drift apart again. They already did once:
 * three components hard-coded 142 while the suite returned 128. On a protocol
 * whose entire argument is that an unverified claim is worthless, shipping an
 * unverifiable one about ourselves is the cheapest possible way to lose the
 * reader. Update this constant when the suite grows, and nowhere else.
 */
const TEST_COUNT = 128;

/**
 * Measured, not invented. Both figures come from Gas.t.sol, and the second is
 * the one the whole registry exists to make true.
 */
const DEPLOYMENT_STATS = [
  { icon: "●", label: "1,202 gas per read", change: "flat" },
  { icon: "●", label: "0 precompile calls", change: "per read" },
];

const cardAnimation = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
};

const getCardTransition = (delay = 0): Transition => ({
  duration: 0.8,
  ease: EASE,
  delay,
});

function PhoneMockup({
  children,
  variant = "full",
}: {
  children: ReactNode;
  variant?: "full" | "compact";
}): ReactNode {
  const isCompact = variant === "compact";

  return (
    <div
      className={`
        relative bg-background shadow-2xl border-neutral-800 overflow-hidden z-10
        ${isCompact 
          ? "w-44 md:w-48 h-64 md:h-72 rounded-3xl border-4" 
          : "w-56 md:w-64 h-96 md:h-115 rounded-t-4xl border-6 border-b-0"
        }
      `}
    >
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 bg-neutral-800 rounded-full z-10
          ${isCompact ? "top-2 w-16 h-4" : "top-2 w-20 h-5"}
        `}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

/**
 * Bare marks on the surface. No circles, no tiles, no borders -- a glyph inside
 * a filled container is the component-kit default, and five of them in a row
 * reads as a widget rather than a list of things this contract actually checks.
 * Rank comes from type: the gate number in accent, its subject in muted body.
 */
function VerificationGates(): ReactNode {
  return (
    <ul className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1.5">
      {VERIFICATION_GATES.map(([id, subject]) => (
        <li key={id} className="flex items-baseline gap-1.5">
          <span className="text-accent text-sm font-semibold tabular-nums">{id}</span>
          <span className="text-card-foreground-muted text-xs">{subject}</span>
        </li>
      ))}
    </ul>
  );
}

function DeploymentStat({
  icon,
  label,
  change,
}: {
  icon: string;
  label: string;
  change: string;
}): ReactNode {
  return (
    <div className="flex items-center justify-between bg-background rounded-xl p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-foreground font-medium">{label}</span>
      </div>
      <span className="text-black text-sm font-medium">{change}</span>
    </div>
  );
}

function DecorativeCircles(): ReactNode {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="absolute size-56 border border-accent/80 rounded-full" />
      <div className="absolute size-72 border border-accent/60 rounded-full" />
      <div className="absolute size-88 border border-accent/40 rounded-full" />
    </div>
  );
}

function StepByStepCard(): ReactNode {
  return (
    <motion.div
      {...cardAnimation}
      transition={getCardTransition(0)}
      className="group bg-card-primary rounded-4xl p-8 pb-0 overflow-hidden min-h-140 md:row-span-2 flex flex-col"
    >
      <div className="relative z-10 text-center mb-6 transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="text-2xl md:text-4xl font-medium text-neutral-900 leading-tight mb-3">
          One proof, read by every application
        </h3>
        <p className="text-neutral-700 text-sm">
          Prove an address once on any supported chain, and every Creditcoin application can read it
        </p>
      </div>

      <div className="flex-1 flex justify-center items-end transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        <PhoneMockup variant="full">
          <div className="absolute inset-0 bg-phone-screen pt-14 px-5">
            <h4 className="text-3xl font-medium text-neutral-900 leading-none tracking-tight mt-4">
              Verify once.
            </h4>
            <h4 className="text-3xl font-medium text-neutral-900 leading-none tracking-tight mb-4">
              Reuse forever.
            </h4>
            <p className="text-sm text-neutral-500 leading-snug mb-8">
              One verification, then every application reads it for free.
            </p>

            {/* Project Card */}
            <div className="relative bg-linear-to-br from-accent via-accent/80 to-accent/50 rounded-2xl p-4 h-52 shadow-xl overflow-hidden">
              <ProjectCardContent />
            </div>
          </div>
        </PhoneMockup>
      </div>
    </motion.div>
  );
}

function ProjectCardContent(): ReactNode {
  return (
    <>
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,60 Q30,40 60,50 T100,30"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.5"
        />
        <path
          d="M0,55 Q40,35 70,45 T100,25"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
      </svg>

      <div className="relative z-10 flex items-start justify-between gap-3 h-full">
        <div>
          <p className="text-base font-semibold text-neutral-900">Aave V3</p>
          <p className="text-base font-semibold text-neutral-900">Repayment</p>
        </div>
        <CircleCheck className="opacity-25 text-black" aria-hidden="true" />
      </div>

      {/*
        The template's "PRJ • 2024 • LIVE" placeholder named nothing. These three
        are the fields that actually decide whether a fact is admissible: which
        Attestcoin key space the proof came from, which network it settled on,
        and that it is on chain now rather than staged.
      */}
      <div className="absolute bottom-3 left-5 flex items-center gap-2 text-neutral-700 text-xs tracking-widest" aria-hidden="true">
        <span>KEY 1</span>
        <span>•</span>
        <span>SEPOLIA</span>
        <span>•</span>
        <span>LIVE</span>
      </div>
    </>
  );
}

function DashboardCard(): ReactNode {
  return (
    <motion.div
      {...cardAnimation}
      transition={getCardTransition(0.1)}
      className="group bg-card-secondary rounded-4xl p-8 overflow-hidden min-h-80 relative flex flex-col md:block"
    >
      <div className="relative z-10 max-w-48 transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="text-xl md:text-2xl whitespace-nowrap font-medium text-card-foreground leading-tight mb-3">
          Verified facts
        </h3>
        <p className="text-card-foreground-muted text-sm">
          Every fact traces back to the transaction it was drawn from
        </p>
      </div>

      <div className="relative md:absolute mt-8 md:mt-0 md:right-12 md:top-1/2 md:-translate-y-1/2 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 self-center md:self-auto">
        <DecorativeCircles />

        <PhoneMockup variant="compact">
          <div className="absolute inset-0 bg-phone-screen pt-9 px-3">
            <div className="bg-white rounded-full px-2 py-1.5 mb-3 flex items-center gap-1.5 border border-neutral-200">
              <span className="text-neutral-400 text-xs">Search an address...</span>
            </div>
            <p className="text-xs text-neutral-500 mb-0.5">Registered sources</p>
            <p className="text-xl font-medium text-neutral-900 mb-3">3 fact types</p>

            <div className="flex gap-1.5 mb-4">
              <span className="bg-accent text-black text-xs px-2.5 py-1 rounded-full">
                Deploy
              </span>
              <span className="text-neutral-400 text-xs px-2 py-1">Build</span>
              <span className="text-neutral-400 text-xs px-2 py-1">Test</span>
            </div>
          </div>
        </PhoneMockup>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-neutral-900 rounded-2xl px-5 py-3 shadow-xl z-20 whitespace-nowrap">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-neutral-400 text-xs">Test suite</span>
            <span className="text-neutral-500 text-xs">ⓘ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium text-white tabular-nums">{TEST_COUNT} passing</span>
            <span className="text-xs font-medium text-accent bg-accent/20 px-2 py-0.5 rounded">
              ✓ 100%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TrustedByCard(): ReactNode {
  return (
    <motion.div
      {...cardAnimation}
      transition={getCardTransition(0.2)}
      className="group bg-card-secondary rounded-4xl p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-64"
    >
      <div className="transition-transform duration-500 ease-out group-hover:scale-110">
        <h3 className="text-2xl md:text-3xl font-medium text-card-foreground leading-tight mb-1">
          Proven by
        </h3>
        <h3 className="text-2xl md:text-3xl font-medium text-card-foreground leading-tight mb-5 tabular-nums">
          {TEST_COUNT} tests
        </h3>
      </div>

      <div className="transition-transform duration-500 ease-out group-hover:scale-105">
        <VerificationGates />
      </div>

      {/*
        The template closed this card with a star rating and a review count, both
        invented. Vouch has no reviewers, and a fabricated number is the exact
        thing the registry exists to make unnecessary -- so the footer is now the
        command that reproduces the figure above it. A reader who doubts the
        count can settle it in one line instead of taking our word, which is the
        whole argument of the protocol applied to our own marketing page.
      */}
      <p className="mt-5 text-card-foreground-muted text-xs font-medium">
        Check it yourself:{" "}
        <code className="text-card-foreground">forge test</code>
      </p>
    </motion.div>
  );
}

function IntegrationsCard(): ReactNode {
  return (
    <motion.div
      {...cardAnimation}
      transition={getCardTransition(0.3)}
      className="group bg-card-primary rounded-4xl p-6 md:p-8 flex flex-col min-h-64"
    >
      <div className="mb-auto transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="text-xl md:text-2xl font-medium text-neutral-900 leading-tight mb-2">
          Permissionless
        </h3>
        <p className="text-neutral-700 text-sm">
          Anyone can submit a proof. No allowlist, no operator, no registration
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-6 transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        {DEPLOYMENT_STATS.map((stat) => (
          <DeploymentStat key={stat.icon} {...stat} />
        ))}
      </div>
    </motion.div>
  );
}

export function FeaturesBento(): ReactNode {
  return (
    <section className="w-full px-6 mb-32 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
          <StepByStepCard />
          <DashboardCard />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TrustedByCard />
            <IntegrationsCard />
          </div>
        </div>
      </div>
    </section>
  );
}
