"use client";

import Link from "next/link";

import {
  Button,
  EmptyState,
  Mono,
  SectionLabel,
  SkeletonRows,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/primitives";
import { useFacts } from "@/hooks/useFacts";
import { usePassport } from "@/hooks/usePassport";
import { useWallet } from "@/hooks/useWallet";
import { factById } from "@vouch/schemas";

/**
 * Dashboard home.
 *
 * The hub. Standing at a glance, then the facts that produced it, because a
 * number without its evidence is a score and a score is what this protocol
 * refuses to be.
 *
 * Everything here reads the deployed registry. Where there is nothing to show
 * it says so plainly rather than rendering zeroes: an empty registry and a
 * disconnected wallet are different conditions, and only one of them means
 * anything.
 */

const TIER_NAMES = ["Unproven", "Tier 1", "Tier 2", "Tier 3"] as const;

// Collateral bands, mirroring VouchCredit. Shown as a line, not a promise.
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
      <header className="mb-12">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Vouch
        </div>

        <h1 className="mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[40px]">
          Your history.
          <br />
          Verified.
        </h1>

        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
          Cryptographically verified facts from other chains, made reusable
          across Creditcoin.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button href="/passport">View Passport</Button>
          <Button href="/proofs" variant="secondary">
            Explore Proofs
          </Button>
        </div>
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
              <Button href="/passport" variant="secondary">
                Look up an address instead
              </Button>
            )
          }
        />
      ) : (
        <>
          <section className="mb-12" aria-labelledby="overview">
            <SectionLabel>
              <span id="overview">Overview</span>
            </SectionLabel>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Verified Facts"
                value={loading ? "—" : String(total)}
                hint={total > 0 ? "Proven on chain" : "Nothing proven yet"}
                {...(total > 0 ? { status: "verified" as const } : {})}
              />
              <StatCard
                label="Standing Tier"
                value={loading ? "—" : TIER_NAMES[tier]}
                hint={tier > 0 ? "Rises, never falls" : "Unknown, not clean"}
                {...(tier > 0 ? { status: "verified" as const } : { status: "unknown" as const })}
              />
              <StatCard
                label="Collateral"
                value={loading ? "—" : `${COLLATERAL_BPS[tier] / 100}%`}
                hint={tier > 0 ? `Down from ${COLLATERAL_BPS[0] / 100}%` : "Baseline rate"}
              />
              <StatCard
                label="Applications"
                value="3"
                hint="Reading this registry"
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
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
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
              <ul className="divide-y divide-border rounded-xl border border-border">
                {facts.data.slice(0, 8).map((fact) => {
                  const definition = factById(fact.factType);
                  return (
                    <li key={fact.factId}>
                      <Link
                        href={`/proofs?fact=${fact.factId}`}
                        className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] text-foreground">
                            {definition?.label ?? "Unknown fact"}
                          </div>
                          <div className="mt-0.5 text-[12px] text-muted-foreground">
                            Ethereum Sepolia
                          </div>
                        </div>

                        <StatusBadge status="verified" />

                        <div className="hidden text-right sm:block">
                          <div className="font-mono text-[12px] text-muted-foreground">
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
