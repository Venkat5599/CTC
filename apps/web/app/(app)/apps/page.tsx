"use client";

import { DataTable, Nothing, Section, Snippet, type Column } from "@/components/dashboard/data";
import { Button, Mono, PageHeader } from "@/components/dashboard/primitives";
import { addresses, explorerUrl } from "@/lib/contracts";

/**
 * Applications.
 *
 * The page carrying the whole competitive argument, so it shows the contracts
 * reading one registry and the grants that differ between them. The point is
 * not that three applications exist. It is that none of them knows the others
 * do, and none of them registered with anything.
 */

interface Consumer {
  key: "credit" | "feeTier" | "access";
  name: string;
  domain: string;
  reads: string;
  grants: string;
  note: string;
}

const CONSUMERS: Consumer[] = [
  {
    key: "credit",
    name: "VouchCredit",
    domain: "Lending",
    reads: "Repayment history",
    grants: "Collateral from 150% down to 100%",
    note: "Floors at 100%. Standing reduces collateral and never removes it, because negative history is unprovable.",
  },
  {
    key: "feeTier",
    name: "VouchFeeTier",
    domain: "Exchange",
    reads: "Supply history",
    grants: "Taker fee from 0.30% down to 0.10%",
    note: "Counts events rather than value, so a single large deposit cannot buy the deepest tier.",
  },
  {
    key: "access",
    name: "VouchAccess",
    domain: "Access control",
    reads: "Any registered fact",
    grants: "A gate that opens, permanently",
    note: "Configured by constructor argument. A fourth application is a deployment, not a new contract type.",
  },
];

const PROOF = `_submit(_repayClaim(ALICE, 5_000e6, 25_000_000, "thesis"));

assertEq(credit.collateralBpsFor(ALICE), 13_000);   // 130%
assertTrue(accessGate.isAdmitted(ALICE));           // gate open
assertEq(feeTier.feeBpsFor(ALICE), 30);             // unchanged`;

const columns: Column<Consumer>[] = [
  {
    key: "contract",
    header: "Contract",
    cell: (row) => (
      <div className="min-w-0">
        <div className="font-mono text-[13px] text-[var(--vouch-text)]">{row.name}</div>
        <div className="mt-0.5 text-[12px] text-[var(--vouch-text-muted)]">{row.domain}</div>
      </div>
    ),
  },
  {
    key: "reads",
    header: "Reads",
    width: "w-[180px]",
    cell: (row) => <span className="text-[13px]">{row.reads}</span>,
  },
  {
    key: "grants",
    header: "Grants",
    secondary: true,
    cell: (row) => (
      <div className="min-w-0">
        <div className="text-[13px]">{row.grants}</div>
        <div className="mt-0.5 max-w-[54ch] text-[12px] text-[var(--vouch-text-muted)]">
          {row.note}
        </div>
      </div>
    ),
  },
  {
    key: "address",
    header: "Deployed",
    align: "right",
    width: "w-[150px]",
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

export default function AppsPage() {
  return (
    <>
      <PageHeader
        label="Applications"
        title="Applications"
        description="Contracts reading one registry, each for its own purpose. None of them registered with Vouch, and none of them knows the others exist."
      />

      <div className="space-y-4">
        <Section
          title="Deployed consumers"
          description="Every one of these reads the same facts through the same view call."
        >
          <DataTable
            columns={columns}
            rows={CONSUMERS}
            rowKey={(row) => row.key}
            empty={<Nothing>No consumers are deployed on this network.</Nothing>}
          />
        </Section>

        <Section
          title="One fact, three unrelated grants"
          description="Asserted by a test rather than claimed by a README. One proven repayment lowers collateral, opens the access gate, and leaves the exchange fee untouched, because the exchange reads a different fact type entirely."
        >
          <Snippet code={PROOF} caption="test_oneFactThreeUnrelatedConsumers, in Consumers.t.sol" />
        </Section>

        <Section
          title="Building a fourth"
          action={
            <Button href="/developers" variant="secondary">
              Integration guide
            </Button>
          }
        >
          <div className="px-6 py-6">
            <Nothing>
              Nothing needs to be registered with Vouch. A consumer deployed after a fact was proven
              reads that fact immediately, which is what makes this a primitive rather than a
              platform with a waiting list.
            </Nothing>
          </div>
        </Section>
      </div>
    </>
  );
}
