import type {
  PurchaseEmailErrors,
  PurchaseEmailInput,
  ValidationResult,
} from '../../types/purchase-email';

function singleLine(value: string, maxLength: number): string | null {
  if (/[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const normalized = value.normalize('NFC').trim().replace(/ +/g, ' ');
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function parsePriceCents(value: string): number | null {
  const match = value.trim().match(/^(\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.](\d{1,2}))?$/);
  if (!match) return null;
  const cents =
    BigInt(match[1].replace(/\s/g, '')) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return cents > 0n && cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

export function validatePurchaseEmailInput(input: PurchaseEmailInput): ValidationResult {
  const errors: PurchaseEmailErrors = {};
  const firstName = singleLine(input.firstName, 100);
  const lastName = singleLine(input.lastName, 100);
  if (!firstName)
    errors.firstName = 'Saisissez un prénom sur une seule ligne (100 caractères maximum).';
  if (!lastName) errors.lastName = 'Saisissez un nom sur une seule ligne (100 caractères maximum).';
  const associateNumber = input.existingAssociate ? singleLine(input.associateNumber, 80) : null;
  if (input.existingAssociate && !associateNumber)
    errors.associateNumber = 'Saisissez votre numéro d’associé (80 caractères maximum).';
  const shares = /^\d+$/.test(input.shares.trim()) ? Number(input.shares.trim()) : NaN;
  if (!Number.isSafeInteger(shares) || shares <= 0)
    errors.shares = 'Saisissez un nombre entier de parts supérieur à zéro.';
  const priceCents = parsePriceCents(input.maxPricePerShare);
  if (priceCents === null)
    errors.maxPricePerShare =
      'Saisissez un prix positif avec au maximum deux décimales, par exemple 31,88.';
  if (Object.keys(errors).length || firstName === null || lastName === null || priceCents === null)
    return { success: false, errors };
  return {
    success: true,
    data: { firstName, lastName, associateNumber, shares, maxPricePerShareCents: priceCents },
  };
}
