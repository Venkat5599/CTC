/**
 * Indexer entrypoint.
 *
 * Reads the source chain and the registry, and writes what it finds to Postgres.
 * It has no authority: it decides nothing, signs nothing, and everything it
 * emits is re-derived from the proven payload on chain before it counts. Garbage
 * from here produces a rejected submission rather than a false fact, and an
 * omission produces a late fact rather than a wrong one.
 *
 * That asymmetry is what lets the entire off-chain half of Vouch be untrusted
 * and replaceable, which in turn is what makes a permissionless `submitBatch`
 * safe rather than reckless.
 */

export * from './SourceIndexer.js';
export { prisma, disconnect, isDatabaseReachable, normalizeAddress } from './database/client.js';
export { toAmountString, fromAmountString } from './database/client.js';
