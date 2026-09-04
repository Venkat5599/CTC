"use client";

/**
 * The live demo, end to end, with nothing simulated.
 *
 *   Ethereum event -> Attestcoin proof -> Vouch verification -> Creditcoin
 *   state -> multiple contract reads
 *
 * Every stage below is a real network operation. There is no timer advancing
 * anything, and no stage reports success it did not observe.
 *
 * THE ONE DESIGN DECISION WORTH EXPLAINING. The registry write is sent by the
 * USER'S wallet, not by a relayer. `submitBatch` is permissionless by design --
 * the subject is read from the proven log rather than from `msg.sender`, so a
 * submitter gains nothing by submitting and cannot claim standing for
 * themselves. That property is what makes this possible: the demo needs no
 * server holding a key, no trusted operator, and no deployed relayer. Anyone
 * watching can run the same flow from their own wallet and get the same result.
 *
 * WHY VERIFICATION HAS NO SEPARATE NETWORK STEP. Stage 5 is not a call. The
 * receipt-status, emitter, topic and replay checks all happen INSIDE
 * `submitBatch`, as reverts. So a confirmed submission is itself the evidence
 * that every check passed, and a reverted one names which failed. Showing
 * verification as its own request would be theatre; showing it as the reason
 * the write succeeded is the truth.
 */

import { useCallback, useState } from "react";
import { parseAbi, type Hex } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import { creditcoinClient } from "@/lib/viem";
import { addresses } from "@/lib/contracts";

const REGISTRY_ABI = parseAbi([
  "function submitBatch((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[])[] claims) returns (uint256)",
  "function hasProof(address subject, bytes32 factType) view returns (bool)",
  "function proofCount(address subject, bytes32 factType) view returns (uint32)",
  "function totalProofs(address subject) view returns (uint32)",
]);

export type StepState = "idle" | "running" | "done" | "failed";

export interface DemoStep {
  key: string;
  label: string;
  state: StepState;
  detail: string | null;
}

export interface SourceFact {
  chainName: string;
  chainKey: number;
  txHash: Hex;
  blockNumber: string | null;
  blockLogIndex: number;
  receiptLogIndex: number;
  receiptStatus: string;
  emitter: Hex;
  topic0: Hex;
  subject: Hex;
}

export interface ProofInfo {
  headerNumber: string;
  continuityRoots: number;
  txBytesLength: number;
}

export interface StandingSnapshot {
  hasProof: boolean;
  proofCount: number;
  totalProofs: number;
}

const STEPS: { key: string; label: string }[] = [
  { key: "discover", label: "Find a real Aave repayment on Ethereum Sepolia" },
  { key: "proof", label: "Obtain an Attestcoin inclusion proof" },
  { key: "before", label: "Read the registry before" },
  { key: "submit", label: "Submit to VouchRegistry from your wallet" },
  { key: "confirm", label: "Wait for the Creditcoin transaction" },
  { key: "after", label: "Read the registry again" },
];

function fresh(): DemoStep[] {
  return STEPS.map((s) => ({ ...s, state: "idle" as StepState, detail: null }));
}

