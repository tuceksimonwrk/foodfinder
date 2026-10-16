import { useEffect, useState } from 'react';
import type { ListItem } from '@foodfinder/shared';

interface Props {
  item: ListItem;
  onStep: (delta: 1 | -1) => void;
  onSet: (value: number) => void;
}

/** Amount of a shopping list item: − / + by whole packs (or 50 g, or one piece) and an exact value to type. */
export function AmountControl({ item, onStep, onSet }: Props) {
  const byWeight = item.grams !== undefined;
  const value = byWeight ? item.grams! : (item.count ?? 1);
  const min = byWeight ? (item.packGrams ?? 50) : 1;
  const unit = byWeight ? 'g' : 'ks';

  // The typed text is only committed on blur or Enter, so half-typed numbers never change the price.
  const [draft, setDraft] = useState(String(Math.round(value)));
  useEffect(() => setDraft(String(Math.round(value))), [value]);

  const commit = () => {
    const n = Number(draft.replace(',', '.'));
    if (!Number.isFinite(n) || Math.round(n) < 1) setDraft(String(Math.round(value)));
    else onSet(n);
  };

  const packs = byWeight && item.packGrams && value % item.packGrams === 0 ? value / item.packGrams : null;

  return (
    <div className="qty" role="group" aria-label={`Množství: ${item.label}`}>
      <div className="qty-controls">
      <button type="button" className="qty-btn" aria-label="Méně" disabled={value <= min} onClick={() => onStep(-1)}>−</button>
      <input
        className="qty-input"
        type="text"
        inputMode="numeric"
        aria-label={`Množství v ${byWeight ? 'gramech' : 'kusech'}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <span className="qty-unit">{unit}</span>
      <button type="button" className="qty-btn" aria-label="Více" onClick={() => onStep(1)}>+</button>
      </div>
      {packs !== null && item.packGrams && packs >= 1 && (
        <span className="muted small qty-packs">{packs}× balení {item.packGrams} g</span>
      )}
    </div>
  );
}
