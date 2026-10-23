import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';
import type { MarketDataResult } from '../../src/application/secondary-market/dtos/market-data-result.js';
import { MarketSourceError } from '../../src/application/secondary-market/errors/market-source-error.js';
import { marketHtml } from '../helpers/market-fixture.js';

const snapshot: MarketDataResult = {
  freshness: 'fresh',
  warnings: [],
  scpi: { id: 'primopierre', name: 'Primopierre', manager: 'Praemia REIM France' },
  source: {
    url: 'https://www.praemiareim.fr/fr/scpi-primopierre',
    fetchedAt: '2026-10-22T10:00:00.000Z',
    updatedAtLocal: '2026-10-21T15:39:00',
    timeZone: 'Europe/Paris',
  },
  lastExecution: { date: '2026-09-24', shares: 364, sellerPriceCents: 3188, buyerPriceCents: 3500 },
  nextConfrontation: { localDateTime: '2026-10-29T16:00:00' },
  orderDeadline: { localDateTime: '2026-10-27T16:00:00' },
  history: [{ date: '2026-09-24', shares: 364, sellerPriceCents: 3188, buyerPriceCents: 3500 }],
  orderBook: {
    coverage: 'public-top-5-levels',
    bids: [{ orderCount: 2, shares: 1000, sellerLimitCents: 2000, buyerLimitCents: 2196 }],
    asks: [{ orderCount: 2, shares: 752, sellerLimitCents: 2000 }],
  },
};
let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllGlobals();
});

function withSource(fetch = vi.fn().mockResolvedValue(snapshot)) {
  app = buildApp({ logger: false, marketDataSources: new Map([['primopierre', { fetch }]]) });
  return { app, fetch };
}

describe('GET /api/scpis/:scpiId/market', () => {
  it('returns the complete public snapshot as JSON with exact monetary units', async () => {
    const { app, fetch } = withSource();
    const response = await app.inject({ method: 'GET', url: '/api/scpis/primopierre/market' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual(snapshot);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('serializes only public fields, including in nested objects', async () => {
    const privateSnapshot = {
      ...snapshot,
      internalDebug: 'private',
      source: { ...snapshot.source, rawHtml: 'private' },
    };
    const { app } = withSource(vi.fn().mockResolvedValue(privateSnapshot));
    const response = await app.inject('/api/scpis/primopierre/market');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(snapshot);
    expect(response.body).not.toContain('private');
  });

  it('returns 404 without fetching for a valid but unregistered SCPI', async () => {
    const { app, fetch } = withSource();
    const response = await app.inject('/api/scpis/unknown-scpi/market');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'SCPI_NOT_FOUND', message: 'SCPI is not registered.' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['Primopierre', '-fund', 'two%20words', 'https%3A%2F%2Fexample.com', 'a'.repeat(65)])(
    'rejects invalid identifier %s before fetching',
    async (id) => {
      const { app, fetch } = withSource();
      const response = await app.inject(`/api/scpis/${id}/market`);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { code: 'INVALID_REQUEST', message: 'Invalid SCPI identifier.' },
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['SOURCE_TIMEOUT', 504, 'Market data source timed out.'],
    ['SOURCE_UNAVAILABLE', 502, 'Market data source is unavailable.'],
    ['SOURCE_FORMAT_CHANGED', 502, 'Market data source returned an unexpected format.'],
  ] as const)('maps %s to HTTP %i without exposing diagnostics', async (code, status, message) => {
    const error = new MarketSourceError(code, 'private upstream details', {
      cause: new Error('private cause'),
    });
    const { app } = withSource(vi.fn().mockRejectedValue(error));
    const response = await app.inject('/api/scpis/primopierre/market');
    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({ error: { code, message } });
    expect(response.body).not.toContain('private');
    expect(response.body).not.toContain('stack');
  });

  it('returns a generic 500 for unexpected programming errors', async () => {
    const { app } = withSource(vi.fn().mockRejectedValue(new TypeError('private internal bug')));
    const response = await app.inject('/api/scpis/primopierre/market');
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  });

  it('keeps health independent from the external source', async () => {
    const { app, fetch } = withSource(vi.fn().mockRejectedValue(new Error('Offline')));
    const response = await app.inject('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'louveinvest-api' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('connects the production factory to the HTTP client and parser without live network', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(marketHtml, { headers: { 'content-type': 'text/html;charset=UTF-8' } }),
      );
    vi.stubGlobal('fetch', fetcher);
    app = buildApp({ logger: false });
    await app.ready();
    expect(fetcher).not.toHaveBeenCalled();
    const response = await app.inject('/api/scpis/primopierre/market');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      scpi: snapshot.scpi,
      lastExecution: snapshot.lastExecution,
      source: { url: snapshot.source.url, updatedAtLocal: snapshot.source.updatedAtLocal },
      orderBook: { coverage: 'public-top-5-levels' },
    });
    expect(response.json().history).toHaveLength(7);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(snapshot.source.url, expect.any(Object));
  });

  it('supports an explicitly empty source registry without defaulting to the live provider', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    app = buildApp({ logger: false, marketDataSources: new Map() });
    const response = await app.inject('/api/scpis/primopierre/market');
    expect(response.statusCode).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reuses cache, marks stale fallback, recovers and enforces maximum age through HTTP', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const fetch = vi.fn().mockResolvedValue(snapshot);
    const built = withSource(fetch);
    app = built.app;
    const url = '/api/scpis/primopierre/market';
    expect((await app.inject(url)).json().freshness).toBe('fresh');
    expect((await app.inject(url)).json().warnings).toEqual([]);
    expect(fetch).toHaveBeenCalledOnce();

    clock.mockReturnValue(30 * 60_000);
    fetch.mockRejectedValue(new MarketSourceError('SOURCE_TIMEOUT', 'private'));
    const stale = await app.inject(url);
    expect(stale.statusCode).toBe(200);
    expect(stale.json()).toMatchObject({ freshness: 'stale', source: snapshot.source });
    expect(stale.json().warnings).toEqual([{ code: 'STALE_DATA', message: expect.any(String) }]);

    clock.mockReturnValue(2 * 60 * 60_000);
    expect((await app.inject(url)).statusCode).toBe(504);
    fetch.mockResolvedValue(snapshot);
    const recovered = await app.inject(url);
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json().freshness).toBe('fresh');
    expect(recovered.json().warnings).toEqual([]);
  });
});
