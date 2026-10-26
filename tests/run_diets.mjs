// Solve the example person for every diet and write tests/out/diets.json (used by the workbook + HiGHS check).
import { optimizeDiet, buildModel, DIETS } from '../src/lib/dietOptimizer.js';
import { writeFileSync, mkdirSync } from 'fs';
export const EXAMPLE = { calories: 2600, fiber: 38, calcium: 1000, iron: 8, potassium: 3400, vitc: 90, sodium: 2300 };
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const out = {};
for (const d of DIETS) {
  const t0 = Date.now();
  const r = optimizeDiet(EXAMPLE, { diet: d.name });
  const m = buildModel(EXAMPLE, { diet: d.name });
  out[d.name] = { status: r.status, cost: r.costPerDay ?? null, pivots: r.pivots, ms: Date.now() - t0, reasons: r.reasons,
    foods: m.foods.map(f => f.id), c: m.c, rows: m.rows, senses: m.senses, rhs: m.rhs, labels: m.labels, kinds: m.kinds,
    x: r.model?.x ?? null, totals: r.totals, meals: r.meals?.map(ml => ({ meal: ml.meal, kcal: ml.kcal, protein: ml.protein, cost: ml.cost,
      items: ml.items.map(i => `${i.name} ${i.grams.toFixed(0)} g`) })) };
  console.log(`\n=== ${d.name}: ${r.status}  $${r.costPerDay?.toFixed(2)}/day  pivots=${r.pivots}  constraints=${m.labels.length}  ${Date.now()-t0} ms`);
  if (r.status !== 'optimal') { console.log('  ', r.reasons); continue; }
  for (const ml of r.meals) console.log(`  ${ml.meal.padEnd(9)} ${ml.kcal.toFixed(0).padStart(5)} kcal ${ml.protein.toFixed(0).padStart(4)} g P  | ` + ml.items.map(i => `${i.name} ${i.grams.toFixed(0)}g`).join(', '));
}
writeFileSync(new URL('./out/diets.json', import.meta.url), JSON.stringify(out));
