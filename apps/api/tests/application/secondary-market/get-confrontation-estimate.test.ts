import { describe, expect, it, vi } from 'vitest';

import { MarketSourceError } from '../../../src/application/secondary-market/errors/market-source-error.js';
import { GetConfrontationEstimate } from '../../../src/application/secondary-market/use-cases/get-confrontation-estimate.js';
import { GetScpiMarket } from '../../../src/application/secondary-market/use-cases/get-scpi-market.js';
import { yieldMarketFixture } from '../../helpers/yield-market-fixture.js';

function setup() {
  const market = yieldMarketFixture();
  const fetch = vi.fn().mockResolvedValue({
    ...market,
    orderBook: {
      ...market.orderBook,
      bids: [{ sellerLimitCents: 2000, buyerLimitCents: 2196, shares: 10, orderCount: 2 }],
      asks: [{ sellerLimitCents: 1000, shares: 7, orderCount: 1 }],
    },
  });
  const useCase = new GetConfrontationEstimate(
    new GetScpiMarket(new Map([['primopierre', { fetch }]])),
  );
  return { market, fetch, useCase };
}

describe('GetConfrontationEstimate', () => {
  it('uses seller limits and preserves collection, next date and partial-book explanations', async () => {
    const { market, useCase } = setup();
    const result = await useCase.execute({ scpiId: 'primopierre' });
    expect(result).toMatchObject({
      source: market.source,
      nextConfrontation: market.nextConfrontation,
      referencePriceCents: 3188,
      coverage: 'public-top-5-levels',
      estimate: { status: 'estimated', executionPriceCents: 2000, exchangedShares: 7 },
    });
    expect(result.assumptions).toHaveLength(4);
    expect(result.limitations).toHaveLength(3);
  });
  it('returns an explicit empty-book observation instead of throwing a technical error', async () => {
    const { market, fetch, useCase } = setup();
    fetch.mockResolvedValue(market);
    expect((await useCase.execute({ scpiId: 'primopierre' })).estimate.status).toBe('empty-book');
  });
  it('keeps stale warnings and the original timestamp', async () => {
    const { market, fetch, useCase } = setup();
    fetch.mockResolvedValue({
      ...market,
      freshness: 'stale',
      warnings: [{ code: 'STALE_DATA', message: 'Last valid data' }],
    });
    expect(await useCase.execute({ scpiId: 'primopierre' })).toMatchObject({
      freshness: 'stale',
      source: market.source,
      warnings: [{ code: 'STALE_DATA', message: 'Last valid data' }],
    });
  });
  it('rejects unknown SCPI without fetching', async () => {
    const { fetch, useCase } = setup();
    await expect(useCase.execute({ scpiId: 'unknown' })).rejects.toMatchObject({
      name: 'ScpiNotFoundError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('propagates source errors', async () => {
    const { fetch, useCase } = setup();
    const error = new MarketSourceError('SOURCE_TIMEOUT', 'Timeout');
    fetch.mockRejectedValue(error);
    await expect(useCase.execute({ scpiId: 'primopierre' })).rejects.toBe(error);
  });
});
