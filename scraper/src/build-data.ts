import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Offer, RawOffer } from '@foodfinder/shared';
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
}

/** Below this share of the previous offer count the new data is considered suspicious. */
const MIN_SHARE_OF_PREVIOUS = 0.5;

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function previousCount(outPath: string): number {
  if (!existsSync(outPath)) return 0;
  try {
    return JSON.parse(readFileSync(outPath, 'utf8')).offers?.length ?? 0;
  } catch {
    return 0;
  }
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

  const today = isoDate(opts.now);
  const valid: Offer[] = raws.map(normalizeOffer).filter((o) => o.validTo >= today);
  const count = valid.length;

  const previous = previousCount(opts.outPath);
  if (count === 0 || (previous > 0 && count < previous * MIN_SHARE_OF_PREVIOUS)) {
    console.error(`refusing to overwrite ${opts.outPath}: ${count} new offers vs ${previous} previous`);
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
