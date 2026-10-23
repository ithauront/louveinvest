import { describe, expect, it } from 'vitest';

import { formatBasisPoints, formatYieldPercent } from '../../src/utilities/market-format';
describe('Yield percentages', () => {
  it('formats percent units without multiplying the result by 100', () => {
    expect(formatYieldPercent(13.027)).toBe('13,027\u00a0%');
    expect(formatYieldPercent(0)).toBe('0\u00a0%');
  });
  it('converts basis points to percent units', () => {
    expect(formatBasisPoints(480)).toBe('4,8\u00a0%');
    expect(formatBasisPoints(500)).toBe('5\u00a0%');
    expect(formatBasisPoints(0)).toBe('0\u00a0%');
  });
});
