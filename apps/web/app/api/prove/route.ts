import { NextResponse } from "next/server";
import {
  createPublicClient,
  defineChain,
  encodePacked,
  http,
  keccak256,
  toHex,
  type Hex,
  type Log,
} from "viem";
import { sepolia } from "viem/chains";
import { CREDITCOIN_TESTNET, DEPLOYED } from "@vouch/config";

/**
 * Find a real Aave repayment on Sepolia and obtain a real Attestcoin proof for
 * it.
 *
 * WHY THIS IS A SERVER ROUTE. The proof builder ships as an axios client in
 * `@gluwa/usc-sdk`. Calling it from the browser would depend on the prover
 * allowing cross-origin requests, which is not something to discover during a
 * demo. Running it here also keeps the Sepolia RPC key out of the bundle.
 *
 * WHY IT FINDS AN EXISTING REPAYMENT RATHER THAN CREATING ONE. Two reasons, and
 * the second is the interesting one.
 *
 *   Practical: proving requires the source block to have been attested already.
 *   A transaction sent seconds ago has not been, so a create-then-prove demo
 *   would stall for minutes on the attestation rather than on anything this
 *   system does.
 *
 *   Substantive: proving somebody else's repayment is the whole argument. A
 *   registry that can only record facts about transactions its own operator
 *   just sent is a database with extra steps. Reaching back into history that
 *   nobody here had a hand in is what makes it a standing registry.
 *
 * This route performs NO writes. It returns the arguments for `submitBatch`,
 * and the caller's wallet decides whether to send them -- submission is
 * permissionless, so the user pays their own gas and no key is held here.
 */

const AAVE_POOL_SEPOLIA = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" as const;

/**
 * The reserve asset the registry pins for AAVE_REPAYMENT (S4).
 *
 * Discovery has to respect it. Roughly one in six repayments on Sepolia settles
 * in some other token, and submitting one of those would revert
 * `ReserveAssetMismatch` -- correctly, since the registry cannot value a token
 * nobody registered. Picking a matching repayment is selecting a fact this
 * registry can actually verify, not weakening the check: the rejection still
 * happens, it just happens in the scanner instead of costing the user gas.
 */
const PINNED_RESERVE = "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8";
const REPAY_TOPIC = keccak256(
  toHex("Repay(address,address,address,uint256,bool)")
);
const AAVE_REPAYMENT = keccak256(toHex("AAVE_REPAYMENT"));

/** chainKey is Attestcoin's key space. On CC3 Testnet, 1 is Sepolia. */
const CHAIN_KEY = 1;
const PROVER =
  process.env.PROOF_BUILDER_URL ??
  "https://proof-gen-api.cc3-testnet.creditcoin.network";
const SEPOLIA_RPC =
  process.env.ETH_SEPOLIA_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com";
const CREDITCOIN_RPC =
  process.env.CREDITCOIN_RPC ?? CREDITCOIN_TESTNET.rpcUrls.default.http[0];

/** Only what the replay check needs, kept narrow so a rename fails loudly. */
const REPLAY_ABI = [
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "factId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const creditcoin = createPublicClient({
  chain: defineChain(CREDITCOIN_TESTNET),
  transport: http(CREDITCOIN_RPC),
});

/**
 * Mirrors `ReplayGuard._factId` exactly:
 * keccak256(abi.encodePacked(chainKey, blockNumber, txHash, factType, logIndex)).
 *
 * Checked against the deployed registry rather than assumed: computed for both
 * facts the v2 registry holds, this reproduces their stored `factId` bytes and
 * `isVerified` returns true for both.
 */
function replayKey(blockNumber: bigint, txHash: Hex, logIndex: number): Hex {
  return keccak256(
    encodePacked(
      ["uint64", "uint64", "bytes32", "bytes32", "uint32"],
      [BigInt(CHAIN_KEY), blockNumber, txHash, AAVE_REPAYMENT, logIndex],
    ),
  );
}

/**
 * Has the registry already recorded this exact log?
 *
 * WHY THIS EXISTS. The replay guard is keyed on the log, so a repayment that has
 * already been proven cannot be proven again -- resubmitting it reverts with
 * `FactAlreadyVerified`. Discovery walks backwards from the head, which means a
 * second run of this demo finds the same repayment the first run just consumed
 * and walks the visitor straight into a guaranteed revert. A judge clicking the
 * button twice, or a presenter recording a second take, hits exactly that.
 *
 * Fails OPEN, deliberately. This is a convenience check, not the security
 * boundary: the registry re-checks the same key on chain before it writes, so
 * the worst a failed read here can cause is the revert it would have caused
 * anyway. Blocking discovery because a read failed would trade a possible revert
 * for a certain one.
 */
async function alreadyRecorded(
  blockNumber: bigint,
  txHash: Hex,
  receiptLogIndex: number,
): Promise<boolean> {
  const registry = DEPLOYED["cc3-testnet"].registry;
  if (!registry) return false;

  try {
    return await creditcoin.readContract({
      address: registry,
      abi: REPLAY_ABI,
      functionName: "isVerified",
      args: [replayKey(blockNumber, txHash, receiptLogIndex)],
    });
  } catch {
    return false;
  }
}

export const maxDuration = 120;

