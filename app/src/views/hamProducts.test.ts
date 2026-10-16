import { describe, it, expect } from 'vitest';
import type { Offer } from '@foodfinder/shared';
import { hamProducts } from './hamProducts';

const o = (id: string, name: string): Offer => ({
  id, name, store: 'lidl', price: 1, discountPct: 0, validFrom: '2026-10-12', validTo: '2026-10-20', category: 'maso', sourceUrl: 'u',
});
const offers = [o('1', 'Šunka výběrová Pikok 100 g'), o('2', 'Šunka výběrová Pikok 250 g'), o('3', 'Šunka sedlácká sušená Dulano'), o('4', 'Salám šunkový Pikok'), o('5', 'Tvaroh')];

describe('hamProducts', () => {
  it('lists each ham once and nothing else', () =>
    expect(hamProducts(offers, {}, '').map(([k]) => k)).toEqual(['sunka vyberova pikok', 'sunka sedlacka susena dulano']));
  it('hides hams that already have a value', () =>
    expect(hamProducts(offers, { 'sunka vyberova pikok': 85 }, '').map(([k]) => k)).toEqual(['sunka sedlacka susena dulano']));
  it('filters by query ignoring diacritics', () =>
    expect(hamProducts(offers, {}, 'SEDLÁCKÁ').map(([k]) => k)).toEqual(['sunka sedlacka susena dulano']));
});
