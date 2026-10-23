import { InvalidYieldInputError } from '../errors/invalid-yield-input-error.js';

/** Half-up rounding for nonnegative exact rational amounts; guard the JSON number boundary. */
export function roundRatio(numerator: bigint, denominator: bigint): number {
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER))
    throw new InvalidYieldInputError('resultPrecision');
  return Number(rounded);
}
