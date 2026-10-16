import { describe, it, expect } from 'vitest';
import { initialLetakState, type LetakState } from './letakState';

const defaults = { minProtein: 15, maxFat: 8, favoriteStores: ['lidl' as const] };

describe('initialLetakState', () => {
  it('starts from the settings when nothing was saved', () => {
    const s = initialLetakState(defaults, null);
    expect(s.stores).toEqual(['lidl']);
    expect(s.minProtein).toBe(15);
    expect(s.maxFat).toBe(8);
    expect(s.storesTouched).toBe(false);
  });

  it('uses favorite stores while the user has not picked stores themselves', () => {
    const saved: Partial<LetakState> = { stores: [], storesTouched: false, categories: ['maso'] };
    const s = initialLetakState(defaults, saved);
    expect(s.stores).toEqual(['lidl']);
    expect(s.categories).toEqual(['maso']);
  });

  it('keeps the user\'s own store choice once made, even an empty one', () => {
    const s = initialLetakState(defaults, { stores: [], storesTouched: true });
    expect(s.stores).toEqual([]);
  });

  it('takes Fit thresholds from the settings, not from a previous session', () => {
    const s = initialLetakState(defaults, { minProtein: 99, maxFat: 1 });
    expect([s.minProtein, s.maxFat]).toEqual([15, 8]);
  });

  it('never restores the search query', () =>
    expect(initialLetakState(defaults, { query: 'kuře' }).query).toBe(''));

  it('ignores garbage from storage', () =>
    expect(initialLetakState(defaults, 'nonsense' as unknown as null).stores).toEqual(['lidl']));
});
