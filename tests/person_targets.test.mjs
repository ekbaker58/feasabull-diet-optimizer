// 1) Our calculator reproduces the live site EXACTLY (81 people computed by the site's own code, Oct 26 2026)
//    when run with the site's coefficients; 2) shows how much the IOM correction changes; 3) every person -> a plan.
import { readFileSync } from 'fs';
import { calculateTargets } from '../src/lib/personTargets.js';
import { optimizeDiet, DIETS } from '../src/lib/dietOptimizer.js';
const ref = JSON.parse(readFileSync(new URL('./site_reference.json', import.meta.url)));
const F = ['maintenance', 'calories', 'fiber', 'protein', 'carbs', 'fat', 'vitc', 'calcium', 'iron', 'potassium', 'bmi'];
let mismatches = 0, femaleDiff = [], plans = { optimal: 0, infeasible: 0 };
for (const r of ref) {
  const person = { sex: r[0] === 'm' ? 'male' : 'female', age: r[1], heightCm: r[2], weightKg: r[3], activity: r[4], goal: r[5] };
  const site = calculateTargets(person, { coefficients: 'site' });
  const got = [site.maintenance, site.calories, site.fiber, site.macros.protein.grams, site.macros.carbs.grams, site.macros.fat.grams,
    site.nutrients['Vitamin C'].amount, site.nutrients.Calcium.amount, site.nutrients.Iron.amount, site.nutrients.Potassium.amount, site.bmi.value];
  got.forEach((v, i) => { if (v !== r[6 + i]) { mismatches++; console.log('MISMATCH', person, F[i], 'site', r[6 + i], 'ours', v); } });
  const iom = calculateTargets(person);
  if (person.sex === 'female') femaleDiff.push(iom.maintenance - site.maintenance);
  const plan = optimizeDiet(iom.optimizerTargets, { diet: 'Balanced' });
  plans[plan.status] = (plans[plan.status] || 0) + 1;
  if (plan.status !== 'optimal') console.log('  no plan for', person, '->', plan.reasons?.[0]);
}
console.log(`site match: ${ref.length} people x ${F.length} fields, ${mismatches} mismatches`);
console.log(`IOM fix for women/girls: maintenance kcal change ${Math.min(...femaleDiff)} to +${Math.max(...femaleDiff)}`);
console.log(`Balanced plans for all ${ref.length} people (IOM targets):`, plans);
if (mismatches) process.exit(1);
