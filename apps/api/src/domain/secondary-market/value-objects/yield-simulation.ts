import { InvalidYieldInputError } from '../errors/invalid-yield-input-error.js';

export interface YieldSimulationInput {
  sellerPriceCents: number;
  shares: number;
  /** Total fixed cost for the whole purchase, explicitly supplied as a hypothesis. */
  fixedFeesCents: number;
}

export class YieldSimulation {
  readonly sellerPriceCents: number;
  readonly shares: number;
  readonly fixedFeesCents: number;

  constructor(input: YieldSimulationInput) {
    for (const field of ['sellerPriceCents', 'shares', 'fixedFeesCents'] as const) {
      const minimum = field === 'fixedFeesCents' ? 0 : 1;
      if (!Number.isSafeInteger(input[field]) || input[field] < minimum)
        throw new InvalidYieldInputError(field);
    }
    this.sellerPriceCents = input.sellerPriceCents;
    this.shares = input.shares;
    this.fixedFeesCents = input.fixedFeesCents;
    Object.freeze(this);
  }
}
