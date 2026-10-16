import { matchesProduct } from './product';
import { normalizeText } from './text';
import type { ListItem } from './shopping';
import type { Ingredient, Offer, Recipe } from './types';

/** generic ingredient name -> last known price in Kč/kg */
export type PriceBook = Record<string, number>;

/** A course of the day. Recipes carry these as tags. */
export type MealSlot = 'snidane' | 'obed' | 'vecere' | 'svacina';

/** How meals are picked: the lowest price, or the biggest saving against regular prices. */
export type PlanMode = 'cheapest' | 'discount';

export interface PricedIngredient {
  generic: string;
  grams: number;
  pricePerKg: number;
  cost: number;
  offer?: Offer;
  estimated: boolean;
  /** Discount of the matched offer in percent (undefined without a discount). */
  discountPct?: number;
  /** Kč saved against the regular price of this amount. */
  saving: number;
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
  /** Portion factor applied to the recipe's amounts (1 = the recipe as written). */
  scale: number;
  /** Kč saved against regular prices by the discounted ingredients of this meal. */
  savings: number;
  /** Generic name of the ingredient that brings the most protein. */
  mainProtein: string;
  slot?: MealSlot;
  slotLabel?: string;
}

export interface PlanInput {
  kcal: number;
  proteinMin: number;
  fatMax: number;
  meals: number;
  days: number;
  excluded: string[];
  budget?: number;
  /** Default: cheapest. */
  mode?: PlanMode;
}

export interface DayPlan {
  meals: PricedRecipe[];
  kcal: number;
  protein: number;
  fat: number;
  cost: number;
  savings: number;
  /** One portion factor for the whole day, chosen so the calories land on the target. */
  scale: number;
}

export interface PlanResult {
  days: DayPlan[];
  totalCost: number;
  totalSavings: number;
  satisfied: boolean;
  issues: string[];
}

export const SCALE_MIN = 0.7;
export const SCALE_MAX = 1.5;
const SCALE_STEP = 0.05;
const KCAL_TOLERANCE = 0.05;
/** Upper bounds on evaluated combinations per day so large recipe books cannot stall the UI. */
const MAX_COMBOS = 200_000;
const MAX_COMBOS_WIDE = 400_000;
/** In discount mode one Kč saved outweighs this many Kč of price when comparing whole days. */
const DEAL_WEIGHT = 3;

// ---------- courses ----------

const SLOTS_UP_TO_SIX: Record<number, MealSlot[]> = {
  1: ['obed'],
  2: ['snidane', 'vecere'],
  3: ['snidane', 'obed', 'vecere'],
  4: ['snidane', 'obed', 'svacina', 'vecere'],
  5: ['snidane', 'svacina', 'obed', 'svacina', 'vecere'],
  6: ['snidane', 'svacina', 'obed', 'svacina', 'vecere', 'svacina'],
};

/** Courses of a day in time order: breakfast, lunch and dinner first, further meals are snacks. */
export function mealSlots(count: number): MealSlot[] {
  const n = Math.floor(count);
  if (!(n >= 1)) return [];
  if (n <= 6) return [...SLOTS_UP_TO_SIX[n]];
  return [...SLOTS_UP_TO_SIX[6], ...Array<MealSlot>(n - 6).fill('svacina')];
}

export function slotLabels(slots: MealSlot[]): string[] {
  let lunchSeen = false;
  let dinnerSeen = false;
  return slots.map((slot) => {
    if (slot === 'snidane') return 'Snídaně';
    if (slot === 'obed') {
      lunchSeen = true;
      return 'Oběd';
    }
    if (slot === 'vecere') {
      dinnerSeen = true;
      return 'Večeře';
    }
    return !lunchSeen ? 'Dopolední svačina' : !dinnerSeen ? 'Odpolední svačina' : 'Pozdní svačina';
  });
}

