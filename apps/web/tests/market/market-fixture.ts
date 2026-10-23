import type { ScpiMarket } from '../../src/types/market';

export function marketFixture(): ScpiMarket {
  const execution = {
    date: '2026-09-24',
    shares: 364,
    sellerPriceCents: 3188,
    buyerPriceCents: 3500,
  };
  return {
    scpi: { id: 'primopierre', name: 'Primopierre', manager: 'Praemia REIM France' },
    source: {
      url: 'https://www.praemiareim.fr/fr/scpi-primopierre',
      fetchedAt: '2026-10-23T10:00:00.000Z',
      updatedAtLocal: '2026-10-23T11:30:00',
      timeZone: 'Europe/Paris',
    },
    lastExecution: execution,
    history: [execution],
    nextConfrontation: { localDateTime: '2026-10-29T16:00:00' },
    orderDeadline: { localDateTime: '2026-10-27T16:00:00' },
    orderBook: {
      coverage: 'public-top-5-levels',
      bids: [{ orderCount: 2, shares: 1000, sellerLimitCents: 3188, buyerLimitCents: 3500 }],
      asks: [{ orderCount: 3, shares: 2000, sellerLimitCents: 3200 }],
    },
    freshness: 'fresh',
    warnings: [],
  };
}
export function marketResponse(body: unknown = marketFixture(), status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
