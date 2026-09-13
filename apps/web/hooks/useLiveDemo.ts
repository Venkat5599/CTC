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
import {
  BaseError,
  ContractFunctionRevertedError,
  parseAbi,
  UserRejectedRequestError,
  type Hex,
} from "viem";
import { useAccount, useWriteContract } from "wagmi";

import { creditcoinClient } from "@/lib/viem";
import { addresses } from "@/lib/contracts";
import { useTxHistory } from "@/hooks/useTxHistory";

const REGISTRY_ABI = parseAbi([
  // Every custom error the registry can throw is enumerated here so viem can
  // decode a reverted simulation or receipt into something a user can act on
  // (rather than "execution reverted" with an opaque selector).
  "error FactAlreadyVerified()",
  "error EmitterMismatch()",
  "error TopicMismatch()",
  "error ReceiptStatusFail()",
  "error LogIndexOutOfRange()",
  "error ChainKeyMismatch()",
  "error ReserveAssetMismatch()",
  "error DeadlineExpired()",
  "error UnknownFactType()",
  "error SourceNotRegistered()",
  "error ContinuityInvalid()",
  "error InclusionProofInvalid()",
  "function submitBatch((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[])[] claims) returns (uint256)",
  "function hasProof(address subject, bytes32 factType) view returns (bool)",
  "function proofCount(address subject, bytes32 factType) view returns (uint32)",
  "function totalProofs(address subject) view returns (uint32)",
]);

/**
 * Translate a viem error into a one-line, user-facing explanation.
 *
 * Priorities:
 *  1. UserRejectedRequestError — the user closed the wallet prompt.
 *  2. ContractFunctionRevertedError — the registry rejected the claim; the
 *     custom error name is the exact failure and we surface it verbatim.
 *  3. Anything else — the first line of the message, which viem writes in a
 *     shape that reads as a sentence.
 */
function humaniseError(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "You rejected the request in your wallet. Nothing was sent.";
    }
    const reverted = err.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null;
    if (reverted) {
      const name = reverted.data?.errorName;
      const friendly: Record<string, string> = {
        FactAlreadyVerified:
          "The registry has already recorded this log. Replay is blocked at the guard, so nothing was written.",
        EmitterMismatch:
          "The log did not come from the pinned emitter. S2 stopped a lookalike contract cold.",
        TopicMismatch:
          "The log's topic0 does not match the registered event signature.",
        ReceiptStatusFail:
          "The source transaction reverted on its own chain. S1 blocked the write.",
        LogIndexOutOfRange:
          "The receipt-scoped log index is out of range for that transaction.",
        ChainKeyMismatch:
          "The chainKey on the proof does not match the registered source.",
        ReserveAssetMismatch:
          "The Aave reserve asset on this repayment is not the one this deployment pins.",
        DeadlineExpired:
          "The Attestcoin proof deadline has passed. Regenerate the proof and retry.",
        UnknownFactType: "This fact type is not registered on this deployment.",
        SourceNotRegistered:
          "No source has been registered for that chainKey and fact type.",
        ContinuityInvalid:
          "The continuity proof failed against the Block Prover precompile.",
        InclusionProofInvalid:
          "The Merkle inclusion proof failed against the receipts root.",
      };
      return name ? friendly[name] ?? `Registry reverted: ${name}` : err.shortMessage;
    }
    return err.shortMessage;
  }
  return err instanceof Error ? err.message.split("\n")[0] ?? String(err) : String(err);
}

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
  const history = useTxHistory(address);

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

  const run = useCallback(async (targetSubject?: string) => {
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
      mark(
        "discover",
        "running",
        targetSubject
          ? `Scanning Sepolia for a repayment by ${targetSubject.slice(0, 10)}…`
          : "Scanning Sepolia for an Aave Repay…",
      );
      mark("proof", "running", "Asking the Attestcoin prover…");

      const url = targetSubject
        ? `/api/prove?subject=${targetSubject.toLowerCase()}`
        : "/api/prove";
      const response = await fetch(url, { method: "POST" });
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

      // 4. Simulate first, so any revert surfaces with its custom error name
      // BEFORE we ask the user to sign — a rejected simulation costs no gas and
      // spares them a wallet prompt for a transaction the chain would have
      // rejected anyway.
      const submitArgs = [
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
      ] as never;

      mark("submit", "running", "Simulating against the registry…");
      try {
        await creditcoinClient.simulateContract({
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "submitBatch",
          args: submitArgs,
          account: address as `0x${string}`,
        });
      } catch (simError) {
        const message = humaniseError(simError);
        mark("submit", "failed", message);
        setError(message);
        setRunning(false);
        return;
      }

      mark("submit", "running", "Confirm in your wallet…");
      const hash = await writeContractAsync({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "submitBatch",
        args: submitArgs,
      });

      setCreditcoinTx(hash);
      mark("submit", "done", hash);
      history.append({
        hash,
        subject: src.subject,
        factType,
      });

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
        history.update(hash, { status: "reverted" });
        setRunning(false);
        return;
      }

      mark("confirm", "done", `gas ${receipt.gasUsed.toString()}`);
      history.update(hash, {
        status: "success",
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
      });

      // 6. Standing after.
      mark("after", "running", "Reading Creditcoin…");
      const nextStanding = await readStanding(src.subject, factType);
      setAfter(nextStanding);
      mark("after", "done", `${nextStanding.proofCount} proven`);

      setRunning(false);
    } catch (caught) {
      const message = humaniseError(caught);
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
