import { describe, it, expect } from 'vitest';
import { matchesProduct } from './product';

describe('matchesProduct', () => {
  const yes: [string, string][] = [
    ['Mražená kuřecí prsa', 'kuřecí prsa'],
    ['Kuřecí prsní řízky', 'kuřecí prsní'],
    ['Tvaroh polotučný Pilos', 'tvaroh'],
    ['Vejce M 10 ks', 'vejce'],
    ['Banány', 'banán'],
    ['Rýže Arax', 'rýže'],
    ['Tuňák ve vlastní šťávě', 'tuňák'],
  ];
  const no: [string, string][] = [
    ['Vejce v aspiku', 'vejce'],
    ['Pomazánka a la losos', 'losos'],
    ['Salát s tuňákem Giana', 'tuňák'],
    ['Rolka se špenátem a sýrem', 'špenát'],
    ['Nápoj mléčný Skyr To Go', 'skyr'],
    ['Fazole v omáčce', 'fazole'],
    ['Rýžové chlebíčky', 'rýže'],
    ['Tuňáková pomazánka', 'tuňák'],
    ['Krém tuňákový', 'tuňák'],
  ];
  for (const [name, kw] of yes) it(`accepts "${name}" for "${kw}"`, () => expect(matchesProduct(name, kw)).toBe(true));
  for (const [name, kw] of no) it(`rejects "${name}" for "${kw}"`, () => expect(matchesProduct(name, kw)).toBe(false));
});
