"use client";

import Link from "next/link";

import { Check, DataField, Eyebrow } from "@/components/dashboard/console";
import { Button } from "@/components/dashboard/primitives";
import { Connect } from "@/components/vouch/connect";
import { ConsumerReads } from "@/components/vouch/consumer-reads";
import { useLiveDemo, type DemoStep } from "@/hooks/useLiveDemo";
import { explorerUrl, sourceExplorerUrl } from "@/lib/contracts";

/**
 * The live demo.
 *
 *   Ethereum event -> Attestcoin proof -> Vouch verification -> Creditcoin
 *   state -> multiple contract reads
 *
 * Every step is a real network operation, in order, with its result shown as it
 * arrives. Nothing advances on a timer and nothing reports a success it did not
 * observe.
 *
 * The registry write is sent by the visitor's own wallet. `submitBatch` is
 * permissionless and the subject is read from the proven log rather than from
 * msg.sender, so submitting gains the submitter nothing and needs no trusted
 * operator. Anyone can run this flow and get the same answer, which is the
 * property the whole design rests on.
 */

const CREDITCOIN_CHAIN_ID = 102_031;

function StepRow({ step, index }: { step: DemoStep; index: number }) {
  const mark =
    step.state === "done"
      ? "✓"
      : step.state === "failed"
        ? "✕"
        : step.state === "running"
          ? "●"
          : "○";

  const tone =
    step.state === "done"
      ? "text-[var(--vouch-primary)]"
      : step.state === "failed"
        ? "text-[var(--vouch-danger)]"
        : step.state === "running"
          ? "text-[var(--vouch-text)]"
          : "text-[var(--vouch-text-faint)]";

  return (
    <div className="flex gap-3 border-t border-[var(--vouch-border)] px-4 py-3 first:border-t-0">
      <span
        aria-hidden
        className={`mt-px font-mono text-[13px] ${tone} ${step.state === "running" ? "animate-pulse" : ""}`}
      >
        {mark}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] ${step.state === "idle" ? "text-[var(--vouch-text-faint)]" : "text-[var(--vouch-text)]"}`}
        >
          <span className="mr-2 font-mono text-[11px] text-[var(--vouch-text-faint)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          {step.label}
        </p>
        {step.detail ? (
          <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--vouch-text-muted)]">
            {step.detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function LiveDemoPage() {
  const demo = useLiveDemo();

  const moved =
    demo.before !== null && demo.after !== null && demo.after.proofCount > demo.before.proofCount;

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 border-b border-[var(--vouch-border)] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--vouch-primary)]"
            />
            <Eyebrow tone="accent">Live</Eyebrow>
          </div>
          <h1 className="mt-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.03em]">
            Prove a real repayment, end to end
          </h1>
          <p className="mt-2 max-w-[72ch] text-[13.5px] leading-[1.6] text-[var(--vouch-text-muted)]">
            A genuine Aave repayment on Ethereum Sepolia — somebody else&apos;s, not ours — proven
            through the Attestcoin precompile, validated by the registry, and written to Creditcoin
            from your wallet.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Connect requiredChainId={CREDITCOIN_CHAIN_ID} requiredChainName="Creditcoin CC3" />
          <Button disabled={demo.running || !demo.isConnected} onClick={() => void demo.run()}>
            {demo.running ? "Running…" : "Run the demo"}
          </Button>
          {demo.creditcoinTx || demo.error ? (
            <Button onClick={demo.reset} variant="ghost">
              Reset
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Sequence</Eyebrow>
          <div className="mt-3 overflow-hidden rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)]">
            {demo.steps.map((step, i) => (
              <StepRow index={i} key={step.key} step={step} />
            ))}
          </div>

          {!demo.isConnected ? (
            <p className="mt-3 text-[12px] leading-[1.55] text-[var(--vouch-text-faint)]">
              A wallet is needed for step 04 only. Everything else on this site reads the registry
              without one, and always will — reading standing is a public view call.
            </p>
          ) : null}

          {demo.error ? (
            <p className="mt-3 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-danger)]/30 bg-[var(--vouch-danger)]/10 px-3 py-2 text-[12px] leading-[1.55] text-[var(--vouch-danger)]">
              {demo.error}
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          {demo.source ? (
            <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow tone="accent">Source event</Eyebrow>
                <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--vouch-text-faint)] uppercase">
                  {demo.source.chainName}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DataField href={sourceExplorerUrl(demo.source.txHash)} label="Transaction">
                  {demo.source.txHash}
                </DataField>
                <DataField label="Block">{demo.source.blockNumber ?? "unknown"}</DataField>
                <DataField label="Emitter">{demo.source.emitter}</DataField>
                <DataField label="Subject (from the log)">{demo.source.subject}</DataField>
                <DataField label="Receipt status">{demo.source.receiptStatus}</DataField>
                <DataField label="Log index">
                  {demo.source.receiptLogIndex}
                  <span className="text-[var(--vouch-text-faint)]">
                    {" "}
                    receipt-scoped, not block {demo.source.blockLogIndex}
                  </span>
                </DataField>
              </div>
            </div>
          ) : null}

          {demo.proof ? (
            <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
              <Eyebrow tone="accent">Attestcoin proof</Eyebrow>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DataField label="Header number">{demo.proof.headerNumber}</DataField>
                <DataField label="Continuity roots">{demo.proof.continuityRoots}</DataField>
                <DataField label="Encoded tx">{demo.proof.txBytesLength} chars</DataField>
              </div>
              <p className="mt-3 text-[12px] leading-[1.55] text-[var(--vouch-text-faint)]">
                This proves the transaction is in a block on the confirmed source chain. It proves
                nothing about whether the transaction succeeded, or which contract emitted the log
                inside it.
              </p>
            </div>
          ) : null}

          {demo.creditcoinTx ? (
            <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
              <Eyebrow tone="accent">Vouch validation</Eyebrow>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
                Every check below runs inside <code>submitBatch</code> as a revert. A confirmed
                submission is the evidence that all of them passed — there is no separate call to
                make, and no partial state to report.
              </p>
              <div className="mt-3 space-y-2">
                <Check>Inclusion proof verified by the Block Prover precompile</Check>
                <Check>S1 — receipt status is 1, so the transaction actually succeeded</Check>
                <Check>
                  S2 — the log came from the pinned emitter, not merely a matching topic0
                </Check>
                <Check>S3 — this log has not been recorded before</Check>
                <Check>Subject taken from the proven log, never from the submitter</Check>
              </div>
              <div className="mt-3">
                <DataField
                  href={explorerUrl("tx", demo.creditcoinTx)}
                  label="Creditcoin transaction"
                >
                  {demo.creditcoinTx}
                </DataField>
              </div>
            </div>
          ) : null}

          {demo.before && demo.after ? (
            <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
              <Eyebrow tone="accent">Registry state</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-4 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4">
                <div>
                  <Eyebrow>Before</Eyebrow>
                  <p className="mt-1.5 font-mono text-[18px] text-[var(--vouch-text-muted)]">
                    {demo.before.proofCount}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--vouch-text-faint)]">
                    {demo.before.hasProof ? "had standing" : "unknown, not clean"}
                  </p>
                </div>
                <div>
                  <Eyebrow tone={moved ? "accent" : "muted"}>After</Eyebrow>
                  <p
                    className={`mt-1.5 font-mono text-[18px] font-semibold ${moved ? "text-[var(--vouch-primary)]" : "text-[var(--vouch-text-muted)]"}`}
                  >
                    {demo.after.proofCount}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--vouch-text-faint)]">
                    {moved ? "fact recorded, permanently" : "unchanged"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {demo.source && demo.after ? (
        <section className="mt-3 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">One fact, every consumer</Eyebrow>
          <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            Independent contracts, reading the entry that was just written
          </h2>
          <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
            None of these re-verifies anything. None pays proof gas. None registered with the
            registry, and the registry does not know they exist — each is a view call against the
            same storage slot.
          </p>
          <div className="mt-4">
            <ConsumerReads subject={demo.source.subject} />
          </div>
        </section>
      ) : null}

      <section className="mt-3 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow tone="accent">Proof integrity</Eyebrow>
          <Link
            className="font-mono text-[11px] text-[var(--vouch-primary)] hover:underline"
            href="/proofs"
          >
            Full verification trace →
          </Link>
        </div>
        <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
          A valid proof can still be a lie
        </h2>
        <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
          Deploy a contract emitting a byte-identical <code>Repay</code> naming yourself. The
          transaction succeeds, topic0 matches exactly, and the proof verifies — because it is
          genuine. Only the pinned emitter separates that from the repayment proven above.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
            <div className="min-w-0">
              <Eyebrow>Pinned emitter</Eyebrow>
              <p className="truncate font-mono text-[11px] text-[var(--vouch-text)]">Aave V3 Pool</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.1em] text-[var(--vouch-primary)] uppercase">
              accepted
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2.5">
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
        <p className="mt-3 text-[11.5px] leading-[1.5] text-[var(--vouch-text-faint)]">
          Demonstrated in <code>test_forgery_sameBytesOppositeOutcomes</code> against a mocked
          precompile: one proof, fingerprinted, submitted to two contracts, opposite outcomes. The
          live Sepolia run has not been performed, and this line will say so until it has.
        </p>
      </section>
    </>
  );
}
