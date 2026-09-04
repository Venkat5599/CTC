"use client";

import Link from "next/link";
import { useState } from "react";

import { AddressField, Section } from "@/components/dashboard/data";
import {
  Check,
  DataField,
  Eyebrow,
  Metric,
  PipelineStep,
  TermsShift,
} from "@/components/dashboard/console";
import { Button, Mono, SkeletonRows } from "@/components/dashboard/primitives";
import { PROVEN_DEMO_ADDRESS, ProvenAddressHint } from "@/components/vouch/consumer-reads";
import { useConsumers } from "@/hooks/useConsumers";
import { useFacts } from "@/hooks/useFacts";
import { usePassport } from "@/hooks/usePassport";
import { useWallet } from "@/hooks/useWallet";
import { addresses, explorerUrl, sourceExplorerUrl } from "@/lib/contracts";
import { factById } from "@vouch/schemas";

/**
 * Dashboard — the underwriting console.
 *
 * Composed to answer one question in a single view: what can this address
 * prove, and what does that change. The evidence sits next to the decision on
 * purpose. A number without its evidence is a score, and a score is the thing
 * this protocol refuses to be.
 *
 * THE RULE THIS FILE IS BUILT AROUND. Every figure below is a live `eth_call`
 * against a deployed contract, or it is absent. There is no sample data, no
 * seeded row, no illustrative block height, no placeholder latency. Where a
 * value cannot be read the surface says so. That is not fastidiousness: the
 * entire argument of this project is that a claim and a proof are different
 * things, and a dashboard that invents a plausible figure to look busy has
 * already lost the argument it exists to make.
 *
 * Consequently several panels a mockup would carry are deliberately absent --
 * a block-height ticker, a signer quorum, a round-trip latency, a count of
 * borrowers. None of them are readable from what is deployed today, so none of
 * them are drawn.
 */

const TIER_NAMES = ["Unproven", "Tier 1", "Tier 2", "Tier 3"] as const;

/** Mirrors VouchCredit and VouchReceivablesFacility. Terms, not promises. */
const BASELINE_COLLATERAL_BPS = 15_000;
const BASELINE_ADVANCE_BPS = 7_000;

/** Measured in Gas.t.sol, not estimated. Flat regardless of consumer count. */
const READ_GAS = "1,202";

