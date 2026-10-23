import { afterEach, describe, expect, it, vi } from 'vitest';

import { getApiJson, postApiJson } from '../../src/services/api-client';

afterEach(() => vi.unstubAllEnvs());

describe('Deployment API origin', () => {
  it.each(['https://louveinvest-api.vercel.app', 'https://louveinvest-api.vercel.app/'])(
    'joins %s with the GET endpoint without losing /api',
    async (origin) => {
      vi.stubEnv('VITE_API_BASE_URL', origin);
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response('{"status":"ok"}', { headers: { 'Content-Type': 'application/json' } }),
        );
      vi.stubGlobal('fetch', fetcher);
      await getApiJson('/api/health', (value) => value);
      expect(fetcher).toHaveBeenCalledWith(
        'https://louveinvest-api.vercel.app/api/health',
        expect.anything(),
      );
    },
  );

  it('sends scenario JSON to the configured external API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://louveinvest-api.vercel.app');
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    const body = { sellerPriceCents: 3188, shares: 10, fixedFeesCents: 0 };
    await postApiJson('/api/scpis/primopierre/yield-simulation', body, (value) => value);
    expect(fetcher).toHaveBeenCalledWith(
      'https://louveinvest-api.vercel.app/api/scpis/primopierre/yield-simulation',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    );
  });
});
