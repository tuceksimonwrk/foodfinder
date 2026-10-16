import type { Filters, SortKey, Store } from '@foodfinder/shared';

export interface LetakState extends Filters {
  sort: SortKey;
  /** True once the user changed the store filter, so settings no longer override it. */
  storesTouched: boolean;
}

export interface LetakDefaults {
  minProtein: number;
  maxFat: number;
  favoriteStores: Store[];
}

export function initialLetakState(defaults: LetakDefaults, saved: Partial<LetakState> | null): LetakState {
  const base: LetakState = {
    query: '', stores: defaults.favoriteStores, categories: [], minDiscountPct: 0, fit: false,
    minProtein: defaults.minProtein, maxFat: defaults.maxFat, sort: 'relevance', storesTouched: false,
  };
  if (!saved || typeof saved !== 'object') return base;
  const merged: LetakState = { ...base, ...saved, query: '' };
  if (!saved.storesTouched) merged.stores = defaults.favoriteStores;
  merged.minProtein = defaults.minProtein;
  merged.maxFat = defaults.maxFat;
  return merged;
}
