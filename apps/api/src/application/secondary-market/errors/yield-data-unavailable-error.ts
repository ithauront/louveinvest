export class YieldDataUnavailableError extends Error {
  readonly code = 'YIELD_DATA_UNAVAILABLE';

  constructor(
    readonly scpiId: string,
    readonly dividendYear: number,
  ) {
    super(`Yield parameters unavailable for ${scpiId}, dividend year ${dividendYear}`);
    this.name = 'YieldDataUnavailableError';
  }
}
