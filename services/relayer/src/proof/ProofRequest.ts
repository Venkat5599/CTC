/**
 * ProofRequest
 *
 * Builds the payloads the Attestcoin proof-builder API is asked for, and turns
 * its responses into the calldata `VouchRegistry.submitBatch` expects.
 *
 * The relayer is untrusted, and this file is where that claim is easiest to
 * misread, so it is worth being precise about. Nothing here is a security
 * boundary. The relayer chooses WHICH facts get submitted and WHEN, which means
 * it can censor and it can stall -- both liveness properties, both recoverable
 * because anyone else can run one. What it cannot do is make the registry
 * believe something false: every field below is either re-derived on chain from
 * the proven payload (subject, value, emitter) or asserted against a registered
 * source (chainKey, topic0, logIndex). A malicious relayer's best available
 * attack is to do nothing.
 *
 * Which is also why this module signs nothing and holds no key. The submitting
 * wallet pays gas; it grants no authority.
 */

import type { Hex } from 'viem';
import type { Batch, PendingClaim } from '../packer/BatchPacker.js';

/** Attestcoin proof-builder, CC3 Testnet. */
export const DEFAULT_PROOF_BUILDER_URL =
  'https://proof-gen-api.cc3-testnet.creditcoin.network';

export interface MerkleProofEntry {
  hash: Hex;
  isLeft: boolean;
}

/** Mirrors `INativeQueryVerifier.ContinuityProof`. */
export interface ContinuityProof {
  lowerEndpointDigest: Hex;
  roots: Hex[];
}

/** One claim, in the shape `VouchTypes.FactClaim` expects. */
export interface EncodedFactClaim {
  chainKey: bigint;
  blockNumber: bigint;
  txHash: Hex;
  factType: Hex;
  logIndex: number;
  encodedTransaction: Hex;
  merkleRoot: Hex;
  siblings: MerkleProofEntry[];
}

export interface SubmissionPayload {
  continuity: ContinuityProof;
  claims: EncodedFactClaim[];
}

export interface ProofBuilderResponse {
  encodedTransaction: Hex;
  merkleRoot: Hex;
  siblings: MerkleProofEntry[];
}

export interface ContinuityResponse {
  lowerEndpointDigest: Hex;
  roots: Hex[];
}

export interface ProofBuilderClient {
  transactionProof(chainKey: number, blockNumber: bigint, txHash: Hex): Promise<ProofBuilderResponse>;
  continuityProof(chainKey: number, fromBlock: bigint, toBlock: bigint): Promise<ContinuityResponse>;
}

/**
 * Assemble one batch into submission calldata.
 *
 * Ordering is preserved from the packer, so the submitted array matches the
 * deterministic partition and a competing relayer's identical submission simply
 * loses on the replay guard rather than writing anything different.
 */
export async function buildSubmission(
  client: ProofBuilderClient,
  batch: Batch,
): Promise<SubmissionPayload> {
  // ONE continuity proof for the whole window. This single call, amortised over
  // up to ten claims, is the batching argument in its entirety.
  const continuity = await client.continuityProof(
    batch.chainKey,
    batch.windowStart,
    batch.windowEnd - 1n,
  );

  // Per-transaction inclusion proofs. Requested in parallel because they are
  // independent, and the proof builder is the slowest step in the pipeline.
  const proofs = await Promise.all(
    batch.claims.map((claim) =>
      client.transactionProof(claim.chainKey, claim.blockNumber, claim.txHash),
    ),
  );

  return {
    continuity: {
      lowerEndpointDigest: continuity.lowerEndpointDigest,
      roots: continuity.roots,
    },
    claims: batch.claims.map((claim, i) => encodeClaim(claim, proofs[i]!)),
  };
}

function encodeClaim(claim: PendingClaim, proof: ProofBuilderResponse): EncodedFactClaim {
  return {
    chainKey: BigInt(claim.chainKey),
    blockNumber: claim.blockNumber,
    txHash: claim.txHash,
    factType: claim.factType,
    // Passed straight through from the indexer, which read it from the node.
    // The contract re-checks that the log at this position carries the
    // registered topic0 and emitter, so a wrong value reverts.
    logIndex: claim.logIndex,
    encodedTransaction: proof.encodedTransaction,
    merkleRoot: proof.merkleRoot,
    siblings: proof.siblings,
  };
}

/**
 * HTTP client for the proof builder.
 *
 * Deliberately thin. The endpoint shapes are the part most likely to drift --
 * the SDK and contracts were renamed from USC to Attestcoin recently enough that
 * repository names still lag -- so keeping the surface small means a protocol
 * change touches one file, the same reason `AttestcoinVerifier` is the only
 * contract that talks to the precompile.
 */
export function createProofBuilderClient(
  baseUrl: string = DEFAULT_PROOF_BUILDER_URL,
  fetchImpl: typeof fetch = fetch,
): ProofBuilderClient {
  return {
    async transactionProof(chainKey, blockNumber, txHash) {
      return request<ProofBuilderResponse>(fetchImpl, `${baseUrl}/proof/transaction`, {
        chainKey,
        blockNumber: blockNumber.toString(),
        txHash,
      });
    },

    async continuityProof(chainKey, fromBlock, toBlock) {
      return request<ContinuityResponse>(fetchImpl, `${baseUrl}/proof/continuity`, {
        chainKey,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
      });
    },
  };
}

async function request<T>(
  fetchImpl: typeof fetch,
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Surfaced rather than swallowed. A proof that cannot be built is a fact
    // that will never land, and a silent skip here would look identical to "the
    // user has no history" downstream.
    throw new ProofBuilderError(url, response.status, await response.text().catch(() => ''));
  }

  return (await response.json()) as T;
}

export class ProofBuilderError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`Proof builder ${status} at ${url}: ${body.slice(0, 200)}`);
    this.name = 'ProofBuilderError';
  }
}
