import { matchesProduct, normalizeText, type Nutrition } from '@foodfinder/shared';
import entries from './dictionary.json';

interface Entry { keywords: string[]; kcal: number; protein: number; fat: number; carbs: number }

const prepared = (entries as Entry[]).flatMap((e) =>
  e.keywords.map((k) => ({ keyword: k, length: normalizeText(k).length, entry: e })),
);

/** Longest matching keyword wins. */
export function lookupDictionary(name: string): Nutrition | null {
  let best: (typeof prepared)[number] | null = null;
  for (const p of prepared) {
    if (matchesProduct(name, p.keyword) && (!best || p.length > best.length)) best = p;
  }
  if (!best) return null;
  const { kcal, protein, fat, carbs } = best.entry;
  return { kcal, protein, fat, carbs, source: 'dictionary', confidence: 0.6 };
}
