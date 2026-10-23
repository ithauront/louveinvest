export type PraemiaParsingReason =
  | 'UNSAFE_INTEGER'
  | 'INVALID_INTEGER'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_STRUCTURE'
  | 'INCONSISTENT_DATA';

/** Internal diagnostic; translated to MarketSourceError at the source boundary. */
export class PraemiaParsingError extends Error {
  constructor(
    readonly reason: PraemiaParsingReason,
    message: string,
  ) {
    super(message);
    this.name = 'PraemiaParsingError';
  }
}
