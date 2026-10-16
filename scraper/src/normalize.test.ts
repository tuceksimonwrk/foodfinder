import { describe, it, expect } from 'vitest';
import type { RawOffer } from '@foodfinder/shared';
import { normalizeOffer } from './normalize';

const base: RawOffer = {
  store: 'lidl',
  name: 'Tvaroh polotučný',
  price: 50,
  originalPrice: 80,
  quantityText: '250 g',
  validFrom: '2026-10-12',
  validTo: '2026-10-18',
  sourceUrl: 'https://example.test/x',
};

describe('normalizeOffer', () => {
  it('computes discount, pricePerKg and packageGrams', () => {
    const o = normalizeOffer(base);
    expect(o.discountPct).toBe(38);
    expect(o.pricePerKg).toBe(200);
    expect(o.packageGrams).toBe(250);
    expect(o.category).toBe('mlecne');
  });
  it('has zero discount without originalPrice', () =>
    expect(normalizeOffer({ ...base, originalPrice: undefined }).discountPct).toBe(0));
  it('keeps unparsable quantity offers without pricePerKg', () => {
    const o = normalizeOffer({ ...base, quantityText: '2+1 zdarma' });
    expect(o.pricePerKg).toBeUndefined();
    expect(o.name).toBe('Tvaroh polotučný');
  });
  it('stores pieces when the pack is counted in ks', () =>
    expect(normalizeOffer({ ...base, quantityText: '10 ks' }).pieces).toBe(10));
  it('produces a stable id containing the store', () => {
    const a = normalizeOffer(base);
    const b = normalizeOffer({ ...base });
    expect(a.id).toBe(b.id);
    expect(a.id).toContain('lidl');
  });
});
