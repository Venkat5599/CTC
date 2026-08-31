"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { AddressField, Section } from "@/components/dashboard/data";
import {
  Button,
  Mono,
  Panel,
  SectionLabel,
  SkeletonRows,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { CrossChainPipeline } from "@/components/vouch/pipeline";
import { useFacts } from "@/hooks/useFacts";
import { usePassport } from "@/hooks/usePassport";
import { useWallet } from "@/hooks/useWallet";
import { factById } from "@vouch/schemas";

/**
 * Dashboard.
 *
 * Home for the protocol, not for any one module. An earlier version led with a
 * "View Passport" button, which framed Vouch as a credit passport that happens
 * to have other pages: the opposite of the argument. Passport is one consumer of
 * the registry, reachable from the standing figure itself, which is where
 * somebody actually wants it. Read the tier, then ask what produced it.
 *
 * Composed as one frame rather than stacked as bands. The previous version was
 * a header, then a strip of four numbers, then a gap, then a box, then a gap,
 * which reads as a deck of slides no matter how each band is styled. Here the
 * pipeline anchors a tall column and the two figures sit beside it, so the
 * numbers and the path that produced them are in one view. A number without its
 * evidence is a score, and a score is what this protocol refuses to be.
 *
 * No back control: this is the root, and every destination is one click away in
 * the rail.
 */

const TIER_NAMES = ["Unproven", "Tier 1", "Tier 2", "Tier 3"] as const;

// Mirrors VouchCredit. Shown as terms, not as a promise.
const COLLATERAL_BPS = [15_000, 13_000, 11_500, 10_000] as const;

export default function DashboardPage() {
  const { address, isConnected, isConnecting, canConnect, connect } = useWallet();

  // A typed address wins over the connected one, so you can inspect anybody
  // without disconnecting.
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject ?? address ?? null;
  const viewingOther = Boolean(subject && subject !== address?.toLowerCase());

  const passport = usePassport(active ?? undefined);
  const facts = useFacts(active ?? undefined);

  const tier = passport.data?.tier ?? 0;
  const total = passport.data?.totalProofs ?? 0;
  const loading = Boolean(active) && (passport.isLoading || facts.isLoading);
  const newest = facts.data?.[0];
  const rows = facts.data ?? [];

  return (
    <>
      <header className="mb-8">
        <SectionLabel>Dashboard</SectionLabel>
        <h1 className="mt-3 text-[34px] leading-[1.05] font-medium tracking-[-0.035em] sm:text-[40px]">
          {viewingOther ? "Verified cross-chain activity" : "Your verified cross-chain activity"}
        </h1>
      </header>

      {/*
        The subject selector, and the reason it is on the home page at all.

        Standing is public and reading it is a view call, so gating the whole
        dashboard behind a wallet connection contradicted the one claim the
        protocol makes loudest. Every figure below reads whichever address is
        active, whether that came from a wallet or from this field.

        There is no second connect button here on purpose: the sidebar carries
        one permanently, and two controls with the same intent on one screen is
        a duplicate, not an affordance.
      */}
      <div className="mb-4">
        <Section
          title="Address"
          description={
            active
              ? undefined
              : "Reading standing never requires a signature. Paste any address, or connect a wallet."
          }
          action={
            active ? (
              <div className="flex items-center gap-3">
                <Mono value={active} chars={5} />
                <span className="text-[12px] text-[var(--vouch-text-faint)]">
                  {viewingOther ? "looked up" : "your wallet"}
                </span>
                {viewingOther ? (
                  <Button variant="ghost" onClick={() => setSubject(null)}>
                    Clear
                  </Button>
                ) : null}
              </div>
            ) : canConnect && !isConnected ? (
              <Button variant="secondary" onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting…" : "Use my wallet"}
              </Button>
            ) : null
          }
        >
          <div className="px-6 py-5">
            <AddressField id="dashboard-address" onSubmit={setSubject} />
          </div>
        </Section>
      </div>

      {/* Two columns sharing one grid: the artifact on the left, the two figures
          stacked to match its height. Below 1024px it collapses to a single
          column with the figures first, since on a phone the numbers are what
          you came for. */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Standing">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <CrossChainPipeline
            {...(newest
              ? {
                  fact: {
                    factType: factById(newest.factType)?.label ?? "Verified fact",
                    sourceChain: "Ethereum Sepolia",
                    txHash: newest.txHash,
                    blockNumber: String(newest.blockNumber),
                    factId: newest.factId,
                  },
                }
              : {})}
          />
        </div>

        <div className="order-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:order-2 lg:col-span-5 lg:grid-cols-1">
          <Figure
            label="Verified facts"
            value={loading ? "…" : active ? String(total) : "0"}
            hint={
              !active
                ? "Paste an address above, or connect a wallet. Reading standing is a public view call."
                : total > 0
                  ? `${TIER_NAMES[tier]} standing. The registry is append-only, so this rises and never falls.`
                  : "Nothing proven yet. That reads as unknown, never as clean."
            }
            href="/proofs"
            action="View proofs"
            {...(active && tier > 0 ? { verified: true } : {})}
          />

          <Figure
            label="Credit terms"
            value={loading ? "…" : `${COLLATERAL_BPS[active ? tier : 0] / 100}%`}
            hint={
              active && tier > 0
                ? `Collateral required, down from ${COLLATERAL_BPS[0] / 100}% unproven.`
                : `Baseline collateral. One proven repayment moves this to ${COLLATERAL_BPS[1] / 100}%.`
            }
            href="/credit"
            action="View terms"
          />
        </div>
      </section>

      <section className="mt-4" aria-labelledby="activity">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
            <h2 id="activity" className="text-[14px] text-[var(--vouch-text)]">
              Recent verified activity
            </h2>

            <Link
              href="/proofs"
              className="text-[12.5px] text-[var(--vouch-text-muted)] transition-colors duration-300 hover:text-[var(--vouch-text)]"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="p-6">
              <SkeletonRows rows={3} />
            </div>
          ) : rows.length === 0 ? (
            // A quiet line inside the same panel, not a large void. For this
            // protocol "nothing proven" is frequently the correct answer, and a
            // giant empty box makes an ordinary state look like a failure.
            <p className="max-w-[68ch] px-6 py-8 text-[13px] leading-relaxed text-[var(--vouch-text-muted)]">
              {active
                ? "Nothing has been proven for this address yet. That is not a judgement about it: Vouch can prove that something happened, never that it did not."
                : "Enter an address above, or connect a wallet, to see the facts proven for it."}
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {rows.slice(0, 6).map((fact) => {
                const definition = factById(fact.factType);
                return (
                  <li key={fact.factId}>
                    <Link
                      href={`/proofs?fact=${fact.factId}`}
                      className="focus-visible:outline-accent flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 transition-colors duration-300 hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] text-[var(--vouch-text)]">
                          {definition?.label ?? "Unknown fact"}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[var(--vouch-text-muted)]">
                          Ethereum Sepolia
                        </div>
                      </div>

                      <StatusBadge status="verified" />

                      <div className="hidden text-right sm:block">
                        <div className="font-mono text-[12px] tabular-nums text-[var(--vouch-text-muted)]">
                          Block {String(fact.blockNumber)}
                        </div>
                        <div className="mt-0.5">
                          <Mono value={fact.txHash} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>
    </>
  );
}

/**
 * One headline number with the sentence that makes it mean something.
 *
 * A percentage on its own invites the reader to guess whether it is good. The
 * hint says what it is down from, so the number carries its own comparison.
 */
function Figure({
  label,
  value,
  hint,
  href,
  action,
  verified,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  action: string;
  verified?: boolean;
}) {
  return (
    <Panel className="flex h-full flex-col p-6" interactive>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] text-[var(--vouch-text-muted)]">{label}</span>
        {verified ? <StatusBadge status="verified" /> : null}
      </div>

      <div className="mt-5 font-mono text-[40px] leading-none tracking-[-0.035em] tabular-nums text-[var(--vouch-text)]">
        {value}
      </div>

      <p className="mt-4 max-w-[44ch] flex-1 text-[12.5px] leading-relaxed text-[var(--vouch-text-muted)]">
        {hint}
      </p>

      <Link
        href={href}
        className="focus-visible:outline-accent group mt-6 inline-flex w-fit items-center gap-2 text-[12.5px] text-[var(--vouch-text-muted)] transition-colors duration-300 hover:text-[var(--vouch-text)] focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {action}
        <span className="flex size-5 items-center justify-center rounded-full bg-white/[0.06] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px">
          <ArrowUpRight size={11} weight="bold" />
        </span>
      </Link>
    </Panel>
  );
}
