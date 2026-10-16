export type Quantity = { grams: number } | { pieces: number };

const UNIT_GRAMS: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000 };

const num = (s: string) => parseFloat(s.replace(',', '.'));

/** Parses a package size. Liquids are treated as density 1 (1 l = 1 kg). */
export function parseQuantity(text?: string): Quantity | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/\d\s*\+\s*\d/.test(t)) return null;

  const weight = t.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/);
  if (weight) {
    const multiplier = weight[1] ? parseInt(weight[1], 10) : 1;
    return { grams: multiplier * num(weight[2]) * UNIT_GRAMS[weight[3]] };
  }
  const pieces = t.match(/(\d+)\s*ks\b/);
  if (pieces) return { pieces: parseInt(pieces[1], 10) };
  return null;
}

export function computePricePerKg(price: number, q: Quantity | null): number | undefined {
  if (!q || !('grams' in q) || q.grams <= 0) return undefined;
  return (price / q.grams) * 1000;
}
