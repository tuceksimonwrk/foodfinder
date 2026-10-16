import { normalizeText, type ListItem } from '@foodfinder/shared';
import { rohlikSearchTerm } from './rohlik';

/** "500 g", "1,5 kg": rounded to 5 g like a kitchen scale. */
function formatAmount(grams: number): string {
  const rounded = Math.max(5, Math.round(grams / 5) * 5);
  if (rounded < 1000) return `${rounded} g`;
  return `${String(Math.round((rounded / 1000) * 100) / 100).replace('.', ',')} kg`;
}

/**
 * The shopping list as plain text, one product per line ("kuřecí prsa 500 g"), ready to paste into a shop's own
 * assistant or a note. Checked-off items are left out and the same product from several stores is added up.
 */
export function shoppingListText(items: ListItem[]): string {
  const lines = new Map<string, { term: string; grams?: number }>();
  for (const item of items) {
    if (item.checked) continue;
    const term = (item.searchTerm ?? rohlikSearchTerm(item.label)).trim();
    if (!term) continue;
    const key = normalizeText(term);
    const line = lines.get(key) ?? { term };
    if (item.grams !== undefined) line.grams = (line.grams ?? 0) + item.grams;
    lines.set(key, line);
  }
  return [...lines.values()].map((l) => (l.grams === undefined ? l.term : `${l.term} ${formatAmount(l.grams)}`)).join('\n');
}
