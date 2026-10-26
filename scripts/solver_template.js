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
 *               g_min <= G x <= g_max                   (vegetable/fruit cup-equivalents; caps on meat, beans,
 *                                                        cheese, grains, oils and snacks as groups)
 *               0 <= x <= u                             (portion caps; u_j = 0 when the diet excludes food j)
 *
 *   Preferences change only the objective: minimize (D c)^T x, where D = diag(w) is a diagonal preference matrix
 *   (w_j < 1 for liked foods, > 1 for disliked or already-used foods). The reported cost is always the true c^T x.
 *   planOptions() solves several such LPs (lowest cost, your picks, variety menus); compareOptions() returns
 *   A X (nutrients x options) and the cosine-similarity Gram matrix of the options; weekPlan() turns X d into a
 *   shopping list (d = days per option).
 *
 * THE SOLVER
 *   Two-phase Simplex on a dense tableau. Each pivot is a Gauss-Jordan elimination step
 *   (scale the pivot row, subtract multiples of it from every other row). Bland's rule
 *   prevents cycling. Results were checked against SciPy's HiGHS solver (tests/).
 */

/*__DATA__*/

const BIG = 1e9;
const EPS = 1e-9;

export function getDiet(name) {
  const d = DIETS.find((x) => x.name.toLowerCase() === String(name || "Balanced").toLowerCase());
  if (!d) throw new Error(`Unknown diet "${name}". Options: ${DIETS.map((x) => x.name).join(", ")}`);
  return d;
}

/** $ per 100 g of edible food. priceSource 'bls' uses the BLS U.S. average where one exists. */
export function costPer100g(food, { prices = {}, priceSource = "walmart" } = {}) {
  if (prices[food.id] != null) return (prices[food.id] / (food.package_g * food.edible_yield)) * 100;
  if (priceSource === "bls" && food.bls_cost_per_100g != null) return food.bls_cost_per_100g;
  return food.cost_per_100g;
}

/** prefs.exclude: food ids; prefs.avoid: allergy/attribute flags; prefs.foodSet: 'all' (default) | 'core' (the 71 class foods). */
export function isAllowed(food, diet, exclude = [], prefs = {}) {
  if (exclude.includes(food.id)) return false;
  if (prefs.foodSet === "core" && !food.core) return false;
  const avoid = prefs.avoid || [];
  return !food.flags.some((f) => diet.forbid.includes(f) || avoid.includes(f));
}

/**
 * Build the LP.
 * targets: { calories, fiber, calcium, iron, potassium, vitc (daily minimums), sodium (daily maximum),
 *            sugarMax (optional), proteinMin (optional floor in g, e.g. 0.8 g/kg from the calculator) }
 * prefs:   { diet: 'Balanced'|'High-Protein'|'Low-Carb'|'Vegetarian'|'Vegan'|'Pescatarian'|'Gluten-Free'|'No Pork',
 *            exclude: [foodId], mustInclude: {foodId: servings}, maxServings: {foodId: servings},
 *            prices: {foodId: package price}, priceSource: 'walmart'|'bls', settings: {...overrides} }
 */
