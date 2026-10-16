import { describe, it, expect, vi } from 'vitest';
import type { Nutrition, Offer } from '@foodfinder/shared';
import { enrichOffers, type EnrichDeps } from './enrich';

const offer = (name: string, over: Partial<Offer> = {}): Offer => ({
  id: name, store: 'lidl', name, price: 50, discountPct: 0, pricePerKg: 100,
  validFrom: '2026-10-12', validTo: '2026-10-18', category: 'maso', sourceUrl: 'u', ...over,
});
const dictNutrition: Nutrition = { kcal: 110, protein: 23, fat: 1, carbs: 0, source: 'dictionary', confidence: 0.6 };
const offNutrition: Nutrition = { kcal: 90, protein: 10, fat: 1, carbs: 5, source: 'off', confidence: 0.9 };

const deps = (over: Partial<EnrichDeps> = {}): EnrichDeps => ({
  off: vi.fn(async () => null),
  dictionary: (n) => (n.toLowerCase().includes('kuřecí') ? dictNutrition : null),
  overrides: {},
  ...over,
});

describe('enrichOffers', () => {
  it('lets overrides win over the dictionary', async () => {
    const d = deps({ overrides: { 'kureci prsa': { kcal: 1, protein: 2, fat: 3, carbs: 4 } } });
    const [o] = await enrichOffers([offer('Kuřecí prsa 1 kg')], d);
    expect(o.nutrition).toMatchObject({ protein: 2, source: 'override', confidence: 1 });
  });
  it('passes the ean to OFF', async () => {
    const off = vi.fn(async () => offNutrition);
    const withEan = offer('Skyr natural', { ean: '8590000000001' });
    await enrichOffers([withEan], deps({ off }));
    expect(off).toHaveBeenCalledWith({ ean: '8590000000001', name: 'Skyr natural' });
  });
  it('does not call OFF when the dictionary already knows the product', async () => {
    const off = vi.fn(async () => offNutrition);
    await enrichOffers([offer('Kuřecí prsa')], deps({ off }));
    expect(off).not.toHaveBeenCalled();
  });
  it('leaves unmatched offers without nutrition', async () => {
    const [o] = await enrichOffers([offer('Coca Cola')], deps());
    expect(o.nutrition).toBeUndefined();
  });
});
