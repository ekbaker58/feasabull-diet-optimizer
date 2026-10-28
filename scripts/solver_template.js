/**
 * FeasaBULL diet optimizer — linear programming solved with the two-phase Simplex method.
 * EGN4450 Team 9 (Sinister Seven), USF, Fall 2026.  GENERATED FILE: edit scripts/solver_template.js
 * and the data in scripts/foods_v2.py, then run `python scripts/build_all.py`.
 *
 * THE MODEL (matrix form)
 *   x  (n x 1)  diet vector: x_j = amount of food j eaten per day, in 100 g units
 *   c  (n x 1)  cost vector: c_j = $ per 100 g of edible food j
 *   A  (m x n)  nutrient matrix: A_ij = amount of nutrient i in 100 g of food j (USDA SR28)
 *   M  (n x 4)  meal matrix: M_jk = share of food j eaten at meal k (Breakfast, Lunch, Dinner, Snacks)
 *
 *   minimize    c^T x                                   (cost per day)
 *   subject to  b_min <= A x <= b_max                   (daily nutrient targets)
 *               4 p^T x - s_lo e^T x >= 0  (and <= s_hi) (macro split as % of the plan's actual calories; same for carbs, 9x fat)
 *               k_lo <= (A_kcal o M)^T x <= k_hi         (each meal's share of calories)
 *               (p o (M_k - beta 1))^T x >= 0            (each main meal carries >= beta of the protein)
 *               p_j x_j - alpha p^T x <= 0               (no food supplies > alpha of the protein)
 *               g_min <= G x <= g_max                   (caps on meat, beans, cheese, grains, oils and snacks as groups)
 *   REALISTIC model (default; settings.realistic) adds
 *               d_min <= D x <= d_max                   (Dietary Guidelines 2025-2030 daily servings for the person's
 *                                                        calorie level: protein foods, dairy, vegetables, fruits,
 *                                                        whole grains, healthy fats; D_gj = servings of group g in 100 g)
 *               r^T x - w^T x <= 0                      (refined-grain servings <= whole-grain servings)
 *               9 sf^T x - 0.10 e^T x <= 0              (saturated fat < 10% of calories)
 *               x_j <= v * d_min,g / D_gj               (variety: one food <= v of its group's servings; a bound)
 *               c_j = price / (package x edible yield x cook yield x (1 - household waste))
 *   TEXTBOOK model: vegetables/fruit cup-equivalent minimums instead of D, no variety, no waste.
 *               0 <= x <= u                             (portion caps; u_j = 0 when the diet excludes food j)
 *   x is in grams AS EATEN (cooked rice, roasted chicken); the shopping list converts back to grams as bought.
 *
 * THE SOLVER
 *   Two-phase Simplex on a dense tableau. Each pivot is a Gauss-Jordan elimination step
 *   (scale the pivot row, subtract multiples of it from every other row). Bland's rule
 *   prevents cycling. Results were checked against SciPy's HiGHS solver (tests/).
 */

/*__DATA__*/

const BIG = 1e9;
const EPS = 1e-9;

/** A diet by name (from config/diets.json), or pass a diet object to try a custom one without rebuilding:
 *  { name, desc, protein: [0.10, 0.35], carb: [0.45, 0.65], fat: [0.20, 0.35], forbid: ["pork"], forbid_foods: ["almonds"] } */
export function getDiet(name) {
  if (name && typeof name === "object") {   // missing macro ranges fall back to Balanced's
    const base = DIETS.find((x) => x.name === "Balanced") || {};
    return { protein: base.protein, carb: base.carb, fat: base.fat, name: "Custom", desc: "", forbid: [], forbid_foods: [], ...name };
  }
  const d = DIETS.find((x) => x.name.toLowerCase() === String(name || "Balanced").toLowerCase());
  if (!d) throw new Error(`Unknown diet "${name}". Options: ${DIETS.map((x) => x.name).join(", ")}`);
  return d;
}

/** $ per 100 g AS EATEN. priceSource 'bls' uses the BLS U.S. average where one exists. With waste on, the cost
 *  covers the food that is bought but never eaten (USDA ERS household loss rate for the food's group). */
