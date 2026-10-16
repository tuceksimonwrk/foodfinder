import MiniSearch from 'minisearch';
import { czkPer30gProtein } from './nutrition';
import { normalizeText } from './text';
import type { Category, Offer, Store } from './types';

export interface Filters {
  query: string;
  stores: Store[];
  categories: Category[];
  minDiscountPct: number;
  maxPrice?: number;
  fit: boolean;
  minProtein: number;
  maxFat: number;
}

export type SortKey = 'relevance' | 'discount' | 'price' | 'proteinCost' | 'protein';

export function buildIndex(offers: Offer[]): MiniSearch<Offer> {
  const index = new MiniSearch<Offer>({
    fields: ['name', 'category', 'store'],
    idField: 'id',
    processTerm: (term) => normalizeText(term),
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND', processTerm: (term) => normalizeText(term) },
  });
  // Duplicate ids would make MiniSearch throw; keep the first occurrence.
  const seen = new Set<string>();
  index.addAll(offers.filter((o) => !seen.has(o.id) && !!seen.add(o.id)));
  return index;
}

export function applyFilters(offers: Offer[], index: MiniSearch<Offer>, f: Filters): Offer[] {
  let result = offers;
  if (f.query.trim()) {
    const byId = new Map(offers.map((o) => [o.id, o]));
    result = index
      .search(f.query)
      .map((hit) => byId.get(String(hit.id)))
      .filter((o): o is Offer => o !== undefined);
  }
  return result.filter((o) => {
    if (f.stores.length && !f.stores.includes(o.store)) return false;
    if (f.categories.length && !f.categories.includes(o.category)) return false;
    if (o.discountPct < f.minDiscountPct) return false;
    if (f.maxPrice !== undefined && o.price > f.maxPrice) return false;
    if (f.fit) {
      if (!o.nutrition) return false;
      if (o.nutrition.protein < f.minProtein || o.nutrition.fat > f.maxFat) return false;
    }
    return true;
  });
}

export function sortOffers(offers: Offer[], key: SortKey): Offer[] {
  const copy = [...offers];
  switch (key) {
    case 'relevance':
      return copy;
    case 'discount':
      return copy.sort((a, b) => b.discountPct - a.discountPct);
    case 'price':
      return copy.sort((a, b) => a.price - b.price);
    case 'protein':
      return copy.sort((a, b) => (b.nutrition?.protein ?? -1) - (a.nutrition?.protein ?? -1));
    case 'proteinCost':
      return copy.sort((a, b) => (czkPer30gProtein(a) ?? Number.MAX_VALUE) - (czkPer30gProtein(b) ?? Number.MAX_VALUE));
  }
}

/** Offers valid on `today` (ISO date): started and not yet ended. */
export function activeOffers(offers: Offer[], today: string): Offer[] {
  return offers.filter((o) => o.validFrom <= today && o.validTo >= today);
}