export function buildModel(targets, prefs = {}) {
  const diet = getDiet(prefs.diet);
  const S = { ...SETTINGS, ...(prefs.settings || {}) };
  S.meal_kcal = { ...SETTINGS.meal_kcal, ...((prefs.settings || {}).meal_kcal || {}) };
  const kcal = Number(targets.calories);
  if (!(kcal > 0)) throw new Error("targets.calories is required");

  const foods = FOODS.filter((f) => isAllowed(f, diet, prefs.exclude || [], prefs))
    .map((f) => ({ ...f, cost100: costPer100g(f, prefs) }));
  const weights = prefs.weights || {};            // diagonal of the preference matrix D (default 1)
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
    sodium: [null, Math.min(targets.sodium ?? Infinity, diet.sodium_max ?? Infinity)], satfat: [null, null], sugar: [null, targets.sugarMax ?? null],
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
  if (diet.satfat_max != null)                     // saturated fat as a share of the plan's calories (DASH: <= 6%)
    add(A[keys.indexOf("satfat")].map((v, j) => 9 * v - diet.satfat_max * e[j]), "<=", 0,
      `satfat% <= ${Math.round(diet.satfat_max * 100)}% of kcal`, "macro");
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
  // 4. Food-group minimums (USDA cup-equivalents) and group caps (grams or servings)
  const cupRow = (type) => foods.map((f) => (f.type === type ? 100 / f.cup_eq_g : 0));
  if (S.min_veg_cups > 0) add(cupRow("Vegetables"), ">=", S.min_veg_cups, `vegetables >= ${S.min_veg_cups} cup-eq`, "group");
  if (S.min_fruit_cups > 0) add(cupRow("Fruit"), ">=", S.min_fruit_cups, `fruit >= ${S.min_fruit_cups} cup-eq`, "group");
  GROUP_CAPS.forEach((g) => {
    const cap = (S.group_caps || {})[g.key];
    if (cap == null) return;
    const row = foods.map((f) => (f.cap_group !== g.key ? 0 : g.unit === "grams" ? 100 : 100 / f.serving_g));
    if (row.some((v) => v)) add(row, "<=", cap, `${g.key} <= ${cap} ${g.unit}`, "group");
  });
  // 5. Portion caps and must-include foods (rows of the identity matrix)
  const caps = prefs.maxServings || {}, must = prefs.mustInclude || {};
  const u = foods.map((f) => (f.serving_g * (caps[f.id] ?? f.max_servings)) / 100);
  foods.forEach((f, j) => {
    const row = new Array(n).fill(0); row[j] = 1;
    add(row, "<=", u[j], `${f.id} <= cap`, "cap");
    if (must[f.id]) add(row.slice(), ">=", (f.serving_g * must[f.id]) / 100, `${f.id} >= must-include`, "must");
  });
  const c = foods.map((f) => f.cost100);
  const cObj = foods.map((f, j) => c[j] * (weights[f.id] ?? 1));     // D c
  return { diet, settings: S, foods, keys, A, c, cObj, u, rows, senses, rhs, labels, kinds };
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
  const stages = [["macro", `The ${model.diet.name} diet's macro split cannot be met together with the nutrient targets.`],
    ["must", "Your must-include foods conflict with the nutrient targets."],
    ["share", "The protein-diversity rule (no food above the max share of protein) cannot be met. Allow more protein foods or raise the max share."],
    ["meal", "The meal-balance rules (calories and protein per meal) cannot be met. Relax the meal ranges or allow more breakfast foods."]];
  const on = new Set(["cap", "group", "nutrient"]);
  for (const [kind, msg] of stages) {
    on.add(kind);
    if (simplex(zero, ...pick((k) => on.has(k))).status !== "optimal") return [msg];
  }
  return ["The rules conflict in combination. Try widening the calorie tolerance or allowing more foods."];
}

/** Main entry point: person's targets + preferences -> cheapest balanced daily plan, split by meal.
 *  prefs.weights {foodId: w} scales food j's cost in the OBJECTIVE only (minimize (Dc)^T x); costPerDay is the true c^T x. */
export function optimizeDiet(targets, prefs = {}) {
  const model = buildModel(targets, prefs);
  if (!model.foods.length) return { status: "infeasible", reasons: ["No foods are left after applying the diet and exclusions."] };
  const sol = simplex(model.cObj, model.rows, model.senses, model.rhs);
  if (sol.status !== "optimal")
    return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], diet: model.diet.name };
  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const cost = model.c.reduce((s, cj, j) => s + cj * x[j], 0);           // true cost c^T x
  const totals = Object.fromEntries(model.keys.map((k, i) => [k, model.A[i].reduce((s, v, j) => s + v * x[j], 0)]));
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
  return { status: "optimal", diet: model.diet.name, costPerDay: cost, costPerWeek: cost * 7, objective: sol.objective,
    plan, meals, totals, pivots: sol.pivots,
    model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, cObj: model.cObj, x, constraints: model.labels.length,
             labels: model.labels } };
}

