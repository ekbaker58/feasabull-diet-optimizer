# Connecting the FeasaBULL Calories site (Base44) to the optimizer

The site's calculator already produces everything the optimizer needs. The calculator lives in the site's own
code (the function that builds the report, with `calories`, `macros`, `fiber` and `nutrients`). The steps below
pass that report straight into the optimizer, so one click goes person → targets → meal plan.

The `web/index.html` page in this repo already does the whole chain, and you can use it as the reference.

## 1. Add the optimizer file
1. In the Base44 chat, ask: **"Create an empty file src/lib/dietOptimizer.js."**
2. Open the **Code** tab, paste the whole of `src/lib/dietOptimizer.js` from this repo into it, and click **Save**.
   It's a generated file, so paste a new copy whenever the repo version changes and never edit it by hand.

## 2. Paste this prompt into the Base44 chat
```
Connect the calculator report to the meal optimizer. Do NOT edit or re-implement src/lib/dietOptimizer.js.
import { planWithBudget, usdaFoodPlans, FOODS, DIETS } from "@/lib/dietOptimizer";   (use a relative path if @ fails)

1. Right after the report is calculated (the object with calories, macros, fiber, nutrients), build:
   const n = (name) => report.nutrients.find((x) => x.name === name)?.amount;
   const targets = {
     calories: report.calories,
     proteinMin: report.macros.find((m) => m.key === "protein").grams,
     fiber: report.fiber,
     calcium: n("Calcium"), iron: n("Iron"), potassium: n("Potassium"), vitc: n("Vitamin C"),
     sodium: 2300,
   };
2. Below the report add a "Build my cheapest meal plan" section with:
   - Diet dropdown: DIETS.map(d => d.name), with d.desc as helper text -> prefs.diet
   - "Foods I won't eat": checkboxes of FOODS grouped by FOODS[i].group -> prefs.exclude (array of ids)
   - "Weekly food budget ($)": optional number input -> budget
3. Call const B = planWithBudget(targets, prefs, budget) whenever anything changes; const result = B.result.
   B.status is "within_budget" (show "Fits your $X budget", B.leftover), "over_budget" (show "B.shortBy over"),
   or "no_budget".
4. If result.status === "optimal":
   - show result.costPerWeek and result.costPerDay as $0.00
   - a "Shopping list" table from result.shopping.items (food, packages, checkout) and result.shopping.firstTrip
   - one line: "USDA Thrifty Food Plan for you: $" + usdaFoodPlans(age, sex).thrifty + "/week"
   - one card per entry of result.meals (Breakfast, Lunch, Dinner, Snacks): each item's name,
     servings x serving, grams (whole numbers), and the meal's kcal and protein; list items under 10 g on one
     "Plus a little:" line
   - a table: target vs result.totals with a check mark when met
5. If result.status === "infeasible": say no plan meets every rule and list result.reasons.
6. Footer: "Prices: Walmart, Oct 2026. Nutrients: USDA SR28 (as eaten). Servings: Dietary Guidelines 2025–2030. Waste: USDA ERS. Educational estimates, not medical advice."
Match the existing style. No login or database changes.
```

## 3. Fix the activity coefficients (recommended)
The site uses the men's activity coefficients for everyone. Paste this into the Base44 chat:
```
In the calculator, the activity levels use one adultPA/youthPA for both sexes. Make them sex-specific (IOM 2005):
adult men 1, 1.11, 1.25, 1.48; adult women 1, 1.12, 1.27, 1.45;
boys 14-18 1, 1.13, 1.26, 1.42; girls 14-18 1, 1.16, 1.31, 1.56 (inactive, low active, active, very active).
Also change the teen girls' equation constant from +20 to +25. Change nothing else.
```
Without this fix, women's and girls' targets on the site differ from the spreadsheet and the planner page.
They can be up to about 10% low for very active teen girls.

## 4. Check before publishing
- Open **View Changes** and confirm `dietOptimizer.js` was not modified.
- Example person (Male, 21, 5′8″, 155 lb, Active, Maintain, Balanced, no budget): the site must show **3,030 kcal** and
  **$43.01/week ($6.14/day)**, the same as the spreadsheet's Planner and `web/index.html`. With a $60 budget: $56.59/week.
- Then click **Publish**.
