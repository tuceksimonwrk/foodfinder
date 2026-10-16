import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeKey } from './text';

describe('normalizeText', () => {
  it('lowercases, strips diacritics and collapses spaces', () =>
    expect(normalizeText('Kuřecí  PRSA')).toBe('kureci prsa'));
});

describe('normalizeKey', () => {
  it('drops numbers and units so package sizes do not change the key', () =>
    expect(normalizeKey('Kuřecí prsa 1 kg')).toBe('kureci prsa'));
});
