import { normalizeText, type Nutrition } from '@foodfinder/shared';
import entries from './dictionary.json';

interface Entry { keywords: string[]; kcal: number; protein: number; fat: number; carbs: number }

const prepared = (entries as Entry[]).flatMap((e) =>
  e.keywords.map((k) => {
    const keyword = normalizeText(k);
    return { keyword, pattern: new RegExp(`(^|[^a-z])${keyword}`), entry: e };
  }),
);

/** Longest matching keyword wins. */
export function lookupDictionary(name: string): Nutrition | null {
  const text = normalizeText(name);
  let best: (typeof prepared)[number] | null = null;
  for (const p of prepared) {
    if (p.pattern.test(text) && (!best || p.keyword.length > best.keyword.length)) best = p;
  }
  if (!best) return null;
  const { kcal, protein, fat, carbs } = best.entry;
  return { kcal, protein, fat, carbs, source: 'dictionary', confidence: 0.6 };
}
