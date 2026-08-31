"use client";

import { useState } from "react";

import {
  AddressField,
  DataTable,
  Nothing,
  Section,
  type Column,
} from "@/components/dashboard/data";
import { Button, Mono, PageHeader, StatusBadge } from "@/components/dashboard/primitives";
import { FactList } from "@/components/proofs/fact-list";
import { NETWORK, addresses, explorerUrl } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";

/**
 * Registry explorer.
 *
 * Reads the registry directly for any address, and lists the contracts holding
 * it. There is deliberately no global "latest facts" feed: the registry emits
 * per subject, and a live firehose would need an indexer this deployment does
 * not run. Rather than fill the page with plausible rows, the explorer answers
 * exactly the question the chain can answer, and links out to Blockscout for
 * everything else.
 */

interface ContractRow {
  key: "registry" | "passport" | "credit" | "feeTier" | "access";
  label: string;
  role: string;
}

const CONTRACTS: ContractRow[] = [
  { key: "registry", label: "VouchRegistry", role: "Append-only store of verified facts" },
  { key: "passport", label: "VouchPassport", role: "Pure function of the registry" },
  { key: "credit", label: "VouchCredit", role: "Prices collateral from standing" },
  { key: "feeTier", label: "VouchFeeTier", role: "Reads a different fact type" },
  { key: "access", label: "VouchAccess", role: "Gates on a proven fact" },
];

const columns: Column<ContractRow>[] = [
  {
    key: "contract",
    header: "Contract",
    cell: (row) => (
      <div className="min-w-0">
        <div className="font-mono text-[13px] text-[var(--vouch-text)]">{row.label}</div>
        <div className="mt-0.5 text-[12px] text-[var(--vouch-text-muted)]">{row.role}</div>
      </div>
    ),
  },
  {
    key: "state",
    header: "State",
    width: "w-[120px]",
    cell: (row) => (
      <StatusBadge status={addresses[row.key] ? "verified" : "unknown"}>
        {addresses[row.key] ? "Deployed" : "Absent"}
      </StatusBadge>
    ),
  },
  {
    key: "address",
    header: "Address",
    align: "right",
    width: "w-[170px]",
    secondary: true,
    cell: (row) => {
      // `null` means not deployed, never a zero address. A zero address would
      // answer false to everything and look live.
      const deployed = addresses[row.key];
      return deployed ? (
        <a
          href={explorerUrl("address", deployed)}
          target="_blank"
          rel="noreferrer"
          className="transition-colors duration-300 hover:text-[var(--vouch-text)]"
        >
          <Mono value={deployed} chars={4} />
        </a>
      ) : (
        <span className="font-mono text-[12px] text-[var(--vouch-text-faint)]">Not deployed</span>
      );
    },
  },
];

export default function ExplorerPage() {
  const { address, isConnected, connect, canConnect, isConnecting } = useWallet();
  const [subject, setSubject] = useState<string | null>(null);

  const active = subject ?? address ?? null;

  return (
    <>
      <PageHeader
        label="Registry"
        title="Explorer"
        description={`Read the registry directly. Every answer on this page is a public view call against ${NETWORK}.`}
      />

      <div className="space-y-4">
        <Section
          title="Look up an address"
          action={
            !isConnected && canConnect ? (
              <Button onClick={connect} disabled={isConnecting} variant="secondary">
                {isConnecting ? "Connecting…" : "Use my wallet"}
              </Button>
            ) : null
          }
        >
          <div className="px-6 py-5">
            <AddressField id="explorer-address" onSubmit={setSubject} />
          </div>
        </Section>

        {active ? (
          <FactList address={active} />
        ) : (
          <Section title="No address selected">
            <div className="px-6 py-6">
              <Nothing>
                Paste an address above, or connect a wallet. There is no global activity feed here
                because the registry emits per subject and this deployment runs no indexer. Showing
                a plausible feed would mean inventing rows.
              </Nothing>
            </div>
          </Section>
        )}

        <Section
          title={`Deployed contracts on ${NETWORK}`}
          description="The registry and everything currently reading it."
        >
          <DataTable
            columns={columns}
            rows={CONTRACTS}
            rowKey={(row) => row.key}
            empty={<Nothing>Nothing is deployed on this network.</Nothing>}
          />
        </Section>
      </div>
    </>
  );
}