/** How preferences and variety enter the objective (diagonal of D). Team design choices, not nutrition rules. */
export const OPTION_RULES = {
  like: 0.6,          // a liked food is treated as 40% cheaper when choosing (its real price is still what you pay)
  dislike: 1.75,      // a food you'd rather avoid is treated as 75% more expensive (it can still appear if it is needed)
  repeat: 1.5,        // variety menus: each earlier option that used a food (>= 15 g) multiplies its cost by 1.5
  minGrams: 15,
};

/**
 * Several plans for the same person and diet, each the solution of one LP with a different objective D c:
 *   1. "Lowest cost": D = I (the true minimum).
 *   2. "Your picks" (only when the person liked or disliked foods): D from their likes/dislikes.
 *   3+. "Something different" / "Mix it up": D also penalizes foods that earlier options already used.
 * Every option meets every rule; only the objective changes.
 */
export function planOptions(targets, prefs = {}, { count = 3 } = {}) {
  const pref = {};
  for (const id of prefs.likes || []) pref[id] = OPTION_RULES.like;
  for (const id of prefs.dislikes || []) pref[id] = OPTION_RULES.dislike;
  const hasPrefs = Object.keys(pref).length > 0;
  const base = { ...prefs, weights: {} };
  const cheapest = optimizeDiet(targets, base);
  if (cheapest.status !== "optimal") return { status: cheapest.status, reasons: cheapest.reasons, diet: cheapest.diet, options: [] };
  const options = [{ key: "cheapest", title: "Lowest cost", blurb: "The cheapest day that meets every target.", weights: {}, result: cheapest }];
  if (hasPrefs) {
    // Liked foods: at least one serving each (a lower bound l_j on x_j) when the rules allow it, plus the D weights.
    const diet = getDiet(prefs.diet);
    const liked = (prefs.likes || []).filter((id) => { const f = FOODS.find((x) => x.id === id); return f && isAllowed(f, diet, prefs.exclude || [], prefs); });
    const must = { ...(prefs.mustInclude || {}) };
    for (const id of liked) must[id] = Math.max(must[id] || 0, Math.min(1, FOODS.find((x) => x.id === id).max_servings));
    let r = liked.length ? optimizeDiet(targets, { ...prefs, weights: pref, mustInclude: must }) : { status: "skip" };
    let blurb = "Includes a serving of each food you like, and leans away from the ones you'd rather skip.", mustInclude = must;
    if (r.status !== "optimal") {
      r = optimizeDiet(targets, { ...prefs, weights: pref }); mustInclude = prefs.mustInclude;
      blurb = "Leans toward the foods you like (not all of them fit your targets at once).";
    }
    if (r.status === "optimal") options.push({ key: "picks", title: "Your picks", blurb, weights: pref, mustInclude, result: r });
  }
  const variety = [["different", "Something different", "Swaps out the main foods of the plans above."],
                   ["mix", "Mix it up", "A third menu, so a week can rotate between plans."],
                   ["fourth", "One more", "Another rotation menu."]];
  const uses = {};
  for (let v = 0; options.length < count + (hasPrefs ? 1 : 0) && v < variety.length; v++) {
    for (const o of options.slice(-1)) for (const it of o.result.plan) if (it.grams >= OPTION_RULES.minGrams) uses[it.id] = (uses[it.id] || 0) + 1;
    const w = { ...(hasPrefs ? pref : {}) };
    for (const [id, k] of Object.entries(uses)) w[id] = (w[id] ?? 1) * OPTION_RULES.repeat ** k;
    const r = optimizeDiet(targets, { ...prefs, weights: w });
    if (r.status !== "optimal") break;
    const [key, title, blurb] = variety[v];
    const same = options.some((o) => compareOptions([o.result, r]).similarity[0][1] > 0.999);
    options.push({ key, title, blurb, weights: w, result: r, duplicate: same });
  }
  const kept = options.filter((o, k) => k === 0 || !(o.duplicate || (o.key === "picks" && compareOptions([cheapest, o.result]).similarity[0][1] > 0.999)));
  kept.forEach((o, k) => { o.letter = "ABCDE"[k]; o.extraPerDay = o.result.costPerDay - cheapest.costPerDay; delete o.duplicate; });
  return { status: "optimal", diet: cheapest.diet, options: kept, ...compareOptions(kept.map((o) => o.result)) };
}

