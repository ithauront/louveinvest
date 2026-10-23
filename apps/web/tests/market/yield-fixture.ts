import type { ScpiYield } from '../../src/types/yield';
import { marketFixture } from './market-fixture';

export function yieldFixture(): ScpiYield {
  const market = marketFixture();
  return {
    scpi: market.scpi,
    source: market.source,
    freshness: market.freshness,
    warnings: [],
    execution: market.lastExecution,
    acquisitionCostPerShareCents: 3500,
    annualYieldPercent: 13.027,
    dividend: {
      year: 2025,
      grossPerShareCents: 456,
      source: { url: 'https://example.com/annual-report.pdf', pages: [6] },
    },
    fees: {
      commissionBasisPoints: 480,
      registrationBasisPoints: 500,
      fixedFeesIncluded: false,
      source: { url: 'https://example.com/information-note.pdf', pages: [20, 24] },
    },
  };
}
