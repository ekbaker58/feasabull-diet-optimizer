// Solve the example person for every diet and write tests/out/diets.json (used by the workbook + HiGHS check).
import { optimizeDiet, buildModel, DIETS } from '../src/lib/dietOptimizer.js';
import { writeFileSync, mkdirSync } from 'fs';
import { EXAMPLE, EXAMPLE_PERSON } from './example_person.mjs';
console.log('example person', EXAMPLE_PERSON, '-> targets', EXAMPLE);
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const out = {};
for (const d of DIETS) {
  const t0 = Date.now();
  const r = optimizeDiet(EXAMPLE, { diet: d.name });
  const m = buildModel(EXAMPLE, { diet: d.name });
  out[d.name] = { status: r.status, cost: r.objective ?? null, trueCost: r.costPerDay ?? null, pivots: r.pivots, ms: Date.now() - t0, reasons: r.reasons,
    foods: m.foods.map(f => f.id), c: m.cObj, rows: m.rows, senses: m.senses, rhs: m.rhs, labels: m.labels, kinds: m.kinds,
    x: r.model?.x ?? null, totals: r.totals, meals: r.meals?.map(ml => ({ meal: ml.meal, kcal: ml.kcal, protein: ml.protein, cost: ml.cost,
      items: ml.items.map(i => `${i.name} ${i.grams.toFixed(0)} g`) })) };
  console.log(`\n=== ${d.name}: ${r.status}  $${r.costPerDay?.toFixed(2)}/day  pivots=${r.pivots}  constraints=${m.labels.length}  ${Date.now()-t0} ms`);
  if (r.status !== 'optimal') { console.log('  ', r.reasons); continue; }
  for (const ml of r.meals) console.log(`  ${ml.meal.padEnd(9)} ${ml.kcal.toFixed(0).padStart(5)} kcal ${ml.protein.toFixed(0).padStart(4)} g P  | ` + ml.items.map(i => `${i.name} ${i.grams.toFixed(0)}g`).join(', '));
}
// The 71-food core list is the class baseline (minutes, slides): it must still give the documented $3.02.
const core = optimizeDiet(EXAMPLE, { diet: 'Balanced', foodSet: 'core' });
console.log(`\ncore 71 foods, Balanced: $${core.costPerDay.toFixed(4)}/day`);
if (Math.abs(core.costPerDay - 3.0180) > 5e-4) { console.error('CORE BASELINE CHANGED', core.costPerDay); process.exit(1); }
const mc = buildModel(EXAMPLE, { diet: 'Balanced', foodSet: 'core' });
out['Balanced (core 71)'] = { status: core.status, cost: core.objective, foods: mc.foods.map(f => f.id), c: mc.cObj, rows: mc.rows,
  senses: mc.senses, rhs: mc.rhs, labels: mc.labels, kinds: mc.kinds, x: core.model.x };
writeFileSync(new URL('./out/diets.json', import.meta.url), JSON.stringify(out));
writeFileSync(new URL('./out/example.json', import.meta.url), JSON.stringify({ person: EXAMPLE_PERSON, targets: EXAMPLE }));
