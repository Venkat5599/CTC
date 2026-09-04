import { NextResponse } from "next/server";
import { createPublicClient, http, keccak256, toHex, type Log } from "viem";
import { sepolia } from "viem/chains";

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
    for (let offset = 2_000n; offset < 60_000n && !found; offset += 8_000n) {
      const toBlock = head - offset;
      const logs = await client.getLogs({
        address: AAVE_POOL_SEPOLIA,
        fromBlock: toBlock - 8_000n,
        toBlock,
      });
      const repayments = logs.filter((l) => l.topics[0] === REPAY_TOPIC);

      // Prefer one the registry will accept. Falling back to any repayment
      // keeps the route useful against a registry with no asset pinned -- the
      // submission then either succeeds or reverts honestly.
      found =
        repayments.find(
          (l) => `0x${l.topics[1]?.slice(-40)}`.toLowerCase() === PINNED_RESERVE,
        ) ??
        repayments[0] ??
        null;
    }

    if (!found || !found.transactionHash || found.logIndex === null) {
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
    // wrong log entirely.
    const receipt = await client.getTransactionReceipt({
      hash: found.transactionHash,
    });
    const receiptLogIndex = receipt.logs.findIndex(
      (l) => l.logIndex === found?.logIndex
    );
    if (receiptLogIndex < 0) {
      return NextResponse.json(
        { error: "Log not found in its own receipt.", stage: "discovery" },
        { status: 500 }
      );
    }

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
