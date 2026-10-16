import { describe, it, expect } from 'vitest';
import { lookupDictionary } from './dictionary';

describe('lookupDictionary', () => {
  it('recognizes chicken breast', () => {
    const n = lookupDictionary('Kuřecí prsa chlazená 1 kg');
    expect(n?.source).toBe('dictionary');
    expect(n!.protein).toBeGreaterThanOrEqual(21);
    expect(n!.protein).toBeLessThanOrEqual(25);
  });
  it('prefers the longest keyword', () => {
    const lean = lookupDictionary('Tvaroh odtučněný 250 g')!;
    const normal = lookupDictionary('Tvaroh polotučný 250 g')!;
    expect(lean.fat).toBeLessThan(normal.fat);
  });
  it('returns null for unknown products', () => expect(lookupDictionary('Coca Cola')).toBeNull());
});
