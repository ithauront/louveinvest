import type { MarketDataResult } from '../dtos/market-data-result.js';

export interface MarketDataSource {
  fetch(): Promise<MarketDataResult>;
}
