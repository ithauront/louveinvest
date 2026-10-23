import type { AcquisitionFees } from '../value-objects/acquisition-fees.js';
import type { AnnualDividend } from '../value-objects/annual-dividend.js';
import type { YieldSimulation } from '../value-objects/yield-simulation.js';
import { roundRatio } from './yield-arithmetic.js';

export class CalculatePurchaseYield {
  execute(input: { dividend: AnnualDividend; fees: AcquisitionFees; purchase: YieldSimulation }) {
    const { dividend, fees, purchase } = input;
    const basisPointScale = 10_000n;
    const shares = BigInt(purchase.shares);
    // Fixed fees apply once to the whole purchase. Never multiply a rounded unit cost.
    const costNumerator =
      shares *
        BigInt(purchase.sellerPriceCents) *
        (basisPointScale +
          BigInt(fees.commissionBasisPoints) +
          BigInt(fees.registrationBasisPoints)) +
      BigInt(purchase.fixedFeesCents) * basisPointScale;
    const annualDividend = shares * BigInt(dividend.grossPerShareCents);
    return {
      ...purchase,
      totalAcquisitionCostCents: roundRatio(costNumerator, basisPointScale),
      acquisitionCostPerShareCents: roundRatio(costNumerator, basisPointScale * shares),
      annualGrossDividendCents: roundRatio(annualDividend, 1n),
      annualYieldPercent:
        roundRatio(annualDividend * basisPointScale * 100n * 10_000n, costNumerator) / 10_000,
    };
  }
}
