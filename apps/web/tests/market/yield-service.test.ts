import { describe, expect, it, vi } from 'vitest';

import { getScpiYield } from '../../src/services/market/get-scpi-yield';
import { parseScpiYield } from '../../src/services/market/yield.validation';
import { marketResponse } from './market-fixture';
import { yieldFixture } from './yield-fixture';

describe('Yield response contract', () => {
  it('requests and validates the sourced yield without recalculating it', async () => {
    const fetcher = vi.fn().mockResolvedValue(marketResponse(yieldFixture()));
    vi.stubGlobal('fetch', fetcher);
    expect(await getScpiYield('primopierre')).toEqual(yieldFixture());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/api/scpis/primopierre/yield',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it('encodes the identifier and rejects a different SCPI', async () => {
    const fetcher = vi.fn().mockResolvedValue(marketResponse(yieldFixture()));
    vi.stubGlobal('fetch', fetcher);
    await expect(getScpiYield('other/fund')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(fetcher.mock.calls[0]![0]).toBe('/api/scpis/other%2Ffund/yield');
  });
  it.each([
    null,
    {},
    { ...yieldFixture(), annualYieldPercent: -1 },
    { ...yieldFixture(), annualYieldPercent: '13.027' },
    { ...yieldFixture(), acquisitionCostPerShareCents: 0 },
    { ...yieldFixture(), fees: { ...yieldFixture().fees, fixedFeesIncluded: true } },
    { ...yieldFixture(), fees: { ...yieldFixture().fees, commissionBasisPoints: 10001 } },
    { ...yieldFixture(), dividend: { ...yieldFixture().dividend, year: 10000 } },
    { ...yieldFixture(), dividend: { ...yieldFixture().dividend, grossPerShareCents: 4.56 } },
    {
      ...yieldFixture(),
      dividend: { ...yieldFixture().dividend, source: { url: 'javascript:alert(1)', pages: [6] } },
    },
    {
      ...yieldFixture(),
      fees: { ...yieldFixture().fees, source: { url: 'https://example.com', pages: [] } },
    },
    {
      ...yieldFixture(),
      fees: { ...yieldFixture().fees, source: { url: 'https://example.com', pages: [0] } },
    },
  ])('rejects incompatible payload %#', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(payload)));
    await expect(getScpiYield('primopierre')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('rejects non-finite percentages before formatting', () => {
    expect(() => parseScpiYield({ ...yieldFixture(), annualYieldPercent: Infinity })).toThrow();
  });
  it('accepts zero dividends and zero yield as valid data', () => {
    const value = yieldFixture();
    value.dividend.grossPerShareCents = 0;
    value.annualYieldPercent = 0;
    expect(parseScpiYield(value).annualYieldPercent).toBe(0);
  });
  it('preserves unavailable-year errors, without substituting a dividend', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          marketResponse({ error: { code: 'YIELD_DATA_UNAVAILABLE', message: 'private' } }, 503),
        ),
    );
    await expect(getScpiYield('primopierre')).rejects.toMatchObject({
      code: 'YIELD_DATA_UNAVAILABLE',
      status: 503,
    });
  });
});
