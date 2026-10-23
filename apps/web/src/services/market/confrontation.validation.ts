import type { ScpiConfrontation } from '../../types/confrontation';
import { date, integer, invalid, list, literal, object, text } from '../response.validation';
import { parseMarketContext } from './market.validation';

function outcome(value: unknown): ScpiConfrontation['estimate'] {
  const estimate = object(value);
  if (estimate.status === 'empty-book' || estimate.status === 'no-crossing') {
    if (
      estimate.exchangedShares !== 0 ||
      [
        'executionPriceCents',
        'eligibleDemandShares',
        'eligibleSupplyShares',
        'unmatchedEligibleShares',
        'priceInterval',
      ].some((field) => estimate[field] !== null)
    )
      return invalid();
    return {
      status: estimate.status,
      exchangedShares: 0,
      executionPriceCents: null,
      eligibleDemandShares: null,
      eligibleSupplyShares: null,
      unmatchedEligibleShares: null,
      priceInterval: null,
    };
  }
  if (estimate.status !== 'estimated') return invalid();
  const interval = object(estimate.priceInterval);
  const minCents = integer(interval.minCents),
    maxCents = integer(interval.maxCents);
  const executionPriceCents = integer(estimate.executionPriceCents);
  if (minCents > maxCents || executionPriceCents < minCents || executionPriceCents > maxCents)
    return invalid();
  return {
    status: 'estimated',
    executionPriceCents,
    exchangedShares: integer(estimate.exchangedShares),
    eligibleDemandShares: integer(estimate.eligibleDemandShares),
    eligibleSupplyShares: integer(estimate.eligibleSupplyShares),
    unmatchedEligibleShares: integer(estimate.unmatchedEligibleShares, 0),
    priceInterval: { minCents, maxCents },
  };
}

export function parseScpiConfrontation(value: unknown): ScpiConfrontation {
  const root = object(value);
  const assumptions = list(root.assumptions, text),
    limitations = list(root.limitations, text);
  if (!assumptions.length || !limitations.length) return invalid();
  return {
    ...parseMarketContext(value),
    nextConfrontation: { localDateTime: date(object(root.nextConfrontation).localDateTime, true) },
    referencePriceCents: integer(root.referencePriceCents),
    coverage: literal(root.coverage, 'public-top-5-levels'),
    estimate: outcome(root.estimate),
    assumptions,
    limitations,
  };
}
