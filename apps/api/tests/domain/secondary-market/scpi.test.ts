import { describe, expect, it } from 'vitest';

import { Scpi } from '../../../src/domain/secondary-market/entities/scpi.js';
import { InvalidScpiError } from '../../../src/domain/secondary-market/errors/invalid-scpi-error.js';

describe('Scpi', () => {
  it('preserves identity and normalizes display names', () => {
    const scpi = new Scpi({
      id: 'primopierre',
      name: ' Primopierre ',
      manager: ' Praemia REIM France ',
    });
    expect(scpi).toEqual({
      id: 'primopierre',
      name: 'Primopierre',
      manager: 'Praemia REIM France',
    });
    expect(Object.isFrozen(scpi)).toBe(true);
  });

  it.each(['', '../external', 'Primopierre', 'two words', '-id'])('rejects invalid id %s', (id) => {
    expect(() => new Scpi({ id, name: 'Fund', manager: 'Manager' })).toThrow(
      expect.objectContaining({ name: 'InvalidScpiError', code: 'INVALID_SCPI', field: 'id' }),
    );
  });

  it.each([
    { name: '', manager: 'Manager', field: 'name' },
    { name: 'Fund', manager: ' ', field: 'manager' },
  ])('rejects missing identity details', ({ field, ...props }) => {
    expect(() => new Scpi({ id: 'fund', ...props })).toThrow(InvalidScpiError);
    expect(() => new Scpi({ id: 'fund', ...props })).toThrow(
      expect.objectContaining({ code: 'INVALID_SCPI', field }),
    );
  });
});
