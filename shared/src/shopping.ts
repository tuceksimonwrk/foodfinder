import { normalizeText } from './text';
import type { Offer, Store } from './types';

export interface ListItem {
  id: string;
  label: string;
  grams?: number;
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
    price: existing.grams === undefined ? (existing.price ?? 0) + (item.price ?? 0) : existing.price,
    estimated: existing.estimated || item.estimated,
    checked: false,
  };
  return list.map((x, idx) => (idx === i ? merged : x));
}

export function itemPrice(i: ListItem): number | undefined {
  if (i.grams !== undefined && i.pricePerKg !== undefined) return (i.grams / 1000) * i.pricePerKg;
  return i.price;
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
