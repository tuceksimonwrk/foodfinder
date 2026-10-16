/** Lowercase, strip diacritics, collapse whitespace. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable key for a product name: normalized, without numbers and units. */
export function normalizeKey(name: string): string {
  return normalizeText(name)
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|ks|%)?(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
