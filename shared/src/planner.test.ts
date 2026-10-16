import { describe, it, expect } from 'vitest';
import type { Ingredient, Offer, Recipe } from './types';
import {
  SCALE_MAX, SCALE_MIN, generatePlan, ingredientsToListItems, mealSlots, priceRecipe, slotLabels, updatePriceBook,
  type DayPlan, type PlanInput,
} from './planner';

// ---------- fixtures ----------
const per = (kcal: number, protein: number, fat: number, carbs: number) => ({ kcal, protein, fat, carbs });
const FOODS: Record<string, { keywords: string[]; per100g: ReturnType<typeof per>; price: number }> = {
  'kuřecí prsa': { keywords: ['kuřecí prsa', 'kuřecí prsní'], per100g: per(110, 23, 1.2, 0), price: 160 },
  'krůtí prsa': { keywords: ['krůtí prsa'], per100g: per(105, 24, 1, 0), price: 170 },
  'mleté hovězí': { keywords: ['mleté hovězí'], per100g: per(190, 20, 12, 0), price: 220 },
  tofu: { keywords: ['tofu'], per100g: per(120, 13, 7, 2), price: 150 },
  tuňák: { keywords: ['tuňák'], per100g: per(110, 25, 1, 0), price: 400 },
  čočka: { keywords: ['čočka'], per100g: per(350, 25, 1.5, 50), price: 80 },
  vejce: { keywords: ['vejce'], per100g: per(143, 12.5, 10, 0.7), price: 70 },
  rýže: { keywords: ['rýže'], per100g: per(350, 7, 0.8, 78), price: 50 },
  těstoviny: { keywords: ['těstoviny'], per100g: per(350, 12, 1.5, 72), price: 50 },
  brambory: { keywords: ['brambory'], per100g: per(77, 2, 0.1, 17), price: 25 },
  zelenina: { keywords: ['zelenina'], per100g: per(30, 2, 0.3, 5), price: 60 },
  vločky: { keywords: ['ovesné vločky'], per100g: per(370, 13, 7, 60), price: 40 },
  tvaroh: { keywords: ['tvaroh'], per100g: per(70, 13, 0.5, 3.5), price: 80 },
  skyr: { keywords: ['skyr'], per100g: per(63, 11, 0.2, 4), price: 70 },
  cottage: { keywords: ['cottage'], per100g: per(98, 11, 4.3, 3.4), price: 130 },
  banán: { keywords: ['banán'], per100g: per(90, 1.1, 0.3, 21), price: 40 },
  jablko: { keywords: ['jablko'], per100g: per(52, 0.3, 0.2, 14), price: 40 },
  chléb: { keywords: ['chléb'], per100g: per(240, 9, 2.5, 45), price: 50 },
  arašídy: { keywords: ['arašídové máslo'], per100g: per(600, 25, 50, 10), price: 250 },
};

const ing = (generic: string, grams: number): Ingredient => {
  const f = FOODS[generic];
  if (!f) throw new Error('unknown food ' + generic);
  return { generic, keywords: f.keywords, grams, per100g: f.per100g, fallbackPricePerKg: f.price };
};
const recipe = (id: string, tags: string[], items: [string, number][]): Recipe => ({
  id, name: id, steps: [], tags, ingredients: items.map(([g, grams]) => ing(g, grams)),
});

