import { describe, it, expect } from 'vitest';
import type { Nutrition, Offer } from './types';
import { applyFilters, buildIndex, sortOffers, type Filters } from './search';

const nut = (protein: number, fat: number): Nutrition => ({
  kcal: 100, protein, fat, carbs: 0, source: 'dictionary', confidence: 0.6,
});
const mk = (id: string, name: string, over: Partial<Offer> = {}): Offer => ({
  id, name, store: 'lidl', price: 50, discountPct: 0, pricePerKg: 100, validFrom: '2026-10-12',
  validTo: '2026-10-20', category: 'ostatni', sourceUrl: 'u', ...over,
});

const OFFERS: Offer[] = [
  mk('1', 'Kuřecí prsa', { category: 'maso', discountPct: 40, nutrition: nut(23, 1), pricePerKg: 150 }),
  mk('2', 'Tvaroh polotučný', { category: 'mlecne', store: 'albert', discountPct: 10, nutrition: nut(12, 4), pricePerKg: 80 }),
  mk('3', 'Paštika', { category: 'maso', store: 'penny', discountPct: 35, nutrition: nut(10, 12), pricePerKg: 120 }),
  mk('4', 'Coca Cola', { discountPct: 50 }),
  mk('5', 'Voda', { nutrition: nut(0, 0), pricePerKg: 10 }),
  mk('6', 'Kuřecí stehna', { category: 'maso', pieces: 1, pricePerKg: undefined, nutrition: nut(20, 5) }),
];
const F: Filters = {
  query: '', stores: [], categories: [], minDiscountPct: 0, fit: false, minProtein: 0, maxFat: 100,
};
const run = (over: Partial<Filters>) => applyFilters(OFFERS, buildIndex(OFFERS), { ...F, ...over });
const ids = (o: Offer[]) => o.map((x) => x.id).sort();

describe('applyFilters', () => {
  it('finds accented names with an unaccented query', () => expect(ids(run({ query: 'kureci' }))).toEqual(['1', '6']));
  it('tolerates a typo', () => expect(ids(run({ query: 'tvarog' }))).toEqual(['2']));
  it('requires every query word', () => expect(ids(run({ query: 'kureci prsa' }))).toEqual(['1']));
  it('filters by minimum discount', () => expect(ids(run({ minDiscountPct: 30 }))).toEqual(['1', '3', '4']));
  it('filters by store', () => expect(ids(run({ stores: ['penny'] }))).toEqual(['3']));
  it('filters by category', () => expect(ids(run({ categories: ['mlecne'] }))).toEqual(['2']));
  it('filters by maximum price', () =>
    expect(ids(applyFilters([mk('a', 'A', { price: 10 }), mk('b', 'B', { price: 99 })], buildIndex(OFFERS), { ...F, maxPrice: 50 }))).toEqual(['a']));
  it('fit mode drops offers without nutrition and those outside the macro limits', () =>
    expect(ids(run({ fit: true, minProtein: 15, maxFat: 5 }))).toEqual(['1', '6']));
  it('handles an empty offer list', () =>
    expect(applyFilters([], buildIndex([]), { ...F, query: 'x', fit: true })).toEqual([]));
});

describe('sortOffers', () => {
  it('sorts by protein cost ascending with unknown costs last', () => {
    const sorted = sortOffers(OFFERS.filter((o) => ['1', '2', '5', '6'].includes(o.id)), 'proteinCost');
    // 1: 3*150/23≈19.6, 2: 3*80/12=20, 5: protein 0 -> undefined, 6: no pricePerKg -> undefined
    expect(sorted.slice(0, 2).map((o) => o.id)).toEqual(['1', '2']);
    expect(sorted.slice(2).map((o) => o.id).sort()).toEqual(['5', '6']);
  });
  it('sorts by discount descending', () => expect(sortOffers(OFFERS, 'discount')[0].id).toBe('4'));
  it('sorts by price ascending', () =>
    expect(sortOffers([mk('a', 'A', { price: 30 }), mk('b', 'B', { price: 10 })], 'price').map((o) => o.id)).toEqual(['b', 'a']));
  it('sorts by protein descending with missing nutrition last', () => {
    const s = sortOffers(OFFERS, 'protein');
    expect(s[0].id).toBe('1');
    expect(s[s.length - 1].nutrition).toBeUndefined();
  });
  it('keeps relevance order and does not mutate the input', () => {
    const copy = [...OFFERS];
    expect(sortOffers(OFFERS, 'relevance')).toEqual(copy);
    sortOffers(OFFERS, 'price');
    expect(OFFERS).toEqual(copy);
  });
});
