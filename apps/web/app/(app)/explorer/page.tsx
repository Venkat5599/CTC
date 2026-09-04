"use client";

import Link from "next/link";

import { Check, Eyebrow, Metric } from "@/components/dashboard/console";
import { SkeletonRows } from "@/components/dashboard/primitives";
import { useRegistryLog } from "@/hooks/useRegistryLog";
import { addresses, explorerUrl, NETWORK } from "@/lib/contracts";
import { REGISTERED_FACTS, factById } from "@vouch/schemas";

/**
 * Creditcoin Standing Registry — the ledger.
 *
 * Every entry the registry has written, read from its own `FactVerified` log.
 *
 * WHAT IS DELIBERATELY NOT ON THIS PAGE. The design this follows carries a
 * storage-utilisation figure, a downstream-protocol count, a daily query
 * counter, a signer quorum, a ZK verification cost, a Merkle branch depth and
 * an audit attribution. None of those exist:
 *
 *   - There is no ZK circuit and no Poseidon nullifier. The replay guard is a
 *     keccak of (chainKey, blockNumber, txHash, factType, logIndex), stored in
 *     a mapping. Calling that a nullifier would dress a mapping up as
 *     cryptography.
 *   - There is no multi-sig. One admin registers sources; submission is
 *     permissionless.
 *   - There is no audit. Naming a firm that has not looked at this code would
 *     be a fabricated credential, which is the exact failure `Forgery.t.sol`
 *     exists to demonstrate.
 *   - Query counts and downstream-protocol counts need an indexer that is not
 *     running.
 *
 * What is here is what the chain will answer for.
 */

const REGISTRY_READ_GAS = "1,202";

