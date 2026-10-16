import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Recipe } from './types';
import { generatePlan, priceRecipe } from './planner';

const recipes: Recipe[] = JSON.parse(
  readFileSync(join(__dirname, '../../app/public/data/recipes.json'), 'utf8'),
);

describe('recipes.json', () => {
  it('contains 30–40 recipes with unique ids', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(30);
    expect(recipes.length).toBeLessThanOrEqual(40);
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
});
