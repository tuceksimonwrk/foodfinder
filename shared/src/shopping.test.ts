import { describe, it, expect } from 'vitest';
import type { Offer } from './types';
import { addOrMerge, changeAmount, mergeLoaded, groupByStore, itemPrice, offerToListItem, setAmount, totalPrice, type ListItem } from './shopping';

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
      id: 'id-1', label: 'Tvaroh', grams: 250, packGrams: 250, store: 'tesco', offerId: 'o1', pricePerKg: 80, price: 20,
      estimated: false, checked: false,
    });
  });
  it('counts pieces for an offer without a weight', () => {
    const o: Offer = {
      id: 'o2', store: 'lidl', name: 'Houska', price: 3, discountPct: 0, pieces: 1,
      validFrom: '2026-10-12', validTo: '2026-10-20', category: 'prilohy', sourceUrl: 'u',
    };
    const i = offerToListItem(o, 'id-2');
    expect(i.grams).toBeUndefined();
    expect(i.count).toBe(1);
  });
});

describe('changeAmount', () => {
  const pack = (over: Partial<ListItem> = {}) => item({ grams: 250, packGrams: 250, pricePerKg: 80, ...over });
  const pieces = (over: Partial<ListItem> = {}) => item({ grams: undefined, pricePerKg: undefined, price: 3, count: 2, ...over });

  it('adds or removes one whole pack when the pack size is known', () => {
    expect(changeAmount(pack(), 1).grams).toBe(500);
    expect(changeAmount(pack({ grams: 750 }), -1).grams).toBe(500);
  });
  it('never goes below one pack', () => expect(changeAmount(pack(), -1).grams).toBe(250));
  it('steps by 50 g without a known pack size', () => {
    expect(changeAmount(item({ grams: 130 }), 1).grams).toBe(180);
    expect(changeAmount(item({ grams: 130 }), -1).grams).toBe(80);
  });
  it('never goes below one step without a pack size', () => expect(changeAmount(item({ grams: 40 }), -1).grams).toBe(50));
  it('counts pieces and keeps at least one', () => {
    expect(changeAmount(pieces(), 1).count).toBe(3);
    expect(changeAmount(pieces(), -1).count).toBe(1);
    expect(changeAmount(pieces({ count: 1 }), -1).count).toBe(1);
  });
  it('treats a missing count as one piece', () => expect(changeAmount(pieces({ count: undefined }), 1).count).toBe(2));
  it('does not mutate the item', () => {
    const before = pack();
    changeAmount(before, 1);
    expect(before.grams).toBe(250);
  });
});

describe('setAmount', () => {
  it('sets an exact weight', () => expect(setAmount(item(), 720).grams).toBe(720));
  it('ignores zero, negative and non-numeric weights', () => {
    for (const v of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(setAmount(item({ grams: 300 }), v).grams, String(v)).toBe(300);
  });
  it('rounds a weight to a whole gram', () => expect(setAmount(item(), 200.6).grams).toBe(201));
  it('sets a whole number of pieces, at least one', () => {
    const pieces = item({ grams: undefined, pricePerKg: undefined, price: 3, count: 2 });
    expect(setAmount(pieces, 5).count).toBe(5);
    expect(setAmount(pieces, 2.6).count).toBe(3);
    expect(setAmount(pieces, 0).count).toBe(2);
  });
});

describe('piece counts in prices and merging', () => {
  const pieces = (over: Partial<ListItem> = {}) => item({ grams: undefined, pricePerKg: undefined, price: 30, count: 3, ...over });
  it('multiplies the unit price by the count', () => expect(itemPrice(pieces())).toBe(90));
  it('treats a missing count as one', () => expect(itemPrice(pieces({ count: undefined }))).toBe(30));
  it('adds the counts, not the prices, when the same item is added again', () => {
    const merged = addOrMerge([pieces({ count: 2 })], pieces({ id: 'i2', count: 1 }));
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ count: 3, price: 30 });
  });
  it('totals the list with counts and weights', () =>
    expect(totalPrice([pieces({ count: 2 }), item({ grams: 500, pricePerKg: 200 })])).toBe(160));

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
