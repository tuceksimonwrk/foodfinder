import { normalizeKey, normalizeText, type NutritionOverrides, type Offer } from '@foodfinder/shared';

/** Nutrition below this confidence is an estimate the user may want to correct (dictionary 0.6, OFF by name 0.5). */
const ESTIMATE_CONFIDENCE = 0.9;

/**
 * Products (one entry per normalized name) whose macros the user can correct:
 * those without nutrition, and optionally those with only an estimate. Returns [key, display name].
 */
export function correctableProducts(
  offers: Offer[],
  overrides: NutritionOverrides,
  includeEstimates: boolean,
  query: string,
): [string, string][] {
  const byKey = new Map<string, string>();
  for (const o of offers) {
    const key = normalizeKey(o.name);
    if (!key || overrides[key] || byKey.has(key)) continue;
    const needsFix = !o.nutrition || (includeEstimates && o.nutrition.confidence < ESTIMATE_CONFIDENCE);
    if (needsFix) byKey.set(key, o.name);
  }
  const q = normalizeText(query);
  return [...byKey.entries()].filter(([key]) => !q || key.includes(q));
}
