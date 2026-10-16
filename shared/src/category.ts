import { normalizeText } from './text';
import type { Category } from './types';

// Order matters: the first matching rule wins.
const RULES: [Category, string[]][] = [
  ['vejce', ['vejce', 'vejc']],
  ['ryby', ['losos', 'tunak', 'ryba', 'ryby', 'treska', 'pstruh', 'makrel', 'sled', 'kapr', 'krevet']],
  [
    'maso',
    ['kuri', 'kureci', 'krut', 'hovezi', 'vepro', 'mlete', 'sunk', 'salam', 'klobas', 'parek', 'slanin', 'maso', 'rizek', 'stehn', 'prsa', 'prsni', 'kachn', 'telec'],
  ],
  [
    'mlecne',
    ['tvaroh', 'mleko', 'jogurt', 'skyr', 'syr', 'smetan', 'maslo', 'mozzarell', 'eidam', 'gouda', 'kefir', 'zakysan', 'cottage', 'kysan'],
  ],
  ['prilohy', ['ryze', 'testovin', 'spagety', 'brambor', 'vlocky', 'ovesn', 'chleb', 'pecivo', 'bulgur', 'kuskus', 'cocka', 'cizrn', 'fazol', 'mouka', 'knedl']],
  ['zelenina', ['paprik', 'rajc', 'okurk', 'brokolic', 'spenat', 'mrkev', 'cibul', 'salat', 'zeli', 'cuketa', 'houby', 'zelenin', 'cesnek', 'kukuric']],
  ['ovoce', ['banan', 'jablk', 'pomeranc', 'hrusk', 'jahod', 'boruvk', 'hrozn', 'citron', 'mandarink', 'kiwi', 'avokad', 'ovoce', 'melou']],
];

function matchCategory(text: string): Category | null {
  const t = normalizeText(text);
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => new RegExp(`(^|[^a-z])${k}`).test(t))) return category;
  }
  return null;
}

export function categorize(name: string, hint?: string): Category {
  return matchCategory(name) ?? (hint ? matchCategory(hint) : null) ?? 'ostatni';
}
