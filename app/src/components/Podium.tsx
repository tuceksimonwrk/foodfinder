import { useEffect, useRef, useState } from 'react';
import type { Offer, PodiumEntry } from '@foodfinder/shared';
import { formatNumber, formatPrice } from '../format';
import { STORE_LABELS } from '../labels';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from the previously shown value to `target`; jumps straight there when motion is reduced. */
function useCountUp(target: number, duration = 750): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      from.current = origin + (target - origin) * eased;
      setValue(from.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Slab({ entry, rank, onAdd }: { entry: PodiumEntry; rank: number; onAdd: (o: Offer) => void }) {
  const cost = useCountUp(entry.cost);
  const { offer } = entry;
  return (
    <article className={`slab rank-${rank}`} style={{ ['--i' as string]: rank - 1 }}>
      <span className="slab-rank" aria-hidden="true">{rank}</span>
      <div className="slab-cost">
        {formatPrice(cost)}
        <small>za 30 g bílkovin</small>
      </div>
      <div className="slab-name">{offer.name}</div>
      <div className="slab-meta">
        {STORE_LABELS[offer.store]}, {formatPrice(offer.price)}
        {offer.nutrition ? `, ${formatNumber(offer.nutrition.protein)} g bílkovin na 100 g` : ''}
      </div>
      <button className="secondary" onClick={() => onAdd(offer)}>Do seznamu</button>
    </article>
  );
}

export function Podium({ entries, onAdd }: { entries: PodiumEntry[]; onAdd: (o: Offer) => void }) {
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="podium-title">
      <div className="podium-head">
        <h2 id="podium-title">Nejlevnější bílkoviny dnes</h2>
        <span className="muted small">podle tvých filtrů obchodů a kategorií</span>
      </div>
      <div className="podium">
        {entries.map((e, i) => (
          <Slab key={e.offer.id} entry={e} rank={i + 1} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
