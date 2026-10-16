import { describe, it, expect } from 'vitest';
import { categorize } from './category';

describe('categorize', () => {
  const cases: [string, string][] = [
    ['Kuřecí prsní řízky', 'maso'],
    ['Losos filet', 'ryby'],
    ['Tvaroh polotučný', 'mlecne'],
    ['Vejce M 10 ks', 'vejce'],
    ['Rýže jasmínová', 'prilohy'],
    ['Paprika', 'zelenina'],
    ['Banány', 'ovoce'],
    ['Coca Cola', 'ostatni'],
  ];
  for (const [name, expected] of cases) {
    it(`${name} -> ${expected}`, () => expect(categorize(name)).toBe(expected));
  }
  it('falls back to the hint when the name is unknown', () =>
    expect(categorize('Prémiový výrobek', 'Maso a uzeniny')).toBe('maso'));
});
