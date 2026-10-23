import { describe, expect, it, vi } from 'vitest';

import { MarketSourceError } from '../../../src/application/secondary-market/errors/market-source-error.js';
import { GetScpiMarket } from '../../../src/application/secondary-market/use-cases/get-scpi-market.js';
import { GetScpiYield } from '../../../src/application/secondary-market/use-cases/get-scpi-yield.js';
import { AcquisitionFees } from '../../../src/domain/secondary-market/value-objects/acquisition-fees.js';
import { AnnualDividend } from '../../../src/domain/secondary-market/value-objects/annual-dividend.js';
import { yieldMarketFixture } from '../../helpers/yield-market-fixture.js';

const parameters = {
  dividend: new AnnualDividend(2025, 456),
  fees: new AcquisitionFees(480, 500),
  dividendSource: { url: 'https://example.com/annual', pages: [6] },
  feesSource: { url: 'https://example.com/fees', pages: [20, 24] },
};
function setup(date = '2026-10-22T10:00:00Z') {
  const snapshot = yieldMarketFixture();
  const fetch = vi.fn().mockResolvedValue(snapshot);
  const find = vi.fn().mockResolvedValue(parameters);
  const getMarket = new GetScpiMarket(new Map([['primopierre', { fetch }]]));
  const useCase = new GetScpiYield(getMarket, { find }, () => new Date(date));
  return { snapshot, fetch, find, useCase };
}

describe('GetScpiYield', () => {
  it('calculates from seller price and includes the reference year, fees and provenance', async () => {
    const { useCase, snapshot, find } = setup();
    const result = await useCase.execute({ scpiId: 'primopierre' });
    expect(find).toHaveBeenCalledExactlyOnceWith('primopierre', 2025);
    expect(result).toMatchObject({
      annualYieldPercent: 13.027,
      acquisitionCostPerShareCents: 3500,
      execution: snapshot.lastExecution,
      dividend: { year: 2025, grossPerShareCents: 456, source: parameters.dividendSource },
      fees: {
        commissionBasisPoints: 480,
        registrationBasisPoints: 500,
        fixedFeesIncluded: false,
        source: parameters.feesSource,
      },
    });
  });
  it('uses the current French civil year, including the UTC/Paris new-year boundary', async () => {
    const { useCase, find } = setup('2026-12-31T23:30:00Z');
    find.mockResolvedValue(null);
    await expect(useCase.execute({ scpiId: 'primopierre' })).rejects.toMatchObject({
      code: 'YIELD_DATA_UNAVAILABLE',
      dividendYear: 2026,
    });
    expect(find).toHaveBeenCalledWith('primopierre', 2026);
  });
  it('never silently reuses a dividend for the wrong year', async () => {
    const { useCase, find } = setup();
    find.mockResolvedValue({ ...parameters, dividend: new AnnualDividend(2024, 638) });
    await expect(useCase.execute({ scpiId: 'primopierre' })).rejects.toMatchObject({
      code: 'YIELD_DATA_UNAVAILABLE',
    });
  });
  it('reports missing parameters explicitly rather than inventing a zero yield', async () => {
    const { useCase, find } = setup();
    find.mockResolvedValue(null);
    await expect(useCase.execute({ scpiId: 'primopierre' })).rejects.toMatchObject({
      code: 'YIELD_DATA_UNAVAILABLE',
    });
  });
  it('propagates the stale indication and retains the market collection time', async () => {
    const { useCase, fetch, snapshot } = setup();
    fetch.mockResolvedValue({
      ...snapshot,
      freshness: 'stale',
      warnings: [{ code: 'STALE_DATA', message: 'Last valid collection' }],
    });
    expect(await useCase.execute({ scpiId: 'primopierre' })).toMatchObject({
      freshness: 'stale',
      warnings: [{ code: 'STALE_DATA', message: 'Last valid collection' }],
      source: snapshot.source,
    });
  });
  it('does not fetch annual parameters for unknown SCPI', async () => {
    const { useCase, find } = setup();
    await expect(useCase.execute({ scpiId: 'unknown' })).rejects.toMatchObject({
      name: 'ScpiNotFoundError',
    });
    expect(find).not.toHaveBeenCalled();
  });
  it('preserves market failures', async () => {
    const { useCase, fetch } = setup();
    const error = new MarketSourceError('SOURCE_TIMEOUT', 'Timeout');
    fetch.mockRejectedValue(error);
    await expect(useCase.execute({ scpiId: 'primopierre' })).rejects.toBe(error);
  });
});
