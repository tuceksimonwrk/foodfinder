import { describe, it, expect } from 'vitest';
import type { ListItem } from '@foodfinder/shared';
import { shoppingListText } from './shoppingText';

let n = 0;
const item = (over: Partial<ListItem> = {}): ListItem => ({
  id: `i${++n}`, label: 'Produkt', estimated: false, checked: false, ...over,
});

describe('shoppingListText', () => {
  it('writes one line per product with its amount', () => {
    const text = shoppingListText([
      item({ label: 'Čočka Lagris 500 g', grams: 500 }),
      item({ label: 'Cokoliv', searchTerm: 'kuřecí prsa', grams: 260 }),
    ]);
    expect(text).toBe('Čočka Lagris 500 g\nkuřecí prsa 260 g');
  });

  it('strips package sizes and store names from offer names', () =>
    expect(shoppingListText([item({ label: 'Kuřecí prsní řízky Tesco 1 kg', grams: 1000 })])).toBe('Kuřecí prsní řízky 1 kg'));

  it('leaves out items that are already checked off', () => {
    const text = shoppingListText([item({ searchTerm: 'rýže', grams: 100 }), item({ searchTerm: 'tvaroh', grams: 250, checked: true })]);
    expect(text).toBe('rýže 100 g');
  });

  it('adds up the same product from several places, ignoring case and diacritics', () => {
    const text = shoppingListText([
      item({ searchTerm: 'Rýže', grams: 300, store: 'lidl' }),
      item({ searchTerm: 'ryze', grams: 200, store: 'albert' }),
      item({ searchTerm: 'tvaroh', grams: 250 }),
    ]);
    expect(text).toBe('Rýže 500 g\ntvaroh 250 g');
  });

  it('writes larger amounts in kilograms with a decimal comma', () => {
    const lines = shoppingListText([
      item({ searchTerm: 'brambory', grams: 1500 }),
      item({ searchTerm: 'mouka', grams: 1000 }),
      item({ searchTerm: 'sůl', grams: 999 }),
    ]).split('\n');
    expect(lines).toEqual(['brambory 1,5 kg', 'mouka 1 kg', 'sůl 1 kg']);
  });

  it('rounds amounts to 5 g like a kitchen scale', () =>
    expect(shoppingListText([item({ searchTerm: 'banán', grams: 262.4 }), item({ searchTerm: 'okurka', grams: 3 })])).toBe('banán 260 g\nokurka 5 g'));

  it('writes just the name when the amount is unknown, once per product', () =>
    expect(shoppingListText([item({ searchTerm: 'koření' }), item({ searchTerm: 'Koření' })])).toBe('koření'));

  it('is empty for an empty or fully checked list', () => {
    expect(shoppingListText([])).toBe('');
    expect(shoppingListText([item({ searchTerm: 'rýže', grams: 100, checked: true })])).toBe('');
  });
});
