export type Store = 'lidl' | 'albert' | 'billa' | 'kaufland' | 'penny' | 'tesco';

export const STORES: Store[] = ['lidl', 'albert', 'billa', 'kaufland', 'penny', 'tesco'];

export type Category =
  | 'maso'
  | 'ryby'
  | 'mlecne'
  | 'vejce'
  | 'prilohy'
  | 'zelenina'
  | 'ovoce'
  | 'ostatni';

/** Nutrition per 100 g; confidence is 0–1. */
export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  source: 'off' | 'dictionary' | 'override';
  confidence: number;
}

/** Dates are ISO `YYYY-MM-DD`. */
export interface RawOffer {
  store: Store;
  name: string;
  price: number;
  originalPrice?: number;
  quantityText?: string;
  validFrom: string;
  validTo: string;
  imageUrl?: string;
  sourceUrl: string;
  ean?: string;
  categoryHint?: string;
}

export interface Offer {
  id: string;
  store: Store;
  name: string;
  price: number;
  originalPrice?: number;
  discountPct: number;
  packageGrams?: number;
  pieces?: number;
  pricePerKg?: number;
  validFrom: string;
  validTo: string;
  category: Category;
  imageUrl?: string;
  sourceUrl: string;
  nutrition?: Nutrition;
}

export interface Ingredient {
  generic: string;
  keywords: string[];
  grams: number;
  per100g: { kcal: number; protein: number; fat: number; carbs: number };
  fallbackPricePerKg: number;
}

export interface Recipe {
  id: string;
  name: string;
  steps: string[];
  tags: string[];
  ingredients: Ingredient[];
}
