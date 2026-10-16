import type { Nutrition, Offer } from './types';

export function proteinPer100kcal(n: Nutrition): number | undefined {
  return n.kcal > 0 ? (n.protein / n.kcal) * 100 : undefined;
}

/** Cost in Kč of 30 g of protein: 3000 / protein grams of product per kg price. */
export function czkPer30gProtein(o: Offer): number | undefined {
  if (!o.nutrition || o.pricePerKg === undefined || o.nutrition.protein <= 0) return undefined;
  return (3 * o.pricePerKg) / o.nutrition.protein;
}
