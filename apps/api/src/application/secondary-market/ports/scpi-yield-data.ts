import type { AcquisitionFees } from '../../../domain/secondary-market/value-objects/acquisition-fees.js';
import type { AnnualDividend } from '../../../domain/secondary-market/value-objects/annual-dividend.js';

export interface YieldDataSource {
  readonly url: string;
  readonly pages: readonly number[];
}

export interface ScpiYieldParameters {
  readonly dividend: AnnualDividend;
  readonly fees: AcquisitionFees;
  readonly dividendSource: YieldDataSource;
  readonly feesSource: YieldDataSource;
}

export interface ScpiYieldData {
  find(scpiId: string, dividendYear: number): Promise<ScpiYieldParameters | null>;
}
