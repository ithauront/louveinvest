import {
  type ConfrontationInputField,
  InvalidConfrontationInputError,
} from '../errors/invalid-confrontation-input-error.js';
import { ConfrontationEstimate } from '../value-objects/confrontation-estimate.js';
import type { AskLevel, BidLevel } from '../value-objects/market-snapshot.js';

interface EstimateInput {
  readonly bids: readonly BidLevel[];
  readonly asks: readonly AskLevel[];
  readonly previousExecutionPriceCents: number | null;
}

interface PriceCandidate {
  readonly priceCents: number;
  readonly demand: number;
  readonly supply: number;
  readonly quantity: number;
  readonly imbalance: number;
  readonly distance: number;
  readonly minCents: number;
  readonly maxCents: number;
}

function assertPositiveInteger(value: number, field: ConfrontationInputField): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidConfrontationInputError(field);
}

function validateLevels(levels: readonly AskLevel[]): void {
  let total = 0;
  for (const level of levels) {
    assertPositiveInteger(level.sellerLimitCents, 'sellerLimitCents');
    assertPositiveInteger(level.shares, 'shares');
    assertPositiveInteger(level.orderCount, 'orderCount');
    if (level.orderCount > level.shares) throw new InvalidConfrontationInputError('orderCount');
    total += level.shares;
    if (!Number.isSafeInteger(total)) throw new InvalidConfrontationInputError('totalShares');
  }
}

function ranksBefore(candidate: PriceCandidate, previous: PriceCandidate): boolean {
  if (candidate.quantity !== previous.quantity) return candidate.quantity > previous.quantity;
  if (candidate.imbalance !== previous.imbalance) return candidate.imbalance < previous.imbalance;
  if (candidate.distance !== previous.distance) return candidate.distance < previous.distance;
  return candidate.priceCents < previous.priceCents;
}

export class EstimateConfrontation {
  execute(input: EstimateInput): ConfrontationEstimate {
    const { bids, asks, previousExecutionPriceCents } = input;
    validateLevels(bids);
    validateLevels(asks);
    if (previousExecutionPriceCents !== null)
      assertPositiveInteger(previousExecutionPriceCents, 'previousExecutionPriceCents');
    if (!bids.length || !asks.length) return ConfrontationEstimate.withoutTrade('empty-book');

    const prices = [...bids, ...asks].map((level) => level.sellerLimitCents);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    // Supply changes at ask price. Demand changes one cent AFTER bid price (inclusive limits).
    const starts = new Set<number>([minPrice]);
    for (const ask of asks) starts.add(ask.sellerLimitCents);
    for (const bid of bids)
      if (bid.sellerLimitCents < maxPrice) starts.add(bid.sellerLimitCents + 1);
    const boundaries = [...starts].sort((a, b) => a - b);
    let best: PriceCandidate | undefined;

    for (let index = 0; index < boundaries.length; index++) {
      const minCents = boundaries[index];
      const maxCents = index + 1 < boundaries.length ? boundaries[index + 1] - 1 : maxPrice;
      const demand = bids
        .filter((level) => level.sellerLimitCents >= minCents)
        .reduce((sum, level) => sum + level.shares, 0);
      const supply = asks
        .filter((level) => level.sellerLimitCents <= minCents)
        .reduce((sum, level) => sum + level.shares, 0);
      const quantity = Math.min(demand, supply);
      if (quantity === 0) continue;
      // All prices in this interval have the same eligible volume: choose closest to last execution.
      const priceCents =
        previousExecutionPriceCents === null
          ? minCents
          : Math.max(minCents, Math.min(previousExecutionPriceCents, maxCents));
      const candidate: PriceCandidate = {
        priceCents,
        demand,
        supply,
        quantity,
        minCents,
        maxCents,
        imbalance: Math.abs(demand - supply),
        distance:
          previousExecutionPriceCents === null
            ? 0
            : Math.abs(priceCents - previousExecutionPriceCents),
      };
      if (!best || ranksBefore(candidate, best)) best = candidate;
    }
    if (!best) return ConfrontationEstimate.withoutTrade('no-crossing');
    return ConfrontationEstimate.matched({
      executionPriceCents: best.priceCents,
      exchangedShares: best.quantity,
      eligibleDemandShares: best.demand,
      eligibleSupplyShares: best.supply,
      priceInterval: { minCents: best.minCents, maxCents: best.maxCents },
    });
  }
}
