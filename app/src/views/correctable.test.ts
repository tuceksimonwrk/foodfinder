import { describe, it, expect } from 'vitest';
import type { Offer } from '@foodfinder/shared';
import { correctableProducts } from './correctable';

const o = (id: string, name: string, nutrition?: Offer['nutrition']): Offer => ({
  id, name, store: 'lidl', price: 1, discountPct: 0, validFrom: '2026-10-12', validTo: '2026-10-20',
  category: 'ostatni', sourceUrl: 'u', nutrition,
});
const n = (source: 'off' | 'dictionary' | 'override', confidence: number) => ({
  kcal: 1, protein: 1, fat: 1, carbs: 1, source, confidence,
});
const offers = [
  o('1', 'Bez maker 200 g'),
  o('2', 'Bez maker 400 g'),
  o('3', 'Odhad slovník', n('dictionary', 0.6)),
  o('4', 'Jistě z OFF', n('off', 0.9)),
  o('5', 'Odhad OFF podle názvu', n('off', 0.5)),
];

describe('correctableProducts', () => {
  it('lists products without nutrition once per product', () =>
    expect(correctableProducts(offers, {}, false, '').map(([k]) => k)).toEqual(['bez maker']));
  it('also lists low-confidence estimates when asked', () =>
    expect(correctableProducts(offers, {}, true, '').map(([k]) => k).sort()).toEqual([
      'bez maker', 'odhad off podle nazvu', 'odhad slovnik',
    ]));
  it('hides products that already have a local correction', () =>
    expect(correctableProducts(offers, { 'bez maker': { kcal: 1, protein: 1, fat: 1, carbs: 1 } }, false, '')).toEqual([]));
  it('filters by query ignoring diacritics', () =>
    expect(correctableProducts(offers, {}, true, 'SLOVNÍK').map(([k]) => k)).toEqual(['odhad slovnik']));
});
