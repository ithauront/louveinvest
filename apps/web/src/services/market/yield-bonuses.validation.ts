import type {
  PurchaseScenario,
  PurchaseScenarioInput,
  YieldCurveInput,
} from '../../types/yield-bonuses';
import { integer, invalid, list, literal, object } from '../response.validation';
import { parseScpiYield } from './yield.validation';

function scenario(value: unknown): PurchaseScenario {
  const item = object(value);
  const annualYieldPercent = item.annualYieldPercent;
  if (
    typeof annualYieldPercent !== 'number' ||
    !Number.isFinite(annualYieldPercent) ||
    annualYieldPercent < 0
  )
    return invalid();
  return {
    sellerPriceCents: integer(item.sellerPriceCents),
    shares: integer(item.shares),
    fixedFeesCents: integer(item.fixedFeesCents, 0),
    totalAcquisitionCostCents: integer(item.totalAcquisitionCostCents),
    acquisitionCostPerShareCents: integer(item.acquisitionCostPerShareCents),
    annualGrossDividendCents: integer(item.annualGrossDividendCents, 0),
    annualYieldPercent,
  };
}
function context(value: unknown, scpiId: string) {
  const root = object(value),
    reference = parseScpiYield(root.reference);
  if (reference.scpi.id !== scpiId) return invalid();
  return { reference, fixedFeesBasis: literal(root.fixedFeesBasis, 'user-assumption') };
}
export function parseYieldSimulation(value: unknown, scpiId: string, input: PurchaseScenarioInput) {
  const simulation = scenario(object(value).simulation);
  if (
    simulation.sellerPriceCents !== input.sellerPriceCents ||
    simulation.shares !== input.shares ||
    simulation.fixedFeesCents !== input.fixedFeesCents
  )
    return invalid();
  return { ...context(value, scpiId), simulation };
}
export function parseYieldCurve(value: unknown, scpiId: string, input: YieldCurveInput) {
  const points = list(object(value).points, scenario, 200);
  const distance = BigInt(input.maximumPriceCents) - BigInt(input.minimumPriceCents);
  const step = BigInt(input.priceStepCents);
  const count = distance / step + 1n + (distance % step === 0n ? 0n : 1n);
  if (!points.length || BigInt(points.length) !== count) return invalid();
  points.forEach((point, index) => {
    const candidate = BigInt(input.minimumPriceCents) + BigInt(index) * step;
    const expectedPrice =
      candidate > BigInt(input.maximumPriceCents) ? input.maximumPriceCents : Number(candidate);
    if (
      point.sellerPriceCents !== expectedPrice ||
      point.shares !== input.shares ||
      point.fixedFeesCents !== input.fixedFeesCents
    )
      return invalid();
  });
  return { ...context(value, scpiId), points };
}
