"use client";

import { useState } from "react";

import { Check, Eyebrow, TermsShift } from "@/components/dashboard/console";
import { AddressField, Section } from "@/components/dashboard/data";
import { SkeletonRows } from "@/components/dashboard/primitives";
import { ProvenAddressHint } from "@/components/vouch/consumer-reads";
import { useConsumers } from "@/hooks/useConsumers";
import { useWallet } from "@/hooks/useWallet";

/**
 * Credit decisions and standing rules.
 *
 * Two halves. The top is what the deployed consumers answer right now for a
 * given address -- live calls, no interpretation. The bottom is the rule each
 * consumer applies, stated as the constants actually compiled into it.
 *
 * The rules are transcribed from the contracts rather than described, because a
 * lending policy paraphrased on a marketing page and a lending policy in
 * bytecode diverge the first time somebody edits one. Every threshold below has
 * a named constant in `src/consumers/`.
 */

const RULES = [
  {
    contract: "VouchCredit",
    domain: "Lending market",
    reads: "AAVE_REPAYMENT count, via VouchPassport tier",
    rows: [
      ["Unproven", "150%", "COLLATERAL_BASELINE_BPS"],
      ["Tier 1 — 1 repayment", "130%", "COLLATERAL_BRONZE_BPS"],
      ["Tier 2 — 5 repayments", "115%", "COLLATERAL_SILVER_BPS"],
      ["Tier 3 — 12 repayments", "100%", "COLLATERAL_GOLD_BPS"],
    ],
    floor:
      "Floors at 100%. Standing reduces collateral and never eliminates it, because the absence of a liquidation cannot be proven.",
  },
  {
    contract: "VouchReceivablesFacility",
    domain: "Invoice financing / RWA",
    reads: "AAVE_REPAYMENT count, via VouchPassport tier",
    rows: [
      ["Unproven", "70%", "ADVANCE_UNPROVEN_BPS"],
      ["Tier 1", "80%", "ADVANCE_BRONZE_BPS"],
      ["Tier 2", "85%", "ADVANCE_SILVER_BPS"],
      ["Tier 3", "90%", "ADVANCE_GOLD_BPS"],
    ],
    floor:
      "Caps at 90%. A retention always remains, and an unproven supplier is still financeable at a wider haircut rather than refused.",
  },
  {
    contract: "VouchFeeTier",
    domain: "Exchange",
    reads: "LONG_TERM_LP count — a different fact type",
    rows: [
      ["No supply proven", "0.30%", "FEE_STANDARD_BPS"],
      ["1+ supplies", "0.20%", "FEE_PROVEN_BPS"],
      ["5+ supplies", "0.10%", "FEE_DEEP_BPS"],
    ],
    floor:
      "Counts events rather than value, so one large deposit cannot buy the deepest tier. A proven repayment cannot move this at all.",
  },
] as const;

