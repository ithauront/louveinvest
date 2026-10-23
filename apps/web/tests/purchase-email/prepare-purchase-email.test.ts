import { describe, expect, it } from 'vitest';

import { preparePurchaseEmail } from '../../src/services/purchase-email/prepare-purchase-email';
import { validatePurchaseEmailInput } from '../../src/services/purchase-email/purchase-email.validation';
import type { PurchaseEmailInput } from '../../src/types/purchase-email';
import { formatEuroCents } from '../../src/utilities/currency';

const input: PurchaseEmailInput = {
  firstName: ' Marie ',
  lastName: 'Dupont',
  existingAssociate: false,
  associateNumber: 'OLD-HIDDEN',
  shares: '10',
  maxPricePerShare: '31,88',
};
const contact = {
  scpiName: 'Primopierre',
  managerName: 'Praemia REIM France',
  recipient: 'contact@example.com',
};

describe('Purchase email validation', () => {
  it('normalizes names and converts the French maximum price into integer cents', () => {
    expect(validatePurchaseEmailInput(input)).toEqual({
      success: true,
      data: {
        firstName: 'Marie',
        lastName: 'Dupont',
        associateNumber: null,
        shares: 10,
        maxPricePerShareCents: 3188,
      },
    });
  });
  it.each(['31,88', '31.88', '031,88', ' 31,88 '])('accepts unambiguous price %s', (price) => {
    const result = validatePurchaseEmailInput({ ...input, maxPricePerShare: price });
    expect(result).toMatchObject({ success: true, data: { maxPricePerShareCents: 3188 } });
  });
  it.each(['1 000,50', '1\u00a0000,50', '1\u202f000.50'])(
    'handles French grouping in %s',
    (price) => {
      expect(validatePurchaseEmailInput({ ...input, maxPricePerShare: price })).toMatchObject({
        success: true,
        data: { maxPricePerShareCents: 100050 },
      });
    },
  );
  it.each([
    '0',
    '-1',
    '1,234',
    '1.000,00',
    '12 34,00',
    '3e2',
    '31 €',
    '',
    'NaN',
    '9007199254740992',
  ])('rejects invalid price %s', (price) => {
    expect(validatePurchaseEmailInput({ ...input, maxPricePerShare: price })).toMatchObject({
      success: false,
      errors: { maxPricePerShare: expect.any(String) },
    });
  });
  it.each(['0', '-2', '1.5', '1,5', '1e3', '', '9007199254740992'])(
    'requires positive safe whole shares, received %s',
    (shares) => {
      expect(validatePurchaseEmailInput({ ...input, shares })).toMatchObject({
        success: false,
        errors: { shares: expect.any(String) },
      });
    },
  );
  it('requires the shareholder number only for an existing associate', () => {
    expect(
      validatePurchaseEmailInput({ ...input, existingAssociate: true, associateNumber: '' }),
    ).toMatchObject({ success: false, errors: { associateNumber: expect.any(String) } });
    expect(
      validatePurchaseEmailInput({
        ...input,
        existingAssociate: true,
        associateNumber: ' FR-123 / 4 ',
      }),
    ).toMatchObject({ success: true, data: { associateNumber: 'FR-123 / 4' } });
  });
  it.each(['', ' ', 'Marie\nBcc: other@example.com', 'A\tB', 'A'.repeat(101)])(
    'rejects empty, multiline or excessive names',
    (firstName) => {
      expect(validatePurchaseEmailInput({ ...input, firstName })).toMatchObject({
        success: false,
        errors: { firstName: expect.any(String) },
      });
    },
  );
  it('supports accents, apostrophes and non-Latin names without ASCII-only rules', () => {
    expect(
      validatePurchaseEmailInput({ ...input, firstName: 'Éléonore', lastName: '李 O’Connor' }),
    ).toMatchObject({ success: true, data: { firstName: 'Éléonore', lastName: '李 O’Connor' } });
  });
  it('validates last name and associate number independently', () => {
    expect(
      validatePurchaseEmailInput({
        ...input,
        lastName: '',
        existingAssociate: true,
        associateNumber: 'A\nB',
      }),
    ).toMatchObject({
      success: false,
      errors: { lastName: expect.any(String), associateNumber: expect.any(String) },
    });
  });
});

describe('Email preparation', () => {
  it('includes all exercise fields and a request for information, without transmitting an order', () => {
    const result = preparePurchaseEmail(
      { ...input, existingAssociate: true, associateNumber: 'FR-123' },
      contact,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.draft.recipient).toBe(contact.recipient);
    expect(result.draft.subject).toBe('Projet d’achat de parts — Primopierre');
    for (const content of [
      'Prénom : Marie',
      'Nom : Dupont',
      'Numéro d’associé : FR-123',
      'Nombre de parts souhaité : 10',
      'hors frais : 31,88\u00a0€',
      'ne vaut pas transmission',
    ]) {
      expect(result.draft.body).toContain(content);
    }
    expect(result.draft.text).toBe(
      `À : ${contact.recipient}\nObjet : ${result.draft.subject}\n\n${result.draft.body}`,
    );
  });
  it('never leaks a hidden associate number for a non-associate', () => {
    const result = preparePurchaseEmail(input, contact);
    expect(result.success && result.draft.body).toContain('Je ne suis pas encore associé');
    expect(result.success && result.draft.text).not.toContain('OLD-HIDDEN');
  });
  it('returns validation errors rather than creating a partial draft', () => {
    expect(preparePurchaseEmail({ ...input, shares: '0' }, contact)).toMatchObject({
      success: false,
    });
  });
  it('does not mutate the form input and can use another configured SCPI', () => {
    const original = structuredClone(input);
    const result = preparePurchaseEmail(input, { ...contact, scpiName: 'Other SCPI' });
    expect(result.success && result.draft.subject).toContain('Other SCPI');
    expect(input).toEqual(original);
  });
  it('formats exact cents, including near the safe integer limit', () => {
    expect(formatEuroCents(3188)).toBe('31,88\u00a0€');
    expect(formatEuroCents(Number.MAX_SAFE_INTEGER)).toBe(
      '90\u202f071\u202f992\u202f547\u202f409,91\u00a0€',
    );
  });
});
