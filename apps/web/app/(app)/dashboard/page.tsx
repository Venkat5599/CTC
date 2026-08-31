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
import { useFacts } from "@/hooks/useFacts";
import { usePassport } from "@/hooks/usePassport";
import { useWallet } from "@/hooks/useWallet";
import { factById } from "@vouch/schemas";

/**
 * Dashboard.
 *
 * The overview of the protocol, not of any one module. An earlier version led
 * with a "View Passport" button, which framed Vouch as a credit passport that
 * happens to have other pages -- the opposite of the argument. Passport is one
 * consumer of the registry, and it is reachable from the Standing card, which
 * is where somebody actually wants it: you read your tier, then ask what
 * produced it.
 *
 * Four numbers, then the facts underneath them. A number without its evidence
 * is a score, and a score is what this protocol refuses to be.
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

  return (
    <>
      <header className="mb-12 max-w-[60ch]">
        <h1 className="text-[30px] leading-[1.12] font-medium tracking-[-0.03em] sm:text-[36px]">
          Your history. Verified.
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
          Cryptographically verified facts from other chains, made reusable
          across Creditcoin.
        </p>
      </header>

      {!isConnected ? (
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
      ) : (
        <>
          {/* Four numbers describing the protocol's state for this address.
              Each links to the module that owns it, which is how Passport is
              reachable without leading the navigation. */}
          <section className="mb-14" aria-labelledby="overview">
            <SectionLabel>
              <span id="overview">Overview</span>
            </SectionLabel>

            <div className="border-border grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCell
                label="Verified facts"
                value={loading ? "—" : String(total)}
                hint={total > 0 ? "Proven on chain" : "Nothing proven yet"}
                href="/proofs"
                action="View proofs"
              />
              <OverviewCell
                label="Standing"
                value={loading ? "—" : TIER_NAMES[tier]}
                hint={tier > 0 ? "Rises, never falls" : "Unknown, not clean"}
                href="/passport"
                action="View standing"
                {...(tier > 0 ? { verified: true } : {})}
              />
              <OverviewCell
                label="Credit"
                value={loading ? "—" : `${COLLATERAL_BPS[tier] / 100}%`}
                hint={tier > 0 ? `Down from ${COLLATERAL_BPS[0] / 100}%` : "Baseline collateral"}
                href="/credit"
                action="View terms"
              />
              <OverviewCell
                label="Applications"
                value="3"
                hint="Consuming this registry"
                href="/apps"
                action="View applications"
              />
            </div>
          </section>

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
 * One overview number.
 *
 * A cell in a single bordered grid rather than four floating cards -- gap-px on
 * a bordered container gives hairline dividers and one outer edge, which reads
 * as an instrument panel instead of a set of tiles.
 */
function OverviewCell({
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
    <div className="bg-background flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted-foreground text-[12px]">{label}</span>
        {verified ? <StatusBadge status="verified" /> : null}
      </div>

      <div className="text-foreground mt-3 font-mono text-[24px] leading-none tracking-tight tabular-nums">
        {value}
      </div>

      <div className="text-muted-foreground mt-2 text-[12px]">{hint}</div>

      <Link
        href={href}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-accent mt-5 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {action} →
      </Link>
    </div>
  );
}
