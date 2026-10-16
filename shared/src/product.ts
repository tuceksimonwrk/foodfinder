import { normalizeText } from './text';

/** Stems of words that mark a processed product (spread, salad, drink...), not the plain ingredient. */
const PROCESSED_STEMS = [
  'pomazank', 'salat', 'rolka', 'rolad', 'napoj', 'aspik', 'omac', 'krem', 'polevk', 'smoothie',
  'dezert', 'tycink', 'chips', 'sendvic', 'bagetk', 'pizza', 'sushi',
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The same few thousand offer names and dozens of keywords are compared over and over when pricing
// recipes, so normalized names and keyword patterns are memoized (bounded, cleared when full).
const CACHE_LIMIT = 20_000;
const normalizedNames = new Map<string, { text: string; words: string[] }>();
const keywordPatterns = new Map<string, RegExp | null>();

function normalizedName(offerName: string) {
  let entry = normalizedNames.get(offerName);
  if (!entry) {
    if (normalizedNames.size >= CACHE_LIMIT) normalizedNames.clear();
    const text = normalizeText(offerName);
    entry = { text, words: text.split(/[^a-z0-9]+/).filter(Boolean) };
    normalizedNames.set(offerName, entry);
  }
  return entry;
}

function keywordPattern(keyword: string): RegExp | null {
  let pattern = keywordPatterns.get(keyword);
  if (pattern === undefined) {
    const kw = normalizeText(keyword);
    pattern = kw ? new RegExp(`(^|[^a-z])${escapeRegExp(kw)}[a-z]{0,2}($|[^a-z])`) : null;
    keywordPatterns.set(keyword, pattern);
  }
  return pattern;
}

/**
 * Does an offer name denote the plain ingredient `keyword`?
 * The keyword must be a whole word (up to two inflection letters allowed, banán/banány),
 * must appear within the first two words (Czech product names lead with the noun), and the
 * name must not contain a processed-product marker such as "pomazánka" or "v aspiku".
 */
export function matchesProduct(offerName: string, keyword: string): boolean {
  const pattern = keywordPattern(keyword);
  if (!pattern) return false;

  const { text, words } = normalizedName(offerName);
  const match = pattern.exec(text);
  if (!match) return false;

  const wordsBefore = text.slice(0, match.index + match[1].length).split(' ').filter(Boolean).length;
  if (wordsBefore > 1) return false;

  return !words.some((w) => PROCESSED_STEMS.some((stem) => w.startsWith(stem)));
}
