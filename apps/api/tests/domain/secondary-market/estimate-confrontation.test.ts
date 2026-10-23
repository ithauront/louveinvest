import { describe, expect, it } from 'vitest';

import { InvalidConfrontationInputError } from '../../../src/domain/secondary-market/errors/invalid-confrontation-input-error.js';
import { EstimateConfrontation } from '../../../src/domain/secondary-market/services/estimate-confrontation.js';
import type {
  AskLevel,
  BidLevel,
} from '../../../src/domain/secondary-market/value-objects/market-snapshot.js';

const bid = (price: number, shares = 5, orderCount = 1): BidLevel => ({
  sellerLimitCents: price,
  buyerLimitCents: price,
  shares,
  orderCount,
});
const ask = (price: number, shares = 5, orderCount = 1): AskLevel => ({
  sellerLimitCents: price,
  shares,
  orderCount,
});
const estimator = new EstimateConfrontation();
const run = (bids: BidLevel[], asks: AskLevel[], previousExecutionPriceCents: number | null = 15) =>
  estimator.execute({ bids, asks, previousExecutionPriceCents }).value;

describe('EstimateConfrontation', () => {
  it('maximizes shares respecting inclusive price limits', () => {
    expect(run([bid(10, 10)], [ask(10, 7)], 10)).toEqual({
      status: 'estimated',
      executionPriceCents: 10,
      exchangedShares: 7,
      eligibleDemandShares: 10,
      eligibleSupplyShares: 7,
      unmatchedEligibleShares: 3,
      priceInterval: { minCents: 10, maxCents: 10 },
    });
  });
  it('minimizes eligible imbalance before considering distance to last execution', () => {
    expect(run([bid(20, 5), bid(10, 5)], [ask(10, 5)], 10)).toMatchObject({
      executionPriceCents: 11,
      exchangedShares: 5,
      unmatchedEligibleShares: 0,
      priceInterval: { minCents: 11, maxCents: 20 },
    });
  });
  it('selects the previous execution inside a constant-volume interval, not just published prices', () => {
    expect(run([bid(20)], [ask(10)], 15)).toMatchObject({
      executionPriceCents: 15,
      exchangedShares: 5,
      priceInterval: { minCents: 10, maxCents: 20 },
    });
  });
  it.each([
    [1, 10],
    [30, 20],
  ])('clamps previous price %i to closest valid price %i', (reference, expected) => {
    expect(run([bid(20)], [ask(10)], reference).executionPriceCents).toBe(expected);
  });
  it('chooses the lowest optimal price when there is no historical reference', () => {
    expect(run([bid(20)], [ask(10)], null).executionPriceCents).toBe(10);
  });
  it('prioritizes maximum volume even if another price is closer to reference', () => {
    expect(run([bid(20, 10), bid(10, 1)], [ask(10, 1), ask(15, 9)], 10)).toMatchObject({
      executionPriceCents: 15,
      exchangedShares: 10,
    });
  });
  it('distinguishes missing side from a book with no crossing and never invents a price', () => {
    expect(run([], []).status).toBe('empty-book');
    expect(run([bid(10)], []).status).toBe('empty-book');
    expect(run([], [ask(10)]).status).toBe('empty-book');
    expect(run([bid(9)], [ask(10)])).toEqual({
      status: 'no-crossing',
      executionPriceCents: null,
      exchangedShares: 0,
      eligibleDemandShares: null,
      eligibleSupplyShares: null,
      unmatchedEligibleShares: null,
      priceInterval: null,
    });
  });
  it('sums level quantities once, independently of number of orders and input ordering', () => {
    const bids = [bid(20, 1000, 2), bid(18, 3)];
    const asks = [ask(15, 1100, 3)];
    const original = structuredClone({ bids, asks });
    expect(run(bids, asks, 20)).toMatchObject({ exchangedShares: 1003, executionPriceCents: 18 });
    expect({ bids, asks }).toEqual(original);
  });
  it('covers huge price intervals without iterating through each cent or overflowing bid + 1', () => {
    expect(run([bid(Number.MAX_SAFE_INTEGER)], [ask(1)], Number.MAX_SAFE_INTEGER)).toMatchObject({
      executionPriceCents: Number.MAX_SAFE_INTEGER,
      exchangedShares: 5,
    });
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid price %s',
    (price) => {
      expect(() => run([bid(price)], [ask(10)])).toThrow(
        expect.objectContaining({ field: 'sellerLimitCents' }),
      );
      expect(() => run([bid(20)], [ask(price)])).toThrow(InvalidConfrontationInputError);
    },
  );
  it.each([0, -1, 1.5, NaN])('rejects invalid quantities and order counts %s', (count) => {
    expect(() => run([bid(20, count)], [ask(10)])).toThrow(
      expect.objectContaining({ field: 'shares' }),
    );
    expect(() => run([bid(20, 5, count)], [ask(10)])).toThrow(
      expect.objectContaining({ field: 'orderCount' }),
    );
  });
  it('rejects more orders than shares, unsafe volume totals and an invalid reference', () => {
    expect(() => run([bid(20, 1, 2)], [ask(10)])).toThrow(
      expect.objectContaining({ field: 'orderCount' }),
    );
    expect(() => run([bid(20, Number.MAX_SAFE_INTEGER), bid(10, 1)], [ask(10)])).toThrow(
      expect.objectContaining({ field: 'totalShares' }),
    );
    expect(() => run([bid(20)], [ask(10)], 0)).toThrow(
      expect.objectContaining({ field: 'previousExecutionPriceCents' }),
    );
  });
  it('matches an independent per-cent exhaustive search on 200 deterministic small books', () => {
    let seed = 42;
    const random = (max: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % max;
    };
    for (let sample = 0; sample < 200; sample++) {
      const bids = Array.from({ length: 1 + random(4) }, () => bid(1 + random(12), 1 + random(6)));
      const asks = Array.from({ length: 1 + random(4) }, () => ask(1 + random(12), 1 + random(6)));
      const reference = sample % 3 === 0 ? null : 1 + random(15);
      const candidates = Array.from({ length: 12 }, (_, i) => {
        const price = i + 1;
        const demand = bids.reduce(
          (sum, level) => sum + (level.sellerLimitCents >= price ? level.shares : 0),
          0,
        );
        const supply = asks.reduce(
          (sum, level) => sum + (level.sellerLimitCents <= price ? level.shares : 0),
          0,
        );
        return {
          price,
          demand,
          supply,
          quantity: Math.min(demand, supply),
          imbalance: Math.abs(demand - supply),
          distance: reference === null ? 0 : Math.abs(price - reference),
        };
      })
        .filter((c) => c.quantity > 0)
        .sort(
          (a, b) =>
            b.quantity - a.quantity ||
            a.imbalance - b.imbalance ||
            a.distance - b.distance ||
            a.price - b.price,
        );
      const actual = run(bids, asks, reference);
      const expected = candidates[0];
      if (!expected) expect(actual.status).toBe('no-crossing');
      else
        expect(actual).toMatchObject({
          executionPriceCents: expected.price,
          exchangedShares: expected.quantity,
          eligibleDemandShares: expected.demand,
          eligibleSupplyShares: expected.supply,
          unmatchedEligibleShares: expected.imbalance,
        });
    }
  });
});
