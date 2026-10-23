import { describe, expect, it } from 'vitest';

import { InvalidYieldInputError } from '../../../src/domain/secondary-market/errors/invalid-yield-input-error.js';
import { CalculatePurchaseYield } from '../../../src/domain/secondary-market/services/calculate-purchase-yield.js';
import { CalculateYieldCurve } from '../../../src/domain/secondary-market/services/calculate-yield-curve.js';
import { AcquisitionFees } from '../../../src/domain/secondary-market/value-objects/acquisition-fees.js';
import { AnnualDividend } from '../../../src/domain/secondary-market/value-objects/annual-dividend.js';
import { YieldSimulation } from '../../../src/domain/secondary-market/value-objects/yield-simulation.js';

const dividend = new AnnualDividend(2025, 456);
const fees = new AcquisitionFees(480, 500);
const calculator = new CalculatePurchaseYield();
const calculate = (shares = 10, fixedFeesCents = 1000, sellerPriceCents = 3188) =>
  calculator.execute({
    dividend,
    fees,
    purchase: new YieldSimulation({ shares, fixedFeesCents, sellerPriceCents }),
  });
describe('Purchase yield', () => {
  it('applies proportional fees to seller price and a fixed fee once per purchase', () => {
    expect(calculate()).toEqual({
      shares: 10,
      fixedFeesCents: 1000,
      sellerPriceCents: 3188,
      totalAcquisitionCostCents: 36004,
      acquisitionCostPerShareCents: 3600,
      annualGrossDividendCents: 4560,
      annualYieldPercent: 12.6652,
    });
  });
  it('matches the reference yield with zero fixed fees', () => {
    expect(calculate(1, 0)).toMatchObject({
      acquisitionCostPerShareCents: 3500,
      annualYieldPercent: 13.027,
    });
  });
  it('dilutes the fixed cost with additional shares', () => {
    expect(calculate(100).annualYieldPercent).toBeGreaterThan(calculate(10).annualYieldPercent);
  });
  it('rounds the total once instead of multiplying a rounded unit price', () => {
    const result = calculate(10, 0);
    expect(result.totalAcquisitionCostCents).toBe(35004);
    expect(result.totalAcquisitionCostCents).not.toBe(result.acquisitionCostPerShareCents * 10);
  });
  it('returns zero yield for a zero dividend', () => {
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 0),
        fees,
        purchase: new YieldSimulation({ shares: 1, fixedFeesCents: 0, sellerPriceCents: 1 }),
      }).annualYieldPercent,
    ).toBe(0);
  });
  it.each([
    { shares: 0 },
    { shares: 1.5 },
    { shares: Infinity },
    { fixedFeesCents: -1 },
    { fixedFeesCents: NaN },
    { sellerPriceCents: 0 },
    { sellerPriceCents: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects invalid input %j', (patch) => {
    expect(
      () => new YieldSimulation({ shares: 1, fixedFeesCents: 0, sellerPriceCents: 100, ...patch }),
    ).toThrow(InvalidYieldInputError);
  });
  it('rejects a total that cannot be represented safely', () => {
    expect(() => calculate(Number.MAX_SAFE_INTEGER)).toThrow(InvalidYieldInputError);
  });
});
const curveInput = {
  minimumPriceCents: 3000,
  maximumPriceCents: 3200,
  priceStepCents: 100,
  shares: 10,
  fixedFeesCents: 1000,
};
describe('Yield curve', () => {
  const curve = new CalculateYieldCurve();
  it('returns ascending prices and descending yields with the same purchase assumptions', () => {
    const points = curve.execute(curveInput, dividend, fees);
    expect(points.map((p) => p.sellerPriceCents)).toEqual([3000, 3100, 3200]);
    expect(points[0]!.annualYieldPercent).toBeGreaterThan(points[1]!.annualYieldPercent);
    expect(points[1]!.annualYieldPercent).toBeGreaterThan(points[2]!.annualYieldPercent);
    expect(points.every((p) => p.shares === 10 && p.fixedFeesCents === 1000)).toBe(true);
  });
  it('includes the maximum when the final interval is shorter', () => {
    expect(
      curve
        .execute({ ...curveInput, maximumPriceCents: 3150 }, dividend, fees)
        .map((p) => p.sellerPriceCents),
    ).toEqual([3000, 3100, 3150]);
  });
  it('returns one point for equal bounds', () => {
    expect(curve.execute({ ...curveInput, maximumPriceCents: 3000 }, dividend, fees)).toHaveLength(
      1,
    );
  });
  it('allows exactly 200 points', () => {
    expect(
      curve.execute(
        { ...curveInput, minimumPriceCents: 1, maximumPriceCents: 200, priceStepCents: 1 },
        dividend,
        fees,
      ),
    ).toHaveLength(200);
  });
  it.each([
    { minimumPriceCents: 0 },
    { maximumPriceCents: 2999 },
    { priceStepCents: 0 },
    { priceStepCents: 0.5 },
    { maximumPriceCents: Number.MAX_SAFE_INTEGER, priceStepCents: 1 },
  ])('rejects invalid or excessive ranges %j', (patch) => {
    expect(() => curve.execute({ ...curveInput, ...patch }, dividend, fees)).toThrow(
      InvalidYieldInputError,
    );
  });
});
