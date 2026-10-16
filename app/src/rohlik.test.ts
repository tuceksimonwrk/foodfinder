import { describe, it, expect } from 'vitest';
import { rohlikSearchTerm, rohlikSearchUrl } from './rohlik';

describe('rohlikSearchUrl', () => {
  it('builds the search address the Rohlik site uses', () =>
    expect(rohlikSearchUrl('kuřecí prsa')).toBe('https://www.rohlik.cz/hledat?q=ku%C5%99ec%C3%AD%20prsa&companyId=1'));

  it('encodes characters that would break the query', () => {
    const url = rohlikSearchUrl('máslo & mléko #1');
    expect(url).toContain('q=m%C3%A1slo%20%26%20ml%C3%A9ko%20%231');
    expect(new URL(url).searchParams.get('q')).toBe('máslo & mléko #1');
  });

  it('falls back to the Rohlik home page for an empty search', () => {
    expect(rohlikSearchUrl('')).toBe('https://www.rohlik.cz/');
    expect(rohlikSearchUrl('   ')).toBe('https://www.rohlik.cz/');
  });
});

describe('rohlikSearchTerm', () => {
  const cases: [string, string][] = [
    ['Kuřecí prsní řízky Tesco', 'Kuřecí prsní řízky'],
    ['Čočka Lagris 500 g', 'Čočka Lagris'],
    ['Vejce M 10 ks', 'Vejce M'],
    ['Mléko polotučné 1,5 %', 'Mléko polotučné'],
    ['Cizrna Billa 2x120 g', 'Cizrna'],
    ['Losos filety Lidl', 'Losos filety'],
    ['Rýže Arax Albert 1 kg', 'Rýže Arax'],
    ['  Tvaroh   polotučný  ', 'Tvaroh polotučný'],
  ];
  for (const [input, expected] of cases) {
    it(`"${input}" -> "${expected}"`, () => expect(rohlikSearchTerm(input)).toBe(expected));
  }

  it('does not strip a store name that is part of another word', () =>
    expect(rohlikSearchTerm('Pennyroyal čaj')).toBe('Pennyroyal čaj'));

  it('keeps something to search for when everything would be stripped', () =>
    expect(rohlikSearchTerm('Tesco 500 g')).toBe('Tesco'));

  it('limits very long names', () => expect(rohlikSearchTerm('slovo '.repeat(40)).length).toBeLessThanOrEqual(60));
});
