import type { ConfrontationOutcome } from '../../../domain/secondary-market/value-objects/confrontation-estimate.js';
import type { MarketDataResult } from './market-data-result.js';

export interface ConfrontationEstimateResult {
  readonly scpi: MarketDataResult['scpi'];
  readonly source: MarketDataResult['source'];
  readonly freshness: MarketDataResult['freshness'];
  readonly warnings: MarketDataResult['warnings'];
  readonly nextConfrontation: MarketDataResult['nextConfrontation'];
  readonly referencePriceCents: number;
  readonly coverage: MarketDataResult['orderBook']['coverage'];
  readonly estimate: ConfrontationOutcome;
  readonly assumptions: readonly string[];
  readonly limitations: readonly string[];
}
