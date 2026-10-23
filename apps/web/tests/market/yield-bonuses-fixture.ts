import type {
  PurchaseScenarioInput,
  YieldCurveInput,
  YieldCurveResult,
  YieldSimulationResult,
} from '../../src/types/yield-bonuses';
import { yieldFixture } from './yield-fixture';
export const purchaseInput: PurchaseScenarioInput = {
  sellerPriceCents: 3188,
  shares: 10,
  fixedFeesCents: 1000,
};
export const curveInput: YieldCurveInput = {
  minimumPriceCents: 3000,
  maximumPriceCents: 3200,
  priceStepCents: 100,
  shares: 10,
  fixedFeesCents: 1000,
};
export function simulationFixture(): YieldSimulationResult {
  return {
    reference: yieldFixture(),
    fixedFeesBasis: 'user-assumption',
    simulation: {
      ...purchaseInput,
      totalAcquisitionCostCents: 36004,
      acquisitionCostPerShareCents: 3600,
      annualGrossDividendCents: 4560,
      annualYieldPercent: 12.6652,
    },
  };
}
export function curveFixture(): YieldCurveResult {
  return {
    reference: yieldFixture(),
    fixedFeesBasis: 'user-assumption',
    points: [
      {
        sellerPriceCents: 3000,
        totalAcquisitionCostCents: 33940,
        acquisitionCostPerShareCents: 3394,
        annualYieldPercent: 13.4355,
      },
      {
        sellerPriceCents: 3100,
        totalAcquisitionCostCents: 35038,
        acquisitionCostPerShareCents: 3504,
        annualYieldPercent: 13.0144,
      },
      {
        sellerPriceCents: 3200,
        totalAcquisitionCostCents: 36136,
        acquisitionCostPerShareCents: 3614,
        annualYieldPercent: 12.619,
      },
    ].map((point) => ({
      ...point,
      shares: 10,
      fixedFeesCents: 1000,
      annualGrossDividendCents: 4560,
    })),
  };
}
