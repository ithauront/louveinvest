import type { MarketDataResult } from '../../src/application/secondary-market/dtos/market-data-result.js';

export function yieldMarketFixture(): MarketDataResult {
  const execution = {
    date: '2026-09-24',
    shares: 364,
    sellerPriceCents: 3188,
    buyerPriceCents: 3500,
  };
  return {
    scpi: { id: 'primopierre', name: 'Primopierre', manager: 'Praemia REIM France' },
    source: {
      url: 'https://example.com',
      fetchedAt: '2026-10-22T10:00:00.000Z',
      updatedAtLocal: '2026-10-22T11:30:00',
      timeZone: 'Europe/Paris',
    },
    lastExecution: execution,
    history: [execution],
    nextConfrontation: { localDateTime: '2026-10-29T16:00:00' },
    orderDeadline: { localDateTime: '2026-10-27T16:00:00' },
    orderBook: { coverage: 'public-top-5-levels', bids: [], asks: [] },
    freshness: 'fresh',
    warnings: [],
  };
}
