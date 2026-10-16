import { describe, it, expect } from 'vitest';
import { toIsoDate } from './date';

describe('toIsoDate', () => {
  it('formats local date parts with zero padding', () =>
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05'));
});