export function costPer100g(food, { prices = {}, priceSource = "walmart" } = {}, waste = false) {
  let c = food.cost_per_100g;
  if (prices[food.id] != null) c = (prices[food.id] / (food.package_g * food.edible_yield * (food.cook_yield || 1))) * 100;
  else if (priceSource === "bls" && food.bls_cost_per_100g != null) c = food.bls_cost_per_100g;
  return waste ? c / (1 - (food.waste || 0)) : c;
}

/** Dietary Guidelines calorie level used for a calorie target: nearest 200 kcal, within the table (1,000-3,200). */
export function dgaLevel(kcal, table = DGA_SERVINGS) {
  const levels = Object.keys(table).map(Number).sort((a, b) => a - b);
  const want = Math.round(kcal / 200) * 200;
  return Math.min(levels[levels.length - 1], Math.max(levels[0], want));
}

export function isAllowed(food, diet, exclude = []) {
  if (exclude.includes(food.id) || (diet.forbid_foods || []).includes(food.id)) return false;
  return !food.flags.some((f) => (diet.forbid || []).includes(f));
}

/**
 * Build the LP.
 * targets: { calories, fiber, calcium, iron, potassium, vitc (daily minimums), sodium (daily maximum),
 *            sugarMax (optional), proteinMin (optional floor in g, e.g. 0.8 g/kg from the calculator) }
 * prefs:   { diet: a diet name from config/diets.json (DIETS), or a diet object (see getDiet),
 *            exclude: [foodId], mustInclude: {foodId: servings}, maxServings: {foodId: servings},
 *            prices: {foodId: package price}, priceSource: 'walmart'|'bls', settings: {...overrides} }
 */
