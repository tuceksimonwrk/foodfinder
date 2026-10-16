import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORES } from '@foodfinder/shared';
import { createKupiAdapter, parseKupiPage, parseValidity } from './kupi';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf8');
const NOW = new Date('2026-10-16T12:00:00');
const ctx = { now: NOW, pageUrl: 'https://www.kupi.cz/slevy/maso-drubez-a-ryby/lidl' };

describe('parseValidity', () => {
  it('parses "platí do"', () =>
    expect(parseValidity('platí do úterý 20. 10.', NOW)).toEqual({ to: '2026-10-20' }));
  it('parses a from–to range', () =>
    expect(parseValidity('čt 22. 10. – ne 25. 10.', NOW)).toEqual({ from: '2026-10-22', to: '2026-10-25' }));
  it('parses "zítra končí"', () => expect(parseValidity('zítra končí', NOW)).toEqual({ to: '2026-10-17' }));
  it('rolls over to the next year', () =>
    expect(parseValidity('platí do pátku 2. 1.', new Date('2026-12-30T12:00:00'))).toEqual({ to: '2027-01-02' }));
  it('returns null for unknown text', () => expect(parseValidity('kdysi', NOW)).toBeNull());
});

describe('parseKupiPage', () => {
  const offers = parseKupiPage(fixture('kupi-maso-lidl.html'), ctx);

  it('extracts offers only for supported stores', () => {
    expect(offers.length).toBeGreaterThan(10);
    for (const o of offers) {
      expect(STORES).toContain(o.store);
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.price).toBeGreaterThan(0);
      expect(o.validTo >= o.validFrom).toBe(true);
      expect(o.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('maps a known row completely', () => {
    const ham = offers.find((o) => o.name === 'Šunka dušená nejvyšší jakosti');
    expect(ham).toMatchObject({
      store: 'billa', price: 19.9, quantityText: '100 g', validTo: '2026-10-20',
    });
    expect(ham!.originalPrice).toBeCloseTo(29.7, 1);
  });

  it('does not emit duplicates', () => {
    const albert = parseKupiPage(fixture('kupi-mlecne-albert.html'), ctx);
    const keys = albert.map((o) => `${o.store}|${o.name}|${o.price}|${o.quantityText}|${o.validTo}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(albert.some((o) => o.store === 'albert')).toBe(true);
  });

  it('returns [] for a page without rows', () => expect(parseKupiPage('<html></html>', ctx)).toEqual([]));

  it('skips rows without a price', () => {
    const html = '<div class="discount_row" data-discount="1"><a class="btn_list_add" data-product="X"></a></div>';
    expect(parseKupiPage(html, ctx)).toEqual([]);
  });
});

describe('createKupiAdapter', () => {
  it('walks shop × category pages, paginates while rows exist and tolerates HTTP errors', async () => {
    const urls: string[] = [];
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      urls.push(u);
      if (u === 'https://www.kupi.cz/slevy/maso-drubez-a-ryby/lidl')
        return new Response(fixture('kupi-maso-lidl.html'));
      if (u.includes('/zdrava-vyziva/')) return new Response('nope', { status: 500 });
      return new Response('<html></html>');
    }) as unknown as typeof fetch;

    const adapter = createKupiAdapter({ delayMs: 0, now: NOW });
    const offers = await adapter.fetchOffers(fetchFn);

    expect(offers.some((o) => o.store === 'lidl')).toBe(true);
    expect(urls).toContain('https://www.kupi.cz/slevy/maso-drubez-a-ryby/lidl?page=2');
    expect(urls.some((u) => u.includes('/penny-market'))).toBe(true);
    expect(urls.some((u) => u.includes('/tesco'))).toBe(true);
  });
});
