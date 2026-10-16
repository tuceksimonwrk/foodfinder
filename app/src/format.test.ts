import { describe, it, expect } from 'vitest';
import { formatNumber, formatPrice, formatValidTo } from './format';

describe('format', () => {
  it('formats prices with a decimal comma', () => expect(formatPrice(19.9)).toBe('19,90 Kč'));
  it('drops zero decimals', () => expect(formatPrice(20)).toBe('20 Kč'));
  it('formats numbers with at most one decimal', () => {
    expect(formatNumber(2.54)).toBe('2,5');
    expect(formatNumber(23)).toBe('23');
  });
  it('formats the validity date', () => expect(formatValidTo('2026-10-20')).toBe('do 20. 10.'));
});