export function buildModel(targets, prefs = {}) {
  const diet = getDiet(prefs.diet);
  const S = { ...SETTINGS, ...(prefs.settings || {}) };
  S.meal_kcal = { ...SETTINGS.meal_kcal, ...((prefs.settings || {}).meal_kcal || {}) };
  const kcal = Number(targets.calories);
  if (!(kcal > 0)) throw new Error("targets.calories is required");

  const realistic = S.realistic !== false;
  const foods = FOODS.filter((f) => isAllowed(f, diet, prefs.exclude || []))
    .map((f) => ({ ...f, cost100: costPer100g(f, prefs, realistic && S.include_waste !== false) }));
  const n = foods.length;
  const keys = NUTRIENTS.map((k) => k.key);
  const A = keys.map((k) => foods.map((f) => f.per100g[k]));
  const p = A[keys.indexOf("protein")];
  const e = A[keys.indexOf("kcal")];

  const tol = S.calorie_tolerance;
  const bounds = {
    kcal: [kcal * (1 - tol), kcal * (1 + tol)],
    protein: [targets.proteinMin || 0, null],
    fiber: [targets.fiber, null], calcium: [targets.calcium, null], iron: [targets.iron, null],
    potassium: [targets.potassium, null], vitc: [targets.vitc, null],
    sodium: [null, targets.sodium], sugar: [null, targets.sugarMax ?? null],
  };

  const rows = [], senses = [], rhs = [], labels = [], kinds = [];
  const add = (row, sense, b, label, kind) => { rows.push(row); senses.push(sense); rhs.push(b); labels.push(label); kinds.push(kind); };

  // 1. Daily nutrient targets: rows of A
  keys.forEach((k, i) => {
    const [lo, hi] = bounds[k] || [null, null];
    if (lo != null && lo > 0) add(A[i].slice(), ">=", lo, `${k} >= min`, "nutrient");
    if (hi != null) add(A[i].slice(), "<=", hi, `${k} <= max`, "nutrient");
  });
  // 1b. Macro split as a share of the plan's ACTUAL calories: f * macro(x) - pct * kcal(x) (>= or <=) 0
  [["protein", 4], ["carb", 4], ["fat", 9]].forEach(([k, f]) => {
    const mac = A[keys.indexOf(k)], [lo, hi] = diet[k];
    add(mac.map((v, j) => f * v - lo * e[j]), ">=", 0, `${k}% >= ${Math.round(lo * 100)}% of kcal`, "macro");
    add(mac.map((v, j) => f * v - hi * e[j]), "<=", 0, `${k}% <= ${Math.round(hi * 100)}% of kcal`, "macro");
  });
  // 2. Meal balance: calories per meal, protein per main meal (uses meal matrix M)
  MEALS.forEach((meal, m) => {
    const [lo, hi] = S.meal_kcal[meal];
    const row = foods.map((f, j) => e[j] * f.meal[m]);
    add(row, ">=", lo * kcal, `${meal} kcal >= ${Math.round(lo * 100)}%`, "meal");
    add(row.slice(), "<=", hi * kcal, `${meal} kcal <= ${Math.round(hi * 100)}%`, "meal");
    if (meal !== "Snacks" && S.min_meal_protein_share > 0)
      add(foods.map((f, j) => p[j] * (f.meal[m] - S.min_meal_protein_share)), ">=", 0,
        `${meal} protein >= ${Math.round(S.min_meal_protein_share * 100)}% of day`, "meal");
  });
  // 3. Protein diversity: p_j x_j <= alpha * (p^T x) for every high-protein food
  const alpha = S.max_protein_share;
  foods.forEach((f, j) => {
    if (p[j] < S.share_rule_min_protein) return;
    add(foods.map((g, k) => (k === j ? (1 - alpha) * p[k] : -alpha * p[k])), "<=", 0,
      `${f.id} <= ${Math.round(alpha * 100)}% of protein`, "share");
  });
  // 4. Food groups. REALISTIC: Dietary Guidelines servings for the calorie level (rows of D), half grains whole,
  //    saturated fat < 10% of calories. TEXTBOOK: vegetable and fruit cup-equivalent minimums only.
  const notes = [], groupTargets = {};
  const level = dgaLevel(kcal);
  if (realistic) {
    const pattern = DGA_SERVINGS[String(level)];
    Object.entries(pattern).forEach(([g, amt]) => {
      const [lo, hi] = Array.isArray(amt) ? amt : [amt, null];
      const row = foods.map((f) => (f.dga_group === g ? 100 / f.dga_serving_g : 0));
      const n = new Set(foods.filter((f) => f.dga_group === g).map((f) => f.variety_key || f.id)).size;   // distinct choices
      if (!n) { notes.push(`${DGA_GROUP_LABELS[g]}: this diet allows no foods in the group, so its ${lo}-serving guideline is skipped.`); return; }
      groupTargets[g] = { lo, hi, n };
      add(row, ">=", lo, `${g} servings >= ${lo}`, "guideline");
      if (hi != null) add(row.slice(), "<=", hi, `${g} servings <= ${hi}`, "guideline");
    });
    const refined = foods.map((f) => (f.refined_serving_g ? 100 / f.refined_serving_g : f.dga_group === "wgrain" ? -100 / f.dga_serving_g : 0));
    if (refined.some((v) => v > 0)) add(refined, "<=", 0, "refined grains <= whole grains", "guideline");
    const sf = S.max_satfat_share ?? 0.1;
    add(foods.map((f, j) => 9 * f.satfat - sf * e[j]), "<=", 0, `saturated fat <= ${Math.round(sf * 100)}% of kcal`, "guideline");
  } else {
    const cupRow = (types) => foods.map((f) => (types.includes(f.type) ? 100 / f.cup_eq_g : 0));
    if (S.min_veg_cups > 0) add(cupRow(["Vegetables"]), ">=", S.min_veg_cups, `vegetables >= ${S.min_veg_cups} cup-eq`, "group");
    if (S.min_fruit_cups > 0) add(cupRow(["Fruit"]), ">=", S.min_fruit_cups, `fruit >= ${S.min_fruit_cups} cup-eq`, "group");
  }
  GROUP_CAPS.forEach((g) => {
    const cap = (S.group_caps || {})[g.key];
    if (cap == null) return;
    const row = foods.map((f) => (f.cap_group !== g.key ? 0 : g.unit === "grams" ? 100 : 100 / f.serving_g));
    if (row.some((v) => v)) add(row, "<=", cap, `${g.key} <= ${cap} ${g.unit}`, "group");
  });
  // 5. Portion caps and must-include foods (rows of the identity matrix)
  const caps = prefs.maxServings || {}, must = prefs.mustInclude || {};
  const variety = realistic ? Number(S.variety ?? 1) : 1;
  const u = foods.map((f) => {
    let cap = (f.serving_g * (caps[f.id] ?? f.max_servings)) / 100;
    const t = groupTargets[f.dga_group];
    if (t && variety < 1 && !caps[f.id]) cap = Math.min(cap, (Math.max(variety, 1 / t.n) * t.lo * f.dga_serving_g) / 100);
    return cap;
  });
  // near-duplicates (whole and 2% milk; 80/20 and 93/7 beef) share one variety slot: their servings together <= the cap
  if (realistic && variety < 1) {
    const slots = {};
    foods.forEach((f, j) => { if (f.variety_key && f.variety_key !== f.id && groupTargets[f.dga_group]) (slots[f.variety_key] ||= []).push(j); });
    Object.entries(slots).forEach(([key, js]) => {
      if (js.length < 2) return;
      const t = groupTargets[foods[js[0]].dga_group];
      add(foods.map((f, j) => (js.includes(j) ? 100 / f.dga_serving_g : 0)), "<=", Math.max(variety, 1 / t.n) * t.lo,
        `${key} (all kinds) <= ${Math.round(Math.max(variety, 1 / t.n) * 100)}% of ${foods[js[0]].dga_group}`, "variety");
    });
  }
  foods.forEach((f, j) => {
    const row = new Array(n).fill(0); row[j] = 1;
    add(row, "<=", u[j], `${f.id} <= cap`, "cap");
    if (must[f.id]) add(row.slice(), ">=", (f.serving_g * must[f.id]) / 100, `${f.id} >= must-include`, "must");
  });
  return { diet, settings: S, realistic, level, groupTargets, notes, foods, keys, A, c: foods.map((f) => f.cost100), u,
    rows, senses, rhs, labels, kinds };
}

