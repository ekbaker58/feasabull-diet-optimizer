// Plan options, diet comparison and the weekly shopping list. Writes tests/out/options.json (checked by verify_highs.py:
// every option is an LP with objective D c, so HiGHS re-solves it with the same weighted cost vector).
import { planOptions, compareDiets, weekPlan, buildModel, optimizeDiet, DIETS, FOODS } from '../src/lib/dietOptimizer.js';
import { writeFileSync, mkdirSync } from 'fs';
import { EXAMPLE } from './example_person.mjs';
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.error('FAIL', msg); } };
const out = [];
const likes = ['chicken_breast', 'strawberries', 'spinach', 'greek_yogurt', 'mango'], dislikes = ['peanut_butter', 'cabbage'];
const t0 = Date.now();
for (const d of DIETS) for (const p of [{}, { likes, dislikes }, { avoid: ['peanut', 'dairy'] }]) {
  const prefs = { diet: d.name, ...p };
  const o = planOptions(EXAMPLE, prefs);
  check(o.status === 'optimal', `${d.name} ${JSON.stringify(p)} options ${o.status}`);
  if (o.status !== 'optimal') continue;
  const cheapest = o.options[0].result.costPerDay;
  for (const opt of o.options) {
    const r = opt.result, m = buildModel(EXAMPLE, { ...prefs, weights: opt.weights, mustInclude: opt.mustInclude });
    out.push({ status: r.status, cost: r.objective, c: m.cObj, rows: m.rows, senses: m.senses, rhs: m.rhs, x: r.model.x });
    check(r.costPerDay >= cheapest - 1e-9, `${d.name} ${opt.title}: true cost below the lowest-cost option`);
    for (const f of r.plan) check(!(p.avoid || []).some((a) => FOODS.find((x) => x.id === f.id).flags.includes(a)), `${f.id} violates avoid`);
  }
  const S = o.similarity;
  S.forEach((row, a) => row.forEach((v, b) => check(Math.abs(v - S[b][a]) < 1e-12 && (a !== b || Math.abs(v - 1) < 1e-12), 'similarity matrix')));
  check(o.options.length >= 3, `${d.name}: fewer than 3 options`);
  if (p.likes) {
    const pick = o.options.find((x) => x.key === 'picks').result;
    if (o.options.find((x) => x.key === 'picks').mustInclude)
      for (const id of likes) if (!(p.avoid || []).length && d.forbid.length === 0) check(pick.plan.some((i) => i.id === id), `${d.name}: liked ${id} missing from "Your picks"`);
    const share = (r) => r.plan.filter((i) => likes.includes(i.id)).reduce((s, i) => s + i.kcal, 0);
    check(share(pick) >= share(o.options[0].result) - 1e-6, `${d.name}: "Your picks" has fewer liked-food calories than lowest cost`);
  }
  // weekly list: X d, whole packages
  const days = o.options.map((_, k) => (k === 0 ? 7 - (o.options.length - 1) * 2 : 2)).map((v) => Math.max(v, 0));
  const w = weekPlan(o.options.map((x) => x.result), days);
  const gramsDirect = o.options.reduce((s, x, k) => s + days[k] * x.result.plan.reduce((t, i) => t + i.grams, 0), 0);
  check(Math.abs(w.lines.reduce((s, l) => s + l.grams, 0) - gramsDirect) < 1e-6 * gramsDirect + 1, 'X d total grams');
  const lpWeek = o.options.reduce((s, x, k) => s + days[k] * x.result.costPerDay, 0);
  check(Math.abs(w.eaten - lpWeek) < 1e-6 * lpWeek, `${d.name}: weekly cost of food eaten != sum of daily LP costs`);
  check(w.checkout >= w.eaten - 1e-9, 'checkout below cost of food eaten');
}
// DASH-style really enforces its sodium and saturated-fat limits
const dash = optimizeDiet(EXAMPLE, { diet: 'DASH-Style' });
check(dash.totals.sodium <= 1500 + 1e-6, 'DASH sodium');
check(9 * dash.totals.satfat <= 0.06 * dash.totals.kcal + 1e-6, 'DASH saturated fat');
const cd = compareDiets(EXAMPLE, {});
check(cd.length === DIETS.length && cd.every((r) => r.status === 'optimal'), 'compareDiets');
writeFileSync(new URL('./out/options.json', import.meta.url), JSON.stringify(out));
console.log(`options: ${out.length} option LPs across ${DIETS.length} diets x 3 preference sets, ${((Date.now() - t0) / DIETS.length / 3) | 0} ms per person; ` +
  `DASH sodium ${dash.totals.sodium.toFixed(0)} mg, sat fat ${(900 * dash.totals.satfat / dash.totals.kcal).toFixed(1)}% kcal; failures ${fails}`);
console.log('diet costs (example person, all foods):', cd.map((r) => `${r.diet} $${r.costPerDay.toFixed(2)}`).join(', '));
if (fails) process.exit(1);
