import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { toIsoDate, type Offer, type RawOffer } from '@foodfinder/shared';
import { adapters as defaultAdapters, type Adapter } from './adapters/index';
import { normalizeOffer } from './normalize';
import { lookupDictionary } from './nutrition/dictionary';
import { enrichOffers, type EnrichDeps } from './nutrition/enrich';
import { createOffClient } from './nutrition/off';
import overrides from './nutrition/overrides.json';

export interface BuildOptions {
  adapters: Adapter[];
  enrichDeps: EnrichDeps;
  outPath: string;
  now: Date;
  /** Write even if the result looks suspiciously small (never for an empty result). */
  force?: boolean;
}

/** Below this share of the previous offer count the new data is considered suspicious. */
const MIN_SHARE_OF_PREVIOUS = 0.5;

/** Previous offers that are still valid; expired history must not make a healthy refresh look like a drop. */
function previousValid(outPath: string, today: string): Pick<Offer, 'store' | 'validTo'>[] {
  if (!existsSync(outPath)) return [];
  try {
    const offers: Pick<Offer, 'store' | 'validTo'>[] = JSON.parse(readFileSync(outPath, 'utf8')).offers ?? [];
    return offers.filter((o) => o.validTo >= today);
  } catch {
    return [];
  }
}

const countByStore = (offers: Pick<Offer, 'store'>[]) =>
  offers.reduce<Record<string, number>>((acc, o) => ((acc[o.store] = (acc[o.store] ?? 0) + 1), acc), {});

/** A store that used to have a real presence and now has none points to a broken scrape. */
const MIN_STORE_PRESENCE = 20;

function looksSuspicious(previous: Pick<Offer, 'store'>[], next: Offer[]): string | null {
  if (previous.length > 0 && next.length < previous.length * MIN_SHARE_OF_PREVIOUS) {
    return `${next.length} new offers vs ${previous.length} still valid before`;
  }
  const before = countByStore(previous);
  const after = countByStore(next);
  const vanished = Object.entries(before).find(([store, n]) => n >= MIN_STORE_PRESENCE && !after[store]);
  return vanished ? `store ${vanished[0]} had ${vanished[1]} offers and now has none` : null;
}

/** Offers that differ only in package size or price would share an id; suffix the later ones. */
function ensureUniqueIds(offers: Offer[]): Offer[] {
  const used = new Map<string, number>();
  return offers.map((o) => {
    const n = (used.get(o.id) ?? 0) + 1;
    used.set(o.id, n);
    return n === 1 ? o : { ...o, id: `${o.id}-${n}` };
  });
}

export async function runBuild(opts: BuildOptions): Promise<{ count: number; written: boolean }> {
  const raws: RawOffer[] = [];
  for (const adapter of opts.adapters) {
    try {
      raws.push(...(await adapter.fetchOffers()));
    } catch (err) {
      console.warn(`adapter ${adapter.id} failed: ${(err as Error).message}`);
    }
  }

  const today = toIsoDate(opts.now);
  const valid: Offer[] = ensureUniqueIds(raws.map(normalizeOffer).filter((o) => o.validTo >= today));
  const count = valid.length;

  const reason = count === 0 ? 'no offers' : opts.force ? null : looksSuspicious(previousValid(opts.outPath, today), valid);
  if (reason) {
    console.error(`refusing to overwrite ${opts.outPath}: ${reason}`);
    return { count, written: false };
  }

  const enriched = await enrichOffers(valid, opts.enrichDeps);
  mkdirSync(dirname(opts.outPath), { recursive: true });
  writeFileSync(opts.outPath, JSON.stringify({ generatedAt: opts.now.toISOString(), offers: enriched }));
  return { count, written: true };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const result = await runBuild({
    adapters: defaultAdapters,
    enrichDeps: {
      off: createOffClient({ cachePath: resolve(root, 'scraper/cache/off-cache.json') }),
      dictionary: lookupDictionary,
      overrides,
    },
    outPath: resolve(root, 'app/public/data/offers.json'),
    now: new Date(),
    force: process.env.FORCE_WRITE === '1',
  });
  console.log(`offers: ${result.count}, written: ${result.written}`);
  if (!result.written) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
