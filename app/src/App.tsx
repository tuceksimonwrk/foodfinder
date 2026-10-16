import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyLocalOverrides, offerToListItem, updatePriceBook, type ListItem, type Offer, type PriceBook, type Recipe } from '@foodfinder/shared';
import { loadOffers, loadRecipes, type LoadResult } from './data/loadData';
import { getJSON, setJSON } from './store/db';
import { useLocalOverrides, useSettings } from './store/settings';
import { newId, useShoppingList } from './store/shoppingList';
import { Jidelnicek } from './views/Jidelnicek';
import { Letak } from './views/Letak';
import { Nastaveni } from './views/Nastaveni';
import { Seznam } from './views/Seznam';

type Tab = 'letak' | 'jidelnicek' | 'seznam' | 'nastaveni';

const TABS: { id: Tab; label: string }[] = [
  { id: 'letak', label: 'Leták' },
  { id: 'jidelnicek', label: 'Jídelníček' },
  { id: 'seznam', label: 'Seznam' },
  { id: 'nastaveni', label: 'Nastavení' },
];

const formatStamp = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function App() {
  const [tab, setTab] = useState<Tab>('letak');
  const [data, setData] = useState<LoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [priceBook, setPriceBook] = useState<PriceBook>({});
  const list = useShoppingList();
  const [settings, updateSettings, settingsLoaded] = useSettings();
  const [overrides, setOverrides] = useLocalOverrides();

  useEffect(() => {
    loadOffers().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    loadRecipes().then(setRecipes).catch(() => setRecipes([]));
  }, []);

  // Remember the latest known ingredient prices so a later plan can estimate when an ingredient is not on sale.
  useEffect(() => {
    if (!data || recipes.length === 0) return;
    getJSON<PriceBook>('price-book').then((stored) => {
      const next = updatePriceBook(stored ?? {}, recipes, data.offers);
      setPriceBook(next);
      void setJSON('price-book', next);
    });
  }, [data, recipes]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const rawOffers: Offer[] = data?.offers ?? [];
  const offers = useMemo(() => applyLocalOverrides(rawOffers, overrides), [rawOffers, overrides]);

  const addOffer = useCallback(
    (o: Offer) => {
      list.add(offerToListItem(o, newId()));
      setToast(`Přidáno: ${o.name}`);
    },
    [list.add],
  );

  const addItems = useCallback(
    (items: ListItem[]) => {
      list.addMany(items);
      setToast(`Přidáno položek: ${items.length}`);
    },
    [list.addMany],
  );

  const renderTab = () => {
    switch (tab) {
      case 'letak':
        return (
          <Letak
            offers={offers}
            onAdd={addOffer}
            defaults={{ minProtein: settings.fitMinProtein, maxFat: settings.fitMaxFat, favoriteStores: settings.favoriteStores }}
          />
        );
      case 'jidelnicek':
        return (
          <Jidelnicek
            offers={offers}
            recipes={recipes}
            priceBook={priceBook}
            onAddItems={addItems}
            defaults={{ kcal: settings.kcal, proteinMin: settings.proteinMin, fatMax: settings.fatMax }}
          />
        );
      case 'seznam':
        return <Seznam list={list} />;
      case 'nastaveni':
        return (
          <Nastaveni
            settings={settings}
            onChange={updateSettings}
            offers={rawOffers}
            overrides={overrides}
            onOverridesChange={setOverrides}
          />
        );
    }
  };

  return (
    <div className="app">
      {data && (
        <div className={data.fromCache ? 'banner offline' : 'banner'}>
          Data z {formatStamp(data.generatedAt)}
          {data.fromCache ? ' · offline kopie' : ''} · {offers.length} nabídek
        </div>
      )}
      {error && <div className="error">{error}. Zkus to prosím znovu, až budeš online.</div>}
      {!data && !error && <p>Načítám nabídky…</p>}
      {data && settingsLoaded && <main>{renderTab()}</main>}
      {toast && <div className="toast" role="status">{toast}</div>}
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'seznam' && list.items.length > 0 ? ` (${list.items.length})` : ''}
          </button>
        ))}
      </nav>
    </div>
  );
}
