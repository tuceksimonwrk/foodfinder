import { describe, it, expect } from 'vitest';
import type { Nutrition, Offer } from './types';
import { podiumOffers } from './podium';
import { proteinEnergyPct } from './nutrition';

const nut = (protein: number, kcal = 100): Nutrition => ({ kcal, protein, fat: 1, carbs: 1, source: 'dictionary', confidence: 0.6 });
const mk = (id: string, name: string, pricePerKg: number | undefined, protein: number | undefined, store: Offer['store'] = 'lidl'): Offer => ({
  id, name, store, price: 10, discountPct: 0, pricePerKg, validFrom: '2026-10-12', validTo: '2026-10-20',
  category: 'maso', sourceUrl: 'u', nutrition: protein === undefined ? undefined : nut(protein),
});

describe('podiumOffers', () => {
  it('ranks by cost of 30 g protein, cheapest first, limited to n', () => {
    const offers = [
      mk('a', 'Kuřecí prsa', 150, 23),      // 19.6
      mk('b', 'Čočka', 60, 25),             // 7.2
      mk('c', 'Tvaroh', 80, 12),            // 20
      mk('d', 'Tofu', 150, 13),             // 34.6
    ];
    expect(podiumOffers(offers).map((e) => e.offer.id)).toEqual(['b', 'a', 'c']);
    expect(podiumOffers(offers, 2)).toHaveLength(2);
  });

  it('exposes the cost it ranked by', () => {
    const [first] = podiumOffers([mk('b', 'Čočka', 60, 25)]);
    expect(first.cost).toBeCloseTo(7.2);
  });

  it('skips offers whose cost cannot be computed', () => {
    const offers = [mk('x', 'Voda', 10, 0), mk('y', 'Bez maker', 50, undefined), mk('z', 'Bez ceny', undefined, 20), mk('ok', 'Skyr', 70, 11)];
    expect(podiumOffers(offers).map((e) => e.offer.id)).toEqual(['ok']);
  });

  it('shows each product once, at its cheapest store', () => {
    const offers = [mk('billa', 'Čočka Lagris 500 g', 70, 25, 'billa'), mk('tesco', 'Čočka Lagris 1 kg', 60, 25, 'tesco')];
    const result = podiumOffers(offers);
    expect(result).toHaveLength(1);
    expect(result[0].offer.id).toBe('tesco');
  });

  it('returns an empty podium for no data', () => expect(podiumOffers([])).toEqual([]));
});

describe('proteinEnergyPct', () => {
  it('is the share of calories that come from protein', () => expect(proteinEnergyPct(nut(20, 100))).toBe(80));
  it('is capped at 100', () => expect(proteinEnergyPct(nut(30, 100))).toBe(100));
  it('is 0 without calories', () => expect(proteinEnergyPct(nut(20, 0))).toBe(0));
});
