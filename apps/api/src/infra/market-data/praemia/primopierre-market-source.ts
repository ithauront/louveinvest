import type { MarketDataResult } from '../../../application/secondary-market/dtos/market-data-result.js';
import type { MarketDataSource } from '../../../application/secondary-market/ports/market-data-source.js';
import { Scpi } from '../../../domain/secondary-market/entities/scpi.js';
import type { HtmlClient } from '../../http/html-client.js';
import { PrimopierreMarketParser } from './primopierre-market-parser.js';

const PRIMOPIERRE = new Scpi({
  id: 'primopierre',
  name: 'Primopierre',
  manager: 'Praemia REIM France',
});
export const PRIMOPIERRE_URL = 'https://www.praemiareim.fr/fr/scpi-primopierre';

export class PrimopierreMarketSource implements MarketDataSource {
  constructor(
    private readonly client: HtmlClient,
    private readonly parser = new PrimopierreMarketParser(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetch(): Promise<MarketDataResult> {
    const html = await this.client.get(PRIMOPIERRE_URL);
    const fetchedAt = this.now().toISOString();
    const { updatedAtLocal, ...data } = this.parser.parse(html);
    return {
      scpi: PRIMOPIERRE,
      source: { url: PRIMOPIERRE_URL, fetchedAt, updatedAtLocal, timeZone: 'Europe/Paris' },
      ...data,
      freshness: 'fresh',
      warnings: [],
    };
  }
}
