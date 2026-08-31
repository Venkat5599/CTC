"use client";

import Link from "next/link";

import {
  Button,
  EmptyState,
  Mono,
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
 * to have other pages -- the opposite of the argument. Passport is one consumer
 * of the registry, reachable from the standing figure itself, which is where
 * somebody actually wants it: read the tier, then ask what produced it.
 *
 * Two numbers, then the pipeline that produced them. A number without its
 * evidence is a score, and a score is what this protocol refuses to be, so the
 * verification path is the centrepiece rather than a diagram filed under docs.
 *
 * No back control here: this is the root, and every destination is one click
 * away in the rail.
 */

const TIER_NAMES = ["Unproven", "Tier 1", "Tier 2", "Tier 3"] as const;

// Mirrors VouchCredit. Shown as terms, not as a promise.
const COLLATERAL_BPS = [15_000, 13_000, 11_500, 10_000] as const;

export default function DashboardPage() {
  const { address, isConnected, isConnecting, canConnect, connect } = useWallet();
  const passport = usePassport(address);
  const facts = useFacts(address);

  const tier = passport.data?.tier ?? 0;
  const total = passport.data?.totalProofs ?? 0;
  const loading = passport.isLoading || facts.isLoading;
  const newest = facts.data?.[0];

  return (
    <>
      <header className="mb-10">
        <SectionLabel>Dashboard</SectionLabel>
        <h1 className="mt-2 text-[28px] leading-[1.12] font-medium tracking-[-0.03em] sm:text-[32px]">
          Your verified cross-chain activity
        </h1>
      </header>

      {!isConnected ? (
        <>
          <EmptyState
            title="Connect a wallet to see your standing"
            description="Reading standing is a public view call, so Vouch never asks you to sign. Connecting only tells this page which address to read."
            action={
              canConnect ? (
                <Button onClick={connect} disabled={isConnecting}>
                  {isConnecting ? "Connecting…" : "Connect wallet"}
                </Button>
              ) : (
                <Button href="/proofs" variant="secondary">
                  Browse the registry instead
                </Button>
              )
            }
          />

          {/* Shown before connecting too. The path a fact travels is the
              product, and it does not depend on whose address is loaded. */}
          <div className="mt-14">
            <CrossChainPipeline />
          </div>
        </>
      ) : (
        <>
          <section className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Standing">
            <SummaryCard
              label="Verified facts"
              value={loading ? "—" : String(total)}
              hint={
                total > 0
                  ? `${TIER_NAMES[tier]} standing. Rises, never falls.`
                  : "Nothing proven yet. Unknown, not clean."
              }
              href="/proofs"
              action="View proofs"
              {...(tier > 0 ? { verified: true } : {})}
            />

            <SummaryCard
              label="Credit terms"
              value={loading ? "—" : `${COLLATERAL_BPS[tier] / 100}%`}
              hint={
                tier > 0
                  ? `Collateral required, down from ${COLLATERAL_BPS[0] / 100}% unproven.`
                  : `Baseline collateral. Proving one fact moves this to ${COLLATERAL_BPS[1] / 100}%.`
              }
              href="/credit"
              action="View terms"
            />
          </section>

          <div className="mb-14">
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

          <section aria-labelledby="activity">
            <div className="mb-4 flex items-end justify-between gap-4">
              <SectionLabel className="mb-0">
                <span id="activity">Recent verified activity</span>
              </SectionLabel>
              <Link
                href="/proofs"
                className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <SkeletonRows rows={3} />
            ) : !facts.data || facts.data.length === 0 ? (
              <EmptyState
                title="No verified facts yet"
                description="Nothing has been proven for this address. That is not a judgement about it: Vouch can only prove that something happened, never that it did not."
                action={
                  <Button href="/verify" variant="secondary">
                    See the verification pipeline
                  </Button>
                }
              />
            ) : (
              <ul className="divide-border border-border divide-y rounded-xl border">
                {facts.data.slice(0, 8).map((fact) => {
                  const definition = factById(fact.factType);
                  return (
                    <li key={fact.factId}>
                      <Link
                        href={`/proofs?fact=${fact.factId}`}
                        className="hover:bg-muted/40 focus-visible:outline-accent flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground text-[14px]">
                            {definition?.label ?? "Unknown fact"}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-[12px]">
                            Ethereum Sepolia
                          </div>
                        </div>

                        <StatusBadge status="verified" />

                        <div className="hidden text-right sm:block">
                          <div className="text-muted-foreground font-mono text-[12px] tabular-nums">
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
          </section>
        </>
      )}
    </>
  );
}

/**
 * One headline number with the sentence that makes it mean something.
 *
 * A percentage on its own invites the reader to guess whether it is good. The
 * hint says what it is down from, so the number carries its own comparison.
 */
function SummaryCard({
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
    <div className="border-border flex flex-col rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted-foreground text-[12px]">{label}</span>
        {verified ? <StatusBadge status="verified" /> : null}
      </div>

      <div className="text-foreground mt-4 font-mono text-[32px] leading-none tracking-tight tabular-nums">
        {value}
      </div>

      <p className="text-muted-foreground mt-3 max-w-[42ch] text-[12px] leading-relaxed">{hint}</p>

      <Link
        href={href}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-accent mt-6 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {action} →
      </Link>
    </div>
  );
}
