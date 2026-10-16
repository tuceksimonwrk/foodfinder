import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  STORES, applyFilters, buildIndex, sortOffers,
  type Category, type Filters, type Offer, type SortKey, type Store,
} from '@foodfinder/shared';
import { OfferCard } from '../components/OfferCard';
import { CATEGORY_LABELS, STORE_LABELS } from '../labels';

interface Props {
  offers: Offer[];
  onAdd: (o: Offer) => void;
  defaults?: { minProtein: number; maxFat: number; favoriteStores: Store[] };
}

interface State extends Filters {
  sort: SortKey;
}

const PAGE = 60;
const STORAGE_KEY = 'letak-filters';
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const initialState = (defaults: Props['defaults']): State => {
  const base: State = {
    query: '', stores: defaults?.favoriteStores ?? [], categories: [], minDiscountPct: 0,
    fit: false, minProtein: defaults?.minProtein ?? 15, maxFat: defaults?.maxFat ?? 8, sort: 'relevance',
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...base, ...JSON.parse(saved), query: '' };
  } catch {
    /* ignore unavailable or corrupt storage */
  }
  return base;
};

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function Letak({ offers, onAdd, defaults }: Props) {
  const [state, setState] = useState<State>(() => initialState(defaults));
  const [shown, setShown] = useState(PAGE);
  const index = useMemo(() => buildIndex(offers), [offers]);
  const query = useDeferredValue(state.query);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, query: '' }));
    } catch {
      /* ignore */
    }
  }, [state]);

  const results = useMemo(
    () => sortOffers(applyFilters(offers, index, { ...state, query }), state.sort),
    [offers, index, state, query],
  );

  const set = (patch: Partial<State>) => {
    setShown(PAGE);
    setState((s) => ({ ...s, ...patch }));
  };

  return (
    <section>
      <input
        className="search"
        type="search"
        placeholder="Hledej: kuřecí, tvaroh, vejce…"
        value={state.query}
        onChange={(e) => set({ query: e.target.value })}
        aria-label="Hledat v nabídkách"
      />

      <div className="chips" aria-label="Obchody">
        {STORES.map((s) => (
          <button key={s} className={state.stores.includes(s) ? 'chip on' : 'chip'} onClick={() => set({ stores: toggle(state.stores, s) })}>
            {STORE_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="Kategorie">
        {CATEGORIES.map((c) => (
          <button key={c} className={state.categories.includes(c) ? 'chip on' : 'chip'} onClick={() => set({ categories: toggle(state.categories, c) })}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="controls">
        <label>
          Sleva od
          <select value={state.minDiscountPct} onChange={(e) => set({ minDiscountPct: Number(e.target.value) })}>
            {[0, 10, 20, 30, 40, 50].map((p) => (
              <option key={p} value={p}>{p === 0 ? 'všechny' : `${p} %`}</option>
            ))}
          </select>
        </label>
        <label>
          Max. cena (Kč)
          <input
            type="number" min={0} inputMode="numeric" value={state.maxPrice ?? ''}
            onChange={(e) => set({ maxPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
        <label>
          Řazení
          <select value={state.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>
            <option value="relevance">Relevance</option>
            <option value="discount">Největší sleva</option>
            <option value="price">Nejnižší cena</option>
            <option value="proteinCost">Nejlevnější bílkoviny</option>
            <option value="protein">Nejvíc bílkovin</option>
          </select>
        </label>
      </div>

      <div className="fit-box">
        <label className="fit-toggle">
          <input
            type="checkbox" checked={state.fit}
            onChange={(e) => set({ fit: e.target.checked, sort: e.target.checked ? 'proteinCost' : 'relevance' })}
          />
          <b>Fit režim</b>
        </label>
        {state.fit && (
          <div className="controls">
            <label>
              Bílkoviny ≥ (g / 100 g)
              <input type="number" min={0} value={state.minProtein} onChange={(e) => set({ minProtein: Number(e.target.value) })} />
            </label>
            <label>
              Tuk ≤ (g / 100 g)
              <input type="number" min={0} value={state.maxFat} onChange={(e) => set({ maxFat: Number(e.target.value) })} />
            </label>
          </div>
        )}
      </div>

      <p className="muted small">Nalezeno {results.length} nabídek</p>
      <div className="grid">
        {results.slice(0, shown).map((o) => (
          <OfferCard key={o.id} offer={o} onAdd={onAdd} />
        ))}
      </div>
      {results.length === 0 && <p className="muted">Nic jsme nenašli. Zkus uvolnit filtry.</p>}
      {results.length > shown && (
        <button className="primary more" onClick={() => setShown((n) => n + PAGE)}>Zobrazit další</button>
      )}
    </section>
  );
}
