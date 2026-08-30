/**
 * The Vouch client.
 *
 * The whole integration a third party writes is smaller than this file's header:
 *
 *     const vouch = createVouchClient({ registry, publicClient });
 *     if (await vouch.hasProof(user, AAVE_REPAYMENT.id)) {
 *       collateralBps = 11_500;
 *     }
 *
 * Everything else here is convenience over that one call. The client holds no
 * key, sends no transaction and has no privileged relationship with the
 * registry -- it reads the same public view functions any contract reads, which
 * is what makes Vouch a primitive rather than a service with an API you have to
 * be granted access to.
 */

import { Registry } from './registry.js';
import { PassportReader } from './passport.js';
import { createRelayerClient, type RelayerClient } from './verification.js';
import type {
  Address,
  Hex,
  Passport,
  Standing,
  VerifiedFact,
  VouchClientConfig,
} from './types.js';
import { VouchError } from './types.js';

export interface VouchClientOptions extends VouchClientConfig {
  /** Relayer base URL. Only needed to observe verification progress. */
  relayerUrl?: string;
}

export class VouchClient {
  readonly registry: Registry;
  readonly passport: PassportReader | null;
  readonly relayer: RelayerClient | null;

  constructor(options: VouchClientOptions) {
    this.registry = new Registry(options.registry, options.publicClient);
    this.passport = options.passport
      ? new PassportReader(options.passport, options.publicClient)
      : null;
    this.relayer = options.relayerUrl ? createRelayerClient(options.relayerUrl) : null;
  }

  /** The primitive. */
  hasProof(subject: Address, factType: Hex): Promise<boolean> {
    return this.registry.hasProof(subject, factType);
  }

  /** Standing as proven / unknown, never as a bare boolean. */
  standing(subject: Address, factType: Hex): Promise<Standing> {
    return this.registry.standing(subject, factType);
  }

  proofCount(subject: Address, factType: Hex): Promise<number> {
    return this.registry.proofCount(subject, factType);
  }

  facts(subject: Address): Promise<VerifiedFact[]> {
    return this.registry.factsOf(subject);
  }

  /**
   * Aggregated standing.
   *
   * Requires a passport address. Throws rather than returning a default,
   * because a silent tier 0 would be indistinguishable from a real one and a
   * consumer would grant nothing while believing it had checked.
   */
  async passportOf(user: Address): Promise<Passport> {
    // `async` matters here. A synchronous throw from a Promise-returning method
    // escapes the caller's `.catch()` and surfaces as an uncaught exception
    // instead of a rejection, so a caller doing the obvious thing would crash
    // rather than handle it.
    if (!this.passport) {
      throw new VouchError(
        'No passport address configured. Pass `passport` to createVouchClient, or read facts from the registry directly.',
      );
    }
    return this.passport.passportOf(user);
  }

  /**
   * Check several fact types at once.
   *
   * One round trip per fact rather than a multicall, deliberately: the calls are
   * independent view reads and a multicall would add a dependency and a deploy
   * step to save a few milliseconds on a page that is already waiting on a
   * wallet connection.
   */
  async hasAllProofs(subject: Address, factTypes: readonly Hex[]): Promise<boolean> {
    const results = await Promise.all(factTypes.map((f) => this.hasProof(subject, f)));
    return results.every(Boolean);
  }

  async hasAnyProof(subject: Address, factTypes: readonly Hex[]): Promise<boolean> {
    const results = await Promise.all(factTypes.map((f) => this.hasProof(subject, f)));
    return results.some(Boolean);
  }
}

export function createVouchClient(options: VouchClientOptions): VouchClient {
  return new VouchClient(options);
}
