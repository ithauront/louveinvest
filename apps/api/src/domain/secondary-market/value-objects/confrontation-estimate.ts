import { InvalidConfrontationInputError } from '../errors/invalid-confrontation-input-error.js';

export interface MatchedConfrontation {
  readonly status: 'estimated';
  readonly executionPriceCents: number;
  readonly exchangedShares: number;
  readonly eligibleDemandShares: number;
  readonly eligibleSupplyShares: number;
  readonly unmatchedEligibleShares: number;
  /** Constant-demand/supply interval containing the selected price, inclusive. */
  readonly priceInterval: { readonly minCents: number; readonly maxCents: number };
}

export interface UnmatchedConfrontation {
  readonly status: 'empty-book' | 'no-crossing';
  readonly executionPriceCents: null;
  readonly exchangedShares: 0;
  readonly eligibleDemandShares: null;
  readonly eligibleSupplyShares: null;
  readonly unmatchedEligibleShares: null;
  readonly priceInterval: null;
}

export type ConfrontationOutcome = MatchedConfrontation | UnmatchedConfrontation;

export class ConfrontationEstimate {
  private constructor(readonly value: ConfrontationOutcome) {
    if (value.priceInterval) Object.freeze(value.priceInterval);
    Object.freeze(value);
    Object.freeze(this);
  }

  static withoutTrade(status: UnmatchedConfrontation['status']): ConfrontationEstimate {
    return new ConfrontationEstimate({
      status,
      executionPriceCents: null,
      exchangedShares: 0,
      eligibleDemandShares: null,
      eligibleSupplyShares: null,
      unmatchedEligibleShares: null,
      priceInterval: null,
    });
  }

  static matched(
    input: Omit<MatchedConfrontation, 'status' | 'unmatchedEligibleShares'>,
  ): ConfrontationEstimate {
    const {
      executionPriceCents,
      exchangedShares,
      eligibleDemandShares,
      eligibleSupplyShares,
      priceInterval,
    } = input;
    const numbers = [
      executionPriceCents,
      exchangedShares,
      eligibleDemandShares,
      eligibleSupplyShares,
      priceInterval.minCents,
      priceInterval.maxCents,
    ];
    if (
      numbers.some((n) => !Number.isSafeInteger(n) || n <= 0) ||
      exchangedShares !== Math.min(eligibleDemandShares, eligibleSupplyShares) ||
      executionPriceCents < priceInterval.minCents ||
      executionPriceCents > priceInterval.maxCents
    ) {
      throw new InvalidConfrontationInputError('estimate');
    }
    return new ConfrontationEstimate({
      ...input,
      priceInterval: { ...priceInterval },
      status: 'estimated',
      unmatchedEligibleShares: Math.abs(eligibleDemandShares - eligibleSupplyShares),
    });
  }
}