const S = 'snidane', O = 'obed', V = 'vecere', C = 'svacina';
const LIBRARY: Recipe[] = [
  recipe('M1', [O, V], [['kuřecí prsa', 200], ['rýže', 90], ['zelenina', 200]]),
  recipe('M2', [O, V], [['krůtí prsa', 180], ['těstoviny', 90], ['zelenina', 150]]),
  recipe('M3', [O, V], [['mleté hovězí', 150], ['brambory', 300], ['zelenina', 150]]),
  recipe('M4', [O, V], [['tofu', 200], ['rýže', 90], ['zelenina', 200]]),
  recipe('M5', [O, V], [['čočka', 100], ['vejce', 120], ['zelenina', 100]]),
  recipe('M6', [O, V], [['tuňák', 140], ['těstoviny', 80], ['zelenina', 150]]),
  recipe('M7', [O, V], [['kuřecí prsa', 220], ['brambory', 300], ['zelenina', 150]]),
  recipe('M8', [O, V], [['mleté hovězí', 130], ['rýže', 80], ['zelenina', 200]]),
  recipe('B1', [S], [['vločky', 80], ['tvaroh', 200], ['banán', 100]]),
  recipe('B2', [S], [['skyr', 300], ['vločky', 60], ['jablko', 120]]),
  recipe('B3', [S], [['vejce', 180], ['chléb', 100], ['zelenina', 80]]),
  recipe('B4', [S], [['tvaroh', 250], ['banán', 100], ['arašídy', 20]]),
  recipe('B5', [S], [['vločky', 70], ['vejce', 120], ['banán', 100]]),
  recipe('C1', [C], [['skyr', 250], ['banán', 120]]),
  recipe('C2', [C], [['tvaroh', 250], ['jablko', 150]]),
  recipe('C3', [C], [['cottage', 200], ['chléb', 50]]),
  recipe('C4', [C], [['tuňák', 120], ['chléb', 80]]),
  recipe('C5', [C], [['vejce', 150], ['chléb', 60]]),
  recipe('C6', [C], [['skyr', 200], ['jablko', 150]]),
];

const offer = (id: string, name: string, pricePerKg: number): Offer => ({
  id, name, store: 'lidl', price: 50, discountPct: 0, pricePerKg, validFrom: '2026-10-12',
  validTo: '2026-10-20', category: 'maso', sourceUrl: 'u',
});
const OFFERS = [offer('o1', 'Kuřecí prsní řízky', 150), offer('o2', 'Kuřecí prsa mražená', 190)];

const INPUT: PlanInput = { kcal: 2200, proteinMin: 140, fatMax: 80, meals: 4, days: 1, excluded: [] };
const plan = (over: Partial<PlanInput> = {}, recipes = LIBRARY, offers: Offer[] = []) =>
  generatePlan({ ...INPUT, ...over }, recipes, offers, {});

const R1 = recipe('R1', [O], [['kuřecí prsa', 200], ['rýže', 100]]); // 570 kcal at scale 1

/** Offers with a discount: expensive foods (tuna, beef) are on sale, cheap staples are not. */
const deal = (id: string, name: string, pricePerKg: number, discountPct: number): Offer => ({
  ...offer(id, name, pricePerKg), discountPct,
});
const DEALS: Offer[] = [
  deal('d1', 'Tuňák ve vlastní šťávě', 180, 55),
  deal('d2', 'Mleté hovězí', 150, 40),
  deal('d3', 'Skyr natural', 60, 30),
  deal('d4', 'Krůtí prsa', 140, 35),
  deal('d5', 'Arašídové máslo', 120, 45),
];

// ---------- slots ----------
describe('mealSlots', () => {
  it('maps the meal count to courses in time order', () => {
    expect(mealSlots(1)).toEqual(['obed']);
    expect(mealSlots(2)).toEqual(['snidane', 'vecere']);
    expect(mealSlots(3)).toEqual(['snidane', 'obed', 'vecere']);
    expect(mealSlots(4)).toEqual(['snidane', 'obed', 'svacina', 'vecere']);
    expect(mealSlots(5)).toEqual(['snidane', 'svacina', 'obed', 'svacina', 'vecere']);
    expect(mealSlots(6)).toEqual(['snidane', 'svacina', 'obed', 'svacina', 'vecere', 'svacina']);
  });
  it('adds only snacks beyond six meals', () => {
    const slots = mealSlots(8);
    expect(slots).toHaveLength(8);
    expect(slots.filter((s) => s === 'svacina')).toHaveLength(5);
  });
  it('is empty for nonsensical counts', () => {
    expect(mealSlots(0)).toEqual([]);
    expect(mealSlots(-2)).toEqual([]);
  });
});

describe('slotLabels', () => {
  it('names snacks by their place in the day', () => {
    expect(slotLabels(mealSlots(6))).toEqual([
      'Snídaně', 'Dopolední svačina', 'Oběd', 'Odpolední svačina', 'Večeře', 'Pozdní svačina',
    ]);
  });
  it('names a single afternoon snack in four meals', () =>
    expect(slotLabels(mealSlots(4))).toEqual(['Snídaně', 'Oběd', 'Odpolední svačina', 'Večeře']));
});

