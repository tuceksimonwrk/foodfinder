import { normalizeKey, type Nutrition, type Offer } from '@foodfinder/shared';

export interface EnrichDeps {
  off: (q: { ean?: string; name: string }) => Promise<Nutrition | null>;
  dictionary: (name: string) => Nutrition | null;
  overrides: Record<string, Omit<Nutrition, 'source' | 'confidence'>>;
}

/** Priority: override > OFF by EAN > dictionary > OFF by name. */
async function resolve(offer: Offer, deps: EnrichDeps): Promise<Nutrition | undefined> {
  const override = deps.overrides[normalizeKey(offer.name)];
  if (override) return { ...override, source: 'override', confidence: 1 };

  if (offer.ean) {
    const byEan = await deps.off({ ean: offer.ean, name: offer.name });
    if (byEan) return byEan;
  }
  const fromDictionary = deps.dictionary(offer.name);
  if (fromDictionary) return fromDictionary;

  if (!offer.ean) return (await deps.off({ name: offer.name })) ?? undefined;
  return undefined;
}

export async function enrichOffers(offers: Offer[], deps: EnrichDeps): Promise<Offer[]> {
  const result: Offer[] = [];
  for (const offer of offers) {
    const nutrition = await resolve(offer, deps);
    result.push(nutrition ? { ...offer, nutrition } : offer);
  }
  return result;
}
