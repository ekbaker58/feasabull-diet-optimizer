/**
 * FeasaBULL diet optimizer — linear programming solved with the Simplex method.
 * Team 9 (Sinister Seven), EGN4450, USF, Fall 2026.
 *
 * THE MODEL (matrix form)
 *   x  (n x 1)  diet vector: x_j = amount of food j eaten per day, in 100 g units
 *   c  (n x 1)  cost vector: c_j = $ per 100 g edible portion of food j
 *   A  (m x n)  nutrient matrix: A_ij = amount of nutrient i in 100 g of food j
 *   b_min, b_max (m x 1)  daily nutrient targets from the calculator
 *
 *   minimize    c^T x                 (total cost per day)
 *   subject to  A x >= b_min          (meet every minimum)
 *               A x <= b_max          (stay under every maximum)
 *               0 <= x <= u           (portion caps / food exclusions)
 *
 * THE SOLVER
 *   Two-phase Simplex on a dense tableau. Every pivot is a Gauss-Jordan step made of
 *   elementary row operations (scale the pivot row, then subtract multiples of it
 *   from every other row). Bland's rule picks entering/leaving variables so the
 *   method cannot cycle.
 *
 * DATA
 *   Prices: U.S. Bureau of Labor Statistics, Average Price Data, U.S. city average, September 2026.
 *   Nutrients: USDA National Nutrient Database for Standard Reference, Release 28 (SR28),
 *   per 100 g edible portion. Prices are converted to $ per 100 g EDIBLE portion using
 *   USDA refuse percentages (bone, peel, shell).
 */

export const PRICE_SOURCE = "BLS Average Price Data, U.S. city average, September 2026";
export const NUTRIENT_SOURCE = "USDA National Nutrient Database for Standard Reference, Release 28";

/*__DATA__*/

/** $ per 100 g of edible food. Returns null when the food has no price yet. */
export function costPer100g(food, priceOverride) {
  const price = priceOverride ?? food.price;
  if (price == null || !(price > 0)) return null;
  const edibleGrams = food.purchase_g * food.edible_yield;
  return (price / edibleGrams) * 100;
}

const DIET_RULES = {
  none: () => true,
  vegetarian: (f) => !f.tags.includes("meat") && !f.tags.includes("fish"),
  pescatarian: (f) => !f.tags.includes("meat"),
  vegan: (f) => !["meat", "fish", "dairy", "egg", "contains-dairy-egg", "may-contain-dairy"].some((t) => f.tags.includes(t)),
  "no-pork": (f) => !f.tags.includes("pork"),
};

/**
 * Build the LP in matrix form.
 * targets: { calories, calorieTolerance (default 0.05), protein:[min,max], carb:[min,max],
 *            fat:[min,max], fiber, calcium, iron, potassium, vitc (minimums), sodium (maximum),
 *            sugar (maximum, optional) }
 * prefs:   { diet: 'none'|'vegetarian'|'pescatarian'|'vegan'|'no-pork',
 *            exclude: [foodId], mustInclude: {foodId: minServings},
 *            maxServings: {foodId: n}, prices: {foodId: price in that food's price unit} }
 */
