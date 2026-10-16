import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RawOffer } from '@foodfinder/shared';
import type { Adapter } from './adapters/types';
import { runBuild } from './build-data';

const NOW = new Date('2026-10-16T12:00:00');
const deps = { off: async () => null, dictionary: () => null, overrides: {} };
const raws = (n: number, over: Partial<RawOffer> = {}): RawOffer[] =>
  Array.from({ length: n }, (_, i) => ({
    store: 'lidl', name: `Produkt ${i}`, price: 10 + i, quantityText: '500 g',
    validFrom: '2026-10-12', validTo: '2026-10-20', sourceUrl: 'https://example.test', ...over,
  }));
const adapter = (id: string, fn: () => Promise<RawOffer[]>): Adapter => ({ id, fetchOffers: fn });
const tmpOut = () => join(mkdtempSync(join(tmpdir(), 'build-')), 'offers.json');
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('runBuild', () => {
  it('writes normalized offers with a generatedAt stamp', async () => {
    const out = tmpOut();
    const r = await runBuild({ adapters: [adapter('a', async () => raws(100))], enrichDeps: deps, outPath: out, now: NOW });
    expect(r).toEqual({ count: 100, written: true });
    const file = read(out);
    expect(file.offers).toHaveLength(100);
    expect(file.offers[0].pricePerKg).toBeDefined();
    expect(file.generatedAt).toBe(NOW.toISOString());
  });

  it('drops offers that are already expired', async () => {
    const out = tmpOut();
    const list = [...raws(5), ...raws(3, { validTo: '2026-10-10', name: 'Starý' })];
    const r = await runBuild({ adapters: [adapter('a', async () => list)], enrichDeps: deps, outPath: out, now: NOW });
    expect(r.count).toBe(5);
  });

  it('keeps the previous file when the adapters return nothing', async () => {
    const out = tmpOut();
    writeFileSync(out, '{"generatedAt":"old","offers":[1]}');
    const r = await runBuild({ adapters: [adapter('a', async () => [])], enrichDeps: deps, outPath: out, now: NOW });
    expect(r.written).toBe(false);
    expect(read(out).generatedAt).toBe('old');
  });

  it('does not create a file when there is no previous one and nothing was scraped', async () => {
    const out = tmpOut();
    const r = await runBuild({ adapters: [adapter('a', async () => [])], enrichDeps: deps, outPath: out, now: NOW });
    expect(r.written).toBe(false);
    expect(existsSync(out)).toBe(false);
  });

  it('keeps the previous file when the new result is under half of it', async () => {
    const out = tmpOut();
    writeFileSync(out, JSON.stringify({ generatedAt: 'old', offers: new Array(100).fill({}) }));
    const r = await runBuild({ adapters: [adapter('a', async () => raws(30))], enrichDeps: deps, outPath: out, now: NOW });
    expect(r.written).toBe(false);
    expect(read(out).generatedAt).toBe('old');
  });

  it('survives one failing adapter', async () => {
    const out = tmpOut();
    const bad = adapter('bad', async () => { throw new Error('boom'); });
    const good = adapter('good', async () => raws(10));
    const r = await runBuild({ adapters: [bad, good], enrichDeps: deps, outPath: out, now: NOW });
    expect(r).toEqual({ count: 10, written: true });
  });
});
