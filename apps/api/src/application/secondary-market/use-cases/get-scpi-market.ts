import type { MarketDataResult } from '../dtos/market-data-result.js';
import type { MarketDataSource } from '../ports/market-data-source.js';

export class ScpiNotFoundError extends Error {
  constructor(readonly scpiId: string) {
    super(`Unknown SCPI: ${scpiId}`);
    this.name = 'ScpiNotFoundError';
  }
}

export class GetScpiMarket {
  constructor(private readonly sources: ReadonlyMap<string, MarketDataSource>) {}

  async execute(input: { scpiId: string }): Promise<MarketDataResult> {
    const source = this.sources.get(input.scpiId);
    if (!source) throw new ScpiNotFoundError(input.scpiId);
    return source.fetch();
  }
}
