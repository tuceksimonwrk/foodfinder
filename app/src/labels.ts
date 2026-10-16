import type { Category, Nutrition, Store } from '@foodfinder/shared';

export const STORE_LABELS: Record<Store, string> = {
  lidl: 'Lidl', albert: 'Albert', billa: 'Billa', kaufland: 'Kaufland', penny: 'Penny', tesco: 'Tesco',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  maso: 'Maso', ryby: 'Ryby', mlecne: 'Mléčné', vejce: 'Vejce',
  prilohy: 'Přílohy', zelenina: 'Zelenina', ovoce: 'Ovoce', ostatni: 'Ostatní',
};

const SOURCE_LABELS: Record<Nutrition['source'], string> = { off: 'OFF', dictionary: 'slovník', override: 'ruční' };

export const nutritionSourceLabel = (n: Nutrition) => `${SOURCE_LABELS[n.source]}, jistota ${Math.round(n.confidence * 100)} %`;
