import { normalizeText } from './text';
import type { Offer, Store } from './types';

export interface ListItem {
  id: string;
  label: string;
  /** What to search for in an online shop; the plain ingredient for planned meals (falls back to the label). */
  searchTerm?: string;
  /** Amount by weight. Items without a weight (fixed-price products) use `count` instead. */
  grams?: number;
  /** Weight of one pack, so the amount can be changed by whole packs. */
  packGrams?: number;
  /** Number of pieces for items without a weight; a missing count means one. */
  count?: number;
  store?: Store;
  offerId?: string;
  pricePerKg?: number;
  price?: number;
  estimated: boolean;
  checked: boolean;
}

export function offerToListItem(o: Offer, id: string): ListItem {
  return {
    id,
    label: o.name,
    grams: o.packageGrams,
    ...(o.packageGrams !== undefined ? { packGrams: o.packageGrams } : { count: 1 }),
    store: o.store,
    offerId: o.id,
    pricePerKg: o.pricePerKg,
    price: o.price,
    estimated: false,
    checked: false,
  };
}

const sameProduct = (a: ListItem, b: ListItem) =>
  a.store === b.store && normalizeText(a.label) === normalizeText(b.label) && (a.grams === undefined) === (b.grams === undefined);

/** Merges into an existing line for the same product and store, otherwise appends. */
export function addOrMerge(list: ListItem[], item: ListItem): ListItem[] {
  const i = list.findIndex((x) => sameProduct(x, item));
  if (i === -1) return [...list, item];
  const existing = list[i];
  const merged: ListItem = {
    ...existing,
    grams: existing.grams !== undefined ? existing.grams + (item.grams ?? 0) : undefined,
    count: existing.grams === undefined ? (existing.count ?? 1) + (item.count ?? 1) : existing.count,
    estimated: existing.estimated || item.estimated,
    checked: false,
  };
  return list.map((x, idx) => (idx === i ? merged : x));
}

export function itemPrice(i: ListItem): number | undefined {
  if (i.grams !== undefined && i.pricePerKg !== undefined) return (i.grams / 1000) * i.pricePerKg;
  return i.price === undefined ? undefined : i.price * (i.count ?? 1);
}

/** Step of the +/- buttons for items without a known pack size (ingredients of planned meals). */
const DEFAULT_STEP_GRAMS = 50;

/** One step more or less: a whole pack, 50 g without a pack size, or one piece. Never below one step. */
export function changeAmount(item: ListItem, delta: 1 | -1): ListItem {
  if (item.grams !== undefined) {
    const step = item.packGrams ?? DEFAULT_STEP_GRAMS;
    return { ...item, grams: Math.max(step, item.grams + delta * step) };
  }
  return { ...item, count: Math.max(1, (item.count ?? 1) + delta) };
}

/** Sets an exact weight (whole grams) or number of pieces; unusable input leaves the item unchanged. */
export function setAmount(item: ListItem, value: number): ListItem {
  if (!Number.isFinite(value)) return item;
  const rounded = Math.round(value);
  if (rounded < 1) return item;
  return item.grams !== undefined ? { ...item, grams: rounded } : { ...item, count: rounded };
}

export function totalPrice(list: ListItem[]): number {
  return list.reduce((sum, i) => sum + (itemPrice(i) ?? 0), 0);
}

export function groupByStore(list: ListItem[]): Record<string, ListItem[]> {
  const groups: Record<string, ListItem[]> = {};
  for (const i of list) (groups[i.store ?? 'nezarazeno'] ??= []).push(i);
  return groups;
}

/** Combines the stored list with items added in the meantime; safe to run more than once. */
export function mergeLoaded(saved: ListItem[], current: ListItem[]): ListItem[] {
  const savedIds = new Set(saved.map((i) => i.id));
  return [...saved, ...current.filter((i) => !savedIds.has(i.id))];
}