/** Gauss-Jordan pivot: make column `col` the unit vector e_r with elementary row operations. */
function pivot(T, r, col) {
  const pr = T[r], piv = pr[col];
  for (let k = 0; k < pr.length; k++) pr[k] /= piv;                 // R_r <- R_r / a_rc
  for (let i = 0; i < T.length; i++) {
    if (i === r) continue;
    const f = T[i][col];
    if (Math.abs(f) < EPS) continue;
    const row = T[i];
    for (let k = 0; k < row.length; k++) {
      row[k] -= f * pr[k];                                           // R_i <- R_i - a_ic R_r
      if (Math.abs(row[k]) < 1e-13) row[k] = 0;                      // flush round-off
    }
  }
}

const PIV_TOL = 1e-9;   // never pivot on an element smaller than this (numerical safety)

function iterate(T, basis, allowed, counter) {
  const m = T.length - 1, last = T[0].length - 1;
  let stall = 0, lastObj = T[m][last];
  for (let it = 0; it < 50000; it++) {
    const z = T[m];
    // Entering column: most negative reduced cost (Dantzig); switch to Bland's rule while stalled on a degenerate corner
    let col = -1, most = -EPS;
    if (stall < 50) { for (let j = 0; j < last; j++) if (allowed[j] && z[j] < most) { most = z[j]; col = j; } }
    else { for (let j = 0; j < last; j++) if (allowed[j] && z[j] < -EPS) { col = j; break; } }
    if (col === -1) return "optimal";
    // Leaving row: minimum-ratio test; among (near-)ties prefer the largest pivot element for stability
    let r = -1, best = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i][col];
      if (a > PIV_TOL) {
        const ratio = Math.max(T[i][last], 0) / a;
        if (ratio < best - 1e-12 || (ratio <= best + 1e-12 && a > T[r][col])) { best = ratio; r = i; }
      }
    }
    if (r === -1) return "unbounded";
    pivot(T, r, col);
    basis[r] = col;
    counter.pivots++;
    const obj = T[m][last];
    stall = Math.abs(obj - lastObj) < 1e-12 ? stall + 1 : 0;
    lastObj = obj;
  }
  return "iteration-limit";
}

