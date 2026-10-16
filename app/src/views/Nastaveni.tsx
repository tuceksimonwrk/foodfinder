import { useMemo, useState } from 'react';
import { STORES, type NutritionOverrides, type Offer } from '@foodfinder/shared';
import { STORE_LABELS } from '../labels';
import type { Settings } from '../store/settings';
import { correctableProducts } from './correctable';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  /** Offers before local corrections, so already corrected products stay visible in the list below. */
  offers: Offer[];
  overrides: NutritionOverrides;
  onOverridesChange: (next: NutritionOverrides) => void;
}

const MAX_LISTED = 25;

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function MacroForm({ name, onSave }: { name: string; onSave: (m: { kcal: number; protein: number; fat: number; carbs: number }) => void }) {
  const [v, setV] = useState({ kcal: '', protein: '', fat: '', carbs: '' });
  const valid = Object.values(v).every((x) => x.trim() !== '' && Number(x) >= 0);
  const field = (k: keyof typeof v, label: string) => (
    <label>
      {label}
      <input type="number" min={0} step="0.1" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="macro-form">
      <b>{name}</b>
      <div className="controls">
        {field('kcal', 'kcal')}
        {field('protein', 'Bílkoviny')}
        {field('fat', 'Tuk')}
        {field('carbs', 'Sacharidy')}
      </div>
      <button
        className="primary"
        disabled={!valid}
        onClick={() => onSave({ kcal: Number(v.kcal), protein: Number(v.protein), fat: Number(v.fat), carbs: Number(v.carbs) })}
      >
        Uložit makra
      </button>
    </div>
  );
}

export function Nastaveni({ settings, onChange, offers, overrides, onOverridesChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [includeEstimates, setIncludeEstimates] = useState(false);

  const missing = useMemo(
    () => correctableProducts(offers, overrides, includeEstimates, query),
    [offers, overrides, includeEstimates, query],
  );

  const toggleStore = (s: (typeof STORES)[number]) =>
    onChange({
      favoriteStores: settings.favoriteStores.includes(s)
        ? settings.favoriteStores.filter((x) => x !== s)
        : [...settings.favoriteStores, s],
    });

  const save = (key: string, macros: { kcal: number; protein: number; fat: number; carbs: number }) => {
    onOverridesChange({ ...overrides, [key]: macros });
    setOpen(null);
  };
  const removeOverride = (key: string) => {
    const { [key]: _removed, ...rest } = overrides;
    onOverridesChange(rest);
  };

  return (
    <section>
      <h2 className="view-title">Nastavení</h2>

      <h2 className="section-title">Denní cíle (výchozí pro jídelníček)</h2>
      <div className="controls">
        <NumberField label="Kalorie" value={settings.kcal} onChange={(n) => onChange({ kcal: n })} />
        <NumberField label="Bílkoviny ≥ (g)" value={settings.proteinMin} onChange={(n) => onChange({ proteinMin: n })} />
        <NumberField label="Tuk ≤ (g)" value={settings.fatMax} onChange={(n) => onChange({ fatMax: n })} />
      </div>

      <h2 className="section-title">Fit režim v letáku (na 100 g)</h2>
      <div className="controls">
        <NumberField label="Bílkoviny ≥ (g)" value={settings.fitMinProtein} onChange={(n) => onChange({ fitMinProtein: n })} />
        <NumberField label="Tuk ≤ (g)" value={settings.fitMaxFat} onChange={(n) => onChange({ fitMaxFat: n })} />
      </div>

      <h2 className="section-title">Oblíbené obchody (výchozí filtr v letáku)</h2>
      <div className="chips">
        {STORES.map((s) => (
          <button key={s} className={settings.favoriteStores.includes(s) ? 'chip on' : 'chip'} onClick={() => toggleStore(s)}>
            {STORE_LABELS[s]}
          </button>
        ))}
      </div>
      <p className="muted small">Filtr obchodů se v letáku použije, dokud sis v něm nevybral vlastní.</p>

      <h2 className="section-title">Opravit makra</h2>
      <p className="muted small">Doplň makra na 100 g u produktů bez maker. Oprava platí pro všechna balení stejného produktu.</p>
      <label className="fit-toggle">
        <input type="checkbox" checked={includeEstimates} onChange={(e) => setIncludeEstimates(e.target.checked)} />
        <span>Ukázat i produkty s odhadnutými makry (slovník, OFF podle názvu)</span>
      </label>
      <input className="search" type="search" placeholder="Hledat produkt…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="missing">
        {missing.slice(0, MAX_LISTED).map(([key, name]) => (
          <li key={key}>
            {open === key ? (
              <MacroForm name={name} onSave={(m) => save(key, m)} />
            ) : (
              <button className="link" onClick={() => setOpen(key)}>{name}</button>
            )}
          </li>
        ))}
      </ul>
      {missing.length > MAX_LISTED && <p className="muted small">…a dalších {missing.length - MAX_LISTED}. Zpřesni hledání.</p>}
      {missing.length === 0 && <p className="muted">Žádné produkty bez maker nenalezeny.</p>}

      {Object.keys(overrides).length > 0 && (
        <>
          <h2 className="section-title">Moje opravy</h2>
          <ul className="missing">
            {Object.entries(overrides).map(([key, m]) => (
              <li key={key}>
                <span>{key}</span>
                <span className="muted small"> {m.protein} g bílkovin · {m.fat} g tuku · {m.kcal} kcal</span>
                <button className="icon" aria-label={`Smazat opravu ${key}`} onClick={() => removeOverride(key)}>✕</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