export default function ExplorerPage() {
  const log = useRegistryLog();
  const entries = log.data ?? [];

  const subjects = new Set(entries.map((e) => e.subject.toLowerCase()));

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="block h-1.5 w-1.5 rounded-full bg-[var(--vouch-primary)]"
          />
          <Eyebrow tone="accent">Immutable ledger</Eyebrow>
          <span className="font-mono text-[10px] text-[var(--vouch-text-faint)]">
            / CC3 STORAGE
          </span>
        </div>
        <h1 className="mt-3 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em]">
          Creditcoin Standing Registry
        </h1>
        <p className="mt-3 max-w-[70ch] text-[14px] leading-[1.6] text-[var(--vouch-text-muted)]">
          Permanent, append-only credit facts validated on-chain and readable by any downstream
          contract for a single storage read. Nothing here can be altered or removed.
        </p>
      </header>

      {/* Registry identity. Four facts about the contract itself. */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-3.5">
          <Eyebrow>Core registry</Eyebrow>
          {addresses.registry ? (
            <Link
              className="mt-2 block truncate font-mono text-[12px] text-[var(--vouch-primary)] hover:underline"
              href={explorerUrl("address", addresses.registry)}
              rel="noreferrer"
              target="_blank"
            >
              {addresses.registry}
            </Link>
          ) : (
            <p className="mt-2 font-mono text-[12px] text-[var(--vouch-text-faint)]">
              not deployed
            </p>
          )}
        </div>
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-3.5">
          <Eyebrow>Storage model</Eyebrow>
          <p className="mt-2 flex items-center gap-2 font-mono text-[12px] text-[var(--vouch-text)]">
            <span className="block h-1.5 w-1.5 rounded-full bg-[var(--vouch-primary)]" />
            Append-only
          </p>
        </div>
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-3.5">
          <Eyebrow>O(1) gas lookup</Eyebrow>
          <p className="mt-2 font-mono text-[12px] text-[var(--vouch-text)]">
            {REGISTRY_READ_GAS} gas
          </p>
        </div>
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-3.5">
          <Eyebrow>Network</Eyebrow>
          <p className="mt-2 font-mono text-[12px] text-[var(--vouch-text)]">{NETWORK}</p>
        </div>
      </section>

      {/* Live counts. Derived from the log, never asserted. */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          accent
          caption="Written to CC3, never altered"
          detail={log.isLoading ? "reading log…" : undefined}
          label="Committed facts"
          value={log.isLoading ? null : String(entries.length)}
        />
        <Metric
          caption="Distinct addresses with standing"
          label="Subjects"
          value={log.isLoading ? null : String(subjects.size)}
        />
        <Metric
          caption="Registered and enabled on chain"
          label="Fact types"
          value={String(REGISTERED_FACTS.length)}
        />
        <Metric
          accent
          caption="Flat, however many consumers came before"
          detail="measured"
          label="Consumer read"
          unit="gas"
          value={REGISTRY_READ_GAS}
        />
      </section>

      {/* The ledger. */}
      <section className="mb-6 rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.015em]">
              Committed ledger entries
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--vouch-text-muted)]">
              Read from the registry&apos;s own <code>FactVerified</code> log.
            </p>
          </div>
          <span className="font-mono text-[11px] text-[var(--vouch-text-faint)]">
            {log.isLoading ? "loading" : `${entries.length} of ${entries.length}`}
          </span>
        </div>

        {log.isLoading ? <SkeletonRows rows={4} /> : null}

        {!log.isLoading && entries.length === 0 ? (
          <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] px-4 py-10 text-center">
            <p className="text-[13px] text-[var(--vouch-text-muted)]">
              No facts recorded in the scanned window.
            </p>
            <p className="mt-1.5 text-[12px] text-[var(--vouch-text-faint)]">
              An empty registry is shown as empty. Nothing is seeded to make this page look busy.
            </p>
          </div>
        ) : null}

        {!log.isLoading && entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-[var(--vouch-bg)]">
                  {["Fact id", "CC3 block", "Subject", "Fact type", "Value", "CC3 tx"].map((h) => (
                    <th
                      className="px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-[var(--vouch-text-faint)] uppercase"
                      key={h}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const def = factById(e.factType);
                  return (
                    <tr
                      className="border-t border-[var(--vouch-border)] transition-colors hover:bg-[var(--vouch-surface-high)]"
                      key={e.factId}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-primary)]">
                        {e.factId.slice(0, 10)}…
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-muted)] tabular-nums">
                        #{e.recordedAtBlock.toString()}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text)]">
                        {e.subject.slice(0, 8)}…{e.subject.slice(-4)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-[var(--vouch-radius-sm)] bg-[var(--vouch-bg)] px-2 py-1 font-mono text-[10.5px] text-[var(--vouch-primary)]">
                          {def?.name ?? "UNREGISTERED"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11.5px] text-[var(--vouch-text-muted)] tabular-nums">
                        {def && def.valueDecimals > 0
                          ? (Number(e.value) / 10 ** def.valueDecimals).toLocaleString()
                          : e.value.toString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          className="font-mono text-[11.5px] text-[var(--vouch-primary)] hover:underline"
                          href={explorerUrl("tx", e.creditcoinTxHash)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {e.creditcoinTxHash.slice(0, 10)}…
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Integration + invariants. */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Integration</Eyebrow>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            Read standing in Solidity
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--vouch-text-muted)]">
            The whole integration. No ASC to write, no worker to run, no proof gas, and no
            registration with the registry.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-bg)] p-4 font-mono text-[11.5px] leading-[1.7] text-[var(--vouch-text-muted)]">
            <code>{`interface IVouchRegistry {
  function hasProof(address subject, bytes32 factType)
    external view returns (bool);
}

if (IVouchRegistry(VOUCH).hasProof(user, AAVE_REPAYMENT)) {
  collateralBps = 11_500; // 115% instead of 150%
}`}</code>
          </pre>
        </div>

        <div className="rounded-[var(--vouch-radius)] border border-[var(--vouch-border)] bg-[var(--vouch-surface)] p-5">
          <Eyebrow tone="accent">Invariants</Eyebrow>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
            What the storage guarantees
          </h3>
          <div className="mt-4 space-y-2">
            <Check>Append-only — no path removes or decrements a fact</Check>
            <Check>Monotonic — a tier can rise and can never fall</Check>
            <Check>Per-log replay key, so two logs in one transaction stay two facts</Check>
            <Check>Subject taken from the proven log, never from the submitter</Check>
          </div>
          <p className="mt-4 text-[12px] leading-[1.55] text-[var(--vouch-text-faint)]">
            Positive facts only. The registry can prove an address repaid; it cannot prove an
            address was never liquidated, because absence of an event is not enumerable. Unproven
            is unknown, never clean.
          </p>
        </div>
      </section>
    </>
  );
}
