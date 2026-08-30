/**
 * Relayer entrypoint.
 *
 * Ethereum event -> discovery -> fact candidate -> queue -> batch scheduler
 * (same chain, same range, same deadline) -> proof builder -> Attestcoin ->
 * Creditcoin.
 *
 * The service is untrusted and replaceable. It chooses WHICH facts get submitted
 * and WHEN -- so it can censor and it can stall, both liveness properties, both
 * fixable by anyone running their own. It cannot make the registry believe
 * something false, because every field it submits is either re-derived on chain
 * from the proven payload or asserted against a registered source. Its best
 * available attack is to do nothing.
 *
 * Which is why nothing here holds a key that grants authority. The submitting
 * wallet pays gas; it confers no standing, and a test asserts exactly that.
 */

export { Relayer, type RelayerDeps, type RelayerOptions } from './main.js';
export { BatchQueue, type QueuedJob } from './scheduler/queue.js';
export * from './scheduler/batcher.js';
export * from './scheduler/deadline.js';
export * from './scheduler/priority.js';
export * from './proof/builder.js';
export { EventScanner } from './discovery/event-scanner.js';
export { SourceMonitor } from './discovery/source-monitor.js';
export { Keeper } from './settlement/keeper.js';
