import type { MarketDataSource } from '../../application/secondary-market/ports/market-data-source.js';
import { GetScpiMarket } from '../../application/secondary-market/use-cases/get-scpi-market.js';
import { FetchHtmlClient } from '../../infra/http/fetch-html-client.js';
import { CachedMarketDataSource } from '../../infra/market-data/cache/cached-market-data-source.js';
import { PrimopierreMarketSource } from '../../infra/market-data/praemia/primopierre-market-source.js';

export function makeGetScpiMarket(sources?: ReadonlyMap<string, MarketDataSource>): GetScpiMarket {
  const registeredSources =
    sources ?? new Map([['primopierre', new PrimopierreMarketSource(new FetchHtmlClient())]]);
  return new GetScpiMarket(
    new Map([...registeredSources].map(([id, source]) => [id, new CachedMarketDataSource(source)])),
  );
}