/** Minimize c.x subject to rows (<=, >=, =) rhs and x >= 0. Two-phase Simplex. */
export function simplex(c, rows, senses, rhs) {
  const n = c.length, m = rows.length;
  rows = rows.map((r) => r.slice()); senses = senses.slice(); rhs = rhs.slice();
  for (let i = 0; i < m; i++) {                                     // row scaling: largest |coefficient| = 1
    const s = Math.max(...rows[i].map(Math.abs));
    if (s > 0) { rows[i] = rows[i].map((v) => v / s); rhs[i] /= s; }
  }
  for (let i = 0; i < m; i++) if (rhs[i] < 0) {
    rows[i] = rows[i].map((v) => -v); rhs[i] = -rhs[i];
    senses[i] = senses[i] === "<=" ? ">=" : senses[i] === ">=" ? "<=" : "=";
  }
  const nSlack = senses.filter((s) => s !== "=").length;
  const nArt = senses.filter((s) => s !== "<=").length;
  const N = n + nSlack + nArt;
  const T = [], basis = [], isArt = new Array(N).fill(false);
  let s = n, a = n + nSlack;
  for (let i = 0; i < m; i++) {                                     // tableau [A | slack | artificial | b]
    const row = new Float64Array(N + 1);
    for (let j = 0; j < n; j++) row[j] = rows[i][j];
    if (senses[i] === "<=") { row[s] = 1; basis.push(s++); }
    else { if (senses[i] === ">=") row[s++] = -1; row[a] = 1; isArt[a] = true; basis.push(a++); }
    row[N] = rhs[i];
    T.push(row);
  }
  const counter = { pivots: 0 };
  const z1 = new Float64Array(N + 1);                               // Phase 1: minimize sum of artificials
  for (let j = 0; j < N; j++) if (isArt[j]) z1[j] = 1;
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) for (let k = 0; k <= N; k++) z1[k] -= T[i][k];
  T.push(z1);
  iterate(T, basis, new Array(N).fill(true), counter);
  if (-T[m][N] > 1e-7) return { status: "infeasible", pivots: counter.pivots };
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) {                // drive leftover artificials out
    let j = 0;
    while (j < N && (isArt[j] || Math.abs(T[i][j]) < EPS)) j++;
    if (j < N) { pivot(T, i, j); basis[i] = j; }
  }
  const z2 = new Float64Array(N + 1);                               // Phase 2: minimize real cost
  for (let j = 0; j < n; j++) z2[j] = c[j];
  for (let i = 0; i < m; i++) { const cb = basis[i] < n ? c[basis[i]] : 0; if (cb) for (let k = 0; k <= N; k++) z2[k] -= cb * T[i][k]; }
  T[m] = z2;
  const status = iterate(T, basis, isArt.map((v) => !v), counter);
  if (status !== "optimal") return { status, pivots: counter.pivots };
  const x = new Array(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
  return { status, x, objective: -T[m][N], pivots: counter.pivots };
}

export function matVec(A, x) { return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)); }

/** Explain an infeasible request: re-solve smaller LPs to find which rule set breaks it. */
function diagnose(model) {
  const { A, keys, labels, rhs, kinds, rows, senses } = model;
  const pick = (ok) => { const I = kinds.map((k, i) => (ok(k, i) ? i : -1)).filter((i) => i >= 0);
    return [I.map((i) => rows[i]), I.map((i) => senses[i]), I.map((i) => rhs[i])]; };
  const zero = new Array(model.foods.length).fill(0);
  const base = (k) => k === "cap" || k === "group";            // portion caps + food-group caps
  const reasons = [];
  // 1. Each nutrient alone: best value the allowed foods can reach within the caps (an LP per nutrient)
  labels.forEach((lab, k) => {
    if (kinds[k] !== "nutrient") return;
    const [key, op] = lab.split(" ");
    const i = keys.indexOf(key);
    const sol = simplex(op === ">=" ? A[i].map((v) => -v) : A[i], ...pick(base));
    if (sol.status !== "optimal") return;
    const best = op === ">=" ? -sol.objective : sol.objective;
    if (op === ">=" && best < rhs[k] - 1e-6)
      reasons.push(`${key}: the allowed foods can supply at most ${best.toFixed(0)} within the portion caps, below the ${rhs[k].toFixed(0)} minimum`);
    if (op === "<=" && best > rhs[k] + 1e-6)
      reasons.push(`${key}: even the lowest possible amount (${best.toFixed(0)}) is above the ${rhs[k].toFixed(0)} maximum`);
  });
  if (reasons.length) return reasons;
  // 2. Add rule sets one at a time to find the first one that breaks feasibility
  if (simplex(zero, ...pick((k) => base(k) || k === "nutrient")).status !== "optimal")
    return ["Your nutrient targets cannot all be met together with these foods and portion caps."];
  const sources = { protein: "protein foods", carb: "grains, fruit or starchy vegetables", fat: "oils, nuts, avocado or peanut butter" };
  const words = { protein: "protein", carb: "carbohydrate", fat: "fat" };
  for (const mac of ["protein", "carb", "fat"]) for (const side of [">=", "<="]) {
    const ok = (k, i) => base(k) || k === "nutrient" || (k === "macro" && labels[i].startsWith(`${mac}% ${side}`));
    if (simplex(zero, ...pick(ok)).status === "optimal") continue;
    const others = Object.keys(sources).filter((x) => x !== mac).map((x) => sources[x]).join(" or ");
    return [side === ">="
      ? `The ${model.diet.name} diet needs more ${words[mac]} (% of calories) than the allowed foods can give. Allow more ${sources[mac]}, or pick another diet.`
      : `The allowed foods push ${words[mac]} above the ${model.diet.name} diet's maximum share of calories. Allow more ${others}, or pick another diet.`];
  }
  const stages = [["guideline", "The Dietary Guidelines servings for your calorie level (protein foods, dairy, vegetables, fruits, whole grains, healthy fats), half grains whole, or saturated fat under 10% cannot all be met with the allowed foods. Allow more foods, or switch to the textbook model."],
    ["variety", "The variety rule (whole and 2% milk, or the two ground beefs, count as one choice) cannot be met. Choose less variety or allow more foods."],
    ["macro", `The ${model.diet.name} diet's macro split cannot be met together with the nutrient targets.`],
    ["must", "Your must-include foods conflict with the nutrient targets."],
    ["share", "The protein-diversity rule (no food above the max share of protein) cannot be met. Allow more protein foods or raise the max share."],
    ["meal", "The meal-balance rules (calories and protein per meal) cannot be met. Relax the meal ranges or allow more breakfast foods."]];
  const on = new Set(["cap", "group", "nutrient"]);   // stages switch on one rule set at a time
  for (const [kind, msg] of stages) {
    on.add(kind);
    if (simplex(zero, ...pick((k) => on.has(k))).status !== "optimal") return [msg];
  }
  return ["The rules conflict in combination. Try widening the calorie tolerance or allowing more foods."];
}

