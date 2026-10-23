export interface MarketExecution {
  date: string;
  shares: number;
  sellerPriceCents: number;
  buyerPriceCents: number;
}
export interface MarketOrderLevel {
  orderCount: number;
  shares: number;
  sellerLimitCents: number;
}
export interface ScpiMarket {
  scpi: { id: string; name: string; manager: string };
  source: { url: string; fetchedAt: string; updatedAtLocal: string; timeZone: 'Europe/Paris' };
  lastExecution: MarketExecution;
  nextConfrontation: { localDateTime: string };
  orderDeadline: { localDateTime: string };
  history: MarketExecution[];
  orderBook: {
    coverage: 'public-top-5-levels';
    bids: (MarketOrderLevel & { buyerLimitCents: number })[];
    asks: MarketOrderLevel[];
  };
  freshness: 'fresh' | 'stale';
  warnings: { code: 'STALE_DATA'; message: string }[];
}
