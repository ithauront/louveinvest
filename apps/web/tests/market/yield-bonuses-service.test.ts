import { describe, expect, it, vi } from 'vitest';

import { fetchYieldCurve, simulateYield } from '../../src/services/market/simulate-yield';
import { marketResponse } from './market-fixture';
import {
  curveFixture,
  curveInput,
  purchaseInput,
  simulationFixture,
} from './yield-bonuses-fixture';
describe('Scenario POST contracts', () => {
  it('posts purchase cents as JSON and validates the returned assumptions', async () => {
    const fetcher = vi.fn().mockResolvedValue(marketResponse(simulationFixture()));
    vi.stubGlobal('fetch', fetcher);
    expect(await simulateYield('primopierre', purchaseInput)).toEqual(simulationFixture());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/api/scpis/primopierre/yield-simulation',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(purchaseInput),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      }),
    );
  });
  it('posts the requested range and accepts all ordered points', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(curveFixture())));
    expect(await fetchYieldCurve('primopierre', curveInput)).toEqual(curveFixture());
  });
  it.each([
    { ...simulationFixture(), fixedFeesBasis: 'official' },
    { ...simulationFixture(), simulation: { ...simulationFixture().simulation, shares: 11 } },
    {
      ...simulationFixture(),
      simulation: { ...simulationFixture().simulation, fixedFeesCents: 0 },
    },
    {
      ...simulationFixture(),
      simulation: { ...simulationFixture().simulation, sellerPriceCents: 3000 },
    },
    {
      ...simulationFixture(),
      simulation: { ...simulationFixture().simulation, annualYieldPercent: -1 },
    },
    {
      ...simulationFixture(),
      simulation: {
        ...simulationFixture().simulation,
        totalAcquisitionCostCents: Number.MAX_SAFE_INTEGER + 1,
      },
    },
    {
      ...simulationFixture(),
      reference: {
        ...simulationFixture().reference,
        scpi: { id: 'other', name: 'Other', manager: 'Other' },
      },
    },
  ])('rejects incompatible simulation %#', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(payload)));
    await expect(simulateYield('primopierre', purchaseInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
  it.each([
    { ...curveFixture(), points: [] },
    { ...curveFixture(), points: curveFixture().points.slice(0, 2) },
    { ...curveFixture(), points: curveFixture().points.reverse() },
    { ...curveFixture(), points: Array(201).fill(curveFixture().points[0]) },
    {
      ...curveFixture(),
      points: curveFixture().points.map((point) => ({ ...point, fixedFeesCents: 0 })),
    },
  ])('rejects malformed or mismatched curve %#', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(payload)));
    await expect(fetchYieldCurve('primopierre', curveInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
  it('accepts an inclusive maximum with a shortened final interval', async () => {
    const response = curveFixture();
    response.points[2]!.sellerPriceCents = 3150;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(response)));
    expect(
      (await fetchYieldCurve('primopierre', { ...curveInput, maximumPriceCents: 3150 })).points.map(
        (point) => point.sellerPriceCents,
      ),
    ).toEqual([3000, 3100, 3150]);
  });
  it('preserves unavailable-year errors for POST requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          marketResponse({ error: { code: 'YIELD_DATA_UNAVAILABLE', message: 'private' } }, 503),
        ),
    );
    await expect(simulateYield('primopierre', purchaseInput)).rejects.toMatchObject({
      code: 'YIELD_DATA_UNAVAILABLE',
      status: 503,
    });
  });
});
