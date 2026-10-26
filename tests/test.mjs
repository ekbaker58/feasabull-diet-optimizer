import { optimizeDiet, buildModel, simplex } from './diet-optimizer.js';
import { writeFileSync } from 'fs';
export const EXAMPLE = { calories: 2600, calorieTolerance: 0.05, protein: [2600*0.10/4, 2600*0.35/4], carb: [2600*0.45/4, 2600*0.65/4], fat: [2600*0.20/9, 2600*0.35/9],
  fiber: 38, calcium: 1000, iron: 8, potassium: 3400, vitc: 90, sodium: 2300 };
const cases = {
  base: [EXAMPLE, {}],
  vegetarian: [EXAMPLE, { diet: 'vegetarian' }],
  vegan: [EXAMPLE, { diet: 'vegan' }],
  noPork_mustChicken: [EXAMPLE, { diet: 'no-pork', mustInclude: { chicken_breast: 2 }, exclude: ['beans'] }],
  female: [{ calories: 2000, protein: [50, 175], carb: [225, 325], fat: [44.4, 77.8], fiber: 25, calcium: 1000, iron: 18, potassium: 2600, vitc: 75, sodium: 2300 }, {}],
  withLocalPrices: [EXAMPLE, { prices: { peanut_butter: 3.0, oats: 1.6, broccoli: 2.2, carrots: 1.1, apples: 1.9, tuna: 5.5, butter: 4.5 } }],
  impossible: [EXAMPLE, { diet: 'vegan', exclude: ['beans','potatoes','chips'] }],
};
const out = {};
for (const [name, [t, p]] of Object.entries(cases)) {
  const r = optimizeDiet(t, p);
  const m = buildModel(t, p);
  out[name] = { status: r.status, cost: r.costPerDay, iterations: r.iterations, reasons: r.reasons,
    c: m.c, rows: m.rows, senses: m.senses, rhs: m.rhs, foods: m.foods.map(f=>f.id), x: r.model?.x,
    plan: r.plan?.map(p => `${p.name}: ${p.grams.toFixed(0)} g (${p.servings.toFixed(2)} x ${p.serving}) $${p.cost.toFixed(2)}`),
    totals: r.totals };
}
writeFileSync('js_results.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  console.log(`\n=== ${k}: ${v.status} cost/day=${v.cost?.toFixed(4)} iters=${v.iterations}`);
  (v.plan || []).forEach(l => console.log('  ' + l));
  if (v.totals) console.log('  totals', Object.fromEntries(Object.entries(v.totals).map(([a,b])=>[a, +b.toFixed(1)])));
  if (v.reasons) console.log('  reasons', v.reasons);
}
