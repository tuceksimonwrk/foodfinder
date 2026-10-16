import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Nutrition } from '@foodfinder/shared';

export interface OffClientOptions {
  fetchFn?: typeof fetch;
  cachePath?: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  /** After this many consecutive failed requests OFF is skipped for the rest of the run. */
  maxConsecutiveFailures?: number;
}

type Query = { ean?: string; name: string };
type Cache = Record<string, Nutrition | null>;

interface OffNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
}

function mapNutriments(n: OffNutriments | undefined, confidence: number): Nutrition | null {
  if (!n) return null;
  const { 'energy-kcal_100g': kcal, proteins_100g: protein, fat_100g: fat, carbohydrates_100g: carbs } = n;
  if ([kcal, protein, fat, carbs].some((v) => typeof v !== 'number')) return null;
  return { kcal: kcal!, protein: protein!, fat: fat!, carbs: carbs!, source: 'off', confidence };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createOffClient(opts: OffClientOptions = {}) {
  const fetchFn = opts.fetchFn ?? fetch;
  const minInterval = opts.minIntervalMs ?? 700;
  let cache: Cache = {};
  if (opts.cachePath && existsSync(opts.cachePath)) {
    try {
      cache = JSON.parse(readFileSync(opts.cachePath, 'utf8'));
    } catch {
      cache = {};
    }
  }
  const timeoutMs = opts.timeoutMs ?? 8000;
  const maxFailures = opts.maxConsecutiveFailures ?? 3;
  let failures = 0;
  let lastRequest = 0;

  const persist = () => {
    if (!opts.cachePath) return;
    mkdirSync(dirname(opts.cachePath), { recursive: true });
    writeFileSync(opts.cachePath, JSON.stringify(cache));
  };

  async function get(url: string): Promise<any | undefined> {
    if (failures >= maxFailures) return undefined;
    const wait = lastRequest + minInterval - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const res = await fetchFn(url, {
        headers: { 'User-Agent': 'foodfinder-personal' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      failures = 0;
      return body;
    } catch {
      failures++;
      return undefined;
    }
  }

  return async function lookup(q: Query): Promise<Nutrition | null> {
    const key = q.ean ? `ean:${q.ean}` : `name:${q.name.toLowerCase()}`;
    if (key in cache) return cache[key];

    let result: Nutrition | null;
    let answered: boolean;
    if (q.ean) {
      const body = await get(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(q.ean)}.json`);
      answered = body !== undefined;
      result = mapNutriments(body?.product?.nutriments, 0.9);
    } else {
      const body = await get(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q.name)}&json=1&page_size=3&countries_tags=en:czech-republic`,
      );
      answered = body !== undefined;
      const hits: { nutriments?: OffNutriments }[] = body?.products ?? [];
      result = hits.map((h) => mapNutriments(h.nutriments, 0.5)).find((n) => n !== null) ?? null;
    }
    // Only definitive answers are cached; transient failures are retried next run.
    if (answered) {
      cache[key] = result;
      persist();
    }
    return result;
  };
}
