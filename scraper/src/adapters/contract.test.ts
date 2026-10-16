import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORES, toIsoDate } from '@foodfinder/shared';
import { adapters, type Adapter } from './index';
import { createKupiAdapter } from './kupi';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf8');
const NOW = new Date('2026-10-16T12:00:00');

/** Every registered adapter must be listed here with an offline way to run it. */
const SUBJECTS: Record<string, { create: () => Adapter; fetchFn: typeof fetch }> = {
  kupi: {
    create: () => createKupiAdapter({ delayMs: 0, now: NOW, maxPages: 1 }),
    fetchFn: (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/maso-drubez-a-ryby/lidl')) return new Response(fixture('kupi-maso-lidl.html'));
      if (u.endsWith('/mlecne-vyrobky-a-vejce/albert')) return new Response(fixture('kupi-mlecne-albert.html'));
      return new Response('<html></html>');
    }) as typeof fetch,
  },
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('adapter contract', () => {
  it('has an offline subject for every registered adapter', () => {
    expect(adapters.map((a) => a.id).sort()).toEqual(Object.keys(SUBJECTS).sort());
  });

  for (const [id, subject] of Object.entries(SUBJECTS)) {
    describe(id, () => {
      it('returns well-formed offers', async () => {
        const offers = await subject.create().fetchOffers(subject.fetchFn);
        expect(offers.length).toBeGreaterThan(0);
        for (const o of offers) {
          expect(STORES).toContain(o.store);
          expect(o.name.trim().length).toBeGreaterThan(0);
          expect(o.price).toBeGreaterThan(0);
          expect(o.validFrom).toMatch(ISO);
          expect(o.validTo).toMatch(ISO);
          expect(o.validTo >= o.validFrom).toBe(true);
          expect(o.sourceUrl).toMatch(/^https?:\/\//);
          if (o.imageUrl !== undefined) expect(o.imageUrl).toMatch(/^https:\/\//);
        }
      });

      it('returns offers that have not expired yet', async () => {
        const offers = await subject.create().fetchOffers(subject.fetchFn);
        expect(offers.every((o) => o.validTo >= toIsoDate(NOW))).toBe(true);
      });
    });
  }
});
