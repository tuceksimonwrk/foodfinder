import { describe, it, expect } from 'vitest';
import { nextTheme, parseTheme, resolveTheme, themeColor } from './theme';

describe('nextTheme', () => {
  it('cycles auto, light, dark and back', () => {
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
  });
});

describe('parseTheme', () => {
  it('accepts the three known values', () => {
    for (const v of ['auto', 'light', 'dark'] as const) expect(parseTheme(v)).toBe(v);
  });
  it('falls back to auto for anything else', () => {
    for (const v of [null, undefined, '', 'blue', 42, {}]) expect(parseTheme(v)).toBe('auto');
  });
});

describe('resolveTheme', () => {
  it('follows the system in auto mode', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });
  it('ignores the system for an explicit choice', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('themeColor', () => {
  it('matches the header colour of each theme', () => {
    expect(themeColor('light')).toBe('#0e1f3d');
    expect(themeColor('dark')).toBe('#070f1e');
  });
});
