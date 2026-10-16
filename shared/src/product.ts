import { normalizeText } from './text';

/** Stems of words that mark a processed product (spread, salad, drink...), not the plain ingredient. */
const PROCESSED_STEMS = [
  'pomazank', 'salat', 'rolka', 'rolad', 'napoj', 'aspik', 'omac', 'krem', 'polevk', 'smoothie',
  'dezert', 'tycink', 'chips', 'sendvic', 'bagetk', 'pizza', 'sushi',
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does an offer name denote the plain ingredient `keyword`?
 * The keyword must be a whole word (up to two inflection letters allowed, banán/banány),
 * must appear within the first two words (Czech product names lead with the noun), and the
 * name must not contain a processed-product marker such as "pomazánka" or "v aspiku".
 */
export function matchesProduct(offerName: string, keyword: string): boolean {
  const name = normalizeText(offerName);
  const kw = normalizeText(keyword);
  if (!kw) return false;

  const match = new RegExp(`(^|[^a-z])${escapeRegExp(kw)}[a-z]{0,2}($|[^a-z])`).exec(name);
  if (!match) return false;

  const wordsBefore = name.slice(0, match.index + match[1].length).split(' ').filter(Boolean).length;
  if (wordsBefore > 1) return false;

  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  return !words.some((w) => PROCESSED_STEMS.some((stem) => w.startsWith(stem)));
}