// ---------- pricing ----------
describe('priceRecipe', () => {
  const priced = priceRecipe(R1, OFFERS, {});

  it('picks the cheapest matching offer', () => {
    const c = priced.ingredients[0];
    expect(c.offer?.id).toBe('o1');
    expect(c.pricePerKg).toBe(150);
    expect(c.cost).toBeCloseTo(30);
    expect(c.estimated).toBe(false);
  });
  it('falls back to the recipe price and marks it as an estimate', () => {
    expect(priced.ingredients[1]).toMatchObject({ pricePerKg: 50, estimated: true });
    expect(priced.estimated).toBe(true);
  });
  it('prefers the last known price over the fallback', () =>
    expect(priceRecipe(R1, OFFERS, { rýže: 42 }).ingredients[1].pricePerKg).toBe(42));
  it('sums cost and macros at the normal portion', () => {
    expect(priced.scale).toBe(1);
    expect(priced.cost).toBeCloseTo(35);
    expect(priced.kcal).toBeCloseTo(570);
    expect(priced.protein).toBeCloseTo(53);
    expect(priced.fat).toBeCloseTo(3.2);
  });
  it('does not match an offer for a different product with a similar prefix', () => {
    expect(priceRecipe(R1, [offer('x', 'Rýžové chlebíčky', 10)], {}).ingredients[1].offer).toBeUndefined();
  });
  it('does not match processed products (spread, salad, in aspic)', () => {
    const tuna = recipe('T', [C], [['tuňák', 100], ['chléb', 50]]);
    const offers = [offer('p', 'Tuňáková pomazánka', 30), offer('s', 'Salát s tuňákem', 40)];
    expect(priceRecipe(tuna, offers, {}).ingredients[0].offer).toBeUndefined();
  });

  it('scales grams, cost and macros with the portion', () => {
    const big = priceRecipe(R1, OFFERS, {}, 1.3);
    expect(big.scale).toBe(1.3);
    expect(big.ingredients.map((i) => i.grams)).toEqual([260, 130]);
    expect(big.cost).toBeCloseTo(45.5);
    expect(big.kcal).toBeCloseTo(741);
    expect(big.protein).toBeCloseTo(68.9);
  });
  it('rounds scaled grams to 5 g like a kitchen scale', () =>
    expect(priceRecipe(R1, OFFERS, {}, 1.07).ingredients.map((i) => i.grams)).toEqual([215, 105]));
  it('finds the main protein source of a recipe', () => {
    expect(priced.mainProtein).toBe('kuřecí prsa');
    expect(priceRecipe(LIBRARY.find((r) => r.id === 'M5')!, [], {}).mainProtein).toBe('čočka');
  });
});

// ---------- generator ----------
describe('savings', () => {
  const tuna = recipe('T', [C], [['tuňák', 140], ['chléb', 50]]);

  it('computes the saving of a discounted ingredient against its regular price', () => {
    const priced = priceRecipe(tuna, [deal('d1', 'Tuňák ve vlastní šťávě', 180, 55)], {});
    const ing = priced.ingredients[0];
    expect(ing.cost).toBeCloseTo(25.2);
    expect(ing.discountPct).toBe(55);
    expect(ing.saving).toBeCloseTo(25.2 / 0.45 - 25.2); // regular price minus what you pay
    expect(priced.savings).toBeCloseTo(ing.saving);
  });

  it('has no saving for ingredients without a discount or without an offer', () => {
    const noDeal = priceRecipe(tuna, [offer('x', 'Tuňák v oleji', 180)], {});
    expect(noDeal.savings).toBe(0);
    const estimate = priceRecipe(tuna, [], {});
    expect(estimate.savings).toBe(0);
    expect(estimate.ingredients.every((i) => i.saving === 0)).toBe(true);
  });

  it('scales the saving with the portion', () => {
    const one = priceRecipe(tuna, [deal('d1', 'Tuňák ve vlastní šťávě', 180, 55)], {}).savings;
    const big = priceRecipe(tuna, [deal('d1', 'Tuňák ve vlastní šťávě', 180, 55)], {}, 1.5).savings;
    expect(big / one).toBeCloseTo(1.5, 1);
  });
});

