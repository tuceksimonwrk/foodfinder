import { describe, it, expect } from 'vitest';
import type { Offer } from './types';
import { addOrMerge, mergeLoaded, groupByStore, itemPrice, offerToListItem, totalPrice, type ListItem } from './shopping';

const item = (over: Partial<ListItem> = {}): ListItem => ({
  id: 'i1', label: 'Kuřecí prsa', grams: 300, store: 'lidl', pricePerKg: 200, estimated: false, checked: false, ...over,
});

describe('addOrMerge', () => {
  it('sums grams of the same product in the same store', () => {
    const list = addOrMerge([item()], item({ id: 'i2', grams: 200 }));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'i1', grams: 500 });
  });
  it('matches labels ignoring case and diacritics', () =>
    expect(addOrMerge([item()], item({ id: 'i2', label: 'KUŘECÍ PRSA' }))).toHaveLength(1));
  it('keeps the same label from another store separate', () =>
    expect(addOrMerge([item()], item({ id: 'i2', store: 'albert' }))).toHaveLength(2));
  it('marks a merged item as estimated if either part is', () =>
    expect(addOrMerge([item()], item({ id: 'i2', estimated: true }))[0].estimated).toBe(true));
  it('unchecks a merged item because more is needed', () =>
    expect(addOrMerge([item({ checked: true })], item({ id: 'i2' }))[0].checked).toBe(false));
  it('does not merge items with and without grams', () =>
    expect(addOrMerge([item()], item({ id: 'i2', grams: undefined, price: 30 }))).toHaveLength(2));
});

describe('itemPrice / totalPrice', () => {
  it('prices by grams and price per kg', () => expect(itemPrice(item({ grams: 500 }))).toBe(100));
  it('falls back to a fixed price', () =>
    expect(itemPrice(item({ grams: undefined, pricePerKg: undefined, price: 30 }))).toBe(30));
  it('is undefined when nothing is known', () =>
    expect(itemPrice(item({ grams: undefined, pricePerKg: undefined }))).toBeUndefined());
  it('totals only priced items', () =>
    expect(totalPrice([item({ grams: 500 }), item({ id: 'x', grams: undefined, pricePerKg: undefined })])).toBe(100));
});

describe('groupByStore', () => {
  it('groups by store and puts store-less items under nezarazeno', () => {
    const g = groupByStore([item(), item({ id: 'b', store: undefined }), item({ id: 'c' })]);
    expect(Object.keys(g).sort()).toEqual(['lidl', 'nezarazeno']);
    expect(g.lidl).toHaveLength(2);
  });
});

describe('offerToListItem', () => {
  it('maps an offer to a list item', () => {
    const o: Offer = {
      id: 'o1', store: 'tesco', name: 'Tvaroh', price: 20, discountPct: 0, packageGrams: 250, pricePerKg: 80,
      validFrom: '2026-10-12', validTo: '2026-10-20', category: 'mlecne', sourceUrl: 'u',
    };
    expect(offerToListItem(o, 'id-1')).toEqual({
      id: 'id-1', label: 'Tvaroh', grams: 250, store: 'tesco', offerId: 'o1', pricePerKg: 80, price: 20,
      estimated: false, checked: false,
    });
  });
});

describe('mergeLoaded', () => {
  it('is idempotent so a double-run effect cannot double quantities', () => {
    const saved = [item({ grams: 540, checked: true })];
    expect(mergeLoaded(saved, mergeLoaded(saved, []))).toEqual(saved);
  });
  it('keeps items added before the stored list arrived', () => {
    const added = item({ id: 'new', label: 'Skyr' });
    expect(mergeLoaded([item()], [added]).map((i) => i.id)).toEqual(['i1', 'new']);
  });
});
