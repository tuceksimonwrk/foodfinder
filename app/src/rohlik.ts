import { STORE_LABELS } from './labels';

const ROHLIK = 'https://www.rohlik.cz/';
const MAX_TERM_LENGTH = 60;

/** Search address of the Rohlik web shop (the `companyId` parameter is part of its own search links). */
export function rohlikSearchUrl(term: string): string {
  const q = term.trim();
  if (!q) return ROHLIK;
  return `${ROHLIK}hledat?q=${encodeURIComponent(q)}&companyId=1`;
}

const STORE_WORDS = new Set(Object.values(STORE_LABELS).map((s) => s.toLowerCase()));

/**
 * What to type into Rohlik's search for a leaflet product name: package sizes and the name of the store
 * that runs the offer are noise there ("Čočka Lagris 500 g" -> "Čočka Lagris").
 */
export function rohlikSearchTerm(name: string): string {
  const withoutSizes = name
    .replace(/\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|ks)?(?![\p{L}\d])/giu, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|ks|%)(?![\p{L}])/giu, ' ')
    .replace(/(?<![\p{L}\d])\d+(?:[.,]\d+)?(?![\p{L}\d])/gu, ' ');

  const words = withoutSizes.split(/\s+/).filter(Boolean);
  const withoutStores = words.filter((w) => !STORE_WORDS.has(w.toLowerCase()));
  const term = (withoutStores.length > 0 ? withoutStores : words).join(' ');

  if (term.length <= MAX_TERM_LENGTH) return term;
  return term.slice(0, MAX_TERM_LENGTH).replace(/\s+\S*$/, '');
}
