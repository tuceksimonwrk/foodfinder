import { useCallback, useEffect, useState } from 'react';
import { offerToListItem, type Offer } from '@foodfinder/shared';
import { loadOffers, type LoadResult } from './data/loadData';
import { newId, useShoppingList } from './store/shoppingList';
import { Letak } from './views/Letak';
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
  const list = useShoppingList();

  useEffect(() => {
    loadOffers().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const offers: Offer[] = data?.offers ?? [];

  const addOffer = useCallback(
    (o: Offer) => {
      list.add(offerToListItem(o, newId()));
      setToast(`Přidáno: ${o.name}`);
    },
    [list.add],
  );

  const renderTab = () => {
    switch (tab) {
      case 'letak':
        return <Letak offers={offers} onAdd={addOffer} />;
      case 'seznam':
        return <Seznam list={list} />;
      default:
        return <h1>{TABS.find((t) => t.id === tab)!.label}</h1>;
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
      {data && <main>{renderTab()}</main>}
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
