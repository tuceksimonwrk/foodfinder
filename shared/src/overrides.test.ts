import { describe, it, expect } from 'vitest';
import type { Offer } from './types';
import { applyLocalMeat, applyLocalOverrides } from './overrides';

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

describe('applyLocalMeat', () => {
  const ham = (id: string, name: string): Offer => ({
    id, name, store: 'lidl', price: 10, discountPct: 0, validFrom: '2026-10-12', validTo: '2026-10-20', category: 'maso', sourceUrl: 'u',
  });
  it('adds the meat share to every pack of the same product', () => {
    const out = applyLocalMeat([ham('1', 'Šunka výběrová Pikok 100 g'), ham('2', 'Šunka výběrová Pikok 250 g'), ham('3', 'Tvaroh')], { 'sunka vyberova pikok': 85 });
    expect(out.map((o) => o.meatPct)).toEqual([85, 85, undefined]);
  });
  it('returns the offers untouched when nothing was entered', () => {
    const input = [ham('1', 'Šunka')];
    expect(applyLocalMeat(input, {})).toEqual(input);
  });
  it('keys on the normalized name so diacritics and case do not matter', () =>
    expect(applyLocalMeat([ham('1', 'ŠUNKA Výběrová')], { 'sunka vyberova': 72 })[0].meatPct).toBe(72));
});
