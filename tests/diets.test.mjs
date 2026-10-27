// Diet mechanics: food-level exclusions ("forbid_foods"), custom diet objects, and the generated DIETS list.
import assert from 'node:assert/strict';
import { optimizeDiet, getDiet, DIETS, FOODS } from '../src/lib/dietOptimizer.js';
import { EXAMPLE } from './example_person.mjs';

const base = optimizeDiet(EXAMPLE, { diet: 'Balanced' });
assert.equal(base.status, 'optimal');
const used = base.plan.filter((p) => p.grams > 1).map((p) => p.id);   // plan is sorted by cost, highest first
const ban = used.slice(0, 3);                    // ban three foods the cheapest plan actually uses
const custom = { name: 'Test ban', protein: [0.10, 0.35], carb: [0.45, 0.65], fat: [0.20, 0.35], forbid_foods: ban };
const r = optimizeDiet(EXAMPLE, { diet: custom });
assert.equal(r.status, 'optimal', 'custom diet should still be feasible');
assert.equal(r.diet, 'Test ban');
for (const id of ban) assert.ok(!r.model.foods.includes(id), `${id} must be removed from the model`);
assert.ok(r.costPerDay >= base.costPerDay - 1e-9, 'removing foods can never make the plan cheaper');
// a custom object with only a name inherits Balanced's macro split
const named = getDiet({ name: 'Only a name' });
assert.deepEqual([named.protein, named.carb, named.fat], [getDiet('Balanced').protein, getDiet('Balanced').carb, getDiet('Balanced').fat]);
// generated DIETS carry both lists, and every forbidden id is a real food
const ids = new Set(FOODS.map((f) => f.id));
for (const d of DIETS) {
  assert.ok(Array.isArray(d.forbid) && Array.isArray(d.forbid_foods), d.name);
  for (const id of d.forbid_foods) assert.ok(ids.has(id), `${d.name}: unknown food ${id}`);
}
console.log(`diets: ${DIETS.length} diets OK; banning ${ban.join(', ')} -> $${r.costPerDay.toFixed(2)}/day (Balanced $${base.costPerDay.toFixed(2)})`);
