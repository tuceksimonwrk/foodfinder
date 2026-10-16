import { normalizeText } from './text';
import type { ListItem } from './shopping';
import type { Ingredient, Offer, Recipe } from './types';

/** generic ingredient name -> last known price in Kč/kg */
export type PriceBook = Record<string, number>;

export interface PricedIngredient {
  generic: string;
  grams: number;
  pricePerKg: number;
  cost: number;
  offer?: Offer;
  estimated: boolean;
}

export interface PricedRecipe {
  recipe: Recipe;
  ingredients: PricedIngredient[];
  cost: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  estimated: boolean;
}

export interface PlanInput {
  kcal: number;
  proteinMin: number;
  fatMax: number;
  meals: number;
  days: number;
  excluded: string[];
  budget?: number;
}

export interface DayPlan {
  meals: PricedRecipe[];
  kcal: number;
  protein: number;
  fat: number;
  cost: number;
}

export interface PlanResult {
  days: DayPlan[];
  totalCost: number;
  satisfied: boolean;
  issues: string[];
}

const KCAL_TOLERANCE = 0.05;
const REPEAT_PENALTY = 1.2;
const SHORTLIST_SIZE = 12;
/** Upper bound on evaluated combinations per day so large recipe books cannot stall the UI. */
const MAX_COMBOS = 300_000;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word match that tolerates up to two inflection letters (banán / banány). */
function nameMatches(offerName: string, keyword: string): boolean {
  const kw = normalizeText(keyword);
  if (!kw) return false;
  return new RegExp(`(^|[^a-z])${escapeRegExp(kw)}[a-z]{0,2}($|[^a-z])`).test(normalizeText(offerName));
}

function priceIngredient(ing: Ingredient, offers: Offer[], priceBook: PriceBook): PricedIngredient {
  let best: Offer | undefined;
  for (const o of offers) {
    if (o.pricePerKg === undefined) continue;
    if (!ing.keywords.some((k) => nameMatches(o.name, k))) continue;
    if (!best || o.pricePerKg < best.pricePerKg!) best = o;
  }
  const pricePerKg = best?.pricePerKg ?? priceBook[ing.generic] ?? ing.fallbackPricePerKg;
  return {
    generic: ing.generic,
    grams: ing.grams,
    pricePerKg,
    cost: (ing.grams / 1000) * pricePerKg,
    offer: best,
    estimated: best === undefined,
  };
}

export function priceRecipe(recipe: Recipe, offers: Offer[], priceBook: PriceBook): PricedRecipe {
  const ingredients = recipe.ingredients.map((i) => priceIngredient(i, offers, priceBook));
  const sum = (pick: (i: Ingredient) => number) =>
    recipe.ingredients.reduce((acc, i) => acc + (i.grams / 100) * pick(i), 0);
  return {
    recipe,
    ingredients,
    cost: ingredients.reduce((acc, i) => acc + i.cost, 0),
    kcal: sum((i) => i.per100g.kcal),
    protein: sum((i) => i.per100g.protein),
    fat: sum((i) => i.per100g.fat),
    carbs: sum((i) => i.per100g.carbs),
    estimated: ingredients.some((i) => i.estimated),
  };
}

function isExcluded(recipe: Recipe, excluded: string[]): boolean {
  const terms = excluded.map(normalizeText).filter(Boolean);
  if (terms.length === 0) return false;
  return recipe.ingredients.some((i) =>
    [i.generic, ...i.keywords].some((name) => {
      const n = normalizeText(name);
      return terms.some((t) => n.includes(t));
    }),
  );
}