export async function POST(): Promise<NextResponse> {
  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(SEPOLIA_RPC),
    });
    const head = await client.getBlockNumber();

    // Walk backwards in windows. Recent blocks may not be attested yet, so
    // starting a little back is pragmatic rather than arbitrary.
    let found: Log | null = null;
    /** The RECEIPT-scoped index of the chosen log, resolved while choosing it. */
    let foundReceiptLogIndex = -1;
    let foundReceipt: Awaited<ReturnType<typeof client.getTransactionReceipt>> | null = null;

    for (let offset = 2_000n; offset < 60_000n && !found; offset += 8_000n) {
      const toBlock = head - offset;
      const logs = await client.getLogs({
        address: AAVE_POOL_SEPOLIA,
        fromBlock: toBlock - 8_000n,
        toBlock,
      });

      const matchesPin = (l: Log) =>
        `0x${l.topics[1]?.slice(-40)}`.toLowerCase() === PINNED_RESERVE;

      // Two preferences, both learned from a failed run.
      //
      // NEWEST FIRST. `repayments.find(...)` took the oldest match in the
      // window, which is the one most likely to have been consumed already.
      //
      // A REPAYMENT THE REGISTRY WILL ACCEPT, ahead of one it will not. Falling
      // back to any repayment keeps the route useful against a registry with no
      // asset pinned -- the submission then either succeeds or reverts
      // honestly, which is the registry's decision to make, not the scanner's.
      const repayments = logs.filter((l) => l.topics[0] === REPAY_TOPIC);
      const candidates = [
        ...repayments.filter(matchesPin).reverse(),
        ...repayments.filter((l) => !matchesPin(l)).reverse(),
      ];

      for (const candidate of candidates) {
        if (!candidate.transactionHash || candidate.logIndex === null) continue;
        if (candidate.blockNumber === null) continue;

        const receipt = await client.getTransactionReceipt({
          hash: candidate.transactionHash,
        });
        const receiptLogIndex = receipt.logs.findIndex(
          (l) => l.logIndex === candidate.logIndex,
        );
        if (receiptLogIndex < 0) continue;

        if (
          await alreadyRecorded(
            candidate.blockNumber,
            candidate.transactionHash,
            receiptLogIndex,
          )
        ) {
          continue;
        }

        found = candidate;
        foundReceipt = receipt;
        foundReceiptLogIndex = receiptLogIndex;
        break;
      }
    }

    if (!found || !found.transactionHash || foundReceipt === null) {
      return NextResponse.json(
        {
          error: "No Aave repayment found on Sepolia in the searched range.",
          stage: "discovery",
        },
        { status: 404 }
      );
    }

    // The subject is topic 2 (`user`), the borrower whose debt was cleared --
    // NOT `repayer`, who may be a third party settling on their behalf.
    const subject = `0x${found.topics[2]?.slice(-40)}` as `0x${string}`;
    const reserveAsset = `0x${found.topics[1]?.slice(-40)}` as `0x${string}`;

    // eth_getLogs reports logIndex scoped to the BLOCK. The registry decodes a
    // RECEIPT, whose logs are numbered within that one transaction. Passing the
    // block-wide number reverts with LogIndexOutOfRange -- and would be far
    // worse if it happened to land in range, because it would then prove the
    // wrong log entirely. The conversion is done above, where the receipt is
    // fetched anyway.
    const receipt = foundReceipt;
    const receiptLogIndex = foundReceiptLogIndex;

    const { service } =
      await import("@gluwa/usc-sdk/dist/proof-provider/index.js");
    const builder = new service.ProofBuilder(CHAIN_KEY, PROVER, 120_000);
    const result = await builder.getProof(found.transactionHash);

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: `The proof builder refused this transaction: ${result.error ?? "unknown reason"}`,
          stage: "proof",
        },
        { status: 502 }
      );
    }

    const { txBytes, continuityProof, merkleProof, headerNumber } = result.data;

    return NextResponse.json({
      source: {
        chainKey: CHAIN_KEY,
        chainName: "Ethereum Sepolia",
        txHash: found.transactionHash,
        blockNumber: found.blockNumber?.toString() ?? null,
        blockLogIndex: found.logIndex,
        receiptLogIndex,
        receiptStatus: receipt.status,
        emitter: AAVE_POOL_SEPOLIA,
        topic0: REPAY_TOPIC,
        subject,
        reserveAsset,
        reserveMatchesPin: reserveAsset.toLowerCase() === PINNED_RESERVE,
      },
      proof: {
        headerNumber: headerNumber.toString(),
        continuityRoots: continuityProof.roots.length,
        txBytesLength: txBytes.length,
      },
      // Exactly the arguments submitBatch takes. Serialised as strings because
      // JSON has no bigint; the client casts them back before sending.
      submitBatchArgs: {
        continuity: [
          continuityProof.lowerEndpointDigest,
          continuityProof.roots,
        ],
        claim: [
          CHAIN_KEY.toString(),
          headerNumber.toString(),
          found.transactionHash,
          AAVE_REPAYMENT,
          receiptLogIndex,
          txBytes,
          merkleProof.root,
          merkleProof.siblings.map((s: { hash: string; isLeft: boolean }) => [
            s.hash,
            s.isLeft,
          ]),
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stage: "unknown",
      },
      { status: 500 }
    );
  }
}