export function buildModel(targets, prefs = {}) {
  const diet = DIET_RULES[prefs.diet || "none"];
  if (!diet) throw new Error(`Unknown diet "${prefs.diet}"`);
  const exclude = new Set(prefs.exclude || []);
  const prices = prefs.prices || {};

  const foods = FOODS.filter((f) => !exclude.has(f.id) && diet(f))
    .map((f) => ({ ...f, cost100: costPer100g(f, prices[f.id]) }))
    .filter((f) => f.cost100 != null);
  const n = foods.length;

  // Nutrient matrix A (m x n): rows = nutrients, columns = foods.
  const nutrientKeys = NUTRIENTS.map((k) => k.key);
  const A = nutrientKeys.map((k) => foods.map((f) => f.per100g[k]));

  // Target vectors b_min, b_max.
  const tol = targets.calorieTolerance ?? 0.05;
  const bounds = {
    kcal: [targets.calories * (1 - tol), targets.calories * (1 + tol)],
    protein: targets.protein, carb: targets.carb, fat: targets.fat,
    fiber: [targets.fiber, null], calcium: [targets.calcium, null], iron: [targets.iron, null],
    potassium: [targets.potassium, null], vitc: [targets.vitc, null],
    sodium: [null, targets.sodium], sugar: [null, targets.sugar],
  };

  // Stack every constraint as one row of a big system:  M x (<=, >=) rhs
  const rows = [], senses = [], rhs = [], labels = [];
  nutrientKeys.forEach((k, i) => {
    const [lo, hi] = bounds[k] || [null, null];
    if (lo != null && lo > 0) { rows.push(A[i]); senses.push(">="); rhs.push(lo); labels.push(`${k} >= min`); }
    if (hi != null) { rows.push(A[i]); senses.push("<="); rhs.push(hi); labels.push(`${k} <= max`); }
  });
  // Upper bounds x_j <= u_j and lower bounds x_j >= l_j are rows of the identity matrix.
  const caps = prefs.maxServings || {};
  const must = prefs.mustInclude || {};
  foods.forEach((f, j) => {
    const e = new Array(n).fill(0); e[j] = 1;
    const u = (f.serving_g * (caps[f.id] ?? f.max_servings)) / 100;
    rows.push(e); senses.push("<="); rhs.push(u); labels.push(`${f.id} <= cap`);
    if (must[f.id]) {
      rows.push(e.slice()); senses.push(">="); rhs.push((f.serving_g * must[f.id]) / 100); labels.push(`${f.id} >= must`);
    }
  });
  const c = foods.map((f) => f.cost100);
  return { foods, A, c, rows, senses, rhs, labels, nutrientKeys };
}

const EPS = 1e-9;

/** Gauss-Jordan pivot: make column `col` the unit vector e_r using elementary row operations. */
function pivot(T, r, col) {
  const pr = T[r];
  const p = pr[col];
  for (let k = 0; k < pr.length; k++) pr[k] /= p;              // R_r <- R_r / a_rc
  for (let i = 0; i < T.length; i++) {
    if (i === r) continue;
    const f = T[i][col];
    if (Math.abs(f) < EPS) continue;
    const row = T[i];
    for (let k = 0; k < row.length; k++) row[k] -= f * pr[k];   // R_i <- R_i - a_ic * R_r
  }
}

/** Run Simplex iterations on tableau T (last row = reduced costs, last column = RHS). */
function iterate(T, basis, allowed, trace) {
  const m = T.length - 1, last = T[0].length - 1;
  for (let it = 0; it < 20000; it++) {
    const z = T[m];
    let col = -1;                                         // Bland: lowest-index improving column
    for (let j = 0; j < last; j++) if (allowed[j] && z[j] < -EPS) { col = j; break; }
    if (col === -1) return "optimal";
    let r = -1, best = Infinity;
    for (let i = 0; i < m; i++) {                          // minimum-ratio test
      const a = T[i][col];
      if (a > EPS) {
        const ratio = T[i][last] / a;
        if (ratio < best - EPS || (Math.abs(ratio - best) <= EPS && basis[i] < basis[r])) { best = ratio; r = i; }
      }
    }
    if (r === -1) return "unbounded";
    pivot(T, r, col);
    basis[r] = col;
    if (trace) trace.push({ entering: col, leavingRow: r, objective: -T[m][last] });
  }
  return "iteration-limit";
}

