import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';
import { MarketSourceError } from '../../src/application/secondary-market/errors/market-source-error.js';
import { marketHtml } from '../helpers/market-fixture.js';
import { yieldMarketFixture } from '../helpers/yield-market-fixture.js';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllGlobals();
});
const url = '/api/scpis/primopierre/confrontation-estimate';
function setup() {
  const market = yieldMarketFixture();
  const fetch = vi.fn().mockResolvedValue({
    ...market,
    orderBook: {
      ...market.orderBook,
      bids: [{ sellerLimitCents: 2000, buyerLimitCents: 2196, shares: 10, orderCount: 1 }],
      asks: [{ sellerLimitCents: 1000, shares: 7, orderCount: 1 }],
    },
  });
  app = buildApp({
    logger: false,
    marketDataSources: new Map([['primopierre', { fetch }]]),
    now: () => new Date('2026-10-22T10:00:00Z'),
  });
  return { app, fetch, market };
}

describe('GET /api/scpis/:scpiId/confrontation-estimate', () => {
  it('returns price, traded quantity, interval, provenance and limitations', async () => {
    const { app } = setup();
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toMatchObject({
      coverage: 'public-top-5-levels',
      freshness: 'fresh',
      warnings: [],
      estimate: {
        status: 'estimated',
        executionPriceCents: 2000,
        exchangedShares: 7,
        eligibleDemandShares: 10,
        eligibleSupplyShares: 7,
        unmatchedEligibleShares: 3,
        priceInterval: { minCents: 1000, maxCents: 2000 },
      },
    });
    expect(response.json().limitations).toHaveLength(3);
    expect(response.json().assumptions).toHaveLength(4);
  });
  it.each(['empty-book', 'no-crossing'])(
    'returns 200 with a nullable price for %s',
    async (status) => {
      const { app, fetch, market } = setup();
      const book =
        status === 'empty-book'
          ? market.orderBook
          : {
              ...market.orderBook,
              bids: [{ sellerLimitCents: 1000, buyerLimitCents: 1098, shares: 1, orderCount: 1 }],
              asks: [{ sellerLimitCents: 2000, shares: 1, orderCount: 1 }],
            };
      fetch.mockResolvedValue({ ...market, orderBook: book });
      const response = await app.inject(url);
      expect(response.statusCode).toBe(200);
      expect(response.json().estimate).toEqual({
        status,
        executionPriceCents: null,
        exchangedShares: 0,
        eligibleDemandShares: null,
        eligibleSupplyShares: null,
        unmatchedEligibleShares: null,
        priceInterval: null,
      });
    },
  );
  it('shares one cache across all three endpoints', async () => {
    const { app, fetch } = setup();
    for (const path of ['/api/scpis/primopierre/market', '/api/scpis/primopierre/yield', url]) {
      expect((await app.inject(path)).statusCode).toBe(200);
    }
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('preserves stale state after refresh failure', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const { app, fetch, market } = setup();
    await app.inject(url);
    clock.mockReturnValue(30 * 60_000);
    fetch.mockRejectedValue(new MarketSourceError('SOURCE_TIMEOUT', 'private diagnostics'));
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ source: market.source, freshness: 'stale' });
    expect(response.json().warnings[0].code).toBe('STALE_DATA');
  });
  it('rejects invalid and unknown identifiers before fetching', async () => {
    const { app, fetch } = setup();
    expect((await app.inject('/api/scpis/Primopierre/confrontation-estimate')).statusCode).toBe(
      400,
    );
    expect((await app.inject('/api/scpis/unknown/confrontation-estimate')).statusCode).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ['SOURCE_TIMEOUT', 504],
    ['SOURCE_UNAVAILABLE', 502],
    ['SOURCE_FORMAT_CHANGED', 502],
  ] as const)('translates %s without exposing internals', async (code, status) => {
    const { app, fetch } = setup();
    fetch.mockRejectedValue(new MarketSourceError(code, 'private'));
    const response = await app.inject(url);
    expect(response.statusCode).toBe(status);
    expect(response.json().error.code).toBe(code);
    expect(response.body).not.toContain('private');
  });
  it('maps unexpected failures to 500', async () => {
    const { app, fetch } = setup();
    fetch.mockRejectedValue(new TypeError('private bug'));
    const response = await app.inject(url);
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('INTERNAL_ERROR');
  });
  it('runs production composition through HTTP, fixture parsing and the estimator without live network', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(marketHtml, { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    app = buildApp({ logger: false });
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.json().estimate).toMatchObject({
      executionPriceCents: 2000,
      exchangedShares: 752,
      eligibleDemandShares: 1018,
      eligibleSupplyShares: 752,
      unmatchedEligibleShares: 266,
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
