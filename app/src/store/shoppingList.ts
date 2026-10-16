import { useCallback, useEffect, useState } from 'react';
import { addOrMerge, changeAmount, mergeLoaded, setAmount, type ListItem } from '@foodfinder/shared';
import { getJSON, setJSON } from './db';

const KEY = 'shopping-list';

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export interface ShoppingList {
  items: ListItem[];
  add: (item: ListItem) => void;
  addMany: (items: ListItem[]) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  step: (id: string, delta: 1 | -1) => void;
  setAmountOf: (id: string, value: number) => void;
  clear: () => void;
}

export function useShoppingList(): ShoppingList {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getJSON<ListItem[]>(KEY).then((saved) => {
      // Anything added before the stored list arrived is merged in rather than lost.
      setItems((current) => mergeLoaded(saved ?? [], current));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void setJSON(KEY, items);
  }, [items, loaded]);

  const add = useCallback((item: ListItem) => setItems((l) => addOrMerge(l, item)), []);
  const addMany = useCallback((more: ListItem[]) => setItems((l) => more.reduce(addOrMerge, l)), []);
  const toggle = useCallback(
    (id: string) => setItems((l) => l.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))),
    [],
  );
  const remove = useCallback((id: string) => setItems((l) => l.filter((i) => i.id !== id)), []);
  const step = useCallback(
    (id: string, delta: 1 | -1) => setItems((l) => l.map((i) => (i.id === id ? changeAmount(i, delta) : i))),
    [],
  );
  const setAmountOf = useCallback(
    (id: string, value: number) => setItems((l) => l.map((i) => (i.id === id ? setAmount(i, value) : i))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  return { items, add, addMany, toggle, remove, step, setAmountOf, clear };
}
