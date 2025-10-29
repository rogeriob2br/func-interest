import { describe, it, expect } from 'vitest';
import { validateAndNormalizeInterest } from '../../src/core/validate';

describe('validate', () => {
  it('aceita payload válido', () => {
    const out = validateAndNormalizeInterest({ persona: 'nomade', email: 'a@b.com', consent: true, name: ' Ana ' });
    expect(out.email).toBe('a@b.com');
    expect(out.name).toBe('Ana');
  });

  it('rejeita email inválido e consent false', () => {
    expect(() => validateAndNormalizeInterest({ persona: 'nomade', email: 'x', consent: false })).toThrow();
  });
});






