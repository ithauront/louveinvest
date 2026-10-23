import type { ScpiMarket } from './market';

export interface EstimatedConfrontation {
  status: 'estimated';
  executionPriceCents: number;
  exchangedShares: number;
  eligibleDemandShares: number;
  eligibleSupplyShares: number;
  unmatchedEligibleShares: number;
  priceInterval: { minCents: number; maxCents: number };
}

export interface ConfrontationWithoutTrade {
  status: 'empty-book' | 'no-crossing';
  executionPriceCents: null;
  exchangedShares: 0;
  eligibleDemandShares: null;
  eligibleSupplyShares: null;
  unmatchedEligibleShares: null;
  priceInterval: null;
}

export interface ScpiConfrontation extends Pick<
  ScpiMarket,
  'scpi' | 'source' | 'freshness' | 'warnings' | 'nextConfrontation'
> {
  referencePriceCents: number;
  coverage: 'public-top-5-levels';
  estimate: EstimatedConfrontation | ConfrontationWithoutTrade;
  assumptions: string[];
  limitations: string[];
}