/** Main entry point: person's targets + preferences -> cheapest balanced daily plan, split by meal. */
export function optimizeDiet(targets, prefs = {}) {
  const model = buildModel(targets, prefs);
  if (!model.foods.length) return { status: "infeasible", reasons: ["No foods are left after applying the diet and exclusions."] };
  const sol = simplex(model.c, model.rows, model.senses, model.rhs);
  const info = { diet: model.diet.name, realistic: model.realistic, level: model.level, notes: model.notes,
    variety: model.realistic ? Number(model.settings.variety ?? 1) : 1 };
  if (sol.status !== "optimal")
    return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], ...info };
  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const totals = Object.fromEntries(model.keys.map((k, i) => [k, model.A[i].reduce((s, v, j) => s + v * x[j], 0)]));
  totals.satfat = model.foods.reduce((s, f, j) => s + f.satfat * x[j], 0);
  const item = (f, j, share = 1) => {
    const g = x[j] * 100 * share;
    return { id: f.id, name: f.name, group: f.group, type: f.type, grams: g, servings: g / f.serving_g, serving: f.serving_desc,
      cost: x[j] * f.cost100 * share, kcal: (f.per100g.kcal * g) / 100, protein: (f.per100g.protein * g) / 100 };
  };
  const plan = model.foods.map((f, j) => item(f, j)).filter((r) => r.grams > 0.5).sort((a, b) => b.cost - a.cost);
  const meals = MEALS.map((meal, m) => {
    const items = model.foods.map((f, j) => item(f, j, f.meal[m])).filter((r) => r.grams > 0.5).sort((a, b) => b.kcal - a.kcal);
    return { meal, items, kcal: items.reduce((s, r) => s + r.kcal, 0), protein: items.reduce((s, r) => s + r.protein, 0),
      cost: items.reduce((s, r) => s + r.cost, 0) };
  });
  const groups = Object.fromEntries(Object.entries(model.groupTargets).map(([g, t]) => [g, { ...t, label: DGA_GROUP_LABELS[g],
    servings: model.foods.reduce((s, f, j) => s + (f.dga_group === g ? (x[j] * 100) / f.dga_serving_g : 0), 0) }]));
  return { status: "optimal", ...info, costPerDay: sol.objective, costPerWeek: sol.objective * 7,
    plan, meals, totals, groups, shopping: shoppingList(model, x, prefs), pivots: sol.pivots,
    model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, x, constraints: model.labels.length } };
}

