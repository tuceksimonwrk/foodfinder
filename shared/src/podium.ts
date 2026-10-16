import { czkPer30gProtein } from './nutrition';
import { normalizeKey } from './text';
import type { Offer } from './types';

export interface PodiumEntry {
  offer: Offer;
  /** Kč for 30 g of protein */
  cost: number;
}

/** The cheapest sources of protein, each product once (at its cheapest store). */
export function podiumOffers(offers: Offer[], n = 3): PodiumEntry[] {
  const best = new Map<string, PodiumEntry>();
  for (const offer of offers) {
    const cost = czkPer30gProtein(offer);
    if (cost === undefined) continue;
    const key = normalizeKey(offer.name);
    const current = best.get(key);
    if (!current || cost < current.cost) best.set(key, { offer, cost });
  }
  return [...best.values()].sort((a, b) => a.cost - b.cost).slice(0, n);
}
