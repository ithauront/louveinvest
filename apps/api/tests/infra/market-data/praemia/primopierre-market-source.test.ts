import { describe, expect, it, vi } from 'vitest';

import { MarketSourceError } from '../../../../src/application/secondary-market/errors/market-source-error.js';
import {
  PRIMOPIERRE_URL,
  PrimopierreMarketSource,
} from '../../../../src/infra/market-data/praemia/primopierre-market-source.js';
import { marketHtml } from '../../../helpers/market-fixture.js';

describe('PrimopierreMarketSource', () => {
  it('uses the official URL and keeps fetched time distinct from published update', async () => {
    const get = vi.fn().mockResolvedValue(marketHtml);
    const source = new PrimopierreMarketSource(
      { get },
      undefined,
      () => new Date('2026-10-21T14:00:00Z'),
    );
    const result = await source.fetch();
    expect(get).toHaveBeenCalledExactlyOnceWith(PRIMOPIERRE_URL);
    expect(result.scpi.id).toBe('primopierre');
    expect(result.source).toEqual({
      url: PRIMOPIERRE_URL,
      fetchedAt: '2026-10-21T14:00:00.000Z',
      updatedAtLocal: '2026-10-21T15:39:00',
      timeZone: 'Europe/Paris',
    });
    expect(result.lastExecution.date).toBe('2026-09-24');
  });

  it('does not replace HTTP failures with the fixture', async () => {
    const error = new MarketSourceError('SOURCE_TIMEOUT', 'Timeout');
    const source = new PrimopierreMarketSource({ get: vi.fn().mockRejectedValue(error) });
    await expect(source.fetch()).rejects.toBe(error);
  });

  it('propagates invalid source HTML as a format error', async () => {
    const source = new PrimopierreMarketSource({
      get: vi.fn().mockResolvedValue('<h1>Maintenance</h1>'),
    });
    await expect(source.fetch()).rejects.toMatchObject({ code: 'SOURCE_FORMAT_CHANGED' });
  });
});