export function useLiveDemo() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [steps, setSteps] = useState<DemoStep[]>(fresh());
  const [source, setSource] = useState<SourceFact | null>(null);
  const [proof, setProof] = useState<ProofInfo | null>(null);
  const [before, setBefore] = useState<StandingSnapshot | null>(null);
  const [after, setAfter] = useState<StandingSnapshot | null>(null);
  const [creditcoinTx, setCreditcoinTx] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const mark = useCallback(
    (key: string, state: StepState, detail: string | null = null) => {
      setSteps((prev) =>
        prev.map((s) => (s.key === key ? { ...s, state, detail } : s))
      );
    },
    []
  );

  const reset = useCallback(() => {
    setSteps(fresh());
    setSource(null);
    setProof(null);
    setBefore(null);
    setAfter(null);
    setCreditcoinTx(null);
    setError(null);
    setRunning(false);
  }, []);

  const readStanding = useCallback(
    async (subject: Hex, factType: Hex): Promise<StandingSnapshot> => {
      const registry = addresses.registry;
      if (!registry) throw new Error("The registry address is not configured.");

      const [has, count, total] = await Promise.all([
        creditcoinClient.readContract({
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "hasProof",
          args: [subject, factType],
        }),
        creditcoinClient.readContract({
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "proofCount",
          args: [subject, factType],
        }),
        creditcoinClient.readContract({
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "totalProofs",
          args: [subject],
        }),
      ]);

      return {
        hasProof: has as boolean,
        proofCount: Number(count),
        totalProofs: Number(total),
      };
    },
    []
  );

  const run = useCallback(async () => {
    const registry = addresses.registry;
    if (!registry) {
      setError("The registry address is not configured for this network.");
      return;
    }
    if (!isConnected || !address) {
      setError(
        "Connect a wallet first. Reading needs no wallet; submitting pays gas."
      );
      return;
    }

    reset();
    setRunning(true);

    try {
      // 1 + 2. Discovery and proof happen in one server round trip: the proof
      // builder is an axios client, and the transaction it proves is the one
      // discovery just found, so splitting them would mean shipping a log back
      // and forth for no benefit.
      mark("discover", "running", "Scanning Sepolia for an Aave Repay…");
      mark("proof", "running", "Asking the Attestcoin prover…");

      const response = await fetch("/api/prove", { method: "POST" });
      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const stage = (payload.stage as string) ?? "unknown";
        const message = (payload.error as string) ?? "Request failed.";
        mark(stage === "discovery" ? "discover" : "proof", "failed", message);
        if (stage !== "discovery") mark("discover", "done", null);
        setError(message);
        setRunning(false);
        return;
      }

      const src = payload.source as SourceFact;
      const prf = payload.proof as ProofInfo;
      const args = payload.submitBatchArgs as {
        continuity: [Hex, Hex[]];
        claim: [string, string, Hex, Hex, number, Hex, Hex, [Hex, boolean][]];
      };

      setSource(src);
      setProof(prf);
      mark(
        "discover",
        "done",
        `${src.txHash.slice(0, 14)}… at block ${src.blockNumber}`
      );
      mark("proof", "done", `${prf.continuityRoots} continuity roots`);

      // 3. Standing before. Read now, so the change afterwards is observed
      // rather than asserted.
      mark("before", "running", "Reading Creditcoin…");
      const factType = args.claim[3];
      const priorStanding = await readStanding(src.subject, factType);
      setBefore(priorStanding);
      mark(
        "before",
        "done",
        priorStanding.hasProof
          ? `${priorStanding.proofCount} already proven`
          : "no facts on record"
      );

      // 4. The write, from the user's own wallet.
      mark("submit", "running", "Confirm in your wallet…");
      const hash = await writeContractAsync({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "submitBatch",
        args: [
          args.continuity,
          [
            [
              BigInt(args.claim[0]),
              BigInt(args.claim[1]),
              args.claim[2],
              args.claim[3],
              args.claim[4],
              args.claim[5],
              args.claim[6],
              args.claim[7],
            ],
          ],
        ] as never,
      });

      setCreditcoinTx(hash);
      mark("submit", "done", hash);

      // 5. Confirmation. Every S1/S2/S3 check lives inside this call, so a
      // success here IS the verification result.
      mark("confirm", "running", "Waiting for the Creditcoin receipt…");
      const receipt = await creditcoinClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt.status !== "success") {
        mark("confirm", "failed", "The submission reverted.");
        setError(
          "The registry rejected this proof. That is the system working: one of the receipt-status, emitter, topic or replay checks failed."
        );
        setRunning(false);
        return;
      }

      mark("confirm", "done", `gas ${receipt.gasUsed.toString()}`);

      // 6. Standing after.
      mark("after", "running", "Reading Creditcoin…");
      const nextStanding = await readStanding(src.subject, factType);
      setAfter(nextStanding);
      mark("after", "done", `${nextStanding.proofCount} proven`);

      setRunning(false);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? (caught.message.split("\n")[0] ?? "Failed")
          : String(caught);
      setError(message);
      setSteps((prev) =>
        prev.map((s) =>
          s.state === "running" ? { ...s, state: "failed", detail: message } : s
        )
      );
      setRunning(false);
    }
  }, [address, isConnected, mark, readStanding, reset, writeContractAsync]);

  return {
    steps,
    source,
    proof,
    before,
    after,
    creditcoinTx,
    error,
    running,
    isConnected,
    address,
    run,
    reset,
  };
}
