/** Ship-or-wait policy. See `@vouch/proof-engine/deadline` for the tradeoff. */
export {
  DEADLINE_POLICIES,
  deadlineFor,
  proofsPerFact,
  retryDelayMs,
  shouldShip,
  type BatchUrgency,
  type ShipDecision,
} from '@vouch/proof-engine';
