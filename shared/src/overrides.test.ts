import { describe, it, expect } from 'vitest';
import type { Offer } from './types';
import { applyLocalOverrides } from './overrides';

const offer = (id: string, name: string, nutrition?: Offer['nutrition']): Offer => ({
  id, name, store: 'lidl', price: 10, discountPct: 0, validFrom: '2026-10-12', validTo: '2026-10-20',
  category: 'ostatni', sourceUrl: 'u', nutrition,
});
const macros = { kcal: 120, protein: 22, fat: 2, carbs: 1 };

describe('applyLocalOverrides', () => {
  it('adds nutrition to an offer without any', () => {
    const [o] = applyLocalOverrides([offer('1', 'Protein pudink 200 g')], { 'protein pudink': macros });
    expect(o.nutrition).toEqual({ ...macros, source: 'override', confidence: 1 });
  });
  it('replaces existing nutrition', () => {
    const existing = { kcal: 1, protein: 1, fat: 1, carbs: 1, source: 'dictionary' as const, confidence: 0.6 };
    const [o] = applyLocalOverrides([offer('1', 'Protein pudink', existing)], { 'protein pudink': macros });
    expect(o.nutrition?.protein).toBe(22);
  });
  it('leaves offers without a matching key untouched', () => {
    const input = [offer('1', 'Coca Cola')];
    expect(applyLocalOverrides(input, { 'protein pudink': macros })).toEqual(input);
  });
  it('applies one correction to every pack size of the same product', () => {
    const out = applyLocalOverrides([offer('1', 'Pudink 200 g'), offer('2', 'Pudink 400 g')], { pudink: macros });
    expect(out.every((o) => o.nutrition?.protein === 22)).toBe(true);
  });
});
