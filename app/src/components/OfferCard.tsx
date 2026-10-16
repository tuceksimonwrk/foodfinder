import { useEffect, useState } from 'react';
import { czkPer30gProtein, hamGrade, proteinEnergyPct, toIsoDate, type Offer } from '@foodfinder/shared';
import { formatNumber, formatPrice, formatValidity } from '../format';
import { CATEGORY_LABELS, nutritionSourceLabel, STORE_LABELS } from '../labels';
import { CheckIcon } from './Icons';
import { Thumb } from './Thumb';

interface Props {
  offer: Offer;
  onAdd: (o: Offer) => void;
}

export function OfferCard({ offer, onAdd }: Props) {
  const n = offer.nutrition;
  const proteinCost = czkPer30gProtein(offer);
  const grade = hamGrade(offer.name);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <article className="card">
      <div className="card-head">
        <span className="store">{STORE_LABELS[offer.store]}</span>
        <span className="muted">{CATEGORY_LABELS[offer.category]}, {formatValidity(offer, toIsoDate(new Date()))}</span>
      </div>
      <div className="card-top">
        <Thumb src={offer.imageUrl} />
        <div className="card-main">
      <h3 className="card-title">
        <a href={offer.sourceUrl} target="_blank" rel="noreferrer">{offer.name}</a>
      </h3>
      <div className="price-row">
        <strong className="price">{formatPrice(offer.price)}</strong>
        {offer.originalPrice !== undefined && offer.discountPct > 0 && (
          <>
            <s className="old-price">{formatPrice(offer.originalPrice)}</s>
            <span className="discount">−{offer.discountPct} %</span>
          </>
        )}
      </div>
      <div className="muted small">
        {offer.pricePerKg !== undefined ? `${formatPrice(offer.pricePerKg)} za kg` : 'cena za kg neznámá'}
      </div>
        </div>
      </div>

      {(grade || offer.meatPct !== undefined) && (
        <div className="ham-info">
          {offer.meatPct !== undefined && (
            <span className="meat-pct">
              <b className="num">{String(offer.meatPct).replace('.', ',')} %</b> masa <small>(z etikety)</small>
            </span>
          )}
          {grade && <span className="grade-pill" title="Podle vyhlášky 69/2016 Sb. se třída šunky určuje obsahem svalových bílkovin">{grade.label}</span>}
        </div>
      )}

      {n ? (
        <div className="protein-block">
          {proteinCost !== undefined && (
            <div className="protein-cost">
              <span className="num">{formatPrice(proteinCost)}</span>
              <span>za 30 g bílkovin</span>
            </div>
          )}
          <div className="bar" title="Podíl kalorií z bílkovin">
            <span style={{ ['--w' as string]: `${proteinEnergyPct(n)}%` }} />
          </div>
          <div className="small">{Math.round(proteinEnergyPct(n))} % kalorií z bílkovin</div>
          <div className="macro-trio">
            <div><span className="num">{formatNumber(n.protein)} g</span><span>bílkoviny</span></div>
            <div><span className="num">{formatNumber(n.fat)} g</span><span>tuk</span></div>
            <div><span className="num">{formatNumber(n.kcal)}</span><span>kcal</span></div>
          </div>
          <div className="muted small">Makra na 100 g, zdroj: {nutritionSourceLabel(n)}</div>
        </div>
      ) : (
        <div className="no-macros">Bez maker. Doplnit je můžeš v Nastavení.</div>
      )}

      <button
        className={added ? 'primary add added' : 'primary add'}
        onClick={() => {
          onAdd(offer);
          setAdded(true);
        }}
      >
        {added ? (<><CheckIcon /> Přidáno</>) : 'Do seznamu'}
      </button>
    </article>
  );
}
