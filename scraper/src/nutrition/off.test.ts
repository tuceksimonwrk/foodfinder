import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOffClient } from './off';

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, '../../fixtures', name), 'utf8'));
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const opts = (fetchFn: typeof fetch) => ({
  fetchFn,
  cachePath: join(mkdtempSync(join(tmpdir(), 'off-')), 'cache.json'),
  minIntervalMs: 0,
});

describe('createOffClient', () => {
  it('maps a product looked up by EAN', async () => {
    const product = fixture('off-product.json');
    const off = createOffClient(opts(vi.fn(() => json(product)) as unknown as typeof fetch));
    const n = await off({ ean: '3017620422003', name: 'x' });
    expect(n).toMatchObject({
      protein: product.product.nutriments.proteins_100g,
      kcal: product.product.nutriments['energy-kcal_100g'],
      source: 'off',
      confidence: 0.9,
    });
  });

  it('returns null when proteins are missing', async () => {
    const body = { product: { nutriments: { 'energy-kcal_100g': 100 } } };
    const off = createOffClient(opts(vi.fn(() => json(body)) as unknown as typeof fetch));
    expect(await off({ ean: '1', name: 'x' })).toBeNull();
  });

  it('uses the first search hit with nutriments when only a name is given', async () => {
    const search = fixture('off-search.json');
    const off = createOffClient(opts(vi.fn(() => json(search)) as unknown as typeof fetch));
    const n = await off({ name: 'skyr' });
    expect(n).toMatchObject({ source: 'off', confidence: 0.5 });
  });

  it('does not fetch twice for the same query', async () => {
    const fetchFn = vi.fn(() => json(fixture('off-product.json'))) as unknown as typeof fetch;
    const off = createOffClient(opts(fetchFn));
    await off({ ean: '3017620422003', name: 'x' });
    await off({ ean: '3017620422003', name: 'x' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns null instead of throwing on HTTP 500', async () => {
    const off = createOffClient(opts(vi.fn(() => json({}, 500)) as unknown as typeof fetch));
    expect(await off({ ean: '1', name: 'x' })).toBeNull();
  });

  it('returns null instead of throwing when the request fails', async () => {
    const off = createOffClient(opts(vi.fn(() => Promise.reject(new Error('net'))) as unknown as typeof fetch));
    expect(await off({ ean: '1', name: 'x' })).toBeNull();
  });

  it('stops calling OFF after repeated failures so an outage cannot stall the run', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new Error('down'))) as unknown as typeof fetch;
    const off = createOffClient(opts(fetchFn));
    for (let i = 0; i < 10; i++) await off({ name: `produkt ${i}` });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('passes an abort signal so a hanging request times out', async () => {
    const fetchFn = vi.fn(() => json(fixture('off-product.json'))) as unknown as typeof fetch;
    await createOffClient(opts(fetchFn))({ ean: '1', name: 'x' });
    const init = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
