import { describe, it, expect, vi } from 'vitest';
import type { Offer } from '@foodfinder/shared';
import { loadOffers, type Db } from './loadData';

const offer = (id: string, validTo: string): Offer => ({
  id, store: 'lidl', name: id, price: 10, discountPct: 0, validFrom: '2026-10-01', validTo,
  category: 'maso', sourceUrl: 'u',
});
const NOW = new Date('2026-10-16T12:00:00');
const memoryDb = (initial: Record<string, unknown> = {}): Db & { store: Record<string, unknown> } => {
  const store = { ...initial };
  return {
    store,
    getJSON: async <T,>(k: string) => store[k] as T | undefined,
    setJSON: async <T,>(k: string, v: T) => { store[k] = v; },
  };
};
const okFetch = (offers: Offer[]) =>
  vi.fn(async () => new Response(JSON.stringify({ generatedAt: '2026-10-16T05:00:00Z', offers }))) as unknown as typeof fetch;

describe('loadOffers', () => {
  it('filters out expired offers', async () => {
    const db = memoryDb();
    const r = await loadOffers({ fetchFn: okFetch([offer('ok', '2026-10-20'), offer('old', '2026-10-15')]), now: NOW, db });
    expect(r.offers.map((o) => o.id)).toEqual(['ok']);
    expect(r.fromCache).toBe(false);
    expect(r.generatedAt).toBe('2026-10-16T05:00:00Z');
  });

  it('keeps an offer that expires today', async () => {
    const r = await loadOffers({ fetchFn: okFetch([offer('today', '2026-10-16')]), now: NOW, db: memoryDb() });
    expect(r.offers).toHaveLength(1);
  });

  it('stores the fresh file for offline use', async () => {
    const db = memoryDb();
    await loadOffers({ fetchFn: okFetch([offer('a', '2026-10-20')]), now: NOW, db });
    expect(db.store['offers']).toBeDefined();
  });

  it('falls back to the cached copy when the network fails', async () => {
    const cached = { generatedAt: 'cached', offers: [offer('c', '2026-10-20')] };
    const db = memoryDb({ offers: cached });
    const fetchFn = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const r = await loadOffers({ fetchFn, now: NOW, db });
    expect(r.fromCache).toBe(true);
    expect(r.offers.map((o) => o.id)).toEqual(['c']);
  });

  it('rejects with a Czech message when there is neither network nor cache', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await expect(loadOffers({ fetchFn, now: NOW, db: memoryDb() })).rejects.toThrow('Data se nepodařilo načíst');
  });

  it('treats a malformed response as a failure', async () => {
    const fetchFn = vi.fn(async () => new Response('{"nope":1}')) as unknown as typeof fetch;
    await expect(loadOffers({ fetchFn, now: NOW, db: memoryDb() })).rejects.toThrow('Data se nepodařilo načíst');
  });
});
