"use client";

/**
 * Verify — the real user product flow.
 *
 * Enter any Ethereum-Sepolia address. The server scans the last ~200k blocks
 * for one of the borrower's Aave V3 repayments that has NOT already been
 * recorded on Vouch, obtains a real Attestcoin inclusion proof for it, and
 * returns the unsigned arguments for `submitBatch`. The wallet then signs.
 *
 * There is no relayer, no queue, no operator. The submission is permissionless
 * and the subject is read from the proven log, so anybody watching can run this
 * against any address and get the same on-chain result.
 *
 * If the address has no unproven qualifying activity, the page says so with the
 * range that was scanned. It does not fake success, and it does not silently
 * retry.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { Check, DataField, Eyebrow } from "@/components/dashboard/console";
import { Button } from "@/components/dashboard/primitives";
import { Connect } from "@/components/vouch/connect";
import { ConsumerReads } from "@/components/vouch/consumer-reads";
import { useLiveDemo, type DemoStep } from "@/hooks/useLiveDemo";
import { useWallet } from "@/hooks/useWallet";
import { explorerUrl, sourceExplorerUrl } from "@/lib/contracts";

const CREDITCOIN_CHAIN_ID = 102_031;

function isValidAddress(v: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(v.trim());
}

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

function VerifyPageInner() {
  const demo = useLiveDemo();
  const { address: walletAddress } = useWallet();
  const params = useSearchParams();
  const urlSubject = params.get("subject");
  const [subjectInput, setSubjectInput] = useState("");
  useEffect(() => {
    if (urlSubject && isValidAddress(urlSubject)) {
      setSubjectInput(urlSubject.toLowerCase());
    }
  }, [urlSubject]);

  const trimmed = subjectInput.trim();
  const inputValid = trimmed === "" || isValidAddress(trimmed);
  const submissionSubject = trimmed === "" ? undefined : trimmed;

  const moved =
    demo.before !== null &&
    demo.after !== null &&
    demo.after.proofCount > demo.before.proofCount;

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 border-b border-[var(--vouch-border)] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--vouch-primary)]"
            />
            <Eyebrow tone="accent">Verify</Eyebrow>
          </div>
          <h1 className="mt-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.03em]">
            Prove standing for any address
          </h1>
          <p className="mt-2 max-w-[72ch] text-[13.5px] leading-[1.6] text-[var(--vouch-text-muted)]">
            Paste a Sepolia address. The server scans its Aave V3 repayment
            history, obtains a real Attestcoin inclusion proof for one that has
            not been recorded yet, and hands the unsigned <code>submitBatch</code>{" "}
            arguments to your wallet. Your wallet signs; the registry verifies
            on chain; every consumer reads the result. Nothing here is simulated.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Connect requiredChainId={CREDITCOIN_CHAIN_ID} requiredChainName="Creditcoin CC3" />
        </div>
      </header>

      <section className="mb-4 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
        <Eyebrow tone="accent">Subject</Eyebrow>
        <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
          The address whose history you want to prove
        </h2>
        <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
          The subject is read from the proven event log, never from{" "}
          <code>msg.sender</code>. That is why submission is permissionless:
          your wallet pays gas, but the standing that gets written is the
          borrower&apos;s, not yours. Leave blank to prove any unclaimed
          repayment on Sepolia.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            aria-label="Subject address"
            className="w-full flex-1 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2 font-mono text-[12.5px] text-[var(--vouch-text)] placeholder:text-[var(--vouch-text-faint)] focus:border-[var(--vouch-border-strong)] focus:outline-none"
            onChange={(e) => setSubjectInput(e.target.value)}
            placeholder={walletAddress ?? "0x… (any Ethereum address)"}
            spellCheck={false}
            value={subjectInput}
          />
          <div className="flex gap-2">
            {walletAddress ? (
              <Button
                onClick={() => setSubjectInput(walletAddress)}
                variant="ghost"
              >
                Use my wallet
              </Button>
            ) : null}
            <Button
              disabled={demo.running || !demo.isConnected || !inputValid}
              onClick={() => void demo.run(submissionSubject)}
            >
              {demo.running
                ? "Running…"
                : submissionSubject
                  ? "Verify this address"
                  : "Prove any repayment"}
            </Button>
            {demo.creditcoinTx || demo.error ? (
              <Button onClick={demo.reset} variant="ghost">
                Reset
              </Button>
            ) : null}
          </div>
        </div>

        {!inputValid ? (
          <p className="mt-2 text-[12px] text-[var(--vouch-danger)]">
            That does not look like a valid 20-byte address.
          </p>
        ) : null}
        {!demo.isConnected ? (
          <p className="mt-2 text-[12px] text-[var(--vouch-text-faint)]">
            A wallet is only needed to sign the Creditcoin submission — every
            read on this site works without one.
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Sequence</Eyebrow>
          <div className="mt-3 overflow-hidden rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)]">
            {demo.steps.map((step, i) => (
              <StepRow index={i} key={step.key} step={step} />
            ))}
          </div>

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
                Proves the transaction sits in a confirmed source-chain block —
                nothing about whether it succeeded or which contract emitted its
                logs. The registry checks the rest.
              </p>
            </div>
          ) : null}

          {demo.creditcoinTx ? (
            <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
              <Eyebrow tone="accent">Vouch validation</Eyebrow>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
                Every check below runs inside <code>submitBatch</code> as a
                revert. A confirmed submission is the evidence that all of them
                passed.
              </p>
              <div className="mt-3 space-y-2">
                <Check>Inclusion proof verified by the Block Prover precompile</Check>
                <Check>S1 — receipt status is 1, so the transaction actually succeeded</Check>
                <Check>S2 — the log came from the pinned Aave V3 pool, not just a matching topic0</Check>
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
            None of these re-verifies anything, pays proof gas, or registered
            with the registry. Each is a view call against the same storage slot.
          </p>
          <div className="mt-4">
            <ConsumerReads subject={demo.source.subject} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              className="text-[11.5px] font-semibold text-[var(--vouch-primary)] hover:underline"
              href={`/credit?address=${demo.source.subject}`}
            >
              Run underwriting on this address →
            </Link>
            <Link
              className="text-[11.5px] font-semibold text-[var(--vouch-primary)] hover:underline"
              href={`/proofs?address=${demo.source.subject}`}
            >
              See the full verification trace →
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}

const VerifyPage = (): ReactNode => (
  <Suspense fallback={null}>
    <VerifyPageInner />
  </Suspense>
);

export default VerifyPage;
