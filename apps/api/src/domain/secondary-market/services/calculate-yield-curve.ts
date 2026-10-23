import { InvalidYieldInputError } from '../errors/invalid-yield-input-error.js';
import type { AcquisitionFees } from '../value-objects/acquisition-fees.js';
import type { AnnualDividend } from '../value-objects/annual-dividend.js';
import { YieldSimulation } from '../value-objects/yield-simulation.js';
import { CalculatePurchaseYield } from './calculate-purchase-yield.js';

export const MAXIMUM_YIELD_CURVE_POINTS = 200;
export interface YieldCurveInput {
  minimumPriceCents: number;
  maximumPriceCents: number;
  priceStepCents: number;
  shares: number;
  fixedFeesCents: number;
}

export class CalculateYieldCurve {
  constructor(private readonly calculator = new CalculatePurchaseYield()) {}

  execute(input: YieldCurveInput, dividend: AnnualDividend, fees: AcquisitionFees) {
    const { minimumPriceCents, maximumPriceCents, priceStepCents, shares, fixedFeesCents } = input;
    for (const field of ['minimumPriceCents', 'maximumPriceCents', 'priceStepCents'] as const) {
      if (!Number.isSafeInteger(input[field]) || input[field] <= 0)
        throw new InvalidYieldInputError(field);
    }
    if (maximumPriceCents < minimumPriceCents)
      throw new InvalidYieldInputError('maximumPriceCents');
    const distance = BigInt(maximumPriceCents) - BigInt(minimumPriceCents);
    const step = BigInt(priceStepCents);
    // Include the maximum endpoint even when the last interval is shorter than the step.
    const count = distance / step + 1n + (distance % step === 0n ? 0n : 1n);
    if (count > BigInt(MAXIMUM_YIELD_CURVE_POINTS)) throw new InvalidYieldInputError('pointCount');
    return Array.from({ length: Number(count) }, (_, index) => {
      const candidate = BigInt(minimumPriceCents) + BigInt(index) * step;
      const sellerPriceCents = Number(
        candidate > BigInt(maximumPriceCents) ? BigInt(maximumPriceCents) : candidate,
      );
      return this.calculator.execute({
        dividend,
        fees,
        purchase: new YieldSimulation({ sellerPriceCents, shares, fixedFeesCents }),
      });
    });
  }
}
