import { useState } from 'react';
import {
  activeOffers, generatePlan, ingredientsToListItems, toIsoDate,
  type ListItem, type Offer, type PlanResult, type PriceBook, type PricedRecipe, type Recipe,
} from '@foodfinder/shared';
import { formatNumber, formatPrice } from '../format';
import { STORE_LABELS } from '../labels';
import { newId } from '../store/shoppingList';

export interface PlanDefaults {
  kcal: number;
  proteinMin: number;
  fatMax: number;
}

interface Props {
  offers: Offer[];
  recipes: Recipe[];
  priceBook: PriceBook;
  onAddItems: (items: ListItem[]) => void;
  defaults?: PlanDefaults;
}

const FALLBACK_DEFAULTS: PlanDefaults = { kcal: 2200, proteinMin: 150, fatMax: 70 };

const num = (v: string, fallback: number) => (v.trim() === '' || Number.isNaN(Number(v)) ? fallback : Number(v));

export function Jidelnicek({ offers, recipes, priceBook, onAddItems, defaults = FALLBACK_DEFAULTS }: Props) {
  const [kcal, setKcal] = useState(String(defaults.kcal));
  const [proteinMin, setProteinMin] = useState(String(defaults.proteinMin));
  const [fatMax, setFatMax] = useState(String(defaults.fatMax));
  const [meals, setMeals] = useState(4);
  const [days, setDays] = useState(1);
  const [excluded, setExcluded] = useState('');
  const [budget, setBudget] = useState('');
  const [plan, setPlan] = useState<PlanResult | null>(null);

  const generate = () => {
    setPlan(
      generatePlan(
        {
          kcal: num(kcal, defaults.kcal),
          proteinMin: num(proteinMin, defaults.proteinMin),
          fatMax: num(fatMax, defaults.fatMax),
          meals,
          days,
          excluded: excluded.split(',').map((s) => s.trim()).filter(Boolean),
          budget: budget.trim() === '' ? undefined : num(budget, 0),
        },
        recipes,
        activeOffers(offers, toIsoDate(new Date())),
        priceBook,
      ),
    );
  };

  const addMeal = (m: PricedRecipe) => onAddItems(ingredientsToListItems(m, newId));
  const addDay = (day: PlanResult['days'][number]) => onAddItems(day.meals.flatMap((m) => ingredientsToListItems(m, newId)));

  return (
    <section>
      <h1>Jídelníček</h1>
      <div className="controls">
        <label>Kalorie<input type="number" min={0} value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
        <label>Bílkoviny ≥ (g)<input type="number" min={0} value={proteinMin} onChange={(e) => setProteinMin(e.target.value)} /></label>
        <label>Tuk ≤ (g)<input type="number" min={0} value={fatMax} onChange={(e) => setFatMax(e.target.value)} /></label>
        <label>
          Jídel denně
          <select value={meals} onChange={(e) => setMeals(Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Délka
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1 den</option>
            <option value={7}>7 dní</option>
          </select>
        </label>
        <label>Rozpočet (Kč)<input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
      </div>
      <label className="wide-field">
        Vyloučit suroviny (oddělené čárkou)
        <input type="text" placeholder="např. tvaroh, losos" value={excluded} onChange={(e) => setExcluded(e.target.value)} />
      </label>
      <button className="primary generate" onClick={generate}>Vygenerovat jídelníček</button>

      {plan && (
        <div className="plan">
          {plan.issues.length > 0 && (
            <div className="warning" role="alert">
              <b>Cíle se nepodařilo splnit úplně:</b>
              <ul>{plan.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}
          {plan.days.length > 0 && <p className="total">Celkem {formatPrice(plan.totalCost)}</p>}
          {plan.days.map((day, idx) => (
            <article key={idx} className="day">
              <header>
                <h2>{plan.days.length > 1 ? `Den ${idx + 1}` : 'Dnešní plán'}</h2>
                <span className="muted small">
                  {formatNumber(day.kcal)} kcal · {formatNumber(day.protein)} g bílkovin · {formatNumber(day.fat)} g tuku · {formatPrice(day.cost)}
                </span>
              </header>
              {day.meals.map((m) => (
                <div key={m.recipe.id} className="meal">
                  <div className="meal-head">
                    <b>{m.recipe.name}</b>
                    <span>{m.estimated ? '~' : ''}{formatPrice(m.cost)}</span>
                  </div>
                  <div className="muted small">
                    {formatNumber(m.kcal)} kcal · {formatNumber(m.protein)} g bílkovin · {formatNumber(m.fat)} g tuku
                  </div>
                  <ul className="ingredients">
                    {m.ingredients.map((i) => (
                      <li key={i.generic}>
                        {formatNumber(i.grams)} g {i.offer?.name ?? i.generic}
                        {i.offer ? ` (${STORE_LABELS[i.offer.store]}, ${formatPrice(i.cost)})` : ` (odhad ~${formatPrice(i.cost)})`}
                      </li>
                    ))}
                  </ul>
                  <button className="secondary" onClick={() => addMeal(m)}>Naklikat do seznamu</button>
                </div>
              ))}
              {day.meals.length > 0 && (
                <button className="primary" onClick={() => addDay(day)}>Celý den do seznamu</button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
