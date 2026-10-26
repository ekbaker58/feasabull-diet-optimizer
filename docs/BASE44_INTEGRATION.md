# Adding the optimizer to the FeasaBULL website (Base44)

The calculator already turns a person's sex, age, height, weight, activity and goal into daily targets.
The optimizer takes those targets plus the person's preferences and returns the cheapest balanced day, split by meal.

## 1. Put the optimizer file in the app
1. In the Base44 chat, ask: **"Create an empty file src/lib/dietOptimizer.js."**
   (Base44's docs don't say whether the Code tab can create new files, so let the AI create it.)
2. Open the **Code** tab, open that file, paste the whole contents of `src/lib/dietOptimizer.js` from this repo, click **Save**.
3. When the repo version changes, repeat step 2 (it is a generated file — never edit it by hand).

## 2. Paste this prompt into the Base44 chat
```
Add a "Build my cheapest meal plan" section below the calculator report.
Import from the existing file and do NOT edit or re-implement it:
import { optimizeDiet, FOODS, DIETS, MEALS } from "@/lib/dietOptimizer";   (use a relative path if @ fails)

1. After "Calculate my numbers", build targets from the report (grams for fiber, mg for minerals):
   { calories, fiber, calcium, iron, potassium, vitc, sodium, proteinMin }
   - calories = the daily calorie target; sodium = the upper limit; proteinMin = the protein RDA in grams if the report shows one.
2. Preference controls:
   - Diet dropdown with DIETS.map(d => d.name) and d.desc as helper text -> prefs.diet
   - "Foods I won't eat": multi-select of FOODS grouped by FOODS[i].group (show name, store id) -> prefs.exclude
   - "Foods I want": pick foods + minimum servings -> prefs.mustInclude = { id: servings }
   - Price source toggle: "Walmart (Oct 2026)" / "BLS U.S. average (Sep 2026)" -> prefs.priceSource = 'walmart' | 'bls'
3. "Build my plan" calls optimizeDiet(targets, prefs).
4. If result.status === "optimal":
   - Show costPerDay and costPerWeek as $0.00.
   - For each entry of result.meals (Breakfast, Lunch, Dinner, Snacks): a card listing items
     (name, servings x serving, grams rounded to whole numbers) and the meal's kcal and protein.
   - A nutrient table: target vs result.totals with a check mark when met.
   - A collapsed "Show the math" panel: matrix A (rows = nutrient names, columns = food names from
     result.model.foods looked up in FOODS), vector c, vector x, and "Solved by the Simplex method in
     {result.pivots} pivots ({result.model.constraints} constraints)".
5. If result.status === "infeasible": say no plan meets every rule and list result.reasons.
6. Footer: "Prices: Walmart, Oct 2026. Nutrients: USDA SR28. Educational estimates only — not medical advice."
Match the existing style. No login or database changes.
```

## 3. Before publishing
- Open **View Changes** on the AI's message and confirm it did **not** modify `dietOptimizer.js`.
- Test with the example person (2,600 kcal, fiber 38 g, calcium 1,000 mg, iron 8 mg, potassium 3,400 mg,
  vitamin C 90 mg, sodium 2,300 mg, Balanced): the site must show **$2.53/day** — the same as the spreadsheet's Planner.
- Then click **Publish**.

## API reference
```js
optimizeDiet(targets, prefs) -> {
  status: 'optimal' | 'infeasible',
  costPerDay, costPerWeek, diet,
  meals: [{ meal, items: [{ id, name, grams, servings, serving, cost, kcal, protein }], kcal, protein, cost }],
  plan:  [...same items for the whole day, most expensive first],
  totals: { kcal, protein, carb, fat, fiber, sugar, calcium, iron, potassium, sodium, vitc },
  pivots, model: { foods, A, c, x, constraints },
  reasons: [...]            // only when infeasible
}
prefs = { diet, exclude: [ids], mustInclude: {id: servings}, maxServings: {id: n},
          prices: {id: package price}, priceSource: 'walmart'|'bls',
          settings: { calorie_tolerance, max_protein_share, min_meal_protein_share, meal_kcal: {...},
                      min_veg_cups, min_fruit_cups, group_caps: {...} } }
```
