/**
 * Proof construction.
 *
 * A thin re-export of the Attestcoin adapter. The indirection is the point: the
 * SDK and contracts were renamed from USC to Attestcoin recently enough that
 * repository names still lag, so every call into the protocol goes through one
 * package and a protocol change touches one file. This mirrors the same
 * discipline on chain, where `AttestcoinVerifier` is the only contract allowed
 * to speak to the precompile.
 */
export {
  DEFAULT_PROOF_BUILDER_URL,
  ProofBuilderError,
  buildSubmission,
  createProofBuilderClient,
  type ContinuityProof,
  type EncodedFactClaim,
  type ProofBuilderClient,
  type SubmissionPayload,
} from '@vouch/attestcoin';
