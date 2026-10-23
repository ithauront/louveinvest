import { describe, expect, it } from 'vitest';

import { PraemiaParsingError } from '../../../../src/infra/market-data/praemia/errors/praemia-parsing-error.js';
import {
  normalizeText,
  parseEuroCents,
  parseFrenchDate,
  parseFrenchInteger,
  parseFrenchLocalDateTime,
} from '../../../../src/infra/market-data/praemia/french-values.js';

describe('French source values', () => {
  it('normalizes typography and whitespace', () => {
    expect(normalizeText('  Nombre\u00a0d’ordres\n')).toBe("Nombre d'ordres");
  });
  it.each([
    ['31,88 €', 3188],
    ['1\u202f234,56 €', 123456],
    ['1\u00a0234,5€', 123450],
    ['35,00 € / Part', 3500],
    ['0 €', 0],
  ])('parses %s to exact cents', (raw, cents) => {
    expect(parseEuroCents(raw)).toBe(cents);
  });
  it.each([
    '31.88 €',
    '12 34,00 €',
    '-1,00 €',
    '1,234 €',
    '',
    '1,00 € extra',
    'NaN €',
    '9007199254740992 €',
  ])('rejects malformed amount %s', (raw) => {
    expect(() => parseEuroCents(raw)).toThrow(PraemiaParsingError);
  });
  it.each([
    ['1 000', 1000],
    ['752', 752],
    ['1\u00a0000', 1000],
    ['0', 0],
  ])('parses quantity %s', (raw, expected) => {
    expect(parseFrenchInteger(raw)).toBe(expected);
  });
  it.each(['1,5', '1 00', '-2', '123abc', '9007199254740992'])(
    'rejects invalid quantity %s',
    (raw) => {
      expect(() => parseFrenchInteger(raw)).toThrow(PraemiaParsingError);
    },
  );
  it('converts a real French date and preserves local time without inventing an offset', () => {
    expect(parseFrenchDate('29/02/2024')).toBe('2024-02-29');
    expect(parseFrenchLocalDateTime('29/10/2026', '16:00')).toBe('2026-10-29T16:00:00');
  });
  it.each(['29/02/2025', '31/04/2026', '00/01/2026', '2026-10-21', '21/13/2026'])(
    'rejects impossible date %s',
    (raw) => {
      expect(() => parseFrenchDate(raw)).toThrow(PraemiaParsingError);
    },
  );
  it.each(['24:00', '16:60', '4:00', '16:00Z'])('rejects invalid local time %s', (raw) => {
    expect(() => parseFrenchLocalDateTime('21/10/2026', raw)).toThrow(PraemiaParsingError);
  });
  it.each([
    [() => parseFrenchInteger('1,5'), 'INVALID_INTEGER'],
    [() => parseEuroCents('unknown'), 'INVALID_AMOUNT'],
    [() => parseFrenchDate('31/02/2026'), 'INVALID_DATE'],
    [() => parseFrenchLocalDateTime('21/10/2026', '24:00'), 'INVALID_TIME'],
    [() => parseFrenchInteger('9007199254740992'), 'UNSAFE_INTEGER'],
  ] as const)('exposes a stable reason without matching error messages', (parse, reason) => {
    expect(parse).toThrow(expect.objectContaining({ name: 'PraemiaParsingError', reason }));
  });
});