export default function CreditPage() {
  const { address } = useWallet();
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject ?? address ?? null;

  const consumers = useConsumers(active ?? undefined);
  const reads = consumers.data ?? [];
  const readOf = (key: string) => reads.find((r) => r.key === key);

  return (
    <>
      <header className="mb-8">
        <Eyebrow tone="accent">Underwriting</Eyebrow>
        <h1 className="mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em]">
          Credit decisions & standing rules
        </h1>
        <p className="mt-3 max-w-[70ch] text-[14px] leading-[1.6] text-[var(--vouch-text-muted)]">
          What each deployed consumer answers for an address, and the rule it applies. Every
          threshold below is a named constant in the contract, not a policy described in prose.
        </p>
      </header>

      <section className="mb-8">
        <Section
          description={
            active ? undefined : "Paste an address to read every consumer decision at once."
          }
          title="Live decisions"
        >
          <div className="space-y-4 px-6 py-5">
            <AddressField id="credit-address" onSubmit={setSubject} />
            {active ? null : <ProvenAddressHint onUse={setSubject} />}

            {consumers.isLoading ? <SkeletonRows rows={3} /> : null}

            {active && !consumers.isLoading ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <TermsShift
                  baseline="150%"
                  baselineLabel="Collateral, unproven"
                  moved={Boolean(readOf("credit")?.moved)}
                  note={readOf("credit")?.moved ? "relief applied" : "no repayment proven"}
                  proven={readOf("credit")?.value ?? null}
                  provenLabel="VouchCredit"
                />
                <TermsShift
                  baseline="70%"
                  baselineLabel="Advance, unproven"
                  moved={Boolean(readOf("receivables")?.moved)}
                  note={
                    readOf("receivables")?.moved ? "facility widened" : "unknown counterparty"
                  }
                  proven={readOf("receivables")?.value ?? null}
                  provenLabel="VouchReceivablesFacility"
                />
                <TermsShift
                  baseline="0.30%"
                  baselineLabel="Taker fee, unproven"
                  moved={Boolean(readOf("feeTier")?.moved)}
                  note={
                    readOf("feeTier")?.moved
                      ? "reduced by supply history"
                      : "unchanged — reads a different fact type"
                  }
                  proven={readOf("feeTier")?.value ?? null}
                  provenLabel="VouchFeeTier"
                />
                <TermsShift
                  baseline="closed"
                  baselineLabel="Gate, unproven"
                  moved={Boolean(readOf("access")?.moved)}
                  note={readOf("access")?.moved ? "open, permanently" : "not admitted"}
                  proven={readOf("access")?.value ?? null}
                  provenLabel="VouchAccess"
                />
              </div>
            ) : null}
          </div>
        </Section>
      </section>

      <section className="mb-8">
        <div className="mb-4">
          <Eyebrow tone="accent">Standing rules</Eyebrow>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
            The rule each consumer applies
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {RULES.map((rule) => (
            <div
              className="flex flex-col rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5"
              key={rule.contract}
            >
              <div className="mb-3">
                <h3 className="text-[15px] font-semibold">{rule.contract}</h3>
                <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.08em] text-[var(--vouch-text-faint)] uppercase">
                  {rule.domain}
                </p>
              </div>

              <p className="mb-3 text-[12px] text-[var(--vouch-text-muted)]">
                Reads: <span className="font-mono">{rule.reads}</span>
              </p>

              <div className="overflow-hidden rounded-[var(--vouch-radius)] border border-[var(--vouch-border)]">
                {rule.rows.map(([label, value, constant], i) => (
                  <div
                    className={`flex items-center justify-between gap-3 px-3 py-2 ${
                      i > 0 ? "border-t border-[var(--vouch-border)]" : ""
                    }`}
                    key={constant}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-[var(--vouch-text)]">{label}</p>
                      <p className="truncate font-mono text-[10px] text-[var(--vouch-text-faint)]">
                        {constant}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[13px] font-semibold text-[var(--vouch-primary)] tabular-nums">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[12px] leading-[1.55] text-[var(--vouch-text-faint)]">
                {rule.floor}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
        <Eyebrow tone="accent">Epistemology</Eyebrow>
        <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
          What an underwriter may and may not conclude
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Check>
            May conclude: this address repaid on Aave, at this block, in this transaction
          </Check>
          <Check passed={false}>
            May not conclude: this address was never liquidated anywhere
          </Check>
          <Check>May conclude: standing here can rise and can never fall</Check>
          <Check passed={false}>
            May not conclude: a low tier is evidence of bad behaviour
          </Check>
        </div>
        <p className="mt-4 max-w-[80ch] text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
          Inclusion proofs prove positive facts only. Absence of an event is not enumerable, so an
          unproven address is <strong>unknown</strong>, never clean. A consumer that reads a low
          tier as a negative signal has made a claim the registry never made.
        </p>
      </section>
    </>
  );
}
