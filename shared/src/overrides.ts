import { normalizeKey } from './text';
import type { Nutrition, Offer } from './types';

export type NutritionOverrides = Record<string, Omit<Nutrition, 'source' | 'confidence'>>;

/** Applies user-entered macros (keyed by normalizeKey(name)) on top of scraped nutrition. */
export function applyLocalOverrides(offers: Offer[], local: NutritionOverrides): Offer[] {
  if (Object.keys(local).length === 0) return offers;
  return offers.map((o) => {
    const fix = local[normalizeKey(o.name)];
    return fix ? { ...o, nutrition: { ...fix, source: 'override', confidence: 1 } } : o;
  });
}

/** normalizeKey(name) -> meat share in percent, typed in by the user from the package label. */
export type MeatOverrides = Record<string, number>;

export function applyLocalMeat(offers: Offer[], meat: MeatOverrides): Offer[] {
  if (Object.keys(meat).length === 0) return offers;
  return offers.map((o) => {
    const pct = meat[normalizeKey(o.name)];
    return pct === undefined ? o : { ...o, meatPct: pct };
  });
}
