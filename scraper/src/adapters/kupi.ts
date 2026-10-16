import * as cheerio from 'cheerio';
import { toIsoDate as iso, type RawOffer, type Store } from '@foodfinder/shared';
import type { Adapter } from './types';

const BASE = 'https://www.kupi.cz';

/** Kupi.cz shop slugs for the supported stores. */
const SHOP_SLUGS = ['lidl', 'albert', 'billa', 'kaufland', 'penny-market', 'tesco'];

/** Food-related Kupi.cz category slugs. */
const CATEGORY_SLUGS = [
  'maso-drubez-a-ryby',
  'mlecne-vyrobky-a-vejce',
  'ovoce-a-zelenina',
  'zdrava-vyziva',
  'lahudky',
  'konzervy',
  'mrazene-a-instantni-potraviny',
  'pecivo',
  'vareni-a-peceni',
];

/** Hints only where a Kupi category maps cleanly to one of our categories. */
const CATEGORY_HINTS: Record<string, string> = {
  'maso-drubez-a-ryby': 'maso',
  'mlecne-vyrobky-a-vejce': 'mleko',
};

const SHOP_PREFIXES: [string, Store][] = [
  ['lidl', 'lidl'],
  ['albert', 'albert'],
  ['billa', 'billa'],
  ['kaufland', 'kaufland'],
  ['penny', 'penny'],
  ['tesco', 'tesco'],
];

const clean = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const pad = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;

/** Day/month without a year: pick the year that puts the date closest after (now − 180 days). */
function resolveDate(day: number, month: number, now: Date): Date {
  const candidate = new Date(now.getFullYear(), month - 1, day);
  return candidate.getTime() < now.getTime() - 180 * DAY_MS
    ? new Date(now.getFullYear() + 1, month - 1, day)
    : candidate;
}

export function parseValidity(text: string, now: Date): { from?: string; to: string } | null {
  const t = clean(text).replace(/&ndash;/g, '–');
  if (/zítra končí/i.test(t)) return { to: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) };

  const range = t.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*[–-]\s*(?:\p{L}+\s+)?(\d{1,2})\.\s*(\d{1,2})\./u);
  if (range) {
    const from = resolveDate(+range[1], +range[2], now);
    let to = resolveDate(+range[3], +range[4], now);
    if (to < from) to = new Date(to.getFullYear() + 1, to.getMonth(), to.getDate());
    return { from: iso(from), to: iso(to) };
  }
  const until = t.match(/do\s+(?:\p{L}+\s+)?(\d{1,2})\.\s*(\d{1,2})\./u);
  if (until) return { to: iso(resolveDate(+until[1], +until[2], now)) };
  return null;
}

function parsePrice(text: string): number | undefined {
  const m = clean(text).match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : undefined;
}

function mapStore(name: string): Store | null {
  const n = clean(name).toLowerCase();
  return SHOP_PREFIXES.find(([prefix]) => n.startsWith(prefix))?.[1] ?? null;
}

export interface PageContext {
  now: Date;
  pageUrl: string;
  categoryHint?: string;
}

export function parseKupiPage(html: string, ctx: PageContext): RawOffer[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const offers: RawOffer[] = [];
  const today = iso(ctx.now);

  $('.discount_row').each((_, el) => {
    const row = $(el);
    const store = mapStore(row.find('.discounts_shop_name').first().text());
    const name = clean(row.find('a.btn_list_add').first().attr('data-product') ?? '');
    const price = parsePrice(row.find('.discount_price_value').first().text());
    if (!store || !name || price === undefined || price <= 0) return;

    const validity = parseValidity(row.find('.discounts_validity').first().text(), ctx.now);
    if (!validity) return;

    const quantityText = clean(row.find('.discount_amount').first().text()).replace(/^\/\s*/, '') || undefined;
    const pct = parsePrice(row.find('.discount_percentage').first().text());
    const originalPrice =
      pct && pct > 0 && pct < 100 ? Math.round((price / (1 - pct / 100)) * 10) / 10 : undefined;
    const href = row.find('a.btn_link_leaflet').first().attr('href');

    const offer: RawOffer = {
      store,
      name,
      price,
      originalPrice,
      quantityText,
      validFrom: validity.from ?? today,
      validTo: validity.to,
      sourceUrl: href ? new URL(href, BASE).toString() : ctx.pageUrl,
      categoryHint: ctx.categoryHint,
    };
    const key = offerKey(offer);
    if (seen.has(key)) return;
    seen.add(key);
    offers.push(offer);
  });
  return offers;
}

const offerKey = (o: RawOffer) => `${o.store}|${o.name}|${o.price}|${o.quantityText}|${o.validTo}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface KupiOptions {
  delayMs?: number;
  maxPages?: number;
  now?: Date;
}

export function createKupiAdapter(opts: KupiOptions = {}): Adapter {
  const delayMs = opts.delayMs ?? 1000;
  const maxPages = opts.maxPages ?? 5;

  return {
    id: 'kupi',
    async fetchOffers(fetchFn: typeof fetch = fetch): Promise<RawOffer[]> {
      const now = opts.now ?? new Date();
      const all = new Map<string, RawOffer>();

      for (const category of CATEGORY_SLUGS) {
        for (const shop of SHOP_SLUGS) {
          for (let page = 1; page <= maxPages; page++) {
            const url = `${BASE}/slevy/${category}/${shop}${page > 1 ? `?page=${page}` : ''}`;
            if (delayMs > 0) await sleep(delayMs);

            let html: string;
            try {
              const res = await fetchFn(url, { headers: { 'User-Agent': 'foodfinder-personal' } });
              if (!res.ok) {
                console.warn(`kupi: ${url} -> HTTP ${res.status}`);
                break;
              }
              html = await res.text();
            } catch (err) {
              console.warn(`kupi: ${url} failed: ${(err as Error).message}`);
              break;
            }

            const fresh = parseKupiPage(html, { now, pageUrl: url, categoryHint: CATEGORY_HINTS[category] })
              .filter((o) => !all.has(offerKey(o)));
            if (fresh.length === 0) break;
            for (const o of fresh) all.set(offerKey(o), o);
          }
        }
      }
      return [...all.values()];
    },
  };
}

export const kupiAdapter = createKupiAdapter();
