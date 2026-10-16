import {
  categorize,
  computePricePerKg,
  normalizeText,
  parseQuantity,
  type Offer,
  type RawOffer,
} from '@foodfinder/shared';

const slug = (s: string) => normalizeText(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function normalizeOffer(raw: RawOffer): Offer {
  const quantity = parseQuantity(raw.quantityText);
  const discountPct =
    raw.originalPrice && raw.originalPrice > raw.price
      ? Math.round((1 - raw.price / raw.originalPrice) * 100)
      : 0;

  return {
    id: `${raw.store}-${slug(raw.name)}-${raw.validFrom}`,
    store: raw.store,
    name: raw.name,
    price: raw.price,
    originalPrice: raw.originalPrice,
    discountPct,
    packageGrams: quantity && 'grams' in quantity ? quantity.grams : undefined,
    pieces: quantity && 'pieces' in quantity ? quantity.pieces : undefined,
    pricePerKg: computePricePerKg(raw.price, quantity),
    validFrom: raw.validFrom,
    validTo: raw.validTo,
    category: categorize(raw.name, raw.categoryHint),
    imageUrl: raw.imageUrl,
    sourceUrl: raw.sourceUrl,
  };
}
