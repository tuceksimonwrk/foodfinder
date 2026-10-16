import type { Nutrition, Offer } from './types';

export function proteinPer100kcal(n: Nutrition): number | undefined {
  return n.kcal > 0 ? (n.protein / n.kcal) * 100 : undefined;
}

/** Cost in Kč of 30 g of protein: 3000 / protein grams of product per kg price. */
export function czkPer30gProtein(o: Offer): number | undefined {
  if (!o.nutrition || o.pricePerKg === undefined || o.nutrition.protein <= 0) return undefined;
  return (3 * o.pricePerKg) / o.nutrition.protein;
}

/** Share of the calories that come from protein (4 kcal per gram), 0–100. */
export function proteinEnergyPct(n: Nutrition): number {
  if (n.kcal <= 0) return 0;
  return Math.min(100, Math.max(0, (n.protein * 4 * 100) / n.kcal));
}
