import type {
  PurchaseScenarioInput,
  YieldBonusErrors,
  YieldBonusFields,
  YieldCurveInput,
} from '../../types/yield-bonuses';
import { parseMoneyCents } from '../../utilities/parse-money';

type Validation<T> = { success: true; data: T } | { success: false; errors: YieldBonusErrors };
function common(fields: YieldBonusFields, errors: YieldBonusErrors) {
  const shares = /^\d+$/.test(fields.shares.trim()) ? Number(fields.shares.trim()) : NaN;
  if (!Number.isSafeInteger(shares) || shares <= 0)
    errors.shares = 'Saisissez un nombre entier de parts supérieur à zéro.';
  const fixedFeesCents = parseMoneyCents(fields.fixedFees, true);
  if (fixedFeesCents === null)
    errors.fixedFees = 'Saisissez un coût fixe positif ou zéro, avec au maximum deux décimales.';
  return { shares, fixedFeesCents };
}
export function validatePurchaseScenario(
  fields: YieldBonusFields,
): Validation<PurchaseScenarioInput> {
  const errors: YieldBonusErrors = {};
  const { shares, fixedFeesCents } = common(fields, errors);
  const sellerPriceCents = parseMoneyCents(fields.sellerPrice);
  if (sellerPriceCents === null)
    errors.sellerPrice = 'Saisissez un prix positif avec au maximum deux décimales.';
  if (Object.keys(errors).length || fixedFeesCents === null || sellerPriceCents === null)
    return { success: false, errors };
  return { success: true, data: { shares, fixedFeesCents, sellerPriceCents } };
}
export function validateYieldCurve(fields: YieldBonusFields): Validation<YieldCurveInput> {
  const errors: YieldBonusErrors = {};
  const { shares, fixedFeesCents } = common(fields, errors);
  const minimumPriceCents = parseMoneyCents(fields.minimumPrice),
    maximumPriceCents = parseMoneyCents(fields.maximumPrice),
    priceStepCents = parseMoneyCents(fields.priceStep);
  for (const [field, value] of [
    ['minimumPrice', minimumPriceCents],
    ['maximumPrice', maximumPriceCents],
    ['priceStep', priceStepCents],
  ] as const) {
    if (value === null)
      errors[field] = 'Saisissez un montant positif avec au maximum deux décimales.';
  }
  if (minimumPriceCents !== null && maximumPriceCents !== null && priceStepCents !== null) {
    if (maximumPriceCents < minimumPriceCents)
      errors.maximumPrice = 'Le prix maximum doit être supérieur ou égal au minimum.';
    else {
      const distance = BigInt(maximumPriceCents) - BigInt(minimumPriceCents),
        step = BigInt(priceStepCents);
      if (distance / step + 1n + (distance % step === 0n ? 0n : 1n) > 200n)
        errors.priceStep = 'Choisissez un pas plus grand : la courbe est limitée à 200 points.';
    }
  }
  if (
    Object.keys(errors).length ||
    fixedFeesCents === null ||
    minimumPriceCents === null ||
    maximumPriceCents === null ||
    priceStepCents === null
  )
    return { success: false, errors };
  return {
    success: true,
    data: { shares, fixedFeesCents, minimumPriceCents, maximumPriceCents, priceStepCents },
  };
}
