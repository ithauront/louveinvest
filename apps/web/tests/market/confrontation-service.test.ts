import { describe, expect, it, vi } from 'vitest';

import { explainConfrontation } from '../../src/constants/confrontation-explanations';
import { getScpiConfrontation } from '../../src/services/market/get-scpi-confrontation';
import { confrontationFixture } from './confrontation-fixture';
import { marketResponse } from './market-fixture';

describe('Confrontation response contract', () => {
  it.each(['estimated', 'empty-book', 'no-crossing'] as const)(
    'accepts %s as a successful result',
    async (status) => {
      const value = confrontationFixture(status);
      const fetcher = vi.fn().mockResolvedValue(marketResponse(value));
      vi.stubGlobal('fetch', fetcher);
      expect(await getScpiConfrontation('primopierre')).toEqual(value);
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        '/api/scpis/primopierre/confrontation-estimate',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    },
  );
  it('encodes identifiers and rejects another SCPI', async () => {
    const fetcher = vi.fn().mockResolvedValue(marketResponse(confrontationFixture()));
    vi.stubGlobal('fetch', fetcher);
    await expect(getScpiConfrontation('other/fund')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    expect(fetcher.mock.calls[0]![0]).toBe('/api/scpis/other%2Ffund/confrontation-estimate');
  });
  it.each([
    null,
    {},
    { ...confrontationFixture(), coverage: 'full-book' },
    { ...confrontationFixture(), referencePriceCents: 0 },
    { ...confrontationFixture(), assumptions: [] },
    { ...confrontationFixture(), limitations: [] },
    { ...confrontationFixture(), nextConfrontation: { localDateTime: '2026-02-30T16:00:00' } },
    ...[
      { status: 'unknown' },
      { executionPriceCents: null },
      { executionPriceCents: 31.88 },
      { exchangedShares: -1 },
      { eligibleSupplyShares: Number.MAX_SAFE_INTEGER + 1 },
      { priceInterval: { minCents: 3200, maxCents: 3188 } },
      { priceInterval: { minCents: 3200, maxCents: 3300 } },
    ].map((patch) => ({
      ...confrontationFixture(),
      estimate: { ...confrontationFixture().estimate, ...patch },
    })),
    {
      ...confrontationFixture('empty-book'),
      estimate: { ...confrontationFixture('empty-book').estimate, executionPriceCents: 0 },
    },
    {
      ...confrontationFixture('no-crossing'),
      estimate: { ...confrontationFixture('no-crossing').estimate, exchangedShares: 1 },
    },
  ])('rejects malformed or contradictory payload %#', async (value) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(value)));
    await expect(getScpiConfrontation('primopierre')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
  it('preserves typed source failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          marketResponse({ error: { code: 'SOURCE_TIMEOUT', message: 'private' } }, 504),
        ),
    );
    await expect(getScpiConfrontation('primopierre')).rejects.toMatchObject({
      code: 'SOURCE_TIMEOUT',
      status: 504,
      message: 'SOURCE_TIMEOUT',
    });
  });
  it('translates every known explanation and preserves unknown text', () => {
    const fixture = confrontationFixture();
    for (const item of [...fixture.assumptions, ...fixture.limitations])
      expect(explainConfrontation(item)).not.toBe(item);
    expect(explainConfrontation('New source limitation')).toBe('New source limitation');
  });
});
