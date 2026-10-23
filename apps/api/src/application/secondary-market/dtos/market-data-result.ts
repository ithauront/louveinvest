import type { MarketSnapshot } from '../../../domain/secondary-market/value-objects/market-snapshot.js';

/** Delivery metadata belongs to the application, not the SCPI entity. */
export interface MarketDataResult extends MarketSnapshot {
  readonly freshness: 'fresh' | 'stale';
  readonly warnings: readonly {
    readonly code: 'STALE_DATA';
    readonly message: string;
  }[];
}
