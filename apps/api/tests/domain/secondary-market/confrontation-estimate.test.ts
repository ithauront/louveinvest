import { describe, expect, it } from 'vitest';

import { ConfrontationEstimate } from '../../../src/domain/secondary-market/value-objects/confrontation-estimate.js';

const valid = {
  executionPriceCents: 15,
  exchangedShares: 5,
  eligibleDemandShares: 5,
  eligibleSupplyShares: 7,
  priceInterval: { minCents: 10, maxCents: 20 },
};

describe('ConfrontationEstimate', () => {
  it('protects the result and its interval from mutation without freezing caller objects', () => {
    const result = ConfrontationEstimate.matched(valid);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.priceInterval)).toBe(true);
    expect(Object.isFrozen(valid.priceInterval)).toBe(false);
    expect(result.value.unmatchedEligibleShares).toBe(2);
  });
  it.each(['empty-book', 'no-crossing'] as const)(
    'represents %s with null price and zero exchanges',
    (status) => {
      expect(ConfrontationEstimate.withoutTrade(status).value).toMatchObject({
        status,
        executionPriceCents: null,
        exchangedShares: 0,
      });
    },
  );
  it.each([
    { ...valid, executionPriceCents: 21 },
    { ...valid, exchangedShares: 0 },
    { ...valid, exchangedShares: 4 },
    { ...valid, eligibleDemandShares: NaN },
    { ...valid, priceInterval: { minCents: 20, maxCents: 10 } },
  ])('rejects inconsistent estimated results', (input) => {
    expect(() => ConfrontationEstimate.matched(input)).toThrow(
      expect.objectContaining({ code: 'INVALID_CONFRONTATION_INPUT', field: 'estimate' }),
    );
  });
});
