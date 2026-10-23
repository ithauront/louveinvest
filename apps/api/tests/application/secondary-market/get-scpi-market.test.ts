import { describe, expect, it, vi } from 'vitest';

import type { MarketDataResult } from '../../../src/application/secondary-market/dtos/market-data-result.js';
import type { MarketDataSource } from '../../../src/application/secondary-market/ports/market-data-source.js';
import {
  GetScpiMarket,
  ScpiNotFoundError,
} from '../../../src/application/secondary-market/use-cases/get-scpi-market.js';

// Application fixture is independent of Praemia, HTML and infrastructure.
const snapshot: MarketDataResult = {
  freshness: 'fresh',
  warnings: [],
  scpi: { id: 'example-scpi', name: 'Example', manager: 'Manager' },
  source: {
    url: 'https://example.com',
    fetchedAt: '2026-10-21T14:00:00Z',
    updatedAtLocal: '2026-10-21T15:30:00',
    timeZone: 'Europe/Paris',
  },
  lastExecution: { date: '2026-09-24', shares: 10, sellerPriceCents: 1000, buyerPriceCents: 1098 },
  nextConfrontation: { localDateTime: '2026-10-29T16:00:00' },
  orderDeadline: { localDateTime: '2026-10-27T16:00:00' },
  history: [],
  orderBook: { coverage: 'public-top-5-levels', bids: [], asks: [] },
};

describe('GetScpiMarket', () => {
  it('uses the source registered for the requested SCPI, independently of the provider', async () => {
    const source: MarketDataSource = { fetch: vi.fn().mockResolvedValue(snapshot) };
    const other = { fetch: vi.fn() };
    const useCase = new GetScpiMarket(
      new Map([
        ['example-scpi', source],
        ['other', other],
      ]),
    );
    await expect(useCase.execute({ scpiId: 'example-scpi' })).resolves.toBe(snapshot);
    expect(source.fetch).toHaveBeenCalledOnce();
    expect(other.fetch).not.toHaveBeenCalled();
  });

  it.each(['unknown', '__proto__', 'https://external.example'])(
    'rejects unregistered SCPI %s without fetching arbitrary URLs',
    async (scpiId) => {
      const source = { fetch: vi.fn() };
      const useCase = new GetScpiMarket(new Map([['example-scpi', source]]));
      await expect(useCase.execute({ scpiId })).rejects.toBeInstanceOf(ScpiNotFoundError);
      expect(source.fetch).not.toHaveBeenCalled();
    },
  );

  it('propagates source failures', async () => {
    const error = new Error('Source unavailable');
    const source = { fetch: vi.fn().mockRejectedValue(error) };
    await expect(
      new GetScpiMarket(new Map([['example-scpi', source]])).execute({ scpiId: 'example-scpi' }),
    ).rejects.toBe(error);
  });
});
