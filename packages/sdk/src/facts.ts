/**
 * Fact type constants and helpers.
 *
 * Re-exported from `@vouch/schemas` rather than redeclared, because a fact type
 * id that disagrees with the on-chain constant fails silently: the registry
 * simply reports no proofs and nothing anywhere raises. Two definitions of the
 * same constant is exactly how that drift happens, so there is only ever one.
 */

import { keccak256, toHex } from 'viem';
import type { Hex } from './types.js';

export {
  AAVE_REPAYMENT,
  GOVERNANCE_ACTIVITY,
  LONG_TERM_LP,
  REGISTERED_FACTS,
  ALL_FACTS,
  factById,
  factByName,
  isRegisterable,
  type FactDefinition,
} from '@vouch/schemas';

/**
 * Derive a fact type id from its name.
 *
 * Exposed so an integrator can consume a fact type Vouch has not shipped a
 * constant for. The id is just `keccak256(name)`, identical to how
 * `FactTypes.sol` derives its constants, so a source registered on chain under
 * any name is reachable from the SDK the day it is registered.
 */
export function factType(name: string): Hex {
  return keccak256(toHex(name));
}