/** One week of the plan as a shopping list: grams as eaten -> grams as bought (undo cooking, peel/bone, and waste)
 *  -> whole packages. `firstTrip` is what the first week costs at the register; staples (rice, oil, peanut butter)
 *  then last several weeks, so the ongoing cost per week is the plan's cost. */
export function shoppingList(model, x, prefs = {}) {
  const waste = model.realistic && model.settings.include_waste !== false;
  const items = model.foods.map((f, j) => {
    if (x[j] * 100 < 0.5) return null;
    const eatenWeek = 7 * x[j] * 100;
    const buyG = eatenWeek / (f.cook_yield || 1) / f.edible_yield / (waste ? 1 - (f.waste || 0) : 1);
    const price = prefs.prices?.[f.id] ?? f.price;
    const packages = Math.max(1, Math.ceil(buyG / f.package_g - 1e-9));
    return { id: f.id, food: f.buy_name || f.name, eatenWeek, buyG, packages, price, packageG: f.package_g,
      checkout: packages * price, weeks: (packages * f.package_g) / buyG, weekly: (buyG / f.package_g) * price };
  }).filter(Boolean).sort((a, b) => b.checkout - a.checkout);
  return { items, firstTrip: items.reduce((s, r) => s + r.checkout, 0), perWeek: items.reduce((s, r) => s + r.weekly, 0), waste };
}

/** USDA Food Plans (Cost of Food at Home) for a person's age and sex, $ per week. */
export function usdaFoodPlans(age, sex) {
  const P = USDA_FOOD_PLANS, s = sex === "female" ? "female" : "male";
  const tfp = age <= 19 ? "14-19" : age <= 50 ? "20-50" : age <= 70 ? "51-70" : "71+";
  const oth = age <= 18 ? "14-18" : age <= 50 ? "19-50" : age <= 70 ? "51-70" : "71+";
  return { month: P.month, thrifty: P.thrifty[s][tfp], low: P.low[s][oth], moderate: P.moderate[s][oth], liberal: P.liberal[s][oth],
    note: "One person in a 4-person household; USDA adds 20% for someone living alone." };
}

/**
 * Plan with a weekly budget. The realistic plan has a variety rule: one food may supply at most v of its food group's
 * daily servings. A smaller v forces more different foods into each group, which costs more. This tries v = 1 (no
 * variety rule), 1/2, 1/3, 1/4, 1/5 and returns the most varied plan whose weekly cost fits the budget: a
 * parametric linear program, one Simplex solve per level. If even v = 1 is over budget, it says by how much.
 */
export const VARIETY_LEVELS = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5];
export function planWithBudget(targets, prefs = {}, weeklyBudget) {
  const budget = Number(weeklyBudget);
  const realistic = (prefs.settings || {}).realistic ?? SETTINGS.realistic;
  const levels = realistic === false ? [1] : VARIETY_LEVELS;
  const runs = levels.map((v) => ({ variety: v, result: optimizeDiet(targets, { ...prefs, settings: { ...(prefs.settings || {}), variety: v } }) }));
  const ok = runs.filter((r) => r.result.status === "optimal");
  const summary = runs.map((r) => ({ variety: r.variety, foodsPerGroup: Math.round(1 / r.variety), status: r.result.status,
    costPerWeek: r.result.status === "optimal" ? r.result.costPerWeek : null }));
  if (!ok.length) return { status: "infeasible", budget, levels: summary, result: runs[0].result };
  if (!(budget > 0)) { const pick = ok.find((r) => Math.abs(r.variety - (SETTINGS.variety ?? 0.5)) < 1e-9) || ok[0];
    return { status: "no_budget", budget: null, levels: summary, chosen: pick.variety, result: pick.result }; }
  const fits = ok.filter((r) => r.result.costPerWeek <= budget + 1e-9);
  if (!fits.length) return { status: "over_budget", budget, levels: summary, chosen: ok[0].variety, result: ok[0].result,
    shortBy: ok[0].result.costPerWeek - budget };
  const best = fits[fits.length - 1];              // levels are ordered least -> most varied
  return { status: "within_budget", budget, levels: summary, chosen: best.variety, result: best.result,
    leftover: budget - best.result.costPerWeek };
}
