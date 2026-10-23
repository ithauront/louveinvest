import { describe, expect, it, vi } from 'vitest';

import type { MarketDataResult } from '../../../../src/application/secondary-market/dtos/market-data-result.js';
import { MarketSourceError } from '../../../../src/application/secondary-market/errors/market-source-error.js';
import { CachedMarketDataSource } from '../../../../src/infra/market-data/cache/cached-market-data-source.js';

function observation(id = 'fund'): MarketDataResult {
  return {
    scpi: { id, name: 'Fund', manager: 'Manager' },
    source: {
      url: 'https://example.com',
      fetchedAt: '2026-10-22T10:00:00.000Z',
      updatedAtLocal: '2026-10-22T11:30:00',
      timeZone: 'Europe/Paris',
    },
    lastExecution: {
      date: '2026-09-24',
      shares: 10,
      sellerPriceCents: 1000,
      buyerPriceCents: 1098,
    },
    nextConfrontation: { localDateTime: '2026-10-29T16:00:00' },
    orderDeadline: { localDateTime: '2026-10-27T16:00:00' },
    history: [],
    orderBook: { coverage: 'public-top-5-levels', bids: [], asks: [] },
    freshness: 'fresh',
    warnings: [],
  };
}
const offline = new MarketSourceError('SOURCE_UNAVAILABLE', 'Offline');

