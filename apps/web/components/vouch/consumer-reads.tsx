"use client";

import { DataTable, Nothing, Section, type Column } from "@/components/dashboard/data";
import { Mono, SkeletonRows, StatusBadge } from "@/components/dashboard/primitives";
import { useConsumers, type ConsumerRead } from "@/hooks/useConsumers";
import { explorerUrl } from "@/lib/contracts";

/**
 * Live consumer reads.
 *
 * The one screen that proves the thesis instead of describing it. Five deployed
 * contracts are asked about the same address at the same moment, and the answers
 * differ, because each reads what it cares about and nothing else.
 *
 * The most important row is the one that does NOT move. An address whose only
 * proof is a repayment gets cheaper credit and an open gate, and its exchange
 * fee stays exactly where it was, because the exchange reads a different fact
 * type. If standing leaked across fact types, this table would show it, which
 * is precisely why the table is worth having: it can fail in public.
 *
 * Every value is a live eth_call. Nothing here is derived in the browser, so
 * what is on screen is what the contract would answer an integrator.
 */

const columns: Column<ConsumerRead>[] = [
  {
    key: "contract",
    header: "Contract",
    cell: (row) => (
      <div className="min-w-0">
        {row.address ? (
          <a
            href={explorerUrl("address", row.address)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[13px] text-[var(--vouch-text)] transition-opacity duration-300 hover:opacity-70"
          >
            {row.contract}
          </a>
        ) : (
          <span className="font-mono text-[13px] text-[var(--vouch-text)]">{row.contract}</span>
        )}
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--vouch-text-faint)]">
          {row.call}
        </div>
      </div>
    ),
  },
  {
    key: "reads",
    header: "Reads",
    width: "w-[150px]",
    secondary: true,
    cell: (row) => (
      <span className="text-[12.5px] text-[var(--vouch-text-muted)]">{row.reads}</span>
    ),
  },
  {
    key: "value",
    header: "Returns",
    width: "w-[110px]",
    cell: (row) =>
      row.value === null ? (
        <span className="font-mono text-[12px] text-[var(--vouch-text-faint)]">not deployed</span>
      ) : (
        <span
          className="font-mono text-[14px] tabular-nums"
          // Accent marks a value that standing actually moved. A value sitting
          // at baseline is not a failure and must not be coloured like one.
          style={{ color: row.moved ? "var(--vouch-primary)" : "var(--vouch-text)" }}
        >
          {row.value}
        </span>
      ),
  },
  {
    key: "meaning",
    header: "What that means",
    secondary: true,
    cell: (row) => (
      <span className="block max-w-[46ch] text-[12.5px] leading-relaxed text-[var(--vouch-text-muted)]">
        {row.meaning}
      </span>
    ),
  },
];

export function ConsumerReads({ subject }: { subject?: string | null }) {
  const { data, isLoading, isError } = useConsumers(subject ?? undefined);

  const moved = data?.filter((row) => row.moved).length ?? 0;

  return (
    <Section
      title="What every application sees"
      description="Five deployed contracts, asked about this address at the same moment. Each value is a live call against CC3 Testnet."
      action={
        subject && data ? (
          <StatusBadge status={moved > 0 ? "verified" : "unknown"}>
            {moved > 0 ? `${moved} of ${data.length} moved` : "All at baseline"}
          </StatusBadge>
        ) : null
      }
    >
      {!subject ? (
        <div className="px-6 py-6">
          <Nothing>
            Enter an address above to ask every deployed consumer what it returns. None of them
            registered with Vouch, and none of them knows the others exist.
          </Nothing>
        </div>
      ) : isLoading ? (
        <div className="p-6">
          <SkeletonRows rows={5} height="h-12" />
        </div>
      ) : isError || !data ? (
        <div className="px-6 py-6">
          <Nothing>
            The chain did not answer. These are live calls against CC3 Testnet, so this usually
            means the RPC is unreachable rather than that the address has no standing.
          </Nothing>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(row) => row.key}
            empty={<Nothing>No consumers are deployed on this network.</Nothing>}
          />

          <p className="max-w-[76ch] border-t border-white/[0.06] px-6 py-5 text-[12.5px] leading-relaxed text-[var(--vouch-text-muted)]">
            The row worth watching is the one that stays put. An address whose only proof is a
            repayment gets cheaper credit and an open gate, while its exchange fee does not move,
            because the exchange reads a different fact type. Standing does not leak between facts,
            and this table would show it if it did.
          </p>
        </>
      )}
    </Section>
  );
}

/**
 * The address that carries the real end-to-end proof.
 *
 * A real Aave repayment on Ethereum Sepolia, proven through the Attestcoin
 * Block Prover precompile and written to the registry on Creditcoin. It is
 * offered as a starting point because an empty dashboard demonstrates nothing,
 * and inventing data to fill it would demonstrate less than nothing.
 */
export const PROVEN_DEMO_ADDRESS = "0x4c8EA5e41ed3dBe14a4cf0B79ACcb5e5D3Ab88F9";

export function ProvenAddressHint({ onUse }: { onUse: (address: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--vouch-text-faint)]">
      <span>Nothing to hand?</span>
      <button
        type="button"
        onClick={() => onUse(PROVEN_DEMO_ADDRESS.toLowerCase())}
        className="focus-visible:outline-accent underline decoration-white/20 underline-offset-4 transition-colors duration-300 hover:text-[var(--vouch-text)] focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Load an address with a real proven fact
      </button>
      <Mono value={PROVEN_DEMO_ADDRESS} chars={4} />
    </div>
  );
}
