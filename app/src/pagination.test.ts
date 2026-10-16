import { describe, it, expect } from 'vitest';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, paginate, parsePageSize } from './pagination';

const items = Array.from({ length: 100 }, (_, i) => i + 1);

describe('paginate', () => {
  it('returns the first page with its range', () => {
    const p = paginate(items, 1, 24);
    expect(p.items).toEqual(items.slice(0, 24));
    expect(p).toMatchObject({ page: 1, pageCount: 5, from: 1, to: 24, total: 100 });
  });

  it('returns a partial last page', () => {
    const p = paginate(items, 5, 24);
    expect(p.items).toEqual([97, 98, 99, 100]);
    expect(p).toMatchObject({ page: 5, from: 97, to: 100 });
  });

  it('clamps a page number that is too low or too high', () => {
    expect(paginate(items, 0, 24).page).toBe(1);
    expect(paginate(items, -3, 24).page).toBe(1);
    expect(paginate(items, 99, 24).page).toBe(5);
  });

  it('copes with an empty list', () => {
    expect(paginate([], 1, 24)).toMatchObject({ items: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 });
  });

  it('has exactly one page when everything fits', () => {
    expect(paginate(items.slice(0, 10), 1, 24)).toMatchObject({ pageCount: 1, from: 1, to: 10 });
  });

  it('treats a nonsensical page size as the default instead of failing', () => {
    expect(paginate(items, 1, 0).items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(paginate(items, 1, Number.NaN).items).toHaveLength(DEFAULT_PAGE_SIZE);
  });
});

describe('parsePageSize', () => {
  it('accepts the offered sizes', () => {
    for (const size of PAGE_SIZES) expect(parsePageSize(size)).toBe(size);
  });
  it('falls back to the default for anything else', () => {
    for (const v of [0, 7, 1000, '24', null, undefined, {}]) expect(parsePageSize(v)).toBe(DEFAULT_PAGE_SIZE);
  });
  it('offers 12, 24, 48 and 96 with 48 as the default', () => {
    expect([...PAGE_SIZES]).toEqual([12, 24, 48, 96]);
    expect(DEFAULT_PAGE_SIZE).toBe(48);
  });
});
