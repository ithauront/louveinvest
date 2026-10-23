import type { MarketExecution, ScpiMarket } from './market';

export interface YieldDataSource {
  url: string;
  pages: number[];
}

export interface ScpiYield extends Pick<ScpiMarket, 'scpi' | 'source' | 'freshness' | 'warnings'> {
  execution: MarketExecution;
  acquisitionCostPerShareCents: number;
  annualYieldPercent: number;
  dividend: { year: number; grossPerShareCents: number; source: YieldDataSource };
  fees: {
    commissionBasisPoints: number;
    registrationBasisPoints: number;
    fixedFeesIncluded: false;
    source: YieldDataSource;
  };
}
