import { czkPer30gProtein, type Offer } from '@foodfinder/shared';
import { toIsoDate } from '@foodfinder/shared';
import { formatNumber, formatPrice, formatValidity } from '../format';
import { CATEGORY_LABELS, nutritionSourceLabel, STORE_LABELS } from '../labels';

interface Props {
  offer: Offer;
  onAdd: (o: Offer) => void;
}

export function OfferCard({ offer, onAdd }: Props) {
  const n = offer.nutrition;
  const proteinCost = czkPer30gProtein(offer);

  return (
    <article className="card">
      <div className="card-head">
        <span className="store">{STORE_LABELS[offer.store]}</span>
        <span className="muted">{CATEGORY_LABELS[offer.category]} · {formatValidity(offer, toIsoDate(new Date()))}</span>
      </div>
      <h3 className="card-title">
        <a href={offer.sourceUrl} target="_blank" rel="noreferrer">{offer.name}</a>
      </h3>
      <div className="price-row">
        <strong className="price">{formatPrice(offer.price)}</strong>
        {offer.originalPrice !== undefined && offer.discountPct > 0 && (
          <>
            <s className="muted">{formatPrice(offer.originalPrice)}</s>
            <span className="discount">−{offer.discountPct} %</span>
          </>
        )}
      </div>
      <div className="muted small">
        {offer.pricePerKg !== undefined ? `${formatPrice(offer.pricePerKg)}/kg` : 'cena za kg neznámá'}
      </div>
      {n ? (
        <div className="macros">
          <span><b>{formatNumber(n.protein)} g</b> bílkoviny</span>
          <span><b>{formatNumber(n.fat)} g</b> tuk</span>
          <span><b>{formatNumber(n.kcal)}</b> kcal</span>
          <span className="muted small">na 100 g · {nutritionSourceLabel(n)}</span>
          {proteinCost !== undefined && <span className="protein-cost">{formatPrice(proteinCost)} / 30 g bílkovin</span>}
        </div>
      ) : (
        <div className="macros muted small">bez maker</div>
      )}
      <button className="primary add" onClick={() => onAdd(offer)}>Do seznamu</button>
    </article>
  );
}
