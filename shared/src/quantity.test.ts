import { describe, it, expect } from 'vitest';
import { parseQuantity, computePricePerKg } from './quantity';

describe('parseQuantity', () => {
  it('parses grams', () => expect(parseQuantity('500 g')).toEqual({ grams: 500 }));
  it('parses kilograms', () => expect(parseQuantity('1 kg')).toEqual({ grams: 1000 }));
  it('parses litres with decimal comma', () => expect(parseQuantity('0,5 l')).toEqual({ grams: 500 }));
  it('parses millilitres', () => expect(parseQuantity('250 ml')).toEqual({ grams: 250 }));
  it('parses multipack with ×', () => expect(parseQuantity('6×0,5 l')).toEqual({ grams: 3000 }));
  it('parses multipack with x and spaces', () => expect(parseQuantity('6 x 0,5 l')).toEqual({ grams: 3000 }));
  it('parses multipack in grams', () => expect(parseQuantity('4x125 g')).toEqual({ grams: 500 }));
  it('ignores cca prefix', () => expect(parseQuantity('cca 1 kg')).toEqual({ grams: 1000 }));
  it('parses pieces', () => expect(parseQuantity('10 ks')).toEqual({ pieces: 10 }));
  it('returns null for promo text', () => expect(parseQuantity('2+1 zdarma')).toBeNull());
  it('returns null for empty string', () => expect(parseQuantity('')).toBeNull());
  it('returns null for undefined', () => expect(parseQuantity(undefined)).toBeNull());
});

describe('computePricePerKg', () => {
  it('computes from grams', () => expect(computePricePerKg(50, { grams: 250 })).toBe(200));
  it('is undefined for pieces', () => expect(computePricePerKg(50, { pieces: 10 })).toBeUndefined());
  it('is undefined for null', () => expect(computePricePerKg(50, null)).toBeUndefined());
});
