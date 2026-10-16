import { describe, it, expect } from 'vitest';
import { formatNumber, formatPrice, formatValidTo, formatValidity } from './format';

describe('format', () => {
  it('formats prices with a decimal comma', () => expect(formatPrice(19.9)).toBe('19,90 Kč'));
  it('drops zero decimals', () => expect(formatPrice(20)).toBe('20 Kč'));
  it('formats numbers with at most one decimal', () => {
    expect(formatNumber(2.54)).toBe('2,5');
    expect(formatNumber(23)).toBe('23');
  });
  it('formats the validity date', () => expect(formatValidTo('2026-10-20')).toBe('do 20. 10.'));

  it('shows only the end date for a running offer', () =>
    expect(formatValidity({ validFrom: '2026-10-10', validTo: '2026-10-20' }, '2026-10-16')).toBe('do 20. 10.'));
  it('shows the start date for an offer that has not started', () =>
    expect(formatValidity({ validFrom: '2026-10-22', validTo: '2026-10-25' }, '2026-10-16')).toBe('od 22. 10. do 25. 10.'));
});
