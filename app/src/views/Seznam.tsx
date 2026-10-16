import { useEffect, useState } from 'react';
import { groupByStore, itemPrice, totalPrice, type Store } from '@foodfinder/shared';
import { formatPrice } from '../format';
import { AmountControl } from '../components/AmountControl';
import { RohlikLink } from '../components/RohlikLink';
import { STORE_LABELS } from '../labels';
import { rohlikSearchTerm } from '../rohlik';
import { shoppingListText } from '../shoppingText';
import type { ShoppingList } from '../store/shoppingList';

export function Seznam({ list }: { list: ShoppingList }) {
  const { items, toggle, remove, step, setAmountOf, clear } = list;
  // 'done' flashes after a successful copy; 'manual' shows the text for copying by hand when the browser blocks the clipboard
  const [copy, setCopy] = useState<'idle' | 'done' | 'manual'>('idle');

  useEffect(() => {
    if (copy !== 'done') return;
    const t = setTimeout(() => setCopy('idle'), 2000);
    return () => clearTimeout(t);
  }, [copy]);

  if (items.length === 0) {
    return <p className="muted">Seznam je prázdný. Přidej položky z letáku nebo z jídelníčku.</p>;
  }

  const groups = groupByStore(items);
  const keys = Object.keys(groups).sort((a, b) => (a === 'nezarazeno' ? 1 : b === 'nezarazeno' ? -1 : a.localeCompare(b)));
  const anyEstimated = items.some((i) => i.estimated);
  const text = shoppingListText(items);

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy('done');
    } catch {
      setCopy('manual');
    }
  };

  return (
    <section>
      {keys.map((key) => {
        const group = [...groups[key]].sort((a, b) => Number(a.checked) - Number(b.checked));
        return (
          <div key={key} className="list-group">
            <h2>{key === 'nezarazeno' ? 'Nezařazeno' : STORE_LABELS[key as Store]}</h2>
            <ul>
              {group.map((i) => {
                const price = itemPrice(i);
                return (
                  <li key={i.id} className={i.checked ? 'done' : undefined}>
                    <label>
                      <input type="checkbox" checked={i.checked} onChange={() => toggle(i.id)} />
                      <span className="label">{i.label}</span>
                    </label>
                    <AmountControl item={i} onStep={(d) => step(i.id, d)} onSet={(v) => setAmountOf(i.id, v)} />
                    <span className="item-price">
                      {price !== undefined ? `${i.estimated ? '~' : ''}${formatPrice(price)}` : '–'}
                    </span>
                    <RohlikLink compact term={i.searchTerm ?? rohlikSearchTerm(i.label)} />
                    <button className="icon" aria-label={`Smazat ${i.label}`} onClick={() => remove(i.id)}>✕</button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="total">
        Celkem {anyEstimated ? '~' : ''}{formatPrice(totalPrice(items))}
      </p>
      {anyEstimated && <p className="muted small">~ znamená odhad ceny (surovina nebyla v aktuálních akcích).</p>}
      <div className="list-actions">
        <button className={copy === 'done' ? 'primary copied' : 'primary'} onClick={copyList} disabled={text === ''}>
          {copy === 'done' ? 'Zkopírováno' : 'Zkopírovat seznam'}
        </button>
        <button className="secondary" onClick={() => window.confirm('Vyprázdnit celý seznam?') && clear()}>
          Vyprázdnit seznam
        </button>
      </div>
      <p className="muted small">
        Zkopírovaný seznam (bez odškrtnutých položek) můžeš vložit třeba do nákupního asistenta e-shopu nebo do poznámek.
      </p>
      {copy === 'manual' && (
        <label className="manual-copy">
          Prohlížeč nepovolil kopírování. Označ text a zkopíruj ho ručně:
          <textarea readOnly rows={Math.min(10, text.split('\n').length + 1)} value={text} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
    </section>
  );
}
