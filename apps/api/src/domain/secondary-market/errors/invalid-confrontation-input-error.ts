export type ConfrontationInputField =
  | 'sellerLimitCents'
  | 'shares'
  | 'orderCount'
  | 'previousExecutionPriceCents'
  | 'totalShares'
  | 'estimate';

export class InvalidConfrontationInputError extends Error {
  readonly code = 'INVALID_CONFRONTATION_INPUT';

  constructor(readonly field: ConfrontationInputField) {
    super(`Invalid confrontation input: ${field}`);
    this.name = 'InvalidConfrontationInputError';
  }
}
