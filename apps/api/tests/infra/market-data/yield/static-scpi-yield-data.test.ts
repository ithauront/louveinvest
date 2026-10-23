import { describe, expect, it } from 'vitest';

import { StaticScpiYieldData } from '../../../../src/infra/market-data/yield/static-scpi-yield-data.js';

describe('StaticScpiYieldData', () => {
  const provider = new StaticScpiYieldData();
  it('stores the verified gross dividend, rates and exact official references', async () => {
    const result = await provider.find('primopierre', 2025);
    expect(result?.dividend.grossPerShareCents).toBe(456);
    expect(result?.dividend.year).toBe(2025);
    expect(result?.fees.commissionBasisPoints).toBe(480);
    expect(result?.fees.registrationBasisPoints).toBe(500);
    expect(result?.dividendSource.url).toContain('www.praemiareim.fr/documents/');
    expect(result?.dividendSource.pages).toEqual([6]);
    expect(result?.feesSource.pages).toEqual([20, 24]);
  });
  it.each([
    ['unknown', 2025],
    ['primopierre', 2024],
    ['primopierre', 2026],
  ])('has no fallback for %s, %s', async (id, year) => {
    await expect(provider.find(String(id), Number(year))).resolves.toBeNull();
  });
});
