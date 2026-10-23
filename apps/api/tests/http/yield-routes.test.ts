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
function setup(date = '2026-10-22T10:00:00Z') {
  const fetch = vi.fn().mockResolvedValue(yieldMarketFixture());
  app = buildApp({
    logger: false,
    marketDataSources: new Map([['primopierre', { fetch }]]),
    now: () => new Date(date),
  });
  return { app, fetch };
}
const url = '/api/scpis/primopierre/yield';

describe('GET /api/scpis/:scpiId/yield', () => {
  it('returns a sourced gross yield with fees and no fixed fees', async () => {
    const { app } = setup();
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      annualYieldPercent: 13.027,
      acquisitionCostPerShareCents: 3500,
      dividend: { year: 2025, grossPerShareCents: 456, source: { pages: [6] } },
      fees: { commissionBasisPoints: 480, registrationBasisPoints: 500, fixedFeesIncluded: false },
      freshness: 'fresh',
      warnings: [],
      execution: { sellerPriceCents: 3188 },
    });
    expect(response.headers['content-type']).toContain('application/json');
  });
  it('shares the market cache across market and yield endpoints', async () => {
    const { app, fetch } = setup();
    expect((await app.inject('/api/scpis/primopierre/market')).statusCode).toBe(200);
    expect((await app.inject(url)).statusCode).toBe(200);
    expect((await app.inject(url)).statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('returns 503 when next year data are not maintained, without breaking market lookup', async () => {
    const { app } = setup('2027-01-01T00:00:00Z');
    const response = await app.inject(url);
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'YIELD_DATA_UNAVAILABLE',
        message: 'Yield parameters for the previous civil year are unavailable.',
      },
    });
    expect((await app.inject('/api/scpis/primopierre/market')).statusCode).toBe(200);
  });
  it('returns 404 for an unknown fund, and 400 for invalid identifiers before collection', async () => {
    const { app, fetch } = setup();
    expect((await app.inject('/api/scpis/unknown/yield')).statusCode).toBe(404);
    expect((await app.inject('/api/scpis/Primopierre/yield')).statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ['SOURCE_TIMEOUT', 504],
    ['SOURCE_FORMAT_CHANGED', 502],
    ['SOURCE_UNAVAILABLE', 502],
  ] as const)('maps %s without leaking private details', async (code, status) => {
    const { app, fetch } = setup();
    fetch.mockRejectedValue(new MarketSourceError(code, 'private diagnostics'));
    const response = await app.inject(url);
    expect(response.statusCode).toBe(status);
    expect(response.json().error.code).toBe(code);
    expect(response.body).not.toContain('private');
  });
  it('carries stale warnings through to the yield response after a refresh failure', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const { app, fetch } = setup();
    await app.inject(url);
    clock.mockReturnValue(30 * 60_000);
    fetch.mockRejectedValue(new MarketSourceError('SOURCE_TIMEOUT', 'Timeout'));
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ freshness: 'stale', annualYieldPercent: 13.027 });
    expect(response.json().warnings[0].code).toBe('STALE_DATA');
  });
  it('wires production composition through HTML collection and calculation without live network', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(marketHtml, { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    app = buildApp({ logger: false, now: () => new Date('2026-10-22T10:00:00Z') });
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.json().annualYieldPercent).toBe(13.027);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
