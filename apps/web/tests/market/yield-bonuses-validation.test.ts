import { describe, expect, it } from 'vitest';

import {
  validatePurchaseScenario,
  validateYieldCurve,
} from '../../src/services/market/yield-bonus-form.validation';
import type { YieldBonusFields } from '../../src/types/yield-bonuses';
import { parseMoneyCents } from '../../src/utilities/parse-money';
const fields: YieldBonusFields = {
  shares: '10',
  fixedFees: '10',
  sellerPrice: '31,88',
  minimumPrice: '30',
  maximumPrice: '32',
  priceStep: '1',
};
describe('Scenario form validation', () => {
  it('converts decimal euros into integer cents, including explicit zero fixed cost', () => {
    expect(validatePurchaseScenario({ ...fields, fixedFees: '0' })).toEqual({
      success: true,
      data: { sellerPriceCents: 3188, shares: 10, fixedFeesCents: 0 },
    });
    expect(parseMoneyCents('1 234,56')).toBe(123456);
    expect(parseMoneyCents('31.88')).toBe(3188);
  });
  it.each([
    { shares: '0' },
    { shares: '1.5' },
    { shares: '1e2' },
    { fixedFees: '' },
    { fixedFees: '-1' },
    { fixedFees: '1,001' },
    { sellerPrice: '0' },
    { sellerPrice: '3.188,00' },
    { shares: '9007199254740992' },
  ])('rejects invalid purchase input %j', (patch) => {
    expect(validatePurchaseScenario({ ...fields, ...patch }).success).toBe(false);
  });
  it('requires only purchase fields when simulating a single price', () => {
    expect(
      validatePurchaseScenario({ ...fields, minimumPrice: '', maximumPrice: '', priceStep: '' })
        .success,
    ).toBe(true);
  });
  it.each(['0', '-1', '1e2', '1,001', '9007199254740992', '1.234,56'])(
    'rejects invalid or unsafe euro input %s',
    (value) => {
      expect(parseMoneyCents(value)).toBeNull();
    },
  );
  it('counts the maximum endpoint even for a shortened final step', () => {
    expect(
      validateYieldCurve({ ...fields, minimumPrice: '1', maximumPrice: '2,99', priceStep: '0,01' })
        .success,
    ).toBe(true);
    expect(
      validateYieldCurve({ ...fields, minimumPrice: '1', maximumPrice: '3', priceStep: '0,01' })
        .success,
    ).toBe(false);
    expect(
      validateYieldCurve({ ...fields, minimumPrice: '1', maximumPrice: '4,99', priceStep: '0,02' })
        .success,
    ).toBe(false);
  });
  it('accepts one-point ranges and rejects inverted or zero-step ranges', () => {
    expect(validateYieldCurve({ ...fields, maximumPrice: '30' }).success).toBe(true);
    expect(validateYieldCurve({ ...fields, maximumPrice: '29' }).success).toBe(false);
    expect(validateYieldCurve({ ...fields, priceStep: '0' }).success).toBe(false);
  });
});
