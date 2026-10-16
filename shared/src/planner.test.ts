import { describe, it, expect } from 'vitest';
import type { Ingredient, Offer, Recipe } from './types';
import { generatePlan, ingredientsToListItems, priceRecipe, updatePriceBook, type PlanInput } from './planner';

const ing = (
  generic: string, keywords: string[], grams: number,
  per100g: [number, number, number, number], fallbackPricePerKg: number,
): Ingredient => ({
  generic, keywords, grams, fallbackPricePerKg,
  per100g: { kcal: per100g[0], protein: per100g[1], fat: per100g[2], carbs: per100g[3] },
});

const chicken = (g: number) => ing('kuřecí prsa', ['kuřecí prsa', 'kuřecí prsní'], g, [110, 23, 1.2, 0], 160);
const turkey = (g: number) => ing('krůtí prsa', ['krůtí prsa'], g, [105, 24, 1, 0], 170);
const rice = (g: number) => ing('rýže', ['rýže'], g, [350, 7, 0.8, 78], 50);
const potato = (g: number) => ing('brambory', ['brambory'], g, [77, 2, 0.1, 17], 25);
const quark = (g: number) => ing('tvaroh', ['tvaroh'], g, [70, 13, 0.5, 3.5], 80);
const banana = (g: number) => ing('banán', ['banán'], g, [90, 1.1, 0.3, 21], 40);
const lentils = (g: number) => ing('čočka', ['čočka'], g, [350, 25, 1.5, 50], 80);
const egg = (g: number) => ing('vejce', ['vejce'], g, [143, 12.5, 10, 0.7], 70);
const beef = (g: number) => ing('mleté hovězí', ['mleté hovězí'], g, [190, 20, 12, 0], 220);
const pasta = (g: number) => ing('těstoviny', ['těstoviny'], g, [350, 12, 1.5, 72], 50);

const recipe = (id: string, ingredients: Ingredient[]): Recipe => ({ id, name: id, steps: [], tags: [], ingredients });

const R1 = recipe('R1', [chicken(200), rice(100)]);   // 570 kcal, 53 P, 3.2 F, cost 35
const R1b = recipe('R1b', [chicken(200), potato(300)]);
const R2 = recipe('R2', [quark(250), banana(200)]);
const R3 = recipe('R3', [lentils(120), egg(120)]);    // 592 kcal, 45 P, 13.8 F
const R4 = recipe('R4', [beef(150), pasta(120)]);
const R6 = recipe('R6', [turkey(200), rice(100)]);    // 560 kcal, 55 P, 2.8 F, cost 39
const RECIPES = [R1, R1b, R2, R3, R4, R6];

const offer = (id: string, name: string, pricePerKg: number): Offer => ({
  id, name, store: 'lidl', price: 50, discountPct: 0, pricePerKg, validFrom: '2026-10-12',
  validTo: '2026-10-20', category: 'maso', sourceUrl: 'u',
});
const OFFERS = [offer('o1', 'Kuřecí prsní řízky', 150), offer('o2', 'Kuřecí prsa mražená', 190)];

const INPUT: PlanInput = { kcal: 1200, proteinMin: 95, fatMax: 40, meals: 2, days: 1, excluded: [] };

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
  it('sums cost and macros', () => {
    expect(priced.cost).toBeCloseTo(35);
    expect(priced.kcal).toBeCloseTo(570);
    expect(priced.protein).toBeCloseTo(53);
    expect(priced.fat).toBeCloseTo(3.2);
  });
  it('does not match an offer for a different product with a similar prefix', () => {
    const noise = [offer('x', 'Rýžové chlebíčky', 10)];
    expect(priceRecipe(R1, noise, {}).ingredients[1].offer).toBeUndefined();
  });
});

describe('generatePlan', () => {
  it('finds the cheapest combination that meets all targets', () => {
    const r = generatePlan(INPUT, RECIPES, OFFERS, {});
    expect(r.satisfied).toBe(true);
    const day = r.days[0];
    expect(day.meals.map((m) => m.recipe.id).sort()).toEqual(['R1', 'R3']);
    expect(day.kcal).toBeGreaterThanOrEqual(1140);
    expect(day.kcal).toBeLessThanOrEqual(1260);
    expect(day.protein).toBeGreaterThanOrEqual(95);
    expect(day.fat).toBeLessThanOrEqual(40);
  });

  it('avoids repeating yesterday\'s recipes when an alternative is nearly as cheap', () => {
    const r = generatePlan({ ...INPUT, days: 2 }, RECIPES, OFFERS, {});
    expect(r.days).toHaveLength(2);
    const day2 = r.days[1].meals.map((m) => m.recipe.id);
    expect(day2).toContain('R6');
    expect(day2).not.toContain('R1');
    expect(r.totalCost).toBeCloseTo(r.days[0].cost + r.days[1].cost);
  });

  it('never uses recipes with excluded ingredients', () => {
    const r = generatePlan({ ...INPUT, excluded: ['rýže', 'brambory'] }, RECIPES, OFFERS, {});
    const ids = r.days.flatMap((d) => d.meals.map((m) => m.recipe.id));
    expect(ids).not.toContain('R1');
    expect(ids).not.toContain('R1b');
    expect(ids).not.toContain('R6');
    expect(r.satisfied).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('matches exclusions regardless of diacritics and case', () => {
    const r = generatePlan({ ...INPUT, excluded: ['RYZE'] }, RECIPES, OFFERS, {});
    expect(r.days.flatMap((d) => d.meals.map((m) => m.recipe.id))).not.toContain('R1');
  });

  it('reports unreachable calorie targets instead of throwing', () => {
    const r = generatePlan({ ...INPUT, kcal: 6000 }, RECIPES, OFFERS, {});
    expect(r.satisfied).toBe(false);
    expect(r.issues.join(' ')).toContain('Kalorie');
    expect(r.days[0].meals.length).toBe(2);
  });

  it('copes with every ingredient excluded', () => {
    const r = generatePlan(
      { ...INPUT, excluded: ['kuřecí', 'krůtí', 'tvaroh', 'čočka', 'hovězí'] }, RECIPES, OFFERS, {},
    );
    expect(r.satisfied).toBe(false);
    expect(r.days[0].meals).toEqual([]);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('flags a budget that is too small', () => {
    const r = generatePlan({ ...INPUT, budget: 1 }, RECIPES, OFFERS, {});
    expect(r.satisfied).toBe(false);
    expect(r.issues.join(' ')).toContain('rozpočet');
  });

  it('copes with more meals than recipes', () => {
    const r = generatePlan({ ...INPUT, meals: 10 }, RECIPES, OFFERS, {});
    expect(r.satisfied).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('copes with nonsensical day and meal counts', () => {
    expect(generatePlan({ ...INPUT, days: 0 }, RECIPES, OFFERS, {})).toMatchObject({ days: [], satisfied: false });
    expect(generatePlan({ ...INPUT, meals: 0 }, RECIPES, OFFERS, {}).satisfied).toBe(false);
  });

  it('stays fast with a large recipe book and many meals', () => {
    const many = Array.from({ length: 40 }, (_, i) => recipe(`X${i}`, [chicken(100 + i), rice(50 + i)]));
    const t = Date.now();
    generatePlan({ ...INPUT, meals: 8 }, many, OFFERS, {});
    expect(Date.now() - t).toBeLessThan(5000);
  });
});

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
});

describe('updatePriceBook', () => {
  it('records the cheapest matching offer price per ingredient and keeps older entries', () => {
    const book = updatePriceBook({ rýže: 44, 'starý': 9 }, [R1], OFFERS);
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
