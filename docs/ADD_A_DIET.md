# Adding or changing a diet

Every diet on the website and in the spreadsheet comes from one file, **`config/diets.json`**. Edit that file and
commit it, and the rest updates automatically. No Python or JavaScript is needed.

## The quick way: edit on github.com
1. Open the repo on GitHub → `config` → `diets.json` → the **pencil** icon (Edit).
2. Copy an existing diet block, from `{` to `},`, and paste it after another diet. Change the values (see the reference below).
3. Click **Commit changes**. Committing straight to `main` works. Choosing "Create a new branch" opens a pull request, so teammates can review first.
4. Open the **Actions** tab. The "Rebuild and test" run takes about 3 minutes.
   - **Green check:** the diet is valid and the example person gets a plan. The bot then commits the rebuilt files:
     - `src/lib/dietOptimizer.js`
     - `web/index.html`
     - `docs/FOOD_LIST.md`
     - the spreadsheet
   - **Red X:** click into the run and open the "Check config/diets.json" or "Build and test everything" step. The message says what's wrong, e.g. `"peanut buttr" ... (closest: peanut butter)`. Fix it and commit again. Nothing is published until the run passes.
5. To see the result, pull the repo (or download `web/index.html`) and open `web/index.html` in a browser. If the site is hosted on Netlify or GitHub Pages (see the README), it updates by itself.

## One diet, field by field
```json
{
  "name": "Nut-Free",
  "description": "No peanuts or tree nuts",
  "protein_pct": [10, 35],
  "carbs_pct": [45, 65],
  "fat_pct": [20, 35],
  "no": ["peanut_butter", "almonds"]
}
```
| Field | Meaning | Rules |
|---|---|---|
| `name` | Shown in the diet menu | Must be unique |
| `description` | One line under the menu | Required |
| `protein_pct`, `carbs_pct`, `fat_pct` | Allowed share of the plan's calories, as [min, max] in percent | 0 ≤ min ≤ max ≤ 100. The three minimums must add up to 100% or less, and the three maximums to 100% or more. The USDA ranges (AMDR) are protein 10–35, carbs 45–65, fat 20–35 |
| `no` | What the diet removes | A list of names in quotes; can be empty `[]` |

Each name in `no` can be:
- **an attribute**: `red meat` (this includes pork, since pork foods carry both flags), `pork`, `poultry`, `fish`, `eggs`, `dairy`, `gluten`
- **a food group**: e.g. `Snacks & Sweets`
- **a food type**: e.g. `Grains & Bread`, `Plant Proteins`
- **one food**: by id or by full name, e.g. `peanut_butter` or `Peanut butter`

Names aren't case-sensitive. The full list is in **[`docs/FOOD_LIST.md`](FOOD_LIST.md)**.

### Check what a name actually removes
Food types are broad, and some foods sit in categories you might not expect:
- **`Nuts & Seeds`** includes **avocado**. If you mean nuts only, list `almonds` and `peanut_butter` instead.
- **Peanut butter** is under `Plant Proteins`, not `Nuts & Seeds`.
- **Soy milk** is a dairy *alternative*: `dairy` doesn't remove it. List `soy_milk` if your diet excludes soy.
- **`eggs` also removes chocolate-chip cookies**, and **`dairy` also removes cookies, granola bars, ice cream and butter**, because those foods are flagged as containing them.

To see exactly what each diet removes, run `python scripts/diets.py`. If you didn't run it yourself, read it in the "Check config/diets.json" step of the Actions log.

## Tested examples (example person: male, 21, 5′8″, 155 lb, active, maintain)
Each of these was run through the optimizer with the rules above. "Realistic" is the default plan (Dietary
Guidelines servings, variety, household waste); "Textbook" is the plain least-cost LP.

| Diet | `no` | Macros (P / C / F %) | Realistic | Textbook |
|---|---|---|---|---|
| Balanced (for comparison) | — | 10–35 / 45–65 / 20–35 | $43.01/week ($6.14/day) | $3.28/day |
| Nut-Free | `peanut_butter`, `almonds` | 10–35 / 45–65 / 20–35 | $44.40/week | $3.47/day |
| Dairy-Free | `dairy` | 10–35 / 45–65 / 20–35 | $54.10/week | $3.79/day |
| Mediterranean-style | `red meat`, `Snacks & Sweets` | 15–30 / 40–55 / 25–40 | $43.14/week | $3.35/day |
| Paleo-style | `Grains & Bread`, `Plant Proteins`, `dairy`, `soy_milk`, `Snacks & Sweets` | 20–35 / 25–45 / 30–45 | **No possible plan** | $12.34/day |
| Keto (carbs 5–10%) | `Grains & Bread`, `Snacks & Sweets` | 15–30 / 5–10 / 60–75 | **No possible plan** | **No possible plan** |

**When a diet excludes a whole food group** (Paleo-style has no dairy and no whole grains), the page says that
group's guideline is skipped. Paleo-style still fails in the realistic model, because its macro split can't be met
together with the nutrient targets and the remaining guideline servings. The build would reject it, since it gives
the example person no plan.

**Why keto fails:** the fiber target is what blocks it. The person calculator sets fiber at 14 g per 1,000 kcal,
which is 42 g for this person. Fiber in these 71 foods comes with carbohydrate, so 42 g of fiber is impossible with
carbs at 10% of calories. We checked this: with the fiber target removed, the textbook keto plan becomes feasible at
$12.17/day; with it kept, no plan exists. The fiber target is part of the b vector from `src/lib/personTargets.js`,
not a diet option, and it applies to every diet. A keto diet therefore means changing the nutrition rules, so decide
that as a team; don't add a per-diet workaround.

**Why restrictive diets cost more:** each `no` entry sets the upper bound u_j = 0 for every food it removes, which shrinks the feasible region. The minimum cost can stay the same or go up, but never down.

## What a diet changes in the math
- **Constraint rows:** the macro split becomes rows of the constraint matrix.
  - 4·protein(x) − p_min·kcal(x) ≥ 0, and ≤ 0 with p_max (carbs use 4, fat uses 9).
- **Upper bounds:** every food in `no` gets u_j = 0.
- **Spreadsheet:**
  - The **Diets** sheet holds the rows.
  - On **Food Data**, "Blocked by diet" is the dot product (food attribute row) · (diet's forbidden row), plus 1 if the food's # is in the diet's "Also excluded" column.

## Trying a diet without committing
- **On your own computer:**
  ```bash
  python scripts/diets.py          # checks the file and lists what each diet removes
  python scripts/build_all.py      # full rebuild + every test (run scripts/fetch_usda.sh once first)
  ```
- **In code, without touching the file:**
  ```js
  optimizeDiet(targets, { diet: { name: "Test", protein: [0.1, 0.35], carb: [0.45, 0.65], fat: [0.2, 0.35],
                                  forbid: ["pork"], forbid_foods: ["almonds"] } })
  ```
  Here the ranges are fractions, not percents, and the lists use attribute keys and food ids.

## Don't
- **Don't edit generated files:** `src/lib/dietOptimizer.js`, `web/index.html`, `data/foods.json`, `docs/FOOD_LIST.md`, or the Diets sheet in the spreadsheet. They are rebuilt from `config/diets.json` and your changes would be overwritten.
- **Don't add comments:** JSON doesn't allow them, and `//` breaks the file. Put notes in `description`.
- **Don't change foods or prices here.** Those live in `scripts/foods_v2.py`.
