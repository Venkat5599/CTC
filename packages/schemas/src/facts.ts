/**
 * Typed fact definitions.
 *
 * A fact type is a triple: which contract on which chain emits which event, plus
 * where in that event the subject sits. Registering one is a configuration
 * change rather than a code change, and that property is what makes Vouch
 * infrastructure instead of an application -- adding Compound or Morpho or a
 * Governor is a row in SourceRegistry, not a new contract.
 *
 * Every value here is a trust decision that fails SILENTLY when wrong. A bad
 * topic0 matches no logs and the registry merely looks empty; a bad
 * subjectTopicIndex pins the wrong address and mints someone else's history to
 * the wrong wallet. Nothing throws. So each definition below carries the event
 * signature it was derived from, and the derivation is checked in a test rather
 * than trusted.
 */

import { keccak256, toHex } from 'viem';

export interface FactDefinition {
  /** Stable identifier: keccak of the name. Matches FactTypes.sol. */
  readonly id: `0x${string}`;
  /** The constant's name in FactTypes.sol. */
  readonly name: string;
  /** Human label for UI. */
  readonly label: string;
  /** What a consumer may legitimately conclude from this fact. */
  readonly meaning: string;
  /** Broad domain, so the registry reads as domain-agnostic rather than credit-only. */
  readonly domain: 'credit' | 'liquidity' | 'governance';
  /** Full Solidity event signature the topic0 is derived from. */
  readonly eventSignature: string;
  /** keccak of eventSignature. */
  readonly topic0: `0x${string}`;
  /**
   * Which topic carries the subject.
   *
   * Index 0 is the signature, so a subject is never at 0. A definition whose
   * subject is not indexed at all cannot be expressed here, which is a feature:
   * it forces the problem to surface at configuration time instead of pinning
   * whatever happens to sit at the index.
   */
  readonly subjectTopicIndex: 1 | 2 | 3;
  /** What the first word of log data means, for display. */
  readonly valueMeaning: string;
  readonly valueDecimals: number;
}

const factId = (name: string) => keccak256(toHex(name));
const topic = (signature: string) => keccak256(toHex(signature));

/**
 * Aave V3 Repay. Credit.
 *
 * topics: [signature, reserve, user, repayer]; data: (amount, useATokens).
 * The subject is `user` -- the borrower whose debt was cleared -- not `repayer`,
 * who may be a third party settling on their behalf. Pinning repayer would
 * credit the wrong wallet whenever a liquidator or a friend paid.
 */
export const AAVE_REPAYMENT: FactDefinition = {
  id: factId('AAVE_REPAYMENT'),
  name: 'AAVE_REPAYMENT',
  label: 'Aave repayment',
  meaning: 'This address borrowed on Aave V3 and repaid.',
  domain: 'credit',
  eventSignature: 'Repay(address,address,address,uint256,bool)',
  topic0: topic('Repay(address,address,address,uint256,bool)'),
  subjectTopicIndex: 2,
  valueMeaning: 'Amount repaid, in the reserve token',
  valueDecimals: 6,
};

/**
 * Aave V3 Supply. Liquidity.
 *
 * topics: [signature, reserve, onBehalfOf, referralCode]; data: (user, amount).
 * Note the indexed set differs from Repay: `user` is NOT indexed here and
 * `onBehalfOf` is, so index 2 means something different in each event. This is
 * precisely why the index is configured per fact type rather than assumed.
 */
export const LONG_TERM_LP: FactDefinition = {
  id: factId('LONG_TERM_LP'),
  name: 'LONG_TERM_LP',
  label: 'Liquidity supplied',
  meaning: 'This address supplied liquidity to Aave V3.',
  domain: 'liquidity',
  eventSignature: 'Supply(address,address,address,uint256,uint16)',
  topic0: topic('Supply(address,address,address,uint256,uint16)'),
  subjectTopicIndex: 2,
  valueMeaning: 'Amount supplied, in the reserve token',
  valueDecimals: 6,
};

/**
 * Governor VoteCast. Governance.
 *
 * OpenZeppelin's IGovernor declares:
 *
 *   event VoteCast(address indexed voter, uint256 proposalId, uint8 support,
 *                  uint256 weight, string reason)
 *
 * `voter` IS indexed, so it sits at topic index 1 and the subject is readable
 * the same way it is for the Aave sources. An earlier version of this file
 * claimed otherwise and held the fact type back on that basis; the claim was
 * checked against the installed contracts and was simply wrong.
 *
 * The value word is `proposalId` rather than an amount, which is why
 * valueMeaning says so: a consumer summing it would be adding proposal
 * identifiers together and getting a meaningless number.
 */
export const GOVERNANCE_ACTIVITY: FactDefinition = {
  id: factId('GOVERNANCE_ACTIVITY'),
  name: 'GOVERNANCE_ACTIVITY',
  label: 'Governance participation',
  meaning: 'This address voted on an on-chain proposal.',
  domain: 'governance',
  eventSignature: 'VoteCast(address,uint256,uint8,uint256,string)',
  topic0: topic('VoteCast(address,uint256,uint8,uint256,string)'),
  subjectTopicIndex: 1,
  valueMeaning: 'Proposal id. Not an amount -- summing it is meaningless.',
  valueDecimals: 0,
};

/** The fact types configured on chain in v1. */
export const REGISTERED_FACTS = [AAVE_REPAYMENT, LONG_TERM_LP, GOVERNANCE_ACTIVITY] as const;

/** Everything defined, including what is not yet safe to register. */
export const ALL_FACTS = [AAVE_REPAYMENT, LONG_TERM_LP, GOVERNANCE_ACTIVITY] as const;

export type RegisteredFactName = (typeof REGISTERED_FACTS)[number]['name'];

export function factById(id: string): FactDefinition | undefined {
  return ALL_FACTS.find((fact) => fact.id.toLowerCase() === id.toLowerCase());
}

export function factByName(name: string): FactDefinition | undefined {
  return ALL_FACTS.find((fact) => fact.name === name);
}

/**
 * Whether a fact type is safe to register on chain.
 *
 * The check is not decorative. `GOVERNANCE_ACTIVITY` looks complete and would
 * register without complaint, so the guard is what stops a well-meaning script
 * from configuring a source that silently attributes votes to the wrong address.
 */
export function isRegisterable(fact: FactDefinition): boolean {
  return REGISTERED_FACTS.some((registered) => registered.id === fact.id);
}