describe('generatePlan: choosing by price or by discounts', () => {
  const run = (mode?: 'cheapest' | 'discount', over: Partial<PlanInput> = {}) =>
    generatePlan({ ...INPUT, proteinMin: 1, fatMax: 500, mode, ...over }, LIBRARY, DEALS, {});

  it('treats the cheapest mode as the default', () => {
    const ids = (r: ReturnType<typeof run>) => r.days.map((d) => d.meals.map((m) => m.recipe.id));
    expect(ids(run(undefined))).toEqual(ids(run('cheapest')));
  });

  it('saves more money on sale items when told to follow discounts', () => {
    const cheap = run('cheapest').days[0];
    const sale = run('discount').days[0];
    expect(sale.savings).toBeGreaterThan(cheap.savings);
  });

  it('pays less overall when told to be cheapest', () => {
    const cheap = run('cheapest').days[0];
    const sale = run('discount').days[0];
    expect(cheap.cost).toBeLessThanOrEqual(sale.cost);
  });

  it('keeps the targets, courses and variety in discount mode', () => {
    const r = run('discount', { days: 7, kcal: 2400 });
    for (const d of r.days) {
      expect(Math.abs(d.kcal / 2400 - 1)).toBeLessThanOrEqual(0.05);
      expect(d.meals.map((m) => m.slot)).toEqual(['snidane', 'obed', 'svacina', 'vecere']);
    }
    const uses: Record<string, number> = {};
    r.days.forEach((d) => d.meals.forEach((m) => (uses[m.recipe.id] = (uses[m.recipe.id] ?? 0) + 1)));
    expect(Object.keys(uses).length).toBeGreaterThanOrEqual(12);
    expect(Math.max(...Object.values(uses))).toBeLessThanOrEqual(3);
  });

  it('falls back to a sensible plan when nothing is on sale', () => {
    const r = generatePlan({ ...INPUT, proteinMin: 1, fatMax: 500, mode: 'discount' }, LIBRARY, [], {});
    expect(r.days[0].meals).toHaveLength(4);
    expect(r.days[0].savings).toBe(0);
    expect(r.satisfied).toBe(true);
  });

  it('adds up the savings of meals, days and the whole plan', () => {
    const r = run('discount', { days: 3 });
    for (const d of r.days) expect(d.savings).toBeCloseTo(d.meals.reduce((a, m) => a + m.savings, 0));
    expect(r.totalSavings).toBeCloseTo(r.days.reduce((a, d) => a + d.savings, 0));
  });
});

