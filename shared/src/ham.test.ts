import { describe, it, expect } from 'vitest';
import { hamGrade, isHam } from './ham';

describe('isHam', () => {
  it('recognizes ham in its forms', () => {
    for (const n of ['Šunka dušená nejvyšší jakosti', 'ŠUNKA výběrová', 'Šunka sedlácká sušená Dulano', 'Kuřecí šunka', 'Dušená šunka', 'Šunku nakrájenou'])
      expect(isHam(n), n).toBe(true);
  });
  it('does not mistake salami or other products for ham', () => {
    for (const n of ['Salám šunkový Pikok', 'Párky jemné', 'Šunkofleky', 'Sunkist pomeranč', 'Tvaroh'])
      expect(isHam(n), n).toBe(false);
  });
});

describe('hamGrade', () => {
  it('reads the highest class and its protein minimum', () => {
    expect(hamGrade('Šunka dušená nejvyšší jakosti')).toEqual({ grade: 'nejvyssi', minProteinPct: 16, label: 'nejvyšší jakost, min. 16 % svalových bílkovin' });
    expect(hamGrade('Šunka delikatesní vařená nejvyšší jakosti Dulano')?.minProteinPct).toBe(16);
    expect(hamGrade('ŠUNKA ZVONAŘKA NEJVYŠŠÍ JAKOSTI LE&CO')?.grade).toBe('nejvyssi');
  });
  it('reads the select class', () =>
    expect(hamGrade('Šunka výběrová Pikok')).toEqual({ grade: 'vyberova', minProteinPct: 13, label: 'výběrová jakost, min. 13 % svalových bílkovin' }));
  it('reads the standard class', () =>
    expect(hamGrade('Šunka standardní')).toEqual({ grade: 'standardni', minProteinPct: 10, label: 'standardní jakost, min. 10 % svalových bílkovin' }));
  it('says nothing when the name does not state a class', () => {
    for (const n of ['Šunka sedlácká sušená Dulano', 'Šunka kuřecí prsní High Protein Pikok', 'Šunka'])
      expect(hamGrade(n), n).toBeNull();
  });
  it('says nothing for products that are not ham, even with a class phrase', () => {
    expect(hamGrade('Salám šunkový nejvyšší jakosti')).toBeNull();
    expect(hamGrade('Párky výběrové')).toBeNull();
  });
  it('does not apply the ham classes to dry-cured ham', () =>
    expect(hamGrade('Šunka sušená nejvyšší jakosti')).toBeNull());
});
