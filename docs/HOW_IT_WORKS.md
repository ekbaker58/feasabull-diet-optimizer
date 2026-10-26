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
`calculateTargets(person).optimizerTargets` produces exactly the object `optimizeDiet()` takes:
```js
{ calories, proteinMin, fiber, calcium, iron, potassium, vitc, sodium }
```
Those numbers become the right-hand side **b** of the linear program:

minimize cᵀx subject to b_min ≤ A·x ≤ b_max, plus the diet, meal and balance rules.

The full model is in `docs/MODEL.md`.

## Where each step lives
| | Person → targets | Targets → plan |
|---|---|---|
| **Website** (`web/index.html`, live page) | `personTargets.js`, live as you type | `dietOptimizer.js` in the browser, ~20 ms per plan |
| **Spreadsheet** | Planner steps 1–2 + **DRI Tables** (formulas) | **Matrix Model** + Excel Solver (Simplex LP) |
| **FeasaBULL site (Base44)** | its own calculator (already there) | add `dietOptimizer.js`; see `docs/BASE44_INTEGRATION.md` |

The website and the spreadsheet were checked against each other: same targets for 5 test people, and the same
$3.02/day plan for the example person.

## Example: the site's own placeholder person
Male, 21, 5′8″, 155 lb, Active, Maintain → 173 cm, 70.3 kg, PA 1.25 →
**3,030 kcal, protein ≥ 112 g, fiber ≥ 42 g**, calcium 1,000 mg, iron 8 mg, potassium 3,400 mg,
vitamin C 90 mg → cheapest Balanced plan **$2.87/day ($20.12/week)** from all 146 foods, every target met
(**$3.02/day, $21.13/week** with the original 71-food core list).
A typical student day of similar size costs **$6.89** and misses protein, fiber, potassium, sodium and fat limits.

## Step 3 → 4: options, every diet, and a week
The planner page does not stop at one plan. `planOptions(targets, prefs)` solves a few more LPs with the same rules
but a different objective (D c)ᵀx, where D is a diagonal preference matrix:
- **A · Lowest cost** (D = I);
- **Your picks** (if you liked or banned foods): liked foods weighted 0.6, and at least one serving each when possible;
- **Something different / Mix it up**: foods already used by earlier menus cost 1.5× more per earlier use, so the solver
  swaps them out.

For the example person (Balanced) that gives $2.87, $3.42 and $3.66 a day. `compareOptions` stacks the plans as columns
of X and returns A·X (every nutrient for every plan) and a cosine-similarity matrix of where the calories come from.
`compareDiets` solves every diet for the person, and `weekPlan(X, d)` turns days-per-plan d into weekly grams X·d and
a shopping list with whole packages.

Inputs on the page: the calculator fields, the diet, allergy filters, foods you like or never eat, an optional daily
budget, and the food list (all 146 foods, or the core 71).
