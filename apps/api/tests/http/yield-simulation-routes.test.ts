import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';
import { MarketSourceError } from '../../src/application/secondary-market/errors/market-source-error.js';
import { yieldMarketFixture } from '../helpers/yield-market-fixture.js';
let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.restoreAllMocks();
});
function setup(year = 2026) {
  const fetch = vi.fn().mockResolvedValue(yieldMarketFixture());
  app = buildApp({
    logger: false,
    marketDataSources: new Map([['primopierre', { fetch }]]),
    now: () => new Date(`${year}-10-22T10:00:00Z`),
  });
  return { app, fetch };
}
const purchase = { sellerPriceCents: 3188, shares: 10, fixedFeesCents: 1000 };
const curve = {
  minimumPriceCents: 3000,
  maximumPriceCents: 3200,
  priceStepCents: 100,
  shares: 10,
  fixedFeesCents: 1000,
};
const path = '/api/scpis/primopierre/';
describe('Yield bonus HTTP composition', () => {
  it('returns a simulation with sourced reference and explicit hypothetical fixed fees', async () => {
    const { app } = setup();
    const response = await app.inject({
      method: 'POST',
      url: path + 'yield-simulation',
      payload: purchase,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      fixedFeesBasis: 'user-assumption',
      simulation: {
        totalAcquisitionCostCents: 36004,
        annualYieldPercent: 12.6652,
      },
      reference: {
        dividend: { year: 2025, grossPerShareCents: 456 },
        fees: { fixedFeesIncluded: false },
      },
    });
  });
  it('serves both bonuses and reference from one cached collection', async () => {
    const { app, fetch } = setup();
    expect((await app.inject(path + 'yield')).statusCode).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: path + 'yield-simulation', payload: purchase }))
        .statusCode,
    ).toBe(200);
    const response = await app.inject({
      method: 'POST',
      url: path + 'yield-curve',
      payload: curve,
    });
    expect(response.statusCode).toBe(200);
    expect(
      response.json().points.map((p: { sellerPriceCents: number }) => p.sellerPriceCents),
    ).toEqual([3000, 3100, 3200]);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([{ shares: 0 }, { fixedFeesCents: -1 }, { sellerPriceCents: 0 }, { shares: 0.5 }])(
    'rejects invalid purchase before fetching %j',
    async (patch) => {
      const { app, fetch } = setup();
      expect(
        (
          await app.inject({
            method: 'POST',
            url: path + 'yield-simulation',
            payload: { ...purchase, ...patch },
          })
        ).statusCode,
      ).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('rejects malformed JSON with 400', async () => {
    const { app, fetch } = setup();
    const response = await app.inject({
      method: 'POST',
      url: path + 'yield-simulation',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_REQUEST');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires an explicit fixed fee, including zero', async () => {
    const { app } = setup();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path + 'yield-simulation',
          payload: { shares: 10, sellerPriceCents: 3188 },
        })
      ).statusCode,
    ).toBe(400);
  });
  it.each([{ maximumPriceCents: 2999 }, { maximumPriceCents: 100000, priceStepCents: 1 }])(
    'maps domain range errors to 400 %j',
    async (patch) => {
      const { app } = setup();
      const response = await app.inject({
        method: 'POST',
        url: path + 'yield-curve',
        payload: { ...curve, ...patch },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_YIELD_INPUT');
    },
  );
  it('rejects unsafe totals with a typed error', async () => {
    const { app } = setup();
    const response = await app.inject({
      method: 'POST',
      url: path + 'yield-simulation',
      payload: { ...purchase, shares: Number.MAX_SAFE_INTEGER },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('resultPrecision');
  });
  it('preserves unavailable-year and unknown-SCPI handling', async () => {
    const { app } = setup(2027);
    expect(
      (await app.inject({ method: 'POST', url: path + 'yield-simulation', payload: purchase }))
        .statusCode,
    ).toBe(503);
    expect(
      (await app.inject({ method: 'POST', url: '/api/scpis/unknown/yield-curve', payload: curve }))
        .statusCode,
    ).toBe(404);
  });
  it('preserves source errors', async () => {
    const { app, fetch } = setup();
    fetch.mockRejectedValue(new MarketSourceError('SOURCE_TIMEOUT', 'private'));
    const response = await app.inject({
      method: 'POST',
      url: path + 'yield-curve',
      payload: curve,
    });
    expect(response.statusCode).toBe(504);
    expect(response.body).not.toContain('private');
  });
  it('carries stale warnings into simulations', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const { app, fetch } = setup();
    await app.inject(path + 'yield');
    clock.mockReturnValue(30 * 60_000);
    fetch.mockRejectedValue(new MarketSourceError('SOURCE_TIMEOUT', 'timeout'));
    const response = await app.inject({
      method: 'POST',
      url: path + 'yield-simulation',
      payload: purchase,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().reference.freshness).toBe('stale');
    expect(response.json().reference.warnings[0].code).toBe('STALE_DATA');
  });
});
