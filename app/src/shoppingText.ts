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
  const lines = new Map<string, { term: string; grams?: number; pieces: number }>();
  for (const item of items) {
    if (item.checked) continue;
    const term = (item.searchTerm ?? rohlikSearchTerm(item.label)).trim();
    if (!term) continue;
    const key = normalizeText(term);
    const line = lines.get(key) ?? { term, pieces: 0 };
    if (item.grams !== undefined) line.grams = (line.grams ?? 0) + item.grams;
    else line.pieces += item.count ?? 1;
    lines.set(key, line);
  }
  return [...lines.values()]
    .map((l) => {
      if (l.grams !== undefined) return `${l.term} ${formatAmount(l.grams)}`;
      return l.pieces > 1 ? `${l.term} ${l.pieces} ks` : l.term;
    })
    .join('\n');
}
