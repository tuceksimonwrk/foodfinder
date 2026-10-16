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
