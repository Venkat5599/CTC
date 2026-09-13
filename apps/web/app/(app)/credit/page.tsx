"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { parseAbi } from "viem";
import { useQuery } from "@tanstack/react-query";

import { Check, DataField, Eyebrow, TermsShift } from "@/components/dashboard/console";
import { AddressField, Section } from "@/components/dashboard/data";
import { Button, SkeletonRows } from "@/components/dashboard/primitives";
import { ProvenAddressHint } from "@/components/vouch/consumer-reads";
import { useConsumers } from "@/hooks/useConsumers";
import { useWallet } from "@/hooks/useWallet";
import { addresses, explorerUrl } from "@/lib/contracts";
import { creditcoinClient } from "@/lib/viem";

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

const RECEIVABLES_ABI = parseAbi([
  "function advanceFor(address supplier, uint256 faceValue) view returns (uint256)",
  "function retentionFor(address supplier, uint256 faceValue) view returns (uint256)",
  "function fundedRail() view returns (bool)",
  "function liquidity() view returns (uint256)",
]);

/** A real underwriting quote from the deployed receivables facility. */
function useReceivablesQuote(subject: string | null, faceValueUsd: string) {
  const receivables = addresses.receivables;
  const faceValueNum = Number(faceValueUsd);
  const enabled =
    Boolean(subject) && Boolean(receivables) && faceValueNum > 0 && Number.isFinite(faceValueNum);

  // USD entered as human amount; contract math is in the settlement token's
  // smallest units. We keep 6 decimals (matches USDC on the funded rail).
  const faceUnits = enabled ? BigInt(Math.round(faceValueNum * 1_000_000)) : 0n;

  return useQuery({
    queryKey: ["receivables-quote", subject, faceUnits.toString()],
    enabled,
    staleTime: 15_000,
    queryFn: async () => {
      const [advance, retention, funded, liquidity] = await Promise.all([
        creditcoinClient.readContract({
          address: receivables!,
          abi: RECEIVABLES_ABI,
          functionName: "advanceFor",
          args: [subject as `0x${string}`, faceUnits],
        }),
        creditcoinClient.readContract({
          address: receivables!,
          abi: RECEIVABLES_ABI,
          functionName: "retentionFor",
          args: [subject as `0x${string}`, faceUnits],
        }),
        creditcoinClient.readContract({
          address: receivables!,
          abi: RECEIVABLES_ABI,
          functionName: "fundedRail",
        }),
        creditcoinClient.readContract({
          address: receivables!,
          abi: RECEIVABLES_ABI,
          functionName: "liquidity",
        }),
      ]);
      return {
        advanceUnits: advance as bigint,
        retentionUnits: retention as bigint,
        funded: funded as boolean,
        liquidityUnits: liquidity as bigint,
      };
    },
  });
}

function CreditPageInner() {
  const { address } = useWallet();
  const params = useSearchParams();
  const urlAddress = params.get("address");
  const [subject, setSubject] = useState<string | null>(null);
  useEffect(() => {
    if (urlAddress && /^0x[0-9a-fA-F]{40}$/.test(urlAddress)) {
      setSubject(urlAddress.toLowerCase());
    }
  }, [urlAddress]);
  const active = subject ?? address ?? null;

  const [faceValue, setFaceValue] = useState("10000");
  const quote = useReceivablesQuote(active, faceValue);

  const fmtUsd = (units?: bigint | null) => {
    if (units === undefined || units === null) return "—";
    return `$${(Number(units) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const advanceBps = useMemo(() => {
    if (!quote.data || Number(faceValue) <= 0) return null;
    const face = BigInt(Math.round(Number(faceValue) * 1_000_000));
    if (face === 0n) return null;
    return Number((quote.data.advanceUnits * 10_000n) / face);
  }, [quote.data, faceValue]);

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

      {active ? (
        <section className="mb-8 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Financing calculator</Eyebrow>
          <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">
            Underwrite an invoice, live, against the deployed facility
          </h2>
          <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
            Every number below is a direct <code>eth_call</code> to{" "}
            <code>VouchReceivablesFacility.advanceFor(supplier, faceValue)</code>{" "}
            and <code>retentionFor(...)</code>. Change the face value or the
            address and re-run the same math the contract runs. No policy is
            paraphrased here.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] tracking-[0.08em] text-[var(--vouch-text-faint)] uppercase">
                Invoice face value (USD)
              </span>
              <input
                aria-label="Face value in USD"
                className="w-full rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-3 py-2 font-mono text-[14px] tabular-nums text-[var(--vouch-text)] focus:border-[var(--vouch-border-strong)] focus:outline-none"
                inputMode="decimal"
                min={0}
                onChange={(e) => setFaceValue(e.target.value)}
                type="number"
                value={faceValue}
              />
            </label>
            <div className="flex gap-2">
              {["1000", "10000", "100000"].map((v) => (
                <Button
                  key={v}
                  onClick={() => setFaceValue(v)}
                  variant={faceValue === v ? "primary" : "ghost"}
                >
                  ${Number(v).toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {quote.isLoading ? <SkeletonRows rows={2} /> : null}

          {quote.data ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4">
                <Eyebrow>Advance to supplier</Eyebrow>
                <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-[var(--vouch-primary)]">
                  {fmtUsd(quote.data.advanceUnits)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[var(--vouch-text-faint)]">
                  {advanceBps === null
                    ? " "
                    : `${(advanceBps / 100).toFixed(2)}% of face — the exact number the drawdown function would pay out.`}
                </p>
              </div>
              <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4">
                <Eyebrow>Retention held</Eyebrow>
                <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-[var(--vouch-text-muted)]">
                  {fmtUsd(quote.data.retentionUnits)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[var(--vouch-text-faint)]">
                  Kept as loss cushion until settlement. Never zero: this
                  facility has no liquidation path.
                </p>
              </div>
              <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4">
                <Eyebrow>Settlement rail</Eyebrow>
                <p className="mt-1 text-[13.5px] font-semibold text-[var(--vouch-text)]">
                  {quote.data.funded ? "Funded (on-chain USDC)" : "Bookkeeping only"}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[var(--vouch-text-faint)]">
                  {quote.data.funded
                    ? `Pool liquidity: ${fmtUsd(quote.data.liquidityUnits)}. A drawdown would move tokens now.`
                    : "The advance rate is the underwriting decision. Cash movement is the financier's rail — off chain until a token pool is funded."}
                </p>
              </div>
            </div>
          ) : null}

          {quote.error ? (
            <p className="mt-3 rounded-[var(--vouch-radius-sm)] border border-[var(--vouch-danger)]/30 bg-[var(--vouch-danger)]/10 px-3 py-2 text-[12px] text-[var(--vouch-danger)]">
              The receivables facility rejected the read:{" "}
              {String(quote.error instanceof Error ? quote.error.message.split("\n")[0] : quote.error)}
            </p>
          ) : null}

          {addresses.receivables ? (
            <div className="mt-4">
              <DataField
                href={explorerUrl("address", addresses.receivables)}
                label="Contract"
              >
                {addresses.receivables}
              </DataField>
            </div>
          ) : null}
        </section>
      ) : null}

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

// useSearchParams requires a Suspense boundary at build time. A single frame
// placeholder is enough; nothing on this page is meaningful without the URL.
const CreditPage = (): ReactNode => (
  <Suspense fallback={null}>
    <CreditPageInner />
  </Suspense>
);

export default CreditPage;
