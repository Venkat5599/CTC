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
      className={`bg-background relative z-10 overflow-hidden border-neutral-800 shadow-2xl ${
        isCompact
          ? "h-64 w-44 rounded-3xl border-4 md:h-72 md:w-48"
          : "h-96 w-56 rounded-t-4xl border-6 border-b-0 md:h-115 md:w-64"
      } `}
    >
      <div
        className={`absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-neutral-800 ${isCompact ? "top-2 h-4 w-16" : "top-2 h-5 w-20"} `}
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
          <span className="text-accent text-sm font-semibold tabular-nums">
            {id}
          </span>
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
    <div className="bg-background flex items-center justify-between rounded-xl p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-foreground font-medium">{label}</span>
      </div>
      <span className="text-sm font-medium text-black">{change}</span>
    </div>
  );
}

function DecorativeCircles(): ReactNode {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="border-accent/80 absolute size-56 rounded-full border" />
      <div className="border-accent/60 absolute size-72 rounded-full border" />
      <div className="border-accent/40 absolute size-88 rounded-full border" />
    </div>
  );
}

function StepByStepCard(): ReactNode {
  return (
    <motion.div
      {...cardAnimation}
      transition={getCardTransition(0)}
      className="group bg-card-primary flex min-h-140 flex-col overflow-hidden rounded-4xl p-8 pb-0 md:row-span-2"
    >
      <div className="relative z-10 mb-6 text-center transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="mb-3 text-2xl leading-tight font-medium text-neutral-900 md:text-4xl">
          One proof, read by every application
        </h3>
        <p className="text-sm text-neutral-700">
          Prove an address once on any supported chain, and every Creditcoin
          application can read it
        </p>
      </div>

      <div className="flex flex-1 items-end justify-center transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        <PhoneMockup variant="full">
          <div className="bg-phone-screen absolute inset-0 px-5 pt-14">
            <h4 className="mt-4 text-3xl leading-none font-medium tracking-tight text-neutral-900">
              Verify once.
            </h4>
            <h4 className="mb-4 text-3xl leading-none font-medium tracking-tight text-neutral-900">
              Reuse forever.
            </h4>
            <p className="mb-8 text-sm leading-snug text-neutral-500">
              One verification, then every application reads it for free.
            </p>

            {/* Project Card */}
            <div className="from-accent via-accent/80 to-accent/50 relative h-52 overflow-hidden rounded-2xl bg-linear-to-br p-4 shadow-xl">
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

      <div className="relative z-10 flex h-full items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-neutral-900">Aave V3</p>
          <p className="text-base font-semibold text-neutral-900">Repayment</p>
        </div>
        <CircleCheck className="text-black opacity-25" aria-hidden="true" />
      </div>

      {/*
        The template's "PRJ • 2024 • LIVE" placeholder named nothing. These three
        are the fields that actually decide whether a fact is admissible: which
        Attestcoin key space the proof came from, which network it settled on,
        and that it is on chain now rather than staged.
      */}
      <div
        className="absolute bottom-3 left-5 flex items-center gap-2 text-xs tracking-widest text-neutral-700"
        aria-hidden="true"
      >
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
      className="group bg-card-secondary relative flex min-h-80 flex-col overflow-hidden rounded-4xl p-8 md:block"
    >
      <div className="relative z-10 max-w-48 transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="text-card-foreground mb-3 text-xl leading-tight font-medium whitespace-nowrap md:text-2xl">
          Verified facts
        </h3>
        <p className="text-card-foreground-muted text-sm">
          Every fact traces back to the transaction it was drawn from
        </p>
      </div>

      <div className="relative mt-8 flex items-center justify-center self-center transition-transform duration-500 ease-out group-hover:scale-105 md:absolute md:top-1/2 md:right-12 md:mt-0 md:-translate-y-1/2 md:self-auto">
        <DecorativeCircles />

        <PhoneMockup variant="compact">
          <div className="bg-phone-screen absolute inset-0 px-3 pt-9">
            <div className="mb-3 flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2 py-1.5">
              <span className="text-xs text-neutral-400">
                Search an address...
              </span>
            </div>
            <p className="mb-0.5 text-xs text-neutral-500">
              Registered sources
            </p>
            <p className="mb-3 text-xl font-medium text-neutral-900">
              3 fact types
            </p>

            <div className="mb-4 flex gap-1.5">
              <span className="bg-accent rounded-full px-2.5 py-1 text-xs text-black">
                Deploy
              </span>
              <span className="px-2 py-1 text-xs text-neutral-400">Build</span>
              <span className="px-2 py-1 text-xs text-neutral-400">Test</span>
            </div>
          </div>
        </PhoneMockup>

        <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-neutral-900 px-5 py-3 whitespace-nowrap shadow-xl">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-xs text-neutral-400">Test suite</span>
            <span className="text-xs text-neutral-500">ⓘ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium text-white tabular-nums">
              {TEST_COUNT} passing
            </span>
            <span className="text-accent bg-accent/20 rounded px-2 py-0.5 text-xs font-medium">
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
      className="group bg-card-secondary flex min-h-64 flex-col items-center justify-center rounded-4xl p-6 text-center md:p-8"
    >
      <div className="transition-transform duration-500 ease-out group-hover:scale-110">
        <h3 className="text-card-foreground mb-1 text-2xl leading-tight font-medium md:text-3xl">
          Proven by
        </h3>
        <h3 className="text-card-foreground mb-5 text-2xl leading-tight font-medium tabular-nums md:text-3xl">
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
      <p className="text-card-foreground-muted mt-5 text-xs font-medium">
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
      className="group bg-card-primary flex min-h-64 flex-col rounded-4xl p-6 md:p-8"
    >
      <div className="mb-auto transition-transform duration-500 ease-out group-hover:scale-105">
        <h3 className="mb-2 text-xl leading-tight font-medium text-neutral-900 md:text-2xl">
          Permissionless
        </h3>
        <p className="text-sm text-neutral-700">
          Anyone can submit a proof. No allowlist, no operator, no registration
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        {DEPLOYMENT_STATS.map((stat) => (
          <DeploymentStat key={stat.icon} {...stat} />
        ))}
      </div>
    </motion.div>
  );
}

export function FeaturesBento(): ReactNode {
  return (
    <section className="bg-background mb-32 w-full px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.5fr]">
          <StepByStepCard />
          <DashboardCard />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TrustedByCard />
            <IntegrationsCard />
          </div>
        </div>
      </div>
    </section>
  );
}
