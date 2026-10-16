import { useState } from 'react';
import {
  activeOffers, generatePlan, ingredientsToListItems, toIsoDate,
  type ListItem, type Offer, type PlanMode, type PlanResult, type PriceBook, type PricedRecipe, type Recipe,
} from '@foodfinder/shared';
import { Meter } from '../components/Meter';
import { formatNumber, formatPrice, formatScale } from '../format';
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

const MEALS_HINT: Record<number, string> = {
  2: 'Snídaně a večeře.',
  3: 'Snídaně, oběd a večeře.',
  4: 'Snídaně, oběd, odpolední svačina a večeře.',
  5: 'Snídaně, dopolední svačina, oběd, odpolední svačina a večeře.',
  6: 'Snídaně, oběd a večeře doplněné třemi svačinami.',
};

const FALLBACK_DEFAULTS: PlanDefaults = { kcal: 2200, proteinMin: 150, fatMax: 70 };

const MODE_KEY = 'plan-mode';
const loadMode = (): PlanMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'discount' ? 'discount' : 'cheapest';
  } catch {
    return 'cheapest';
  }
};

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
  const [targets, setTargets] = useState<PlanDefaults>(defaults);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<PlanMode>(loadMode);

  const chooseMode = (next: PlanMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* the choice lasts for this visit only */
    }
  };

  const generate = () => {
    const goal = {
      kcal: num(kcal, defaults.kcal),
      proteinMin: num(proteinMin, defaults.proteinMin),
      fatMax: num(fatMax, defaults.fatMax),
    };
    setTargets(goal);
    setBusy(true);
    // Let the browser paint "Generuji…" first: the search can take a second or two for a full week.
    setTimeout(() => {
      try {
        setPlan(
          generatePlan(
            {
              ...goal,
              meals,
              days,
              excluded: excluded.split(',').map((s) => s.trim()).filter(Boolean),
              budget: budget.trim() === '' ? undefined : num(budget, 0),
              mode,
            },
            recipes,
            activeOffers(offers, toIsoDate(new Date())),
            priceBook,
          ),
        );
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const addMeal = (m: PricedRecipe) => onAddItems(ingredientsToListItems(m, newId));
  const addDay = (day: PlanResult['days'][number]) => onAddItems(day.meals.flatMap((m) => ingredientsToListItems(m, newId)));

  return (
    <section>
      <h2 className="view-title">Jídelníček</h2>
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
      <fieldset className="segmented">
        <legend>Vybírat jídla podle</legend>
        <label>
          <input type="radio" name="plan-mode" checked={mode === 'cheapest'} onChange={() => chooseMode('cheapest')} />
          <span>Nejlevnější</span>
        </label>
        <label>
          <input type="radio" name="plan-mode" checked={mode === 'discount'} onChange={() => chooseMode('discount')} />
          <span>Největší slevy</span>
        </label>
      </fieldset>
      <p className="muted small meals-hint">
        {mode === 'cheapest'
          ? 'Vybere sestavu s nejnižší cenou.'
          : 'Vybere sestavu, která ti proti běžným cenám ušetří nejvíc korun, a teprve potom hlídá cenu.'}
        {' '}{MEALS_HINT[meals]}
      </p>
      <button className="primary generate" onClick={generate} disabled={busy} aria-busy={busy}>
        {busy ? 'Generuji…' : 'Vygenerovat jídelníček'}
      </button>

      {plan && (
        <div className="plan">
          {plan.issues.length > 0 && (
            <div className="warning" role="alert">
              <b>Cíle se nepodařilo splnit úplně:</b>
              <ul>{plan.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}
          {plan.days.length > 0 && (
            <p className="total">
              Celkem {formatPrice(plan.totalCost)}{" "}
              {plan.totalSavings >= 1 && <span className="total-saving">ušetříš {formatPrice(plan.totalSavings)}</span>}
            </p>
          )}
          {plan.days.map((day, idx) => (
            <article key={idx} className="day" style={{ animationDelay: `${idx * 70}ms` }}>
              <header className="day-head">
                <h2>{plan.days.length > 1 ? `Den ${idx + 1}` : 'Dnešní plán'}</h2>
                <span className="num">{formatPrice(day.cost)}</span>
              </header>
              {day.meals.length > 0 && (
                <div className="scoreboard">
                  {day.savings >= 1 && (
                    <p className="saving-line">Ušetříš {formatPrice(day.savings)} oproti běžným cenám.</p>
                  )}
                  {day.scale !== 1 && (
                    <p className="muted small scale-note">
                      Porce jsou upravené na {formatScale(day.scale)}× oproti receptu, aby seděly kalorie.
                    </p>
                  )}
                  <Meter label="Kalorie" unit="kcal" kind="range" value={day.kcal} target={targets.kcal} />
                  <Meter label="Bílkoviny" unit="g" kind="min" value={day.protein} target={targets.proteinMin} />
                  <Meter label="Tuk" unit="g" kind="max" value={day.fat} target={targets.fatMax} />
                </div>
              )}
              {day.meals.map((m) => (
                <div key={m.recipe.id} className="meal">
                  {m.slotLabel && <span className="slot-pill">{m.slotLabel}</span>}
                  <div className="meal-head">
                    <b>{m.recipe.name}</b>
                    <span className="num">{m.estimated ? '~' : ''}{formatPrice(m.cost)}</span>
                  </div>
                  {m.savings >= 1 && <span className="deal-tag">−{formatPrice(m.savings)} slevy</span>}
                  <div className="muted small">
                    {formatNumber(m.kcal)} kcal, {formatNumber(m.protein)} g bílkovin, {formatNumber(m.fat)} g tuku
                  </div>
                  <ul className="ingredients">
                    {m.ingredients.map((i) => (
                      <li key={i.generic}>
                        {formatNumber(i.grams)} g {i.offer?.name ?? i.generic}
                        {i.offer ? ` (${STORE_LABELS[i.offer.store]}, ${formatPrice(i.cost)})` : ` (odhad ~${formatPrice(i.cost)})`}
                        {i.discountPct !== undefined && <span className="deal-pct">−{i.discountPct} %</span>}
                      </li>
                    ))}
                  </ul>
                  <button className="secondary" onClick={() => addMeal(m)}>Přidat jídlo do seznamu</button>
                </div>
              ))}
              {day.meals.length > 0 && (
                <div className="day-actions">
                  <button className="primary" onClick={() => addDay(day)}>Celý den do seznamu</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
