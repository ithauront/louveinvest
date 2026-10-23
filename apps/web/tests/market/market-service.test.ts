import { afterEach, describe, expect, it, vi } from 'vitest';

import { getScpiMarket } from '../../src/services/market/get-scpi-market';
import { parseScpiMarket } from '../../src/services/market/market.validation';
import { marketFixture, marketResponse } from './market-fixture';
afterEach(() => vi.useRealTimers());

describe('Market service and runtime contract', () => {
  it('requests the same-origin endpoint, checks JSON and decodes the complete response', async () => {
    const fetcher = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal('fetch', fetcher);
    expect(await getScpiMarket('primopierre')).toEqual(marketFixture());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/api/scpis/primopierre/market',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it('encodes identifiers and rejects a response for another SCPI', async () => {
    const fetcher = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal('fetch', fetcher);
    await expect(getScpiMarket('another/fund')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(fetcher.mock.calls[0]![0]).toBe('/api/scpis/another%2Ffund/market');
  });
  it.each([
    null,
    {},
    { ...marketFixture(), lastExecution: { ...marketFixture().lastExecution, shares: -1 } },
    { ...marketFixture(), freshness: 'unknown' },
    { ...marketFixture(), source: { ...marketFixture().source, url: 'javascript:alert(1)' } },
    {
      ...marketFixture(),
      orderBook: {
        ...marketFixture().orderBook,
        bids: Array(6).fill(marketFixture().orderBook.bids[0]),
      },
    },
    {
      ...marketFixture(),
      lastExecution: { ...marketFixture().lastExecution, sellerPriceCents: 31.88 },
    },
    { ...marketFixture(), lastExecution: { ...marketFixture().lastExecution, date: '2026-02-30' } },
    { ...marketFixture(), orderDeadline: { localDateTime: '2026-10-27T25:00:00' } },
    { ...marketFixture(), source: { ...marketFixture().source, timeZone: 'UTC' } },
  ])('rejects incompatible response %#', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(body)));
    await expect(getScpiMarket('primopierre')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('accepts empty history and book without inventing data', () => {
    const value = marketFixture();
    value.history = [];
    value.orderBook.bids = [];
    value.orderBook.asks = [];
    expect(parseScpiMarket(value)).toEqual(value);
  });
  it.each([
    ['SOURCE_TIMEOUT', 504],
    ['SOURCE_FORMAT_CHANGED', 502],
    ['SCPI_NOT_FOUND', 404],
  ])('preserves API error %s without displaying its diagnostic message', async (code, status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          marketResponse({ error: { code, message: 'private diagnostic' } }, status),
        ),
    );
    await expect(getScpiMarket('primopierre')).rejects.toMatchObject({
      code,
      status,
      message: code,
    });
  });
  it('handles non-JSON HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>proxy failure</html>', { status: 502 })),
    );
    await expect(getScpiMarket('primopierre')).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 502,
    });
  });
  it.each([
    new Response('html', { headers: { 'content-type': 'text/html' } }),
    new Response('{', { headers: { 'content-type': 'application/json' } }),
  ])('rejects a successful response that is not valid JSON %#', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(getScpiMarket('primopierre')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('distinguishes network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(getScpiMarket('primopierre')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
  it('cancels a request when the caller aborts', async () => {
    let captured: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_path: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            captured = options.signal as AbortSignal;
            captured.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const controller = new AbortController();
    const result = getScpiMarket('primopierre', controller.signal);
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect(captured?.aborted).toBe(true);
  });
  it('limits waiting time and clears the request', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_path: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const result = expect(getScpiMarket('primopierre')).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
    });
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
});
