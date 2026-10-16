import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  STORES, applyFilters, buildIndex, podiumOffers, sortOffers,
  type Category, type Offer, type SortKey,
} from '@foodfinder/shared';
import { OfferCard } from '../components/OfferCard';
import { Podium } from '../components/Podium';
import { initialLetakState, type LetakDefaults, type LetakState } from './letakState';
import { CATEGORY_LABELS, STORE_LABELS } from '../labels';

interface Props {
  offers: Offer[];
  onAdd: (o: Offer) => void;
  defaults?: LetakDefaults;
}

type State = LetakState;

const PAGE = 60;
const STORAGE_KEY = 'letak-filters';
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const FALLBACK_DEFAULTS: LetakDefaults = { minProtein: 15, maxFat: 8, favoriteStores: [] };

const loadState = (defaults: LetakDefaults): State => {
  let saved: Partial<State> | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    /* ignore unavailable or corrupt storage */
  }
  return initialLetakState(defaults, saved);
};

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function Letak({ offers, onAdd, defaults }: Props) {
  const [state, setState] = useState<State>(() => loadState(defaults ?? FALLBACK_DEFAULTS));
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

  // The podium ignores the search text and the Fit switch: it always shows the best fit sources
  // within the chosen stores, categories, discount and price.
  const podium = useMemo(
    () => podiumOffers(applyFilters(offers, index, { ...state, query: '', fit: true })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offers, index, state.stores, state.categories, state.minDiscountPct, state.maxPrice, state.minProtein, state.maxFat],
  );

  const set = (patch: Partial<State>) => {
    setShown(PAGE);
    setState((s) => ({ ...s, ...patch }));
  };

  const activeExtras = (state.minDiscountPct > 0 ? 1 : 0) + (state.maxPrice !== undefined ? 1 : 0);

  return (
    <section>
      <Podium entries={podium} onAdd={onAdd} />

      <h2 className="section-title" style={{ marginTop: 8 }}>Všechny nabídky</h2>
      <input
        className="search"
        type="search"
        placeholder="Hledej: kuřecí, tvaroh, vejce…"
        value={state.query}
        onChange={(e) => set({ query: e.target.value })}
        aria-label="Hledat v nabídkách"
      />

      <div className="chips wrap" role="group" aria-label="Obchody">
        {STORES.map((s) => (
          <button
            key={s}
            className={state.stores.includes(s) ? 'chip on' : 'chip'}
            aria-pressed={state.stores.includes(s)}
            onClick={() => set({ stores: toggle(state.stores, s), storesTouched: true })}
          >
            {STORE_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Kategorie">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={state.categories.includes(c) ? 'chip on' : 'chip'}
            aria-pressed={state.categories.includes(c)}
            onClick={() => set({ categories: toggle(state.categories, c) })}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className={state.fit ? 'fit-box on' : 'fit-box'}>
        <label className="fit-toggle">
          <input
            type="checkbox" checked={state.fit}
            onChange={(e) => set({ fit: e.target.checked, sort: e.target.checked ? 'proteinCost' : 'relevance' })}
          />
          Fit režim
        </label>
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          Jen produkty s makry, řazené podle ceny za 30 g bílkovin.
        </p>
        {state.fit && (
          <div className="controls">
            <label>
              Bílkoviny alespoň (g na 100 g)
              <input type="number" min={0} value={state.minProtein} onChange={(e) => set({ minProtein: Number(e.target.value) })} />
            </label>
            <label>
              Tuk nejvýše (g na 100 g)
              <input type="number" min={0} value={state.maxFat} onChange={(e) => set({ maxFat: Number(e.target.value) })} />
            </label>
          </div>
        )}
      </div>

      <details className="more-filters">
        <summary>Další filtry{activeExtras > 0 ? ` (${activeExtras})` : ''}</summary>
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
            Nejvyšší cena (Kč)
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
      </details>

      <p className="muted small" aria-live="polite">Nalezeno {results.length} nabídek</p>
      <div className="grid">
        {results.slice(0, shown).map((o) => (
          <OfferCard key={o.id} offer={o} onAdd={onAdd} />
        ))}
      </div>
      {results.length === 0 && <p className="muted">Nic jsme nenašli. Zkus uvolnit filtry nebo vypnout Fit režim.</p>}
      {results.length > shown && (
        <button className="primary more" onClick={() => setShown((n) => n + PAGE)}>Zobrazit další</button>
      )}
    </section>
  );
}
