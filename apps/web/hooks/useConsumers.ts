"use client";

/**
 * What every consumer contract currently returns for one address.
 *
 * This is the protocol's central claim made checkable rather than asserted:
 * one fact is written once, and unrelated applications read it independently,
 * each for its own purpose, none of them registered with anything.
 *
 * Every value here is a live `eth_call` against a deployed contract. Nothing is
 * computed in the browser, so what the page shows is exactly what the contract
 * would answer a real integrator. That distinction is the whole point of
 * showing it: a number this page derived itself would prove nothing.
 */

import { useQuery } from "@tanstack/react-query";
import { parseAbi } from "viem";

import { addresses } from "@/lib/contracts";
import { creditcoinClient } from "@/lib/viem";

const ABI = parseAbi([
  "function totalProofs(address) view returns (uint32)",
  "function tierOf(address) view returns (uint8)",
  "function collateralBpsFor(address) view returns (uint16)",
  "function feeBpsFor(address) view returns (uint16)",
  "function isAdmitted(address) view returns (bool)",
]);

export interface ConsumerRead {
  key: string;
  contract: string;
  call: string;
  reads: string;
  /** Rendered value, or null when the contract is not deployed on this network. */
  value: string | null;
  /** What the value means, in one line. */
  meaning: string;
  /** True when this consumer's answer changed because of proven standing. */
  moved: boolean;
  address: `0x${string}` | null;
}

/** Baselines, so "moved" is a comparison rather than an assertion. */
const BASELINE = { collateralBps: 15_000, feeBps: 30 } as const;

export function useConsumers(subject?: string) {
  return useQuery<ConsumerRead[]>({
    queryKey: ["consumers", subject],
    enabled: Boolean(subject) && Boolean(addresses.registry),
    staleTime: 30_000,
    queryFn: async () => {
      const user = subject as `0x${string}`;

      // One read per contract, in parallel, each allowed to fail on its own.
      // A single undeployed consumer must not blank the whole panel.
      const read = async (
        address: `0x${string}` | null,
        functionName: "totalProofs" | "tierOf" | "collateralBpsFor" | "feeBpsFor" | "isAdmitted",
      ) => {
        if (!address) return null;
        try {
          return await creditcoinClient.readContract({
            address,
            abi: ABI,
            functionName,
            args: [user],
          });
        } catch {
          return null;
        }
      };

      const [proofs, tier, collateral, fee, admitted] = await Promise.all([
        read(addresses.registry, "totalProofs"),
        read(addresses.passport, "tierOf"),
        read(addresses.credit, "collateralBpsFor"),
        read(addresses.feeTier, "feeBpsFor"),
        read(addresses.access, "isAdmitted"),
      ]);

      const tierNum = typeof tier === "number" ? tier : 0;

      return [
        {
          key: "registry",
          contract: "VouchRegistry",
          call: "totalProofs(address)",
          reads: "The registry itself",
          value: proofs === null ? null : String(proofs),
          meaning:
            Number(proofs ?? 0) > 0
              ? "Facts proven for this address, each traceable to a source transaction."
              : "Nothing proven. Unknown, which is not the same claim as clean.",
          moved: Number(proofs ?? 0) > 0,
          address: addresses.registry,
        },
        {
          key: "passport",
          contract: "VouchPassport",
          call: "tierOf(address)",
          reads: "Every fact type",
          value: tier === null ? null : `Tier ${tierNum}`,
          meaning:
            tierNum > 0
              ? "A pure function of the registry, so this can rise and never fall."
              : "No standing yet. Tier rises with proven history.",
          moved: tierNum > 0,
          address: addresses.passport,
        },
        {
          key: "credit",
          contract: "VouchCredit",
          call: "collateralBpsFor(address)",
          reads: "Repayment history",
          value: collateral === null ? null : `${Number(collateral) / 100}%`,
          meaning:
            Number(collateral) < BASELINE.collateralBps
              ? `Collateral required, down from ${BASELINE.collateralBps / 100}% baseline.`
              : "Baseline collateral. No repayment proven.",
          moved: collateral !== null && Number(collateral) < BASELINE.collateralBps,
          address: addresses.credit,
        },
        {
          key: "access",
          contract: "VouchAccess",
          call: "isAdmitted(address)",
          reads: "One configured fact",
          value: admitted === null ? null : admitted ? "true" : "false",
          meaning: admitted
            ? "The gate is open, and stays open. Nothing revokes it."
            : "Gate closed. It opens on the fact this deployment was configured with.",
          moved: admitted === true,
          address: addresses.access,
        },
        {
          key: "feeTier",
          contract: "VouchFeeTier",
          call: "feeBpsFor(address)",
          reads: "Supply history",
          // The load-bearing row. This one is expected NOT to move for an
          // address whose only proof is a repayment, and that is the result
          // worth showing: standing does not leak across fact types.
          value: fee === null ? null : `${Number(fee) / 100}%`,
          meaning:
            Number(fee) === BASELINE.feeBps
              ? "Unchanged. This reads a different fact type, so a repayment cannot move it."
              : "Reduced by proven supply history.",
          moved: fee !== null && Number(fee) < BASELINE.feeBps,
          address: addresses.feeTier,
        },
      ];
    },
  });
}
