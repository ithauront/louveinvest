import { describe, expect, it } from 'vitest';

import { InvalidYieldInputError } from '../../../src/domain/secondary-market/errors/invalid-yield-input-error.js';
import { CalculateInvestmentYield } from '../../../src/domain/secondary-market/services/calculate-investment-yield.js';
import { AcquisitionFees } from '../../../src/domain/secondary-market/value-objects/acquisition-fees.js';
import { AnnualDividend } from '../../../src/domain/secondary-market/value-objects/annual-dividend.js';

const calculator = new CalculateInvestmentYield();

describe('AnnualDividend', () => {
  it('represents a whole-year gross dividend, including a legitimate zero', () => {
    expect(new AnnualDividend(2025, 456).grossPerShareCents).toBe(456);
    expect(new AnnualDividend(2025, 0).grossPerShareCents).toBe(0);
    expect(Object.isFrozen(new AnnualDividend(2025, 456))).toBe(true);
  });
  it.each([1899, 10_000, 2025.5, NaN])('rejects invalid year %s', (year) => {
    expect(() => new AnnualDividend(year, 456)).toThrow(
      expect.objectContaining({ code: 'INVALID_YIELD_INPUT', field: 'year' }),
    );
  });
  it.each([-1, 4.56, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid dividend cents %s',
    (cents) => {
      expect(() => new AnnualDividend(2025, cents)).toThrow(
        expect.objectContaining({ field: 'grossPerShareCents' }),
      );
    },
  );
});

describe('AcquisitionFees', () => {
  it('uses basis points and supports zero fees', () => {
    expect(new AcquisitionFees(480, 500).commissionBasisPoints).toBe(480);
    expect(new AcquisitionFees(0, 0).registrationBasisPoints).toBe(0);
    expect(Object.isFrozen(new AcquisitionFees(480, 500))).toBe(true);
  });
  it.each([-1, 0.5, 10_001, NaN, Infinity])('rejects invalid rates %s in either field', (rate) => {
    expect(() => new AcquisitionFees(rate, 500)).toThrow(
      expect.objectContaining({ field: 'commissionBasisPoints' }),
    );
    expect(() => new AcquisitionFees(480, rate)).toThrow(
      expect.objectContaining({ field: 'registrationBasisPoints' }),
    );
  });
});

describe('CalculateInvestmentYield', () => {
  it('calculates Primopierre using gross dividend and unrounded proportional cost', () => {
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 456),
        fees: new AcquisitionFees(480, 500),
        sellerPriceCents: 3188,
      }),
    ).toEqual({ acquisitionCostPerShareCents: 3500, annualYieldPercent: 13.027 });
  });
  it('adds both fees on seller price rather than compounding rates', () => {
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 1100),
        fees: new AcquisitionFees(500, 500),
        sellerPriceCents: 10_000,
      }),
    ).toEqual({ acquisitionCostPerShareCents: 11_000, annualYieldPercent: 10 });
  });
  it('does not round acquisition cost before calculating yield', () => {
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 1),
        fees: new AcquisitionFees(480, 500),
        sellerPriceCents: 1,
      }),
    ).toEqual({ acquisitionCostPerShareCents: 1, annualYieldPercent: 91.0747 });
  });
  it('rounds ties half-up for both displayed cents and percentage decimals', () => {
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 1),
        fees: new AcquisitionFees(1000, 0),
        sellerPriceCents: 5,
      }).acquisitionCostPerShareCents,
    ).toBe(6);
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 1),
        fees: new AcquisitionFees(0, 0),
        sellerPriceCents: 128,
      }).annualYieldPercent,
    ).toBe(0.7813);
  });
  it('returns zero yield for zero dividend and supports yields exceeding 100%', () => {
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 0),
        fees: new AcquisitionFees(0, 0),
        sellerPriceCents: 100,
      }).annualYieldPercent,
    ).toBe(0);
    expect(
      calculator.execute({
        dividend: new AnnualDividend(2025, 200),
        fees: new AcquisitionFees(0, 0),
        sellerPriceCents: 100,
      }).annualYieldPercent,
    ).toBe(200);
  });
  it.each([0, -1, 31.88, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid denominator price %s',
    (sellerPriceCents) => {
      expect(() =>
        calculator.execute({
          dividend: new AnnualDividend(2025, 456),
          fees: new AcquisitionFees(480, 500),
          sellerPriceCents,
        }),
      ).toThrow(expect.objectContaining({ field: 'sellerPriceCents' }));
    },
  );
  it('rejects results exceeding safe output precision instead of silently losing cents', () => {
    expect(() =>
      calculator.execute({
        dividend: new AnnualDividend(2025, 456),
        fees: new AcquisitionFees(480, 500),
        sellerPriceCents: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow(InvalidYieldInputError);
    expect(() =>
      calculator.execute({
        dividend: new AnnualDividend(2025, Number.MAX_SAFE_INTEGER),
        fees: new AcquisitionFees(0, 0),
        sellerPriceCents: 1,
      }),
    ).toThrow(expect.objectContaining({ field: 'resultPrecision' }));
  });
});
