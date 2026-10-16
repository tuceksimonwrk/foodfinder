import { groupByStore, itemPrice, totalPrice, type Store } from '@foodfinder/shared';
import { formatNumber, formatPrice } from '../format';
import { STORE_LABELS } from '../labels';
import type { ShoppingList } from '../store/shoppingList';

export function Seznam({ list }: { list: ShoppingList }) {
  const { items, toggle, remove, clear } = list;
  if (items.length === 0) {
    return <p className="muted">Seznam je prázdný. Přidej položky z letáku nebo z jídelníčku.</p>;
  }

  const groups = groupByStore(items);
  const keys = Object.keys(groups).sort((a, b) => (a === 'nezarazeno' ? 1 : b === 'nezarazeno' ? -1 : a.localeCompare(b)));
  const anyEstimated = items.some((i) => i.estimated);

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
                    <span className="muted small">
                      {i.grams !== undefined ? `${formatNumber(i.grams)} g` : ''}
                    </span>
                    <span className="item-price">
                      {price !== undefined ? `${i.estimated ? '~' : ''}${formatPrice(price)}` : '–'}
                    </span>
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
      <button className="secondary" onClick={() => window.confirm('Vyprázdnit celý seznam?') && clear()}>
        Vyprázdnit seznam
      </button>
    </section>
  );
}
