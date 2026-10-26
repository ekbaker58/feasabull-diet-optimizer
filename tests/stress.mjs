import { optimizeDiet, buildModel, FOODS } from './diet-optimizer.js';
import { writeFileSync } from 'fs';
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const diets = ['none','vegetarian','pescatarian','no-pork','none','none'];
const out = [];
for (let k = 0; k < 300; k++) {
  const cal = 1500 + rnd() * 2000;
  const t = { calories: cal, calorieTolerance: 0.02 + rnd() * 0.08, protein: [cal*0.10/4 + rnd()*40, cal*0.35/4], carb: [cal*0.45/4, cal*0.65/4],
    fat: [cal*0.20/9, cal*0.35/9], fiber: 20 + rnd()*18, calcium: 800 + rnd()*500, iron: 8 + rnd()*10, potassium: 2400 + rnd()*1200, vitc: 60 + rnd()*40, sodium: 1800 + rnd()*800 };
  const ids = FOODS.map(f => f.id);
  const p = { diet: diets[Math.floor(rnd()*diets.length)], exclude: ids.filter(() => rnd() < 0.15) };
  if (rnd() < 0.3) p.mustInclude = { [ids[Math.floor(rnd()*29)]]: 1 };
  if (rnd() < 0.5) p.prices = { peanut_butter: 2 + rnd()*2, oats: 1 + rnd(), broccoli: 1.5 + rnd(), apples: 1.5 + rnd() };
  const r = optimizeDiet(t, p); const m = buildModel(t, p);
  out.push({ status: r.status, cost: r.costPerDay ?? null, c: m.c, rows: m.rows, senses: m.senses, rhs: m.rhs, x: r.model?.x ?? null });
}
writeFileSync('stress.json', JSON.stringify(out));
console.log('optimal', out.filter(o => o.status === 'optimal').length, 'infeasible', out.filter(o => o.status === 'infeasible').length, 'other', out.filter(o => !['optimal','infeasible'].includes(o.status)).length);
