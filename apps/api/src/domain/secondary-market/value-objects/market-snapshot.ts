import type { ScpiProps } from '../entities/scpi.js';

/** Read-only observation, not an order that our application can execute. */
export interface MarketExecution {
  readonly date: string; // YYYY-MM-DD
  readonly shares: number;
  readonly sellerPriceCents: number;
  readonly buyerPriceCents: number;
}

export interface AskLevel {
  readonly orderCount: number;
  readonly shares: number; // Total at this price, not multiplied by orderCount.
  readonly sellerLimitCents: number;
}

export interface BidLevel extends AskLevel {
  readonly buyerLimitCents: number;
}

export interface MarketSnapshot {
  readonly scpi: ScpiProps;
  readonly source: {
    readonly url: string;
    readonly fetchedAt: string; // ISO UTC
    readonly updatedAtLocal: string; // Local wall clock; offset is not in the HTML.
    readonly timeZone: 'Europe/Paris';
  };
  readonly lastExecution: MarketExecution;
  readonly nextConfrontation: { readonly localDateTime: string };
  readonly orderDeadline: { readonly localDateTime: string };
  readonly history: readonly MarketExecution[];
  readonly orderBook: {
    readonly coverage: 'public-top-5-levels';
    readonly bids: readonly BidLevel[];
    readonly asks: readonly AskLevel[];
  };
}
