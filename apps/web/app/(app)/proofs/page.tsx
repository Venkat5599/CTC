"use client";

import { useState } from "react";

import { Check, DataField, Eyebrow, PipelineStep } from "@/components/dashboard/console";
import { AddressField, Section } from "@/components/dashboard/data";
import { SkeletonRows } from "@/components/dashboard/primitives";
import { ProvenAddressHint } from "@/components/vouch/consumer-reads";
import { useFacts } from "@/hooks/useFacts";
import { useWallet } from "@/hooks/useWallet";
import { sourceExplorerUrl } from "@/lib/contracts";
import { factById } from "@vouch/schemas";

/**
 * Verification trace — what the registry checked, and what it refused to.
 *
 * The trace is the argument. An inclusion proof answers exactly one question,
 * and this page exists to show which of the remaining questions the registry
 * asked itself before believing anything.
 *
 * The checks below are rendered from the fact that was actually stored. A fact
 * exists in the registry only if every one of them passed, because each is a
 * revert and not a warning -- so a stored fact IS the evidence they passed.
 * That is why they are not toggles: there is no partial state to display.
 */

export default function ProofsPage() {
  const { address } = useWallet();
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject ?? address ?? null;

  const facts = useFacts(active ?? undefined);
  const rows = facts.data ?? [];
  const [selected, setSelected] = useState<number>(0);
  const fact = rows[selected] ?? rows[0];
  const def = fact ? factById(fact.factType) : undefined;

  return (
    <>
      <header className="mb-8">
        <Eyebrow tone="accent">Attestations</Eyebrow>
        <h1 className="mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em]">
          Verification trace
        </h1>
        <p className="mt-3 max-w-[72ch] text-[14px] leading-[1.6] text-[var(--vouch-text-muted)]">
          The Attestcoin precompile proves a transaction was included in a block on the confirmed
          source chain. It does not prove the transaction succeeded, and it does not prove which
          contract emitted the log inside it. This page shows what the registry asked next.
        </p>
      </header>

      <section className="mb-8">
        <Section
          description={active ? undefined : "Paste an address to trace what was proven about it."}
          title="Select a proven fact"
        >
          <div className="space-y-4 px-6 py-5">
            <AddressField id="proofs-address" onSubmit={setSubject} />
            {active ? null : <ProvenAddressHint onUse={setSubject} />}

            {facts.isLoading ? <SkeletonRows rows={2} /> : null}

            {active && !facts.isLoading && rows.length === 0 ? (
              <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-4 py-8 text-center">
                <p className="text-[13px] text-[var(--vouch-text-muted)]">
                  Nothing proven for this address, so there is no trace to show.
                </p>
              </div>
            ) : null}

            {rows.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {rows.map((f, i) => (
                  <button
                    className={`rounded-[var(--vouch-radius-sm)] border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                      i === selected
                        ? "border-[var(--vouch-primary)] bg-[var(--vouch-primary)]/10 text-[var(--vouch-primary)]"
                        : "border-[var(--vouch-border)] bg-[var(--vouch-bg)] text-[var(--vouch-text-muted)] hover:border-[var(--vouch-border-strong)]"
                    }`}
                    key={f.factId}
                    onClick={() => setSelected(i)}
                    type="button"
                  >
                    {factById(f.factType)?.name ?? "FACT"} · #{f.blockNumber.toString()}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Section>
      </section>

      {fact ? (
        <>
          {/* The attested event, field by field. */}
          <section className="mb-8 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vouch-border)] pb-3">
              <div>
                <Eyebrow>Attested event</Eyebrow>
                <h2 className="mt-1.5 text-[18px] font-semibold tracking-[-0.015em]">
                  {def?.label ?? "Verified fact"}
                </h2>
              </div>
              <span className="rounded-[var(--vouch-radius-sm)] bg-[var(--vouch-primary)]/10 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-[var(--vouch-primary)] uppercase">
                Verified standing
              </span>
            </div>

            {def ? (
              <p className="mb-4 max-w-[70ch] text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
                {def.meaning} Event signature{" "}
                <code className="font-mono text-[var(--vouch-text)]">{def.eventSignature}</code>,
                subject read from topic {def.subjectTopicIndex}.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DataField label="Subject">{fact.subject}</DataField>
              <DataField href={sourceExplorerUrl(fact.txHash)} label="Source transaction">
                {fact.txHash}
              </DataField>
              <DataField label="Source block">{fact.blockNumber.toString()}</DataField>
              <DataField label="Pinned emitter">{fact.emitter}</DataField>
              <DataField label="Log index (receipt-scoped)">{fact.logIndex}</DataField>
              <DataField label="Chain key">
                {fact.sourceChainKey}
                <span className="text-[var(--vouch-text-faint)]"> — not a chainId</span>
              </DataField>
              <DataField label="Payload hash">{fact.payloadHash}</DataField>
              <DataField label="Fact id">{fact.factId}</DataField>
              <DataField label="Recorded">
                {fact.verifiedAt.toISOString().replace("T", " ").slice(0, 19)} UTC
              </DataField>
            </div>
          </section>

          {/* The trace. */}
          <section className="mb-8">
            <div className="mb-4">
              <Eyebrow tone="accent">Trace</Eyebrow>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
                What was checked, in order
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PipelineStep
                body="Source registered and enabled, and the claim's chainKey matched the pinned one. A chainId passed here would prove a fact about a different chain, silently."
                footLabel="chainKey"
                footValue={String(fact.sourceChainKey)}
                index="01"
                title="Source pinned"
              />
              <PipelineStep
                body="Block Prover precompile verified the transaction is included in a block belonging to the confirmed source chain."
                footLabel="Precompile"
                footValue="0x…0FD2"
                index="02"
                title="Inclusion proven"
              />
              <PipelineStep
                body="Receipt decoded. Status must equal 1 — a reverted transaction is still in its block and still yields a valid proof."
                footLabel="Receipt status"
                footValue="1"
                index="03"
                title="S1 — status"
              />
              <PipelineStep
                body="Log at the named index must carry the pinned topic0 AND come from the pinned emitter. topic0 alone is what a lookalike contract can forge."
                footLabel="Emitter"
                footValue={`${fact.emitter.slice(0, 10)}…`}
                index="04"
                title="S2 — authorship"
              />
            </div>
          </section>
        </>
      ) : null}

      {/* The claim. Always shown -- it does not depend on an address. */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow tone="accent">Proof integrity</Eyebrow>
            <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[var(--vouch-warning)] uppercase">
              critical difference
            </span>
          </div>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            A valid proof can still be a lie
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
            Deploy a contract emitting a byte-identical <code>Repay</code> naming yourself. The
            transaction succeeds, topic0 matches exactly, and the Merkle and continuity proofs are
            genuine. A consumer matching on the event signature alone credits a fabricated
            repayment — and nothing reverts, warns, or fails a test.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
              <div className="min-w-0">
                <Eyebrow>Pinned emitter</Eyebrow>
                <p className="truncate font-mono text-[11px] text-[var(--vouch-text)]">
                  Aave V3 Pool
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.1em] text-[var(--vouch-primary)] uppercase">
                accepted
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
              <div className="min-w-0">
                <Eyebrow>Lookalike emitter</Eyebrow>
                <p className="truncate font-mono text-[11px] text-[var(--vouch-danger)]">
                  identical topic0
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.1em] text-[var(--vouch-danger)] uppercase">
                rejected
              </span>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-[1.5] text-[var(--vouch-text-faint)]">
            Performed live on 2026-09-05. A lookalike contract on Sepolia emitted a byte-identical
            <code>Repay</code>, the real Attestcoin prover proved it, and the identical bytes were
            accepted by a naive consumer and reverted by this registry. Not a simulation.
          </p>
        </div>

        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Guards</Eyebrow>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            The three checks an integration must not skip
          </h3>
          <div className="mt-4 space-y-2">
            <Check>
              S1 — receipt status must be 1. A reverted transaction is still in its block and still
              proves.
            </Check>
            <Check>
              S2 — emitter must equal the pinned source. topic0 is not chain-specific and not
              authorship.
            </Check>
            <Check>
              S3 — replay keyed per log, including factType. One transaction can carry several
              qualifying logs.
            </Check>
            <Check>
              Subject is read from the proven log, never from msg.sender. Submitting gains the
              submitter nothing.
            </Check>
          </div>
          <p className="mt-4 text-[12px] leading-[1.55] text-[var(--vouch-text-faint)]">
            Each is a revert, not a warning. A fact in the registry is itself the evidence that all
            four passed — which is why this page has no failure state to render.
          </p>
        </div>
      </section>
    </>
  );
}
