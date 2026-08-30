"use client";

import { motion, type Transition } from "motion/react";
import { CircleCheck, Star } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

const AVATAR_URLS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
];

const DEPLOYMENT_STATS = [
  { icon: "🚀", label: "2,598 Deploys", change: "+24%" },
  { icon: "⚡", label: "99.9% Uptime", change: "+0.2%" },
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

function AvatarStack(): ReactNode {
  return (
    <div className="flex items-center">
      {AVATAR_URLS.map((src, i) => (
        <div
          key={i}
          className="size-12 rounded-full border-2 border-white/25 overflow-hidden -ml-4 first:ml-0"
        >
          <Image
            src={src}
            alt=""
            width={48}
            height={48}
            className="size-full object-cover"
          />
        </div>
      ))}
      <div className="size-12 rounded-full border-2 border-white/25 bg-accent text-black flex items-center justify-center text-sm font-semibold -ml-4">
        5+
      </div>
    </div>
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
          Guided Onboarding For Every Team
        </h3>
        <p className="text-neutral-700 text-sm">
          Get your team up and running in minutes with step-by-step walkthroughs
        </p>
      </div>

      <div className="flex-1 flex justify-center items-end transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        <PhoneMockup variant="full">
          <div className="absolute inset-0 bg-phone-screen pt-14 px-5">
            <h4 className="text-3xl font-medium text-neutral-900 leading-none tracking-tight mt-4">
              Your workspace
            </h4>
            <h4 className="text-3xl font-medium text-neutral-900 leading-none tracking-tight mb-4">
              is ready!
            </h4>
            <p className="text-sm text-neutral-500 leading-snug mb-8">
              Invite your team and start collaborating instantly.
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
          <p className="text-base font-semibold text-neutral-900">Project</p>
          <p className="text-base font-semibold text-neutral-900">Alpha</p>
        </div>
        <CircleCheck className="opacity-25 text-black" aria-hidden="true" />
      </div>

      <div className="absolute bottom-3 left-5 flex items-center gap-2 text-neutral-700 text-xs tracking-widest" aria-hidden="true">
        <span>PRJ</span>
        <span>•</span>
        <span>2024</span>
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
          Real-time Data
        </h3>
        <p className="text-card-foreground-muted text-sm">
          Monitor metrics, analytics, and team activity instantly
        </p>
      </div>

      <div className="relative md:absolute mt-8 md:mt-0 md:right-12 md:top-1/2 md:-translate-y-1/2 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105 self-center md:self-auto">
        <DecorativeCircles />

        <PhoneMockup variant="compact">
          <div className="absolute inset-0 bg-phone-screen pt-9 px-3">
            <div className="bg-white rounded-full px-2 py-1.5 mb-3 flex items-center gap-1.5 border border-neutral-200">
              <span className="text-neutral-400 text-xs">Search projects...</span>
            </div>
            <p className="text-xs text-neutral-500 mb-0.5">Active projects</p>
            <p className="text-xl font-medium text-neutral-900 mb-3">24 running</p>

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
            <span className="text-neutral-400 text-xs">Build status</span>
            <span className="text-neutral-500 text-xs">ⓘ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium text-white">All passing</span>
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
          Trusted By
        </h3>
        <h3 className="text-2xl md:text-3xl font-medium text-card-foreground leading-tight mb-5">
          254k+ Users
        </h3>
      </div>

      <div className="transition-transform duration-500 ease-out group-hover:scale-105">
        <AvatarStack />
      </div>

      <div className="flex items-center gap-2 mt-5 text-card-foreground-muted transition-transform duration-500 ease-out group-hover:scale-105">
        <Star className="size-4 fill-current" />
        <span className="text-xs font-medium">4.9 from 48k+ reviews</span>
      </div>
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
          Built to Scale
        </h3>
        <p className="text-neutral-700 text-sm">
          Enterprise-ready infrastructure that grows with you
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