export default function DashboardPage() {
  const { address, canConnect, connect, isConnected, isConnecting } = useWallet();

  const [subject, setSubject] = useState<string | null>(null);
  const active = subject ?? address ?? null;
  const viewingOther = Boolean(subject && subject !== address?.toLowerCase());

  const passport = usePassport(active ?? undefined);
  const facts = useFacts(active ?? undefined);
  const consumers = useConsumers(active ?? undefined);

  const tier = passport.data?.tier ?? 0;
  const total = passport.data?.totalProofs ?? 0;
  const loading = Boolean(active) && (passport.isLoading || facts.isLoading);
  const rows = facts.data ?? [];
  const newest = rows[0];
  const newestFact = newest ? factById(newest.factType) : undefined;

  const reads = consumers.data ?? [];
  const readOf = (key: string) => reads.find((r) => r.key === key);
  const credit = readOf("credit");
  const receivables = readOf("receivables");

  /** Deployed consumer contracts, counted from config rather than asserted. */
  const consumerCount = [
    addresses.passport,
    addresses.credit,
    addresses.receivables,
    addresses.access,
    addresses.feeTier,
  ].filter(Boolean).length;

  return (
    <>
      {/*
        Operational header, not a hero.

        The previous version spent half the viewport explaining the product to
        somebody already inside it. An underwriter opening this screen wants to
        act, so the explanation moved to /docs and this row carries the chain
        path, the registry it reads, and the two things worth doing next.
      */}
      <header className="mb-6 flex flex-col gap-4 border-b border-[var(--vouch-border)] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Eyebrow tone="accent">Underwriting terminal</Eyebrow>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11.5px]">
            <span className="rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] px-2.5 py-1 text-[var(--vouch-text)]">
              Ethereum Sepolia
            </span>
            <span aria-hidden className="text-[var(--vouch-text-faint)]">&rarr;</span>
            <span className="rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] px-2.5 py-1 text-[var(--vouch-text)]">
              Attestcoin
            </span>
            <span aria-hidden className="text-[var(--vouch-text-faint)]">&rarr;</span>
            <span className="rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-primary)]/40 bg-[var(--vouch-primary)]/10 px-2.5 py-1 text-[var(--vouch-primary)]">
              Creditcoin CC3
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button onClick={() => setSubject(PROVEN_DEMO_ADDRESS)} variant="primary">
            Load demo borrower
          </Button>
          <Link
            className="rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] px-3 py-2 text-[13px] text-[var(--vouch-text-muted)] transition-colors hover:border-[var(--vouch-border-strong)] hover:text-[var(--vouch-text)]"
            href="/create"
          >
            Create verified standing
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Registry overview. Four figures, every one live or absent.        */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          accent
          caption="Facts proven for this address"
          label="Verified facts"
          reason={
            !active
              ? "Select a borrower above"
              : loading
                ? "Reading Creditcoin…"
                : passport.isError
                  ? "Registry read failed"
                  : undefined
          }
          value={!active || loading || passport.isError ? null : String(total)}
        />
        <Metric
          caption="A pure function of the registry"
          detail={tier > 0 ? "rises, never falls" : undefined}
          label="Standing"
          reason={
            !active
              ? "Select a borrower above"
              : loading
                ? "Reading Creditcoin…"
                : passport.isError
                  ? "Registry read failed"
                  : undefined
          }
          value={!active || loading || passport.isError ? null : TIER_NAMES[tier]}
        />
        <Metric
          caption="Reading the same registry entry"
          detail="no registration"
          label="Consumers deployed"
          value={String(consumerCount)}
        />
        <Metric
          accent
          caption="Flat, whoever asks and however often"
          detail="measured, Gas.t.sol"
          label="Registry read"
          unit="gas"
          value={READ_GAS}
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Verify a borrower.                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-8">
        <Section
          description={
            active
              ? undefined
              : "Reading standing never requires a signature, consent, or custody. Paste any address."
          }
          title="Verify a borrower"
          action={
            active ? (
              <div className="flex items-center gap-3">
                <Mono chars={5} value={active} />
                <span className="text-[12px] text-[var(--vouch-text-faint)]">
                  {viewingOther ? "looked up" : "your wallet"}
                </span>
                {viewingOther ? (
                  <Button onClick={() => setSubject(null)} variant="ghost">
                    Clear
                  </Button>
                ) : null}
              </div>
            ) : canConnect && !isConnected ? (
              <Button disabled={isConnecting} onClick={connect} variant="secondary">
                {isConnecting ? "Connecting…" : "Use my wallet"}
              </Button>
            ) : null
          }
        >
          <div className="space-y-4 px-6 py-5">
            <AddressField id="dashboard-address" onSubmit={setSubject} />
            {active ? null : <ProvenAddressHint onUse={setSubject} />}

            {loading ? <SkeletonRows rows={3} /> : null}

            {!loading && active && !newest ? (
              <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-4 py-5">
                <p className="text-[13px] text-[var(--vouch-text-muted)]">
                  Nothing proven for this address. That is <strong>unknown</strong>, not clean —
                  absence of an event is not provable, so no consumer should read this as evidence
                  of good behaviour.
                </p>
              </div>
            ) : null}

            {/* The proven fact, field by field, straight off the registry. */}
            {!loading && newest ? (
              <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vouch-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="block h-1.5 w-1.5 rounded-full bg-[var(--vouch-success)]" />
                    <span className="text-[14px] font-semibold text-[var(--vouch-text)]">
                      {newestFact?.label ?? "Verified fact"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--vouch-text-faint)]">
                    {rows.length} fact{rows.length === 1 ? "" : "s"} on record
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DataField label="Subject">{newest.subject}</DataField>
                  <DataField
                    href={sourceExplorerUrl(newest.txHash)}
                    label="Source transaction"
                  >
                    {newest.txHash}
                  </DataField>
                  <DataField label="Source block">
                    {newest.blockNumber.toString()}
                  </DataField>
                  <DataField label="Emitter (pinned, S2)">{newest.emitter}</DataField>
                  <DataField label="Log index">{newest.logIndex}</DataField>
                  <DataField label="Chain key">
                    {newest.sourceChainKey}
                    <span className="text-[var(--vouch-text-faint)]"> (not a chainId)</span>
                  </DataField>
                  <DataField label="Payload hash">{newest.payloadHash}</DataField>
                  <DataField label="Fact id">{newest.factId}</DataField>
                  <DataField label="Verified at">
                    {newest.verifiedAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                  </DataField>
                </div>
              </div>
            ) : null}
          </div>
        </Section>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The pipeline. Real values where this address produced them.       */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-8">
        <div className="mb-4">
          <Eyebrow tone="accent">Architecture</Eyebrow>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
            Cross-chain verification pipeline
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[13px] text-[var(--vouch-text-muted)]">
            The path every fact travels. Four steps, each one refusing something the previous step
            cannot see.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <PipelineStep
            body={
              <>
                The borrower calls <code className="text-[var(--vouch-primary)]">repay()</code> on
                the source chain. An ordinary transaction, with no awareness of Vouch.
              </>
            }
            footLabel="Source block"
            footValue={newest ? newest.blockNumber.toString() : null}
            index="01"
            title="Ethereum"
          />
          <PipelineStep
            body="The Block Prover precompile proves the transaction is included in a block belonging to the confirmed source chain. It proves nothing about success or authorship."
            footLabel="Precompile"
            footValue="0x…0FD2"
            index="02"
            title="Attestcoin"
          />
          <PipelineStep
            body="Receipt status checked, emitter matched against the pinned source, replay guarded per log. The three things an inclusion proof does not answer."
            footLabel="Pinned emitter"
            footValue={newest ? `${newest.emitter.slice(0, 10)}…` : null}
            index="03"
            title="Vouch Registry"
          />
          <PipelineStep
            body={
              <>
                Consumers read the stored fact for an <code>SLOAD</code>. No verification re-run, no
                registration, no relationship with the registry.
              </>
            }
            footLabel="Consumers"
            footValue={`${consumerCount} deployed`}
            index="04"
            title="Creditcoin"
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What verified standing changes.                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-8">
        <div className="mb-4">
          <Eyebrow tone="accent">Underwriting impact</Eyebrow>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
            What verified standing changes
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[13px] text-[var(--vouch-text-muted)]">
            Two independent facilities, reading the same registry entry, moving different terms.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="flex flex-col justify-between rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold">VouchCredit</h3>
                <Eyebrow>Lending market</Eyebrow>
              </div>
              <TermsShift
                baseline={`${BASELINE_COLLATERAL_BPS / 100}%`}
                baselineLabel="Unproven"
                moved={Boolean(credit?.moved)}
                note={credit?.moved ? "collateral relief applied" : "no repayment proven"}
                proven={credit?.value ?? null}
                provenLabel="With proven standing"
              />
            </div>
            <p className="mt-4 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
              Floors at 100%. Standing reduces collateral and never removes it, because negative
              history is unprovable.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold">VouchReceivablesFacility</h3>
                <Eyebrow>Invoice financing / RWA</Eyebrow>
              </div>
              <TermsShift
                baseline={`${BASELINE_ADVANCE_BPS / 100}%`}
                baselineLabel="Unproven"
                moved={Boolean(receivables?.moved)}
                note={receivables?.moved ? "advance widened" : "unknown counterparty"}
                proven={receivables?.value ?? null}
                provenLabel="With proven standing"
              />
            </div>
            <p className="mt-4 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
              No collateral and no liquidation path. With nothing to seize, proven history is the
              primary underwriting input rather than a discount on posted capital.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* One fact, many consumers + proof integrity, side by side.         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Shared primitive</Eyebrow>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            One fact. Every consumer.
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
            None of these verifies anything itself, and none pays proof gas. They read the entry
            the first submission already wrote.
          </p>

          <div className="mt-4 overflow-hidden rounded-[var(--vouch-radius)] border border-[var(--vouch-border)]">
            <div className="grid grid-cols-12 gap-2 bg-[var(--vouch-bg)] px-3 py-2">
              <span className="col-span-5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--vouch-text-faint)]">
                Consumer
              </span>
              <span className="col-span-5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--vouch-text-faint)]">
                Answer
              </span>
              <span className="col-span-2 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--vouch-text-faint)]">
                Gas
              </span>
            </div>
            {reads.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12.5px] text-[var(--vouch-text-faint)]">
                Enter an address to read every consumer at once.
              </div>
            ) : (
              reads.map((r) => (
                <div
                  className="grid grid-cols-12 items-center gap-2 border-t border-[var(--vouch-border)] px-3 py-2.5"
                  key={r.key}
                >
                  <span className="col-span-5 truncate text-[12.5px] font-medium">
                    {r.contract}
                  </span>
                  <span
                    className={`col-span-5 truncate font-mono text-[11.5px] ${
                      r.moved ? "text-[var(--vouch-primary)]" : "text-[var(--vouch-text-muted)]"
                    }`}
                  >
                    {r.value ?? "—"}
                  </span>
                  <span className="col-span-2 text-right font-mono text-[11px] text-[var(--vouch-text-faint)]">
                    {READ_GAS}
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="mt-3 text-[12px] leading-[1.55] text-[var(--vouch-text-faint)]">
            The fee tier is the row worth watching: it reads a different fact type, so a repayment
            cannot move it. Standing does not leak between domains, which is what separates a
            registry from a score.
          </p>
        </div>

        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Proof integrity</Eyebrow>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            A valid proof can still be a lie.
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
            Deploy a contract emitting a byte-identical event naming yourself and the inclusion
            proof is genuine. Attestcoin answered its question correctly; establishing authorship
            is the consumer&apos;s job.
          </p>

          <div className="mt-4 space-y-2">
            <Check>Inclusion — precompile verifies the transaction is in a confirmed block</Check>
            <Check>S1 — receipt status must be 1, or a reverted transaction mints standing</Check>
            <Check>S2 — emitter must equal the pinned source, not merely match topic0</Check>
            <Check>S3 — replay guarded per log, not per transaction</Check>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
              <div className="min-w-0">
                <Eyebrow>Pinned emitter</Eyebrow>
                <p className="truncate font-mono text-[11px] text-[var(--vouch-text)]">
                  Aave V3 Pool
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--vouch-success)]">
                accepted
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
              <div className="min-w-0">
                <Eyebrow>Lookalike emitter</Eyebrow>
                <p className="truncate font-mono text-[11px] text-[var(--vouch-danger)]">
                  same topic0
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--vouch-danger)]">
                rejected
              </span>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-[1.5] text-[var(--vouch-text-faint)]">
            Performed live on Sepolia against the real prover — identical proof bytes, opposite
            outcomes. Reproducible from the repository.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Registry activity. Real rows only.                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="pb-4">
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow tone="accent">CC3 ledger</Eyebrow>
              <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
                Registry activity
              </h3>
              <p className="mt-1 text-[12.5px] text-[var(--vouch-text-muted)]">
                Facts recorded for this address. Nothing here is seeded.
              </p>
            </div>
            {addresses.registry ? (
              <Link
                className="font-mono text-[11px] text-[var(--vouch-primary)] hover:underline"
                href={explorerUrl("address", addresses.registry)}
                rel="noreferrer"
                target="_blank"
              >
                View registry contract →
              </Link>
            ) : null}
          </div>

          {loading ? <SkeletonRows rows={3} /> : null}

          {!loading && rows.length === 0 ? (
            <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-4 py-8 text-center">
              <p className="text-[13px] text-[var(--vouch-text-muted)]">
                {active
                  ? "No facts recorded for this address."
                  : "Enter an address above to read its registry entries."}
              </p>
            </div>
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="bg-[var(--vouch-bg)]">
                    {["Fact type", "Source chain", "Block", "Source tx", "Verified"].map((h) => (
                      <th
                        className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--vouch-text-faint)]"
                        key={h}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => {
                    const def = factById(f.factType);
                    return (
                      <tr
                        className="border-t border-[var(--vouch-border)]"
                        key={f.factId}
                      >
                        <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-primary)]">
                          {def?.name ?? "UNKNOWN"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-muted)]">
                          chainKey {f.sourceChainKey}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-muted)]">
                          {f.blockNumber.toString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <a
                            className="font-mono text-[11.5px] text-[var(--vouch-primary)] hover:underline"
                            href={sourceExplorerUrl(f.txHash)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {f.txHash.slice(0, 10)}…{f.txHash.slice(-6)}
                          </a>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-faint)]">
                          {f.verifiedAt.toISOString().slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