describe('generatePlan: courses', () => {
  it('builds a day from breakfast, lunch, snack and dinner in time order', () => {
    const day = plan().days[0];
    expect(day.meals.map((m) => m.slot)).toEqual(['snidane', 'obed', 'svacina', 'vecere']);
    expect(day.meals.map((m) => m.slotLabel)).toEqual(['Snídaně', 'Oběd', 'Odpolední svačina', 'Večeře']);
  });

  it('serves every course from recipes tagged for it', () => {
    for (const meals of [3, 4, 5, 6]) {
      const day = plan({ meals }).days[0];
      for (const m of day.meals) expect(m.recipe.tags, `${meals} meals: ${m.recipe.id}`).toContain(m.slot);
    }
  });

  it('never repeats a recipe within one day', () => {
    for (const meals of [3, 4, 5, 6]) {
      const ids = plan({ meals }).days[0].meals.map((m) => m.recipe.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('does not serve lunch and dinner built on the same main protein when alternatives exist', () => {
    const r = plan({ days: 7 });
    for (const d of r.days) {
      const lunch = d.meals.find((m) => m.slot === 'obed')!;
      const dinner = d.meals.find((m) => m.slot === 'vecere')!;
      expect(lunch.mainProtein).not.toBe(dinner.mainProtein);
    }
  });
});

describe('generatePlan: hitting the calorie target', () => {
  it('lands within ±5 % of the target by adjusting the portions', () => {
    for (const kcal of [1600, 1800, 2200, 2600, 2900]) {
      const r = plan({ kcal, proteinMin: 1, fatMax: 500 });
      const day = r.days[0];
      expect(Math.abs(day.kcal / kcal - 1), `${kcal} kcal -> ${Math.round(day.kcal)}`).toBeLessThanOrEqual(0.05);
      expect(r.satisfied).toBe(true);
    }
  });

  it('keeps the portion factor within bounds and applies it to every meal', () => {
    const day = plan({ kcal: 2900, proteinMin: 1, fatMax: 500 }).days[0];
    expect(day.scale).toBeGreaterThanOrEqual(SCALE_MIN);
    expect(day.scale).toBeLessThanOrEqual(SCALE_MAX);
    expect(day.meals.every((m) => m.scale === day.scale)).toBe(true);
  });

  it('serves bigger portions for a bigger target', () => {
    const small = plan({ kcal: 1700, proteinMin: 1, fatMax: 500 }).days[0];
    const large = plan({ kcal: 2800, proteinMin: 1, fatMax: 500 }).days[0];
    expect(large.scale).toBeGreaterThan(small.scale);
  });

  it('meets protein and fat limits too when they are reachable', () => {
    const r = plan({ kcal: 2200, proteinMin: 130, fatMax: 80 });
    expect(r.satisfied).toBe(true);
    expect(r.days[0].protein).toBeGreaterThanOrEqual(130);
    expect(r.days[0].fat).toBeLessThanOrEqual(80);
  });

  it('says so, and suggests more meals, when even the largest portions fall short', () => {
    const r = plan({ kcal: 9000, proteinMin: 1, fatMax: 900 });
    expect(r.satisfied).toBe(false);
    expect(r.days[0].scale).toBe(SCALE_MAX);
    const text = r.issues.join(' ');
    expect(text).toContain('Kalorie');
    expect(text).toContain('jídlo');
  });

  it('says so when even the smallest portions overshoot', () => {
    const r = plan({ kcal: 400, proteinMin: 1, fatMax: 900 });
    expect(r.satisfied).toBe(false);
    expect(r.days[0].scale).toBe(SCALE_MIN);
    expect(r.issues.join(' ')).toContain('Kalorie');
  });

  it('keeps the day total consistent with the meals it lists', () => {
    const day = plan({ kcal: 2500, proteinMin: 1, fatMax: 500 }).days[0];
    expect(day.kcal).toBeCloseTo(day.meals.reduce((a, m) => a + m.kcal, 0));
    expect(day.cost).toBeCloseTo(day.meals.reduce((a, m) => a + m.cost, 0));
  });

  it('gives snacks a smaller share of the calories than main meals', () => {
    const day = plan({ kcal: 2400, proteinMin: 1, fatMax: 500, meals: 5 }).days[0];
    const snackMax = Math.max(...day.meals.filter((m) => m.slot === 'svacina').map((m) => m.kcal));
    const mainMin = Math.min(...day.meals.filter((m) => m.slot !== 'svacina').map((m) => m.kcal));
    expect(snackMax).toBeLessThan(mainMin);
  });
});

describe('generatePlan: variety', () => {
  const week = () => plan({ days: 7, proteinMin: 1, fatMax: 500 });
  const idsOf = (d: DayPlan) => d.meals.map((m) => m.recipe.id);

  it('plans seven different days', () => {
    const r = week();
    expect(r.days).toHaveLength(7);
    const signatures = r.days.map((d) => idsOf(d).join('+'));
    expect(new Set(signatures).size).toBe(7);
  });

  it('changes most of the menu from one day to the next', () => {
    const r = week();
    for (let i = 1; i < r.days.length; i++) {
      const prev = new Set(idsOf(r.days[i - 1]));
      const shared = idsOf(r.days[i]).filter((id) => prev.has(id)).length;
      expect(shared, `day ${i} vs ${i + 1}`).toBeLessThanOrEqual(2);
    }
  });

  it('spreads recipes across the week instead of repeating favourites', () => {
    const r = week();
    const uses: Record<string, number> = {};
    r.days.forEach((d) => idsOf(d).forEach((id) => (uses[id] = (uses[id] ?? 0) + 1)));
    expect(Object.keys(uses).length).toBeGreaterThanOrEqual(14);
    expect(Math.max(...Object.values(uses))).toBeLessThanOrEqual(3);
  });

  it('totals the week', () => {
    const r = week();
    expect(r.totalCost).toBeCloseTo(r.days.reduce((a, d) => a + d.cost, 0));
  });
});

describe('generatePlan: constraints and failure modes', () => {
  it('never uses recipes with excluded ingredients, regardless of diacritics and case', () => {
    for (const excluded of [['kuřecí'], ['TVAROH'], ['ryze', 'vejce']]) {
      const r = plan({ days: 3, excluded, proteinMin: 1, fatMax: 500 });
      const terms = excluded.map((e) => e.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''));
      for (const m of r.days.flatMap((d) => d.meals)) {
        const names = m.recipe.ingredients.flatMap((i) => [i.generic, ...i.keywords]).map((n) => n.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''));
        for (const t of terms) expect(names.some((n) => n.includes(t)), `${m.recipe.id} contains ${t}`).toBe(false);
      }
    }
  });

  it('copes with every ingredient excluded', () => {
    const r = plan({ excluded: ['kuřecí', 'krůtí', 'hovězí', 'tofu', 'tuňák', 'čočka', 'vejce', 'tvaroh', 'skyr', 'cottage', 'vločky', 'chléb'] });
    expect(r.satisfied).toBe(false);
    expect(r.days[0].meals).toEqual([]);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('copes with a library that lacks a whole course', () => {
    const noSnacks = LIBRARY.filter((r) => !r.tags.includes(C));
    const r = plan({ meals: 4 }, noSnacks);
    expect(r.days[0].meals).toHaveLength(4);
    expect(r.issues.join(' ')).toContain('svačin');
  });

  it('flags a budget that is too small', () => {
    const r = plan({ budget: 1 });
    expect(r.satisfied).toBe(false);
    expect(r.issues.join(' ')).toContain('rozpočet');
  });

  it('copes with more meals than recipes', () => {
    const r = plan({ meals: 10 }, LIBRARY.slice(0, 3));
    expect(r.satisfied).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('copes with nonsensical day and meal counts', () => {
    expect(plan({ days: 0 })).toMatchObject({ days: [], satisfied: false });
    expect(plan({ meals: 0 }).satisfied).toBe(false);
  });

  it('uses offers to price the meals and prefers cheaper options', () => {
    const r = plan({ proteinMin: 1, fatMax: 500 }, LIBRARY, OFFERS);
    expect(r.days[0].cost).toBeGreaterThan(0);
  });

  it('stays fast with a large recipe book, six meals and a full week', () => {
    const many: Recipe[] = [...LIBRARY];
    for (let i = 0; i < 40; i++) many.push(recipe(`X${i}`, [[S, O, V, C][i % 4]], [['kuřecí prsa', 100 + i], ['rýže', 50 + i]]));
    const t = Date.now();
    plan({ meals: 6, days: 7 }, many);
    expect(Date.now() - t).toBeLessThan(6000);
  });
});

// ---------- shopping list items ----------
describe('ingredientsToListItems', () => {
  it('creates one list item per ingredient with store info from the chosen offer', () => {
    let n = 0;
    const items = ingredientsToListItems(priceRecipe(R1, OFFERS, {}), () => `id-${++n}`);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'id-1', label: 'Kuřecí prsní řízky', grams: 200, store: 'lidl', offerId: 'o1', pricePerKg: 150, estimated: false, checked: false,
    });
    expect(items[1]).toMatchObject({ label: 'rýže', grams: 100, estimated: true, pricePerKg: 50 });
    expect(items[1].store).toBeUndefined();
  });
  it('lists the scaled amounts', () => {
    const items = ingredientsToListItems(priceRecipe(R1, OFFERS, {}, 1.3), () => 'id');
    expect(items.map((i) => i.grams)).toEqual([260, 130]);
  });
});

describe('updatePriceBook', () => {
  it('records the cheapest matching offer price per ingredient and keeps older entries', () => {
    const book = updatePriceBook({ rýže: 44, starý: 9 }, [R1], OFFERS);
    expect(book['kuřecí prsa']).toBe(150);
    expect(book['rýže']).toBe(44);
    expect(book['starý']).toBe(9);
  });
  it('does not mutate the previous book', () => {
    const before = { rýže: 44 };
    updatePriceBook(before, [R1], OFFERS);
    expect(before).toEqual({ rýže: 44 });
  });
});
