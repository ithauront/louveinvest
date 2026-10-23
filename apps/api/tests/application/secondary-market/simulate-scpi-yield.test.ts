import { describe, expect, it, vi } from 'vitest';

import { GetScpiMarket } from '../../../src/application/secondary-market/use-cases/get-scpi-market.js';
import { GetScpiYield } from '../../../src/application/secondary-market/use-cases/get-scpi-yield.js';
import { SimulateScpiYield } from '../../../src/application/secondary-market/use-cases/simulate-scpi-yield.js';
import { AcquisitionFees } from '../../../src/domain/secondary-market/value-objects/acquisition-fees.js';
import { AnnualDividend } from '../../../src/domain/secondary-market/value-objects/annual-dividend.js';
import { yieldMarketFixture } from '../../helpers/yield-market-fixture.js';

function setup() {
  const fetch = vi.fn().mockResolvedValue(yieldMarketFixture());
  // Deliberately different rates/dividend from the Primopierre static configuration.
  const find = vi.fn().mockResolvedValue({
    dividend: new AnnualDividend(2025, 100),
    fees: new AcquisitionFees(100, 200),
    dividendSource: { url: 'https://example.com/dividend', pages: [1] },
    feesSource: { url: 'https://example.com/fees', pages: [2] },
  });
  const market = new GetScpiMarket(new Map([['another-fund', { fetch }]]));
  const reference = new GetScpiYield(market, { find }, () => new Date('2026-10-22T10:00:00Z'));
  return { useCase: new SimulateScpiYield(reference), fetch, find };
}
describe('SimulateScpiYield', () => {
  it('uses injected annual parameters and the requested price rather than last execution', async () => {
    const { useCase, find } = setup();
    const result = await useCase.execute({
      scpiId: 'another-fund',
      sellerPriceCents: 1000,
      shares: 2,
      fixedFeesCents: 40,
    });
    expect(find).toHaveBeenCalledExactlyOnceWith('another-fund', 2025);
    expect(result.simulation).toMatchObject({
      totalAcquisitionCostCents: 2100,
      annualGrossDividendCents: 200,
      annualYieldPercent: 9.5238,
    });
    expect(result.reference.dividend.source.url).toBe('https://example.com/dividend');
    expect(result.fixedFeesBasis).toBe('user-assumption');
  });
  it('uses the same sourced parameters for all curve points', async () => {
    const { useCase, find } = setup();
    const result = await useCase.executeCurve({
      scpiId: 'another-fund',
      minimumPriceCents: 1000,
      maximumPriceCents: 1200,
      priceStepCents: 100,
      shares: 2,
      fixedFeesCents: 40,
    });
    expect(find).toHaveBeenCalledOnce();
    expect(result.points).toHaveLength(3);
    expect(result.points[0]!.totalAcquisitionCostCents).toBe(2100);
  });
  it('validates purchase values before accessing the source', async () => {
    const { useCase, fetch } = setup();
    await expect(
      useCase.execute({
        scpiId: 'another-fund',
        sellerPriceCents: 0,
        shares: 1,
        fixedFeesCents: 0,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_YIELD_INPUT' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves missing annual data instead of calculating a fictional yield', async () => {
    const { useCase, find } = setup();
    find.mockResolvedValue(null);
    await expect(
      useCase.execute({
        scpiId: 'another-fund',
        sellerPriceCents: 1000,
        shares: 1,
        fixedFeesCents: 0,
      }),
    ).rejects.toMatchObject({ code: 'YIELD_DATA_UNAVAILABLE' });
  });
});
