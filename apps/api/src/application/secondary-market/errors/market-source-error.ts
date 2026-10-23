export type MarketSourceErrorCode =
  'SOURCE_UNAVAILABLE' | 'SOURCE_TIMEOUT' | 'SOURCE_FORMAT_CHANGED';

export class MarketSourceError extends Error {
  constructor(
    readonly code: MarketSourceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MarketSourceError';
  }
}