/** Minimize c.x subject to rows (<=, >=, =) rhs and x >= 0. Two-phase Simplex. */
export function simplex(c, rows, senses, rhs, { trace = false } = {}) {
  const n = c.length, m = rows.length;
  rows = rows.map((r) => r.slice()); senses = senses.slice(); rhs = rhs.slice();
  for (let i = 0; i < m; i++) if (rhs[i] < 0) {                // make every RHS >= 0
    rows[i] = rows[i].map((v) => -v); rhs[i] = -rhs[i];
    senses[i] = senses[i] === "<=" ? ">=" : senses[i] === ">=" ? "<=" : "=";
  }
  const nSlack = senses.filter((s) => s !== "=").length;
  const nArt = senses.filter((s) => s !== "<=").length;
  const N = n + nSlack + nArt;                                  // total columns
  const T = [], basis = [];
  let s = n, a = n + nSlack;
  const isArt = new Array(N).fill(false);
  for (let i = 0; i < m; i++) {                                 // [A | S | Art | b]
    const row = new Float64Array(N + 1);
    for (let j = 0; j < n; j++) row[j] = rows[i][j];
    if (senses[i] === "<=") { row[s] = 1; basis.push(s++); }
    else {
      if (senses[i] === ">=") row[s++] = -1;
      row[a] = 1; isArt[a] = true; basis.push(a++);
    }
    row[N] = rhs[i];
    T.push(row);
  }
  const steps = trace ? [] : null;

  // Phase 1: minimize the sum of artificial variables to find a feasible corner.
  const z1 = new Float64Array(N + 1);
  for (let j = 0; j < N; j++) if (isArt[j]) z1[j] = 1;
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) for (let k = 0; k <= N; k++) z1[k] -= T[i][k];
  T.push(z1);
  const all = new Array(N).fill(true);
  let status = iterate(T, basis, all, steps);
  const phase1Iterations = steps ? steps.length : null;
  if (-T[m][N] > 1e-7) return { status: "infeasible" };

  // Drive any artificial variable that is still basic (at zero) out of the basis.
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) {
    let j = 0;
    while (j < N && (isArt[j] || Math.abs(T[i][j]) < EPS)) j++;
    if (j < N) { pivot(T, i, j); basis[i] = j; }
  }

  // Phase 2: minimize the real cost, never letting an artificial re-enter.
  const z2 = new Float64Array(N + 1);
  for (let j = 0; j < n; j++) z2[j] = c[j];
  for (let i = 0; i < m; i++) { const cb = basis[i] < n ? c[basis[i]] : 0; if (cb) for (let k = 0; k <= N; k++) z2[k] -= cb * T[i][k]; }
  T[m] = z2;
  status = iterate(T, basis, isArt.map((v) => !v), steps);
  if (status !== "optimal") return { status };

  const x = new Array(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
  return { status, x, objective: -T[m][N], iterations: steps ? steps.length : undefined, phase1Iterations, steps };
}

/** Matrix-vector product A x. */
export function matVec(A, x) { return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)); }

/** Explain which limits make a request impossible (checked one nutrient at a time). */
function diagnose(model) {
  const { foods, A, nutrientKeys, rows, senses, rhs, labels } = model;
  const u = foods.map((f, j) => { const k = labels.indexOf(`${f.id} <= cap`); return rhs[k]; });
  const l = foods.map((f) => { const k = labels.indexOf(`${f.id} >= must`); return k >= 0 ? rhs[k] : 0; });
  const problems = [];
  labels.forEach((lab, k) => {
    const [key, op] = lab.split(" ");
    const i = nutrientKeys.indexOf(key);
    if (i < 0) return;
    const best = A[i].reduce((s, v, j) => s + v * (op === ">=" ? u[j] : l[j]), 0);
    if (op === ">=" && best < rhs[k] - 1e-6) problems.push(`${key}: even the most your allowed foods can provide (${best.toFixed(0)}) is below the minimum (${rhs[k].toFixed(0)})`);
    if (op === "<=" && best > rhs[k] + 1e-6) problems.push(`${key}: your must-include foods alone (${best.toFixed(0)}) exceed the maximum (${rhs[k].toFixed(0)})`);
  });
  return problems.length ? problems : ["No single nutrient is impossible, but the targets conflict in combination. Try widening the calorie tolerance, allowing more foods, or raising portion caps."];
}

/** Main entry point: targets + preferences -> cheapest daily diet that meets every target. */
export function optimizeDiet(targets, prefs = {}) {
  const model = buildModel(targets, prefs);
  if (model.foods.length === 0) return { status: "infeasible", reasons: ["No foods are left after applying the preferences."] };
  const sol = simplex(model.c, model.rows, model.senses, model.rhs, { trace: true });
  if (sol.status !== "optimal") return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], model };

  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const Ax = matVec(model.A, x);
  const plan = model.foods
    .map((f, j) => ({ id: f.id, name: f.name, grams: x[j] * 100, servings: (x[j] * 100) / f.serving_g,
      serving: f.serving_desc, cost: x[j] * f.cost100 }))
    .filter((p) => p.grams > 0.5)
    .sort((p, q) => q.cost - p.cost);
  const totals = Object.fromEntries(model.nutrientKeys.map((k, i) => [k, Ax[i]]));
  return { status: "optimal", costPerDay: sol.objective, costPerWeek: sol.objective * 7, plan, totals,
    iterations: sol.iterations, model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, x } };
}
