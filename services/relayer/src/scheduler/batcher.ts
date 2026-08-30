/**
 * Batching, re-exported.
 *
 * The packing logic lives in `@vouch/proof-engine` rather than here because the
 * indexer, the worker and the benchmark scripts all need to agree with the
 * relayer about what a batch is. Two implementations that drift would produce
 * two different partitions, and the determinism that makes a competing relayer
 * safe -- it loses on the replay guard instead of writing something different --
 * depends on there being exactly one answer.
 */
export {
  CONTINUITY_WINDOW_BLOCKS,
  MAX_BATCH_SIZE,
  claimKey,
  continuityProofsRequired,
  excludeVerified,
  packBatches,
  type Batch,
  type PendingClaim,
} from '@vouch/proof-engine';
