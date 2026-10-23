import type { ScpiYield } from './yield';

export interface PurchaseScenarioInput {
  sellerPriceCents: number;
  shares: number;
  fixedFeesCents: number;
}
export interface YieldCurveInput {
  minimumPriceCents: number;
  maximumPriceCents: number;
  priceStepCents: number;
  shares: number;
  fixedFeesCents: number;
}
export interface PurchaseScenario extends PurchaseScenarioInput {
  totalAcquisitionCostCents: number;
  acquisitionCostPerShareCents: number;
  annualGrossDividendCents: number;
  annualYieldPercent: number;
}
export interface YieldSimulationResult {
  reference: ScpiYield;
  fixedFeesBasis: 'user-assumption';
  simulation: PurchaseScenario;
}
export interface YieldCurveResult {
  reference: ScpiYield;
  fixedFeesBasis: 'user-assumption';
  points: PurchaseScenario[];
}
export interface YieldBonusFields {
  shares: string;
  fixedFees: string;
  sellerPrice: string;
  minimumPrice: string;
  maximumPrice: string;
  priceStep: string;
}
export type YieldBonusErrors = Partial<Record<keyof YieldBonusFields, string>>;
