import { InvalidYieldInputError } from '../errors/invalid-yield-input-error.js';

/** Both rates apply to the seller price. 100 basis points = 1%. Fixed fees excluded. */
export class AcquisitionFees {
  constructor(
    readonly commissionBasisPoints: number,
    readonly registrationBasisPoints: number,
  ) {
    for (const field of ['commissionBasisPoints', 'registrationBasisPoints'] as const) {
      if (!Number.isSafeInteger(this[field]) || this[field] < 0 || this[field] > 10_000) {
        throw new InvalidYieldInputError(field);
      }
    }
    Object.freeze(this);
  }
}
