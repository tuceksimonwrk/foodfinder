import { describe, it, expect } from 'vitest';
import type { Nutrition, Offer } from './types';
import { czkPer30gProtein, proteinPer100kcal } from './nutrition';

const nutrition = (over: Partial<Nutrition> = {}): Nutrition => ({
  kcal: 100, protein: 20, fat: 2, carbs: 1, source: 'off', confidence: 0.9, ...over,
});
const offer = (over: Partial<Offer> = {}): Offer => ({
  id: 'x', store: 'lidl', name: 'X', price: 50, discountPct: 0, pricePerKg: 200,
  validFrom: '2026-10-12', validTo: '2026-10-18', category: 'maso', sourceUrl: 'u',
  nutrition: nutrition(), ...over,
});

describe('czkPer30gProtein', () => {
  it('computes cost of 30 g protein', () => expect(czkPer30gProtein(offer())).toBe(30));
  it('is undefined for zero protein', () =>
    expect(czkPer30gProtein(offer({ nutrition: nutrition({ protein: 0 }) }))).toBeUndefined());
  it('is undefined without nutrition', () =>
    expect(czkPer30gProtein(offer({ nutrition: undefined }))).toBeUndefined());
  it('is undefined without pricePerKg', () =>
    expect(czkPer30gProtein(offer({ pricePerKg: undefined }))).toBeUndefined());
});

describe('proteinPer100kcal', () => {
  it('computes grams of protein per 100 kcal', () =>
    expect(proteinPer100kcal(nutrition({ kcal: 200, protein: 20 }))).toBe(10));
  it('is undefined for zero kcal', () =>
    expect(proteinPer100kcal(nutrition({ kcal: 0 }))).toBeUndefined());
});
