// 300 random people/preferences -> tests/out/stress.json (checked by verify_highs.py)
import { optimizeDiet, buildModel, FOODS, DIETS } from '../src/lib/dietOptimizer.js';
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const out = []; const t0 = Date.now();
for (let k = 0; k < 300; k++) {
  const t = { calories: 1600 + rnd() * 1800, fiber: 21 + rnd() * 17, calcium: 1000 + rnd() * 300, iron: 8 + rnd() * 10,
    potassium: 2600 + rnd() * 800, vitc: 75 + rnd() * 15, sodium: 2300, proteinMin: rnd() < 0.3 ? 50 + rnd() * 60 : 0 };
  const ids = FOODS.map(f => f.id);
  const p = { diet: DIETS[Math.floor(rnd() * DIETS.length)].name, exclude: ids.filter(() => rnd() < 0.12),
    priceSource: rnd() < 0.3 ? 'bls' : 'walmart' };
  if (rnd() < 0.3) p.mustInclude = { [ids[Math.floor(rnd() * ids.length)]]: 1 };
  if (rnd() < 0.3) p.settings = { max_protein_share: 0.25 + rnd() * 0.2, min_meal_protein_share: 0.15 + rnd() * 0.1 };
  // both models: 20% textbook; realistic cases get a random variety level and waste on/off
  const roll = rnd();
  p.settings = { ...(p.settings || {}), ...(roll < 0.2 ? { realistic: false }
    : { variety: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5][Math.floor(rnd() * 5)], include_waste: rnd() < 0.8 }) };
  const r = optimizeDiet(t, p), m = buildModel(t, p);
  out.push({ status: r.status, reasons: r.reasons, diet: p.diet, cost: r.costPerDay ?? null, c: m.c, rows: m.rows, senses: m.senses, rhs: m.rhs, x: r.model?.x ?? null });
}
writeFileSync(new URL('./out/stress.json', import.meta.url), JSON.stringify(out));
const cnt = s => out.filter(o => o.status === s).length;
for (const o of out.filter((o) => o.status === 'infeasible').slice(0, 6)) console.log('  infeasible:', o.diet, '-', (o.reasons || [])[0]);
console.log(`stress: ${cnt('optimal')} optimal, ${cnt('infeasible')} infeasible, ${out.length - cnt('optimal') - cnt('infeasible')} other, ${(Date.now()-t0)/out.length|0} ms avg`);
// Deliberately impossible requests: the solver must report "infeasible" with a reason.
const imp = [
  [{ calories: 2600, fiber: 38, calcium: 1000, iron: 8, potassium: 3400, vitc: 90, sodium: 2300 }, { diet: 'Vegan', exclude: ['soy_milk', 'tofu', 'peanut_butter', 'canola_oil', 'olive_oil', 'almonds', 'avocado'] }],
  [{ calories: 2600, fiber: 38, calcium: 1000, iron: 8, potassium: 3400, vitc: 90, sodium: 2300, proteinMin: 400 }, { diet: 'Balanced' }],
  [{ calories: 9000, fiber: 38, calcium: 1000, iron: 8, potassium: 3400, vitc: 90, sodium: 2300 }, { diet: 'Balanced' }],
];
const impOut = imp.map(([t, p]) => { const r = optimizeDiet(t, p), m = buildModel(t, p);
  console.log(`impossible case -> ${r.status}: ${(r.reasons || []).join(' | ')}`);
  return { status: r.status, cost: null, c: m.c, rows: m.rows, senses: m.senses, rhs: m.rhs, x: null }; });
writeFileSync(new URL('./out/infeasible.json', import.meta.url), JSON.stringify(impOut));