/** Share of the day's calories a course should bring (normalized over the day's courses). */
const SLOT_WEIGHT: Record<MealSlot, number> = { snidane: 0.25, obed: 0.35, vecere: 0.3, svacina: 0.1 };

const SLOT_NOUN: Record<MealSlot, string> = { snidane: 'snídaně', obed: 'oběd', vecere: 'večeři', svacina: 'svačiny' };

// ---------- pricing ----------

const roundGrams = (g: number) => Math.max(5, Math.round(g / 5) * 5);

function priceIngredient(ing: Ingredient, offers: Offer[], priceBook: PriceBook, scale = 1): PricedIngredient {
  let best: Offer | undefined;
  for (const o of offers) {
    if (o.pricePerKg === undefined) continue;
    if (!ing.keywords.some((k) => matchesProduct(o.name, k))) continue;
    if (!best || o.pricePerKg < best.pricePerKg!) best = o;
  }
  const pricePerKg = best?.pricePerKg ?? priceBook[ing.generic] ?? ing.fallbackPricePerKg;
  const grams = scale === 1 ? ing.grams : roundGrams(ing.grams * scale);
  const cost = (grams / 1000) * pricePerKg;
  const pct = best?.discountPct ?? 0;
  const discounted = pct > 0 && pct < 100;
  return {
    generic: ing.generic,
    grams,
    pricePerKg,
    cost,
    offer: best,
    estimated: best === undefined,
    discountPct: discounted ? pct : undefined,
    saving: discounted ? cost / (1 - pct / 100) - cost : 0,
  };
}

function mainProteinOf(recipe: Recipe): string {
  let best = recipe.ingredients[0];
  for (const i of recipe.ingredients) {
    if (i.grams * i.per100g.protein > best.grams * best.per100g.protein) best = i;
  }
  return best?.generic ?? '';
}

