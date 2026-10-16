import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyLocalMeat, applyLocalOverrides, offerToListItem, updatePriceBook, type ListItem, type Offer, type PriceBook, type Recipe } from '@foodfinder/shared';
import { loadOffers, loadRecipes, type LoadResult } from './data/loadData';
import { getJSON, setJSON } from './store/db';
import { useLocalMeat, useLocalOverrides, useSettings } from './store/settings';
import { useTheme } from './store/useTheme';
import { newId, useShoppingList } from './store/shoppingList';
import { Jidelnicek } from './views/Jidelnicek';
import { ListIcon, PlateIcon, SlidersIcon, TagIcon } from './components/Icons';
import { ThemeToggle } from './components/ThemeToggle';
import { Letak } from './views/Letak';
import { Nastaveni } from './views/Nastaveni';
import { Seznam } from './views/Seznam';

type Tab = 'letak' | 'jidelnicek' | 'seznam' | 'nastaveni';

const TABS: { id: Tab; label: string; icon: () => ReactElement }[] = [
  { id: 'letak', label: 'Leták', icon: TagIcon },
  { id: 'jidelnicek', label: 'Jídelníček', icon: PlateIcon },
  { id: 'seznam', label: 'Seznam', icon: ListIcon },
  { id: 'nastaveni', label: 'Nastavení', icon: SlidersIcon },
];

const formatStamp = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export function App() {
  const [tab, setTab] = useState<Tab>('letak');
  const [data, setData] = useState<LoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [priceBook, setPriceBook] = useState<PriceBook>({});
  const list = useShoppingList();
  const theme = useTheme();
  const [settings, updateSettings, settingsLoaded] = useSettings();
  const [overrides, setOverrides] = useLocalOverrides();
  const [meat, setMeat] = useLocalMeat();

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
  const offers = useMemo(
    () => applyLocalMeat(applyLocalOverrides(rawOffers, overrides), meat),
    [rawOffers, overrides, meat],
  );

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
            meat={meat}
            onMeatChange={setMeat}
          />
        );
    }
  };

  const tabIndex = TABS.findIndex((t) => t.id === tab);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <h1 className="brand"><span className="brand-mark" aria-hidden="true" />foodfinder</h1>
          <div className="topbar-actions">
            {data && (
              <div className={data.fromCache ? 'freshness offline' : 'freshness'}>
                <div>Data z {formatStamp(data.generatedAt)}</div>
                <div>{data.fromCache ? 'offline kopie, ' : ''}{offers.length} nabídek</div>
              </div>
            )}
            <ThemeToggle choice={theme.choice} onClick={theme.cycle} />
          </div>
        </div>
      </header>

      <div className="nav-wrap">
        <nav className="nav" aria-label="Hlavní navigace" style={{ ['--i' as string]: tabIndex }}>
          <span className="nav-indicator" aria-hidden="true" />
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <t.icon />
              {t.label}
              {t.id === 'seznam' && list.items.length > 0 && (
                <span key={list.items.length} className="nav-badge" aria-label={`${list.items.length} položek`}>
                  {list.items.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="app">
        {error && <div className="error">{error}. Zkus to prosím znovu, až budeš online.</div>}
        {!data && !error && <p className="muted">Načítám nabídky…</p>}
        {data && settingsLoaded && <main key={tab} className="view">{renderTab()}</main>}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
