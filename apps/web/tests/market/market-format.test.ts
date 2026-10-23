import { describe, expect, it } from 'vitest';

import {
  formatCollectedAt,
  formatMarketDate,
  formatQuantity,
} from '../../src/utilities/market-format';
describe('French market formatting', () => {
  it('keeps Paris civil times as published, including daylight-saving boundaries', () => {
    expect(formatMarketDate('2026-10-29T16:00:00')).toBe('29 octobre 2026 à 16:00');
    expect(formatMarketDate('2026-03-29T16:00:00')).toBe('29 mars 2026 à 16:00');
  });
  it('converts UTC collection timestamps into Paris time', () => {
    expect(formatCollectedAt('2026-07-01T23:00:00Z')).toBe('02 juillet 2026 à 01:00');
    expect(formatCollectedAt('2026-12-01T23:00:00Z')).toBe('02 décembre 2026 à 00:00');
  });
  it('formats calendar dates and quantities in French', () => {
    expect(formatMarketDate('2026-09-24')).toBe('24 septembre 2026');
    expect(formatQuantity(1234)).toBe('1\u202f234');
  });
});