function setup() {
  let time = 0;
  const initial = observation();
  const fetch = vi.fn().mockResolvedValue(initial);
  const cache = new CachedMarketDataSource(
    { fetch },
    { cacheValidityMs: 100, maximumSnapshotAgeMs: 400, now: () => time },
  );
  return {
    cache,
    fetch,
    initial,
    at: (value: number) => {
      time = value;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('CachedMarketDataSource', () => {
  it('collects lazily and serves the entry before TTL expiry without sliding its lifetime', async () => {
    const { cache, fetch, at, initial } = setup();
    expect(fetch).not.toHaveBeenCalled();
    expect(await cache.fetch()).toEqual(initial);
    at(50);
    await cache.fetch();
    at(99);
    expect(await cache.fetch()).toEqual(initial);
    expect(fetch).toHaveBeenCalledOnce();
    at(100);
    await cache.fetch();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('replaces the entry on a successful refresh', async () => {
    const { cache, fetch, at } = setup();
    await cache.fetch();
    at(100);
    const next = {
      ...observation(),
      source: { ...observation().source, fetchedAt: '2026-10-22T10:30:00.000Z' },
    };
    fetch.mockResolvedValue(next);
    expect(await cache.fetch()).toEqual(next);
    at(199);
    expect(await cache.fetch()).toEqual(next);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shares one initial collection across concurrent requests', async () => {
    const { cache, fetch } = setup();
    const pending = deferred<MarketDataResult>();
    fetch.mockReturnValue(pending.promise);
    const requests = [cache.fetch(), cache.fetch(), cache.fetch()];
    expect(fetch).toHaveBeenCalledOnce();
    pending.resolve(observation());
    const results = await Promise.all(requests);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).not.toBe(results[1]);
  });

  it('shares one refresh across concurrent requests', async () => {
    const { cache, fetch, at } = setup();
    await cache.fetch();
    at(100);
    const pending = deferred<MarketDataResult>();
    fetch.mockReturnValue(pending.promise);
    const requests = [cache.fetch(), cache.fetch()];
    expect(fetch).toHaveBeenCalledTimes(2);
    pending.resolve(observation());
    await Promise.all(requests);
  });

  it.each(['SOURCE_TIMEOUT', 'SOURCE_UNAVAILABLE', 'SOURCE_FORMAT_CHANGED'] as const)(
    'serves an explicit stale fallback for %s',
    async (code) => {
      const { cache, fetch, at, initial } = setup();
      await cache.fetch();
      at(100);
      fetch.mockRejectedValue(new MarketSourceError(code, 'private details'));
      const result = await cache.fetch();
      expect(result.freshness).toBe('stale');
      expect(result.warnings).toEqual([{ code: 'STALE_DATA', message: expect.any(String) }]);
      expect(result.source).toEqual(initial.source);
      expect(JSON.stringify(result)).not.toContain('private details');
    },
  );

  it('does not renew stale age on repeated failures and refuses fallback at maxAge', async () => {
    const { cache, fetch, at } = setup();
    await cache.fetch();
    fetch.mockRejectedValue(offline);
    at(100);
    expect((await cache.fetch()).freshness).toBe('stale');
    at(399);
    expect((await cache.fetch()).freshness).toBe('stale');
    at(400);
    await expect(cache.fetch()).rejects.toBe(offline);
  });

  it('never masks unexpected bugs with stale data', async () => {
    const { cache, fetch, at } = setup();
    await cache.fetch();
    at(100);
    const bug = new TypeError('Internal bug');
    fetch.mockRejectedValue(bug);
    await expect(cache.fetch()).rejects.toBe(bug);
  });

  it('propagates a cold-cache failure to all waiters and retries on the next request', async () => {
    const { cache, fetch } = setup();
    const pending = deferred<MarketDataResult>();
    fetch.mockReturnValueOnce(pending.promise);
    const requests = [cache.fetch(), cache.fetch()];
    const checked = Promise.all(requests.map((p) => expect(p).rejects.toBe(offline)));
    pending.reject(offline);
    await checked;
    expect(await cache.fetch()).toEqual(observation());
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('clears stale status after recovery', async () => {
    const { cache, fetch, at } = setup();
    await cache.fetch();
    at(100);
    fetch.mockRejectedValueOnce(offline);
    expect((await cache.fetch()).freshness).toBe('stale');
    expect((await cache.fetch()).freshness).toBe('fresh');
    expect((await cache.fetch()).warnings).toEqual([]);
  });

  it('keeps independent cache entries per source', async () => {
    const first = new CachedMarketDataSource({
      fetch: vi.fn().mockResolvedValue(observation('first')),
    });
    const second = new CachedMarketDataSource({
      fetch: vi.fn().mockResolvedValue(observation('second')),
    });
    expect((await first.fetch()).scpi.id).toBe('first');
    expect((await second.fetch()).scpi.id).toBe('second');
  });

  it('protects cached data against mutation by the source and consumers', async () => {
    const { cache, initial } = setup();
    const delivered = await cache.fetch();
    Object.assign(initial.lastExecution, { shares: 999 });
    Object.assign(delivered.lastExecution, { shares: 888 });
    expect((await cache.fetch()).lastExecution.shares).toBe(10);
  });

  it('does not promote an upstream stale result to a fresh cache entry', async () => {
    const { cache, fetch } = setup();
    fetch.mockResolvedValue({ ...observation(), freshness: 'stale' });
    expect((await cache.fetch()).freshness).toBe('stale');
    await cache.fetch();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses 30-minute TTL and a maximum two-hour fallback by default', async () => {
    let time = 0;
    const fetch = vi.fn().mockResolvedValue(observation());
    const cache = new CachedMarketDataSource({ fetch }, { now: () => time });
    await cache.fetch();
    time = 30 * 60_000 - 1;
    await cache.fetch();
    expect(fetch).toHaveBeenCalledOnce();
    fetch.mockRejectedValue(offline);
    time = 30 * 60_000;
    expect((await cache.fetch()).freshness).toBe('stale');
    time = 2 * 60 * 60_000;
    await expect(cache.fetch()).rejects.toBe(offline);
  });

  it.each([
    { cacheValidityMs: 0 },
    { maximumSnapshotAgeMs: -1 },
    { cacheValidityMs: 200, maximumSnapshotAgeMs: 100 },
    { cacheValidityMs: 1.5 },
  ])('rejects invalid cache configuration', (options) => {
    expect(() => new CachedMarketDataSource({ fetch: vi.fn() }, options)).toThrow(RangeError);
  });
});
