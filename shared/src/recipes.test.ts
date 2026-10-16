import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Recipe } from './types';
import { generatePlan, priceRecipe } from './planner';

const recipes: Recipe[] = JSON.parse(
  readFileSync(join(__dirname, '../../app/public/data/recipes.json'), 'utf8'),
);

describe('recipes.json', () => {
  it('contains 50–70 recipes with unique ids', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(50);
    expect(recipes.length).toBeLessThanOrEqual(70);
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
  });

  it('has complete, sane ingredients and steps', () => {
    for (const r of recipes) {
      expect(r.name.length, r.id).toBeGreaterThan(0);
      expect(r.steps.length, r.id).toBeGreaterThan(0);
      expect(r.ingredients.length, r.id).toBeGreaterThanOrEqual(2);
      for (const i of r.ingredients) {
        expect(i.keywords.length, `${r.id}/${i.generic}`).toBeGreaterThan(0);
        expect(i.grams, `${r.id}/${i.generic}`).toBeGreaterThan(0);
        expect(i.fallbackPricePerKg, `${r.id}/${i.generic}`).toBeGreaterThan(0);
        expect(i.per100g.kcal, `${r.id}/${i.generic}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every recipe within a plausible single-meal calorie range', () => {
    for (const r of recipes) {
      const kcal = priceRecipe(r, [], {}).kcal;
      expect(kcal, r.id).toBeGreaterThanOrEqual(150);
      expect(kcal, r.id).toBeLessThanOrEqual(1100);
    }
  });

  it('can satisfy a typical fit day (2200 kcal, 150 g protein, 70 g fat, 4 meals) from fallback prices', () => {
    const plan = generatePlan(
      { kcal: 2200, proteinMin: 150, fatMax: 70, meals: 4, days: 1, excluded: [] }, recipes, [], {},
    );
    expect(plan.issues).toEqual([]);
    expect(plan.satisfied).toBe(true);
  });

  it('can plan a whole week without repeating the same day', () => {
    const plan = generatePlan(
      { kcal: 2200, proteinMin: 150, fatMax: 70, meals: 4, days: 7, excluded: [] }, recipes, [], {},
    );
    expect(plan.days).toHaveLength(7);
    expect(plan.days.every((d) => d.meals.length === 4)).toBe(true);
  });

  it('offers enough recipes for every course to keep a week varied', () => {
    const count = (tag: string) => recipes.filter((r) => r.tags.includes(tag)).length;
    expect(count('snidane')).toBeGreaterThanOrEqual(12);
    expect(count('obed')).toBeGreaterThanOrEqual(25);
    expect(count('vecere')).toBeGreaterThanOrEqual(25);
    expect(count('svacina')).toBeGreaterThanOrEqual(14);
  });

  it('only uses the known course tags', () => {
    const known = new Set(['snidane', 'obed', 'vecere', 'svacina']);
    for (const r of recipes) {
      expect(r.tags.length, r.id).toBeGreaterThan(0);
      for (const t of r.tags) expect(known.has(t), `${r.id}: ${t}`).toBe(true);
    }
  });

  it('hits the calorie target within ±5 % for realistic targets and meal counts', () => {
    for (const [kcal, meals] of [[1600, 4], [1900, 4], [2200, 4], [2500, 5], [2800, 5], [3000, 6]] as const) {
      const plan = generatePlan(
        { kcal, proteinMin: Math.round(kcal * 0.065), fatMax: Math.round(kcal * 0.04), meals, days: 1, excluded: [] }, recipes, [], {},
      );
      const day = plan.days[0];
      expect(Math.abs(day.kcal / kcal - 1), `${kcal} kcal in ${meals} meals -> ${Math.round(day.kcal)}`).toBeLessThanOrEqual(0.05);
      expect(plan.issues, `${kcal}/${meals}`).toEqual([]);
    }
  });

  it('serves a real week with at least 30 different recipes and no recipe more than twice', () => {
    const plan = generatePlan(
      { kcal: 2200, proteinMin: 150, fatMax: 70, meals: 5, days: 7, excluded: [] }, recipes, [], {},
    );
    const uses: Record<string, number> = {};
    plan.days.forEach((d) => d.meals.forEach((m) => (uses[m.recipe.id] = (uses[m.recipe.id] ?? 0) + 1)));
    expect(Object.keys(uses).length).toBeGreaterThanOrEqual(30);
    expect(Math.max(...Object.values(uses))).toBeLessThanOrEqual(2);
  });
});