function combinations(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

interface Candidate {
  priced: PricedRecipe;
  adjustedCost: number;
}

interface Choice {
  meals: Candidate[];
  violation: number;
  cost: number;
}

function violation(kcal: number, protein: number, fat: number, input: PlanInput): number {
  const kcalOver = Math.max(0, Math.abs(kcal - input.kcal) - KCAL_TOLERANCE * input.kcal) / Math.max(input.kcal, 1);
  const proteinShort = Math.max(0, input.proteinMin - protein) / Math.max(input.proteinMin, 1);
  const fatOver = Math.max(0, fat - input.fatMax) / Math.max(input.fatMax, 1);
  return kcalOver + proteinShort + fatOver;
}

function better(a: Choice, b: Choice | null): boolean {
  if (!b) return true;
  if ((a.violation > 0) !== (b.violation > 0)) return a.violation === 0;
  if (a.violation > 0 && a.violation !== b.violation) return a.violation < b.violation;
  return a.cost < b.cost;
}

function search(pool: Candidate[], k: number, input: PlanInput): Choice | null {
  if (pool.length < k) return null;
  let best: Choice | null = null;
  const picked: number[] = [];

  const visit = (start: number, kcal: number, protein: number, fat: number, cost: number) => {
    if (picked.length === k) {
      const choice: Choice = { meals: [], violation: violation(kcal, protein, fat, input), cost };
      if (better(choice, best)) {
        choice.meals = picked.map((i) => pool[i]);
        best = choice;
      }
      return;
    }
    for (let i = start; i <= pool.length - (k - picked.length); i++) {
      const p = pool[i];
      picked.push(i);
      visit(i + 1, kcal + p.priced.kcal, protein + p.priced.protein, fat + p.priced.fat, cost + p.adjustedCost);
      picked.pop();
    }
  };
  visit(0, 0, 0, 0, 0);
  return best;
}

function capPool(pool: Candidate[], k: number): Candidate[] {
  let size = pool.length;
  while (size > k && combinations(size, k) > MAX_COMBOS) size--;
  return pool.slice(0, size);
}

function describeIssues(day: DayPlan, input: PlanInput): string[] {
  const issues: string[] = [];
  const kcal = Math.round(day.kcal);
  if (Math.abs(day.kcal - input.kcal) > KCAL_TOLERANCE * input.kcal) issues.push(`Kalorie ${kcal} z ${input.kcal}`);
  if (day.protein < input.proteinMin) issues.push(`Bílkoviny ${Math.round(day.protein)} g z ${input.proteinMin} g`);
  if (day.fat > input.fatMax) issues.push(`Tuk ${Math.round(day.fat)} g nad limit ${input.fatMax} g`);
  return issues;
}

export function generatePlan(
  input: PlanInput,
  recipes: Recipe[],
  offers: Offer[],
  priceBook: PriceBook,
): PlanResult {
  const fail = (message: string): PlanResult => ({ days: [], totalCost: 0, satisfied: false, issues: [message] });
  if (!(input.days >= 1)) return fail('Počet dní musí být alespoň 1');
  if (!(input.meals >= 1)) return fail('Počet jídel musí být alespoň 1');

  const priced = recipes
    .filter((r) => !isExcluded(r, input.excluded))
    .map((r) => priceRecipe(r, offers, priceBook));

  const days: DayPlan[] = [];
  const issues: string[] = [];
  let previous = new Set<string>();

  for (let d = 1; d <= input.days; d++) {
    const label = input.days > 1 ? `Den ${d}: ` : '';
    const candidates: Candidate[] = priced
      .map((p) => ({ priced: p, adjustedCost: p.cost * (previous.has(p.recipe.id) ? REPEAT_PENALTY : 1) }))
      .sort((a, b) => a.adjustedCost / Math.max(a.priced.protein, 1) - b.adjustedCost / Math.max(b.priced.protein, 1));

    if (candidates.length < input.meals) {
      issues.push(`${label}Nedostatek vhodných receptů (${candidates.length} z ${input.meals})`);
      days.push({ meals: [], kcal: 0, protein: 0, fat: 0, cost: 0 });
      previous = new Set();
      continue;
    }

    let choice = search(capPool(candidates.slice(0, SHORTLIST_SIZE), input.meals), input.meals, input);
    if (!choice || choice.violation > 0) {
      const wide = search(capPool(candidates, input.meals), input.meals, input);
      if (wide && better(wide, choice)) choice = wide;
    }

    const meals = choice ? choice.meals.map((c) => c.priced) : [];
    const day: DayPlan = {
      meals,
      kcal: meals.reduce((a, m) => a + m.kcal, 0),
      protein: meals.reduce((a, m) => a + m.protein, 0),
      fat: meals.reduce((a, m) => a + m.fat, 0),
      cost: meals.reduce((a, m) => a + m.cost, 0),
    };
    days.push(day);
    issues.push(...describeIssues(day, input).map((i) => label + i));
    previous = new Set(meals.map((m) => m.recipe.id));
  }

  const totalCost = days.reduce((a, d) => a + d.cost, 0);
  if (input.budget !== undefined && totalCost > input.budget) {
    issues.push(`Cena ${Math.round(totalCost)} Kč překračuje rozpočet ${input.budget} Kč`);
  }
  return { days, totalCost, satisfied: issues.length === 0, issues };
}

const randomId = () => Math.random().toString(36).slice(2);

export function ingredientsToListItems(p: PricedRecipe, makeId: () => string = randomId): ListItem[] {
  return p.ingredients.map((i) => ({
    id: makeId(),
    label: i.offer?.name ?? i.generic,
    grams: i.grams,
    store: i.offer?.store,
    offerId: i.offer?.id,
    pricePerKg: i.pricePerKg,
    estimated: i.estimated,
    checked: false,
  }));
}

/** Remembers the latest offer price of every ingredient that currently has a matching offer. */
export function updatePriceBook(book: PriceBook, recipes: Recipe[], offers: Offer[]): PriceBook {
  const next = { ...book };
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const priced = priceIngredient(ing, offers, {});
      if (!priced.estimated) next[ing.generic] = priced.pricePerKg;
    }
  }
  return next;
}
