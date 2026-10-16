import { isHam, normalizeKey, normalizeText, type MeatOverrides, type Offer } from '@foodfinder/shared';

/** Hams (one entry per product, any pack size) whose meat share the user has not entered yet. Returns [key, name]. */
export function hamProducts(offers: Offer[], meat: MeatOverrides, query: string): [string, string][] {
  const byKey = new Map<string, string>();
  for (const o of offers) {
    if (!isHam(o.name)) continue;
    const key = normalizeKey(o.name);
    if (!key || meat[key] !== undefined || byKey.has(key)) continue;
    byKey.set(key, o.name);
  }
  const q = normalizeText(query);
  return [...byKey.entries()].filter(([key]) => !q || key.includes(q));
}
