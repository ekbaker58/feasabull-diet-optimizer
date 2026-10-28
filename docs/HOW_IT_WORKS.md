# How the pieces connect

```
 1. PERSON                   2. DAILY TARGETS                    3. CHEAPEST PLAN
 sex, age, height,     ->    calories (EER), protein,      ->    linear program over 71 foods,
 weight, activity, goal      fiber, calcium, iron,               solved by the Simplex method
 (the site's form)           potassium, vitamin C, sodium        -> meals, grams, $/day
                             = the b vector                      x = grams of each food
```

## Step 1 → 2: the person calculator (`src/lib/personTargets.js`)
These are the same equations as the FeasaBULL Calories site. `tests/person_targets.test.mjs` checks them
against 81 people whose results were produced by the site's own code: 0 mismatches.

| Target | How it's calculated |
|---|---|
| Maintenance calories | IOM 2005 EER, rounded to 10. Adult man: 662 − 9.53·age + PA·(15.91·kg + 539.6·m). Adult woman: 354 − 6.91·age + PA·(9.36·kg + 726·m). Teens (14–18) use the youth equations plus 25 kcal. |
| Calories | Maintenance −500 (lose fat), +0 (maintain) or +350 (build muscle). Never below 1,500 for men or 1,200 for women. |
| Protein (minimum) | 1.6 g per kg of body weight, kept between 10% and 30% of calories |
| Fiber (minimum) | 14 g per 1,000 kcal |
| Calcium, iron, potassium, vitamin C | DRI table by age bracket and sex (sheet **DRI Tables**) |
| Sodium (maximum) | 2,300 mg |

**Correction to the live site:** the site uses the men's activity coefficients for women and girls, and adds
+20 kcal instead of +25 for teen girls. IOM 2005 is sex-specific:

| | Low active | Active | Very active |
|---|---|---|---|
| Men 19+ | 1.11 | 1.25 | 1.48 |
| Women 19+ | 1.12 | 1.27 | 1.45 |
| Boys 14–18 | 1.13 | 1.26 | 1.42 |
| Girls 14–18 | 1.16 | 1.31 | 1.56 |

Our code uses the IOM values by default. `{ coefficients: "site" }` (or "Same as current site" in the
spreadsheet) reproduces the live site exactly. Across the 81 test people, the correction changes
women's maintenance calories by −80 to +340 kcal.

## Step 2 → 3: the optimizer (`src/lib/dietOptimizer.js`)
`calculateTargets(person).optimizerTargets` produces exactly the object the optimizer takes:
```js
{ calories, proteinMin, fiber, calcium, iron, potassium, vitc, sodium }
```
Those numbers become the right-hand side **b** of the linear program:

minimize cᵀx subject to b_min ≤ A·x ≤ b_max, plus the diet, meal, Dietary Guidelines and balance rules.

```js
planWithBudget(targets, { diet: "Balanced" }, 60)   // weekly budget in $, optional
// -> { status: "within_budget" | "over_budget" | "no_budget", chosen (variety level), levels, result }
// result: { costPerDay, costPerWeek, meals, plan, groups, shopping: { items, firstTrip, perWeek } }
```
- **Realistic model (default):** Dietary Guidelines 2025–2030 servings for the calorie level, half grains whole,
  saturated fat < 10%, variety, household waste in the cost. **Textbook model:** `settings: { realistic: false }`.
- **Budget:** the planner solves the LP for five variety levels (each food ≤ 100%, 50%, 33%, 25%, 20% of its
  food group) and keeps the most varied plan that fits the budget. If none fits, it says how far over the cheapest one is.
- **As eaten:** amounts are cooked weights (rice, cooked; chicken, roasted). The shopping list undoes cooking,
  peel/bone and waste to give packages to buy and the first-trip cost.

The full model is in `docs/MODEL.md`.

## Where each step lives
| | Person → targets | Targets → plan |
|---|---|---|
| **Website** (`web/index.html`, live page) | `personTargets.js`, live as you type | `dietOptimizer.js` in the browser, five LPs in about 50 ms |
| **Spreadsheet** | Planner steps 1–2 + **DRI Tables** (formulas) | **Matrix Model** + Excel Solver (Simplex LP). Planner section 5: plan type, variety, waste, budget check |
| **FeasaBULL site (Base44)** | its own calculator (already there) | add `dietOptimizer.js`; see `docs/BASE44_INTEGRATION.md` |

The website and the spreadsheet were checked against each other: same targets for 5 test people, and the same
$43.01/week ($6.14/day) realistic Balanced plan for the example person.

## Example: the site's own placeholder person
Male, 21, 5′8″, 155 lb, Active, Maintain → 173 cm, 70.3 kg, PA 1.25 →
**3,030 kcal, protein ≥ 112 g, fiber ≥ 42 g**, calcium 1,000 mg, iron 8 mg, potassium 3,400 mg,
vitamin C 90 mg →
- **Realistic Balanced plan: $43.01/week ($6.14/day)**, every target and every Dietary Guidelines serving met.
  First shopping trip about $76 (whole packages; rice, oats and oil then last several weeks).
- With a **$60/week budget**: the most varied plan that fits, $56.59/week (at most 20% of each food group from one food).
- **Textbook LP** (classic diet problem): $3.28/day. Cheapest on paper; rice, beans and milk.
- A typical student day of similar size costs **$8.96/day** including waste, and misses calories, fiber, potassium and the sodium limit.
- USDA's Thrifty Food Plan for a man 20–50 is **$73.20/week** (May 2026).
