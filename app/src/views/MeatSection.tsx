import { useMemo, useState } from 'react';
import type { MeatOverrides, Offer } from '@foodfinder/shared';
import { hamProducts } from './hamProducts';

interface Props {
  /** Offers before local corrections, so already filled hams stay findable. */
  offers: Offer[];
  meat: MeatOverrides;
  onChange: (next: MeatOverrides) => void;
}

const MAX_LISTED = 15;

/** Meat share of hams: the real figure is only on the package label, so the user types it in. */
export function MeatSection({ offers, meat, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const hams = useMemo(() => hamProducts(offers, meat, query), [offers, meat, query]);
  const pct = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(pct) && pct > 0 && pct <= 100;

  const save = (key: string) => {
    onChange({ ...meat, [key]: Math.round(pct * 10) / 10 });
    setOpen(null);
    setValue('');
  };
  const remove = (key: string) => {
    const { [key]: _removed, ...rest } = meat;
    onChange(rest);
  };

  return (
    <>
      <h2 className="section-title">Podíl masa u šunek</h2>
      <p className="muted small">
        Procento masa najdeš na obalu (třeba „85 % masa“). Leták ho neuvádí, proto ho doplň ručně. Hodnota platí pro všechna balení stejné šunky.
      </p>
      <input className="search" type="search" placeholder="Hledat šunku…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="missing">
        {hams.slice(0, MAX_LISTED).map(([key, name]) => (
          <li key={key}>
            {open === key ? (
              <div className="meat-form">
                <b>{name}</b>
                <label>
                  Podíl masa (%)
                  <input type="number" min={1} max={100} step="0.1" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
                </label>
                <button className="primary" disabled={!valid} onClick={() => save(key)}>Uložit podíl masa</button>
              </div>
            ) : (
              <button className="link" onClick={() => { setOpen(key); setValue(''); }}>{name}</button>
            )}
          </li>
        ))}
      </ul>
      {hams.length > MAX_LISTED && <p className="muted small">…a dalších {hams.length - MAX_LISTED}. Zpřesni hledání.</p>}
      {hams.length === 0 && <p className="muted">Žádné šunky bez podílu masa nenalezeny.</p>}

      {Object.keys(meat).length > 0 && (
        <>
          <h3 className="sub-title">Uložené hodnoty</h3>
          <ul className="missing">
            {Object.entries(meat).map(([key, pctValue]) => (
              <li key={key}>
                <span>{key}</span>
                <span className="muted small"> {pctValue} % masa</span>
                <button className="icon" aria-label={`Smazat podíl masa u ${key}`} onClick={() => remove(key)}>✕</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
