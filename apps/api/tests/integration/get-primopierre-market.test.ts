import { describe, expect, it, vi } from 'vitest';

import { GetScpiMarket } from '../../src/application/secondary-market/use-cases/get-scpi-market.js';
import { FetchHtmlClient } from '../../src/infra/http/fetch-html-client.js';
import { PrimopierreMarketSource } from '../../src/infra/market-data/praemia/primopierre-market-source.js';
import { marketHtml } from '../helpers/market-fixture.js';

describe('Market collection through application, HTTP adapter and HTML parser', () => {
  it('returns an observation without any live network dependency', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(marketHtml, { headers: { 'content-type': 'text/html;charset=UTF-8' } }),
      );
    const source = new PrimopierreMarketSource(new FetchHtmlClient(fetcher));
    const result = await new GetScpiMarket(new Map([['primopierre', source]])).execute({
      scpiId: 'primopierre',
    });
    expect(result.scpi.id).toBe('primopierre');
    expect(result.lastExecution.sellerPriceCents).toBe(3188);
    expect(result.orderBook.bids[1].shares).toBe(1000);
    expect(result.orderBook.coverage).toBe('public-top-5-levels');
    expect(new Date(result.source.fetchedAt).toISOString()).toBe(result.source.fetchedAt);
  });
});
