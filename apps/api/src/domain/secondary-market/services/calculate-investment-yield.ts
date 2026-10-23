import { InvalidYieldInputError } from '../errors/invalid-yield-input-error.js';
import type { AcquisitionFees } from '../value-objects/acquisition-fees.js';
import type { AnnualDividend } from '../value-objects/annual-dividend.js';
import { roundRatio } from './yield-arithmetic.js';

export interface InvestmentYield {
  /** For display: half-up rounded to the nearest cent. */
  readonly acquisitionCostPerShareCents: number;
  /** Percentage rounded half-up to 4 decimals using the unrounded acquisition cost. */
  readonly annualYieldPercent: number;
}

export class CalculateInvestmentYield {
  execute(input: {
    dividend: AnnualDividend;
    fees: AcquisitionFees;
    sellerPriceCents: number;
  }): InvestmentYield {
    const { dividend, fees, sellerPriceCents } = input;
    if (!Number.isSafeInteger(sellerPriceCents) || sellerPriceCents <= 0) {
      throw new InvalidYieldInputError('sellerPriceCents');
    }
    const basisPointScale = 10_000n;
    const percentageScale = 100n;
    const yieldDecimalScale = 10_000n;
    // Exact rational cost in cent-basis-points; no early rounding of fees or denominator.
    const costNumerator =
      BigInt(sellerPriceCents) *
      (basisPointScale + BigInt(fees.commissionBasisPoints) + BigInt(fees.registrationBasisPoints));
    return {
      acquisitionCostPerShareCents: roundRatio(costNumerator, basisPointScale),
      annualYieldPercent:
        roundRatio(
          BigInt(dividend.grossPerShareCents) *
            basisPointScale *
            percentageScale *
            yieldDecimalScale,
          costNumerator,
        ) / Number(yieldDecimalScale),
    };
  }
}