/** Prices a recipe at a portion factor; grams of scaled portions are rounded to 5 g. */
export function priceRecipe(recipe: Recipe, offers: Offer[], priceBook: PriceBook, scale = 1): PricedRecipe {
  const ingredients = recipe.ingredients.map((i) => priceIngredient(i, offers, priceBook, scale));
  const sum = (pick: (i: Ingredient) => number) =>
    recipe.ingredients.reduce((acc, i, idx) => acc + (ingredients[idx].grams / 100) * pick(i), 0);
  return {
    recipe,
    ingredients,
    cost: ingredients.reduce((acc, i) => acc + i.cost, 0),
    savings: ingredients.reduce((acc, i) => acc + i.saving, 0),
    kcal: sum((i) => i.per100g.kcal),
    protein: sum((i) => i.per100g.protein),
    fat: sum((i) => i.per100g.fat),
    carbs: sum((i) => i.per100g.carbs),
    estimated: ingredients.some((i) => i.estimated),
    scale,
    mainProtein: mainProteinOf(recipe),
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

// ---------- search ----------

interface Candidate {
  priced: PricedRecipe;
  /** Penalty for recipes already served this week or yesterday. */
  repeat: number;
}

interface Choice {
  meals: Candidate[];
  scale: number;
  violation: number;
  score: number;
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
  return a.score < b.score;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const comboLimit = (slots: number, budget: number, cap: number) =>
  clamp(Math.floor(Math.pow(budget, 1 / Math.max(slots, 1))), 3, cap);

/**
 * Candidates for one course, best first: calories close to the course's share, little repeated lately,
 * and a nudge towards what the mode asks for (low price per kcal, or a large share of discounted ingredients).
 */
function shortlist(pool: Candidate[], targetKcal: number, size: number, mode: PlanMode): Candidate[] {
  const fit = (c: Candidate) => Math.abs(Math.log(Math.max(c.priced.kcal, 50) / Math.max(targetKcal, 50)));
  const perKcal = (c: Candidate) => c.priced.cost / Math.max(c.priced.kcal, 50);
  const sorted = pool.map(perKcal).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  const dealShare = (c: Candidate) => c.priced.savings / (c.priced.cost + c.priced.savings || 1);
  const lean = (c: Candidate) =>
    mode === 'discount' ? -1.2 * dealShare(c) : 0.4 * Math.log(Math.max(perKcal(c), 1e-6) / median);
  return [...pool].sort((a, b) => fit(a) + a.repeat + lean(a) - (fit(b) + b.repeat + lean(b))).slice(0, size);
}

function search(lists: Candidate[][], slots: MealSlot[], shares: number[], input: PlanInput): Choice | null {
  const dealWeight = input.mode === 'discount' ? DEAL_WEIGHT : 0;
  const n = lists.length;
  const picked: Candidate[] = [];
  let best: Choice | null = null;

  const visit = (i: number, kcal: number, protein: number, fat: number, cost: number, savings: number) => {
    if (i === n) {
      const scale = clamp(Math.round(input.kcal / kcal / SCALE_STEP) * SCALE_STEP, SCALE_MIN, SCALE_MAX);
      const v = violation(kcal * scale, protein * scale, fat * scale, input);

      let shape = 0;
      let repeat = 0;
      for (let k = 0; k < n; k++) {
        const want = shares[k] * input.kcal;
        shape += Math.pow((picked[k].priced.kcal * scale - want) / want, 2);
        repeat += picked[k].repeat;
      }
      shape /= n;

      const proteins = picked.map((c) => c.priced.mainProtein);
      const duplicates = n - new Set(proteins).size;
      const lunch = slots.indexOf('obed');
      const dinner = slots.indexOf('vecere');
      const sameMain = lunch >= 0 && dinner >= 0 && proteins[lunch] === proteins[dinner] ? 1 : 0;

      const score =
        cost * scale * (1 + 0.5 * Math.abs(Math.log(scale)) + 0.4 * shape + repeat + 0.1 * duplicates + 0.5 * sameMain) -
        dealWeight * savings * scale;
      const choice: Choice = { meals: [], scale, violation: v, score };
      if (better(choice, best)) {
        choice.meals = [...picked];
        best = choice;
      }
      return;
    }
    for (const c of lists[i]) {
      if (picked.some((p) => p.priced.recipe.id === c.priced.recipe.id)) continue;
      picked.push(c);
      visit(i + 1, kcal + c.priced.kcal, protein + c.priced.protein, fat + c.priced.fat, cost + c.priced.cost, savings + c.priced.savings);
      picked.pop();
    }
  };
  visit(0, 0, 0, 0, 0, 0);
  return best;
}

interface DayResult {
  meals: PricedRecipe[];
  scale: number;
}

function planDay(
  slots: MealSlot[],
  pool: PricedRecipe[],
  input: PlanInput,
  uses: Map<string, number>,
  yesterday: Set<string>,
  offers: Offer[],
  priceBook: PriceBook,
): DayResult | null {
  const weights = slots.map((s) => SLOT_WEIGHT[s]);
  const total = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => w / total);

  const toCandidate = (p: PricedRecipe): Candidate => ({
    priced: p,
    repeat: 0.25 * (uses.get(p.recipe.id) ?? 0) + (yesterday.has(p.recipe.id) ? 0.25 : 0),
  });
  const all = pool.map(toCandidate);
  const tagged = (kind: MealSlot) => all.filter((c) => c.priced.recipe.tags.includes(kind));

  const run = (size: number, restrictToTags: boolean): Choice | null => {
    const lists = slots.map((kind, i) => {
      const own = restrictToTags ? tagged(kind) : [];
      return shortlist(own.length ? own : all, shares[i] * input.kcal, size, input.mode ?? 'cheapest');
    });
    return search(lists, slots, shares, input);
  };

  const narrow = comboLimit(slots.length, MAX_COMBOS, 12);
  let choice = run(narrow, true);
  if (!choice || choice.violation > 0) {
    const wide = run(comboLimit(slots.length, MAX_COMBOS_WIDE, 20), true);
    if (wide && better(wide, choice)) choice = wide;
  }
  // Courses without enough distinct tagged recipes: let any recipe fill in.
  if (!choice) choice = run(comboLimit(slots.length, MAX_COMBOS, 12), false);
  if (!choice) return null;

  const labels = slotLabels(slots);
  const meals = choice.meals.map((c, i) => ({
    ...priceRecipe(c.priced.recipe, offers, priceBook, choice!.scale),
    slot: slots[i],
    slotLabel: labels[i],
  }));
  return { meals, scale: choice.scale };
}

function describeIssues(day: DayPlan, input: PlanInput): string[] {
  const issues: string[] = [];
  const kcal = Math.round(day.kcal);
  if (Math.abs(day.kcal - input.kcal) > KCAL_TOLERANCE * input.kcal) {
    let text = `Kalorie ${kcal} z ${input.kcal}`;
    if (day.kcal < input.kcal && day.scale >= SCALE_MAX) text += ', ani největší porce na cíl nestačí, přidej další jídlo';
    if (day.kcal > input.kcal && day.scale <= SCALE_MIN) text += ', ani nejmenší porce nejsou dost malé, zkus méně jídel';
    issues.push(text);
  }
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
  const fail = (message: string): PlanResult => ({ days: [], totalCost: 0, totalSavings: 0, satisfied: false, issues: [message] });
  if (!(input.days >= 1)) return fail('Počet dní musí být alespoň 1');
  const slots = mealSlots(input.meals);
  if (slots.length === 0) return fail('Počet jídel musí být alespoň 1');

  const pool = recipes.filter((r) => !isExcluded(r, input.excluded)).map((r) => priceRecipe(r, offers, priceBook));
  const emptyDay: DayPlan = { meals: [], kcal: 0, protein: 0, fat: 0, cost: 0, savings: 0, scale: 1 };

  const issues: string[] = [];
  for (const kind of new Set(slots)) {
    if (pool.length >= slots.length && !pool.some((p) => p.recipe.tags.includes(kind))) {
      issues.push(`Chybí recepty pro ${SLOT_NOUN[kind]}, použity jiné recepty`);
    }
  }

  const days: DayPlan[] = [];
  const uses = new Map<string, number>();
  let yesterday = new Set<string>();

  for (let d = 1; d <= input.days; d++) {
    const label = input.days > 1 ? `Den ${d}: ` : '';
    const result = pool.length >= slots.length ? planDay(slots, pool, input, uses, yesterday, offers, priceBook) : null;

    if (!result) {
      issues.push(`${label}Nedostatek vhodných receptů (${pool.length} z ${slots.length})`);
      days.push({ ...emptyDay });
      yesterday = new Set();
      continue;
    }

    const day: DayPlan = {
      meals: result.meals,
      kcal: result.meals.reduce((a, m) => a + m.kcal, 0),
      protein: result.meals.reduce((a, m) => a + m.protein, 0),
      fat: result.meals.reduce((a, m) => a + m.fat, 0),
      cost: result.meals.reduce((a, m) => a + m.cost, 0),
      savings: result.meals.reduce((a, m) => a + m.savings, 0),
      scale: result.scale,
    };
    days.push(day);
    issues.push(...describeIssues(day, input).map((i) => label + i));
    yesterday = new Set(result.meals.map((m) => m.recipe.id));
    for (const m of result.meals) uses.set(m.recipe.id, (uses.get(m.recipe.id) ?? 0) + 1);
  }

  const totalCost = days.reduce((a, d) => a + d.cost, 0);
  const totalSavings = days.reduce((a, d) => a + d.savings, 0);
  if (input.budget !== undefined && totalCost > input.budget) {
    issues.push(`Cena ${Math.round(totalCost)} Kč překračuje rozpočet ${input.budget} Kč`);
  }
  return { days, totalCost, totalSavings, satisfied: issues.length === 0, issues };
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
