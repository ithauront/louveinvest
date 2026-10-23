export type YieldInputField =
  | 'year'
  | 'grossPerShareCents'
  | 'commissionBasisPoints'
  | 'registrationBasisPoints'
  | 'sellerPriceCents'
  | 'resultPrecision'
  | 'shares'
  | 'fixedFeesCents'
  | 'minimumPriceCents'
  | 'maximumPriceCents'
  | 'priceStepCents'
  | 'pointCount';

export class InvalidYieldInputError extends Error {
  readonly code = 'INVALID_YIELD_INPUT';

  constructor(readonly field: YieldInputField) {
    super(`Invalid yield input: ${field}`);
    this.name = 'InvalidYieldInputError';
  }
}
