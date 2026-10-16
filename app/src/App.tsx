import { useEffect, useState } from 'react';
import type { Offer } from '@foodfinder/shared';
import { loadOffers, type LoadResult } from './data/loadData';
import { Letak } from './views/Letak';

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

  useEffect(() => {
    loadOffers().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  const offers: Offer[] = data?.offers ?? [];

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
      {data && <main>{renderTab(tab, offers)}</main>}
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function renderTab(tab: Tab, offers: Offer[]) {
  if (tab === 'letak') return <Letak offers={offers} onAdd={() => {}} />;
  return <h1>{TABS.find((t) => t.id === tab)!.label}</h1>;
}
