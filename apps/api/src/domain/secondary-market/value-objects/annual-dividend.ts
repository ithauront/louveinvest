import { InvalidYieldInputError } from '../errors/invalid-yield-input-error.js';

export class AnnualDividend {
  constructor(
    readonly year: number,
    readonly grossPerShareCents: number,
  ) {
    if (!Number.isInteger(year) || year < 1900 || year > 9999)
      throw new InvalidYieldInputError('year');
    if (!Number.isSafeInteger(grossPerShareCents) || grossPerShareCents < 0) {
      throw new InvalidYieldInputError('grossPerShareCents');
    }
    Object.freeze(this);
  }
}
