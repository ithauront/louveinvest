import { EstimateConfrontation } from '../../../domain/secondary-market/services/estimate-confrontation.js';
import type { ConfrontationEstimateResult } from '../dtos/confrontation-estimate-result.js';
import type { GetScpiMarket } from './get-scpi-market.js';

export class GetConfrontationEstimate {
  constructor(
    private readonly getMarket: GetScpiMarket,
    private readonly estimator = new EstimateConfrontation(),
  ) {}

  async execute(input: { scpiId: string }): Promise<ConfrontationEstimateResult> {
    const market = await this.getMarket.execute(input);
    const estimate = this.estimator.execute({
      bids: market.orderBook.bids,
      asks: market.orderBook.asks,
      previousExecutionPriceCents: market.lastExecution.sellerPriceCents,
    });
    return {
      scpi: market.scpi,
      source: market.source,
      freshness: market.freshness,
      warnings: market.warnings,
      nextConfrontation: market.nextConfrontation,
      referencePriceCents: market.lastExecution.sellerPriceCents,
      coverage: market.orderBook.coverage,
      estimate: estimate.value,
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
}