/** Options side by side. X = grams matrix (foods x options); A X = nutrients x options; S = cosine-similarity Gram matrix of
 *  the calorie vectors (e o x): S_ab = 1 means two menus get their calories from the same foods in the same proportions. */
export function compareOptions(results) {
  const grams = results.map((r) => Object.fromEntries(r.model.foods.map((id, j) => [id, r.model.x[j] * 100])));  // full x, not the display list
  const ids = FOODS.map((f) => f.id).filter((id) => grams.some((g) => g[id] > 0));
  const byId = Object.fromEntries(FOODS.map((f) => [f.id, f]));
  const X = ids.map((id) => grams.map((g) => g[id] ?? 0));                                              // grams, foods x options
  const AX = NUTRIENTS.map((n) => results.map((_, k) => ids.reduce((s, id, j) => s + byId[id].per100g[n.key] * X[j][k] / 100, 0)));
  const K = ids.map((id, j) => X[j].map((g) => byId[id].per100g.kcal * g / 100));                    // calorie vectors
  const dot = (a, b) => K.reduce((s, row) => s + row[a] * row[b], 0);
  const S = results.map((_, a) => results.map((_, b) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b) || 1)));
  return { foods: ids, X, AX, similarity: S };
}

/** Cheapest plan for every diet (same person, same allergy/food choices): which diets fit, and what each costs. */
export function compareDiets(targets, prefs = {}) {
  return DIETS.map((d) => {
    const r = optimizeDiet(targets, { ...prefs, diet: d.name, weights: {} });
    return { diet: d.name, desc: d.desc, status: r.status, costPerDay: r.costPerDay ?? null, protein: r.totals?.protein ?? null,
      foods: r.plan?.length ?? 0, reasons: r.reasons || [] };
  });
}

/** A week: d_k = days on option k. Weekly grams g = X d (a matrix-vector product), then whole packages to buy.
 *  Foods priced per pound are bought by weight; others round up to whole packages, so checkout >= LP cost. */
export function weekPlan(results, days, { priceSource = "walmart" } = {}) {
  const { foods, X } = compareOptions(results);
  const byId = Object.fromEntries(FOODS.map((f) => [f.id, f]));
  const lines = foods.map((id, j) => {
    const f = byId[id];
    const grams = X[j].reduce((s, g, k) => s + g * (days[k] || 0), 0);                         // (X d)_j
    const edible = f.package_g * f.edible_yield;
    const byWeight = /per lb/i.test(f.product);
    const pkgPrice = priceSource === "bls" && f.bls_cost_per_100g != null ? f.bls_cost_per_100g * edible / 100 : f.price;
    const packages = byWeight ? grams / edible : Math.ceil(grams / edible - 1e-9);
    return { id, name: f.name, group: f.group, product: f.product, grams, byWeight, packages, pounds: grams / f.edible_yield / 453.592,
      checkout: packages * pkgPrice, eaten: grams / edible * pkgPrice, source: f.price_source };
  }).filter((l) => l.grams > 0).sort((a, b) => a.group.localeCompare(b.group) || b.checkout - a.checkout);
  const eaten = lines.reduce((s, l) => s + l.eaten, 0), checkout = lines.reduce((s, l) => s + l.checkout, 0);
  return { lines, eaten, checkout, leftover: checkout - eaten, days };
}
