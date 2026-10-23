import type { ScpiConfrontation } from '../../src/types/confrontation';
import { marketFixture } from './market-fixture';

export function confrontationFixture(
  status: ScpiConfrontation['estimate']['status'] = 'estimated',
): ScpiConfrontation {
  const market = marketFixture();
  return {
    scpi: market.scpi,
    source: market.source,
    freshness: 'fresh',
    warnings: [],
    nextConfrontation: market.nextConfrontation,
    referencePriceCents: 3188,
    coverage: 'public-top-5-levels',
    estimate:
      status === 'estimated'
        ? {
            status,
            executionPriceCents: 3188,
            exchangedShares: 364,
            eligibleDemandShares: 364,
            eligibleSupplyShares: 500,
            unmatchedEligibleShares: 136,
            priceInterval: { minCents: 3188, maxCents: 3200 },
          }
        : {
            status,
            executionPriceCents: null,
            exchangedShares: 0,
            eligibleDemandShares: null,
            eligibleSupplyShares: null,
            unmatchedEligibleShares: null,
            priceInterval: null,
          },
    assumptions: [
      'Prices are seller prices excluding fees, on a one-cent grid with inclusive order limits.',
      'Published quantities are aggregated per price level; partial execution is assumed.',
      'Maximize traded shares, then minimize the unmatched eligible shares (absolute demand/supply imbalance).',
      'Then choose the closest price to the last execution; choose the lowest price if a tie remains.',
    ],
    limitations: [
      'Only the public top five price levels per side are available; this is not the full order register.',
      'Individual order priority and all-or-nothing constraints are unavailable and are not simulated.',
      'The order book may change or be administratively delayed; execution at the next confrontation is not guaranteed.',
    ],
  };
}
