/**
 * Vouch SDK.
 *
 * Read verified borrower history from the Vouch registry. One Attestcoin proof
 * of what a borrower actually did on another chain, readable by any Creditcoin
 * issuer for the cost of a storage read.
 */
export { VouchClient, createVouchClient, type VouchClientOptions } from './client';
export { Registry, REGISTRY_ABI } from './registry';
export { PassportReader, PASSPORT_ABI, passportFromRegistry } from './passport';
export * from './facts';
export * from './verification';
export * from './types';
