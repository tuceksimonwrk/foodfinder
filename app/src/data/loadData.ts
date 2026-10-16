import { toIsoDate, type Offer, type Recipe } from '@foodfinder/shared';
import { getJSON, setJSON } from '../store/db';

export interface Db {
  getJSON<T>(key: string): Promise<T | undefined>;
  setJSON<T>(key: string, value: T): Promise<void>;
}

const defaultDb: Db = { getJSON, setJSON };
const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;
const LOAD_ERROR = 'Data se nepodařilo načíst';

interface OffersFile {
  generatedAt: string;
  offers: Offer[];
}

export interface LoadResult {
  offers: Offer[];
  generatedAt: string;
  fromCache: boolean;
}

export interface LoadOptions {
  fetchFn?: typeof fetch;
  now?: Date;
  db?: Db;
}

const isOffersFile = (v: unknown): v is OffersFile =>
  typeof v === 'object' && v !== null && Array.isArray((v as OffersFile).offers) &&
  typeof (v as OffersFile).generatedAt === 'string';

export async function loadOffers(opts: LoadOptions = {}): Promise<LoadResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const db = opts.db ?? defaultDb;
  const today = toIsoDate(opts.now ?? new Date());

  let file: OffersFile;
  let fromCache = false;
  try {
    const res = await fetchFn(dataUrl('offers.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body: unknown = await res.json();
    if (!isOffersFile(body)) throw new Error('unexpected file shape');
    file = body;
    await db.setJSON('offers', file);
  } catch {
    const cached = await db.getJSON<OffersFile>('offers');
    if (!cached || !isOffersFile(cached)) throw new Error(LOAD_ERROR);
    file = cached;
    fromCache = true;
  }

  return {
    offers: file.offers.filter((o) => o.validTo >= today),
    generatedAt: file.generatedAt,
    fromCache,
  };
}

export async function loadRecipes(fetchFn: typeof fetch = fetch): Promise<Recipe[]> {
  const res = await fetchFn(dataUrl('recipes.json'));
  if (!res.ok) throw new Error(LOAD_ERROR);
  return (await res.json()) as Recipe[];
}
