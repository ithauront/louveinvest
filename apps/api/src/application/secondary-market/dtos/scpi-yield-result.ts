import type { InvestmentYield } from '../../../domain/secondary-market/services/calculate-investment-yield.js';
import type { YieldDataSource } from '../ports/scpi-yield-data.js';
import type { MarketDataResult } from './market-data-result.js';

export interface ScpiYieldResult extends InvestmentYield {
  readonly scpi: MarketDataResult['scpi'];
  readonly source: MarketDataResult['source'];
  readonly freshness: MarketDataResult['freshness'];
  readonly warnings: MarketDataResult['warnings'];
  readonly execution: MarketDataResult['lastExecution'];
  readonly dividend: {
    readonly year: number;
    readonly grossPerShareCents: number;
    readonly source: YieldDataSource;
  };
  readonly fees: {
    readonly commissionBasisPoints: number;
    readonly registrationBasisPoints: number;
    readonly fixedFeesIncluded: false;
    readonly source: YieldDataSource;
  };
}
