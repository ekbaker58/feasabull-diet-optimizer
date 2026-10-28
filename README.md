# FeasaBULL Diet Optimizer — EGN4450 Team 9 (Sinister Seven)

**Person and weekly budget in, a realistic day of food out.** Enter sex, age, height, weight, activity, goal and
(optionally) a weekly food budget. The same equations as the team's FeasaBULL Calories site
(https://feasabull-fuel-stats.base44.app) turn them into daily targets, and **linear programming solved with the
Simplex method** finds the cheapest plan that meets them, follows the Dietary Guidelines 2025–2030 servings, and,
given a budget, uses it to buy variety. Amounts are as eaten (cooked rice, roasted chicken), and the shopping list
converts back to what you buy. How the steps connect: [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md).

```
minimize    cᵀx                      cost per day
subject to  b_min ≤ A·x ≤ b_max      nutrient targets (calories, fiber, calcium, iron, potassium, vitamin C, sodium)
            macro split as % of the plan's own calories (linear ratio rows)
            meal balance via the meal matrix M (calories per meal, protein at every main meal)
            protein diversity: no single food > 35% of the day's protein
            d_min ≤ D·x ≤ d_max      Dietary Guidelines 2025–2030 servings for the calorie level (realistic model)
            refined ≤ whole grains, saturated fat < 10% of kcal; caps on meat, beans, cheese, grains, oils, snacks
            0 ≤ x ≤ u                portion and variety caps; u_j = 0 when the diet excludes food j
```
`x` = grams of each food eaten per day (100 g units, as eaten) · `A` = USDA nutrient matrix (11 nutrients × 71 foods) ·
`c` = $ per 100 g as eaten, including typical household food waste (Walmart prices) · full write-up in [`docs/MODEL.md`](docs/MODEL.md).

## What's in the repo
| Path | What it is |
|---|---|
| `spreadsheet/FeasaBULL_Diet_Optimizer.xlsx` | The workbook: **Planner** (person → targets → answer by meal), **DRI Tables**, **Food Data** (71 foods sorted by group/type), **Diets** (8 presets), **Matrix Model** (A, M, G, c, u, x with MMULT), **Diet Comparison** (A·X for every diet + a typical day), **Optimality Proof** (B⁻¹, det, shadow prices), **Notes & Sources** |
| `web/index.html` | **The connected planner page**: person → targets → meal plan, all in the browser. Open the file or host the `web/` folder |
| `config/diets.json` | **The diets.** Edit this to add or change a diet; everything else rebuilds from it. Guide: [`docs/ADD_A_DIET.md`](docs/ADD_A_DIET.md) |
| `docs/FOOD_LIST.md` | Every food, type, group and attribute name a diet can exclude (generated) |
| `src/lib/personTargets.js` | Person → daily targets (same equations as the FeasaBULL site, with the IOM activity-coefficient fix) |
| `src/lib/dietOptimizer.js` | Targets → plan (two-phase Simplex, no dependencies). `optimizeDiet(targets, prefs)`, `planWithBudget(targets, prefs, weeklyBudget)`, `usdaFoodPlans(age, sex)` |
| `docs/BASE44_INTEGRATION.md` | Step-by-step: add the optimizer to the website + the exact prompt for Base44's AI |
| `docs/MODEL.md` | The math, written for the report/slides |
| `data/foods.json` | Prices, yields, servings, meal pattern, diet flags, USDA nutrients for all 71 foods |
| `scripts/` | Rebuild everything from source (see below) |
| `.github/workflows/build.yml` | On every push: checks diets, rebuilds, runs every test, commits the regenerated files (optional GitHub Pages deploy) |
| `netlify.toml` | Hosting settings if the site is put on Netlify |
| `tests/` | Example diets, 300 random stress cases and impossible cases, all checked against SciPy's HiGHS solver |

## Results for the example person
The site's own placeholder person: male, 21, 5′8″, 155 lb, Active, Maintain → **3,030 kcal, protein ≥ 112 g, fiber ≥ 42 g**.

| Diet | Realistic plan, $/week ($/day) | Textbook LP, $/day |
|---|---|---|
| Balanced | $43.01 ($6.14) | $3.28 |
| High-Protein | $65.37 ($9.34) | $5.06 |
| Low-Carb | $70.82 ($10.12) | $4.29 |
| Vegetarian | $43.46 ($6.21) | $3.28 |
| Vegan | $54.67 ($7.81) | $4.11 |
| Pescatarian | $43.46 ($6.21) | $3.28 |
| Gluten-Free | $47.09 ($6.73) | $3.28 |
| No Pork | $43.01 ($6.14) | $3.28 |
| *Typical student day (not optimized)* | *$62.72 ($8.96) incl. waste; misses calories, fiber, potassium and the sodium limit* | |
| *USDA Thrifty Food Plan, man 20–50 (May 2026)* | *$73.20 ($10.46); +20% living alone* | |

**Is $3/day wrong?** Not as math: the textbook LP really is about $3.28/day here, in line with published
least-cost diets ($1.98/day at 2009–10 prices; Chungchunlam et al., 2020, *Nature Food*). But it is mostly rice,
beans and milk, measured with no waste. The realistic plan, with Dietary Guidelines servings, variety and typical
household waste, costs about twice as much. It is still below USDA's Thrifty Food Plan, which is built from what
Americans actually eat (mixed dishes, drinks) at national-average prices. With a $60/week budget, the planner buys
the most varied plan that fits: at most 20% of each food group from one food, for $56.59/week.

## See the website
- **On your computer:** open `web/index.html` (double-click it). It's one self-contained file and works offline.
- **As a live site that updates when the repo changes** (Ethan sets this up once). Either:
  - **Netlify:** log in with GitHub → *Add new site* → *Import an existing project* → pick this repo. `netlify.toml` already has the settings, and every push to `main` redeploys. If a diet is broken, Netlify keeps the last good version.
  - **GitHub Pages:** private repos need GitHub Pro, which is free with the GitHub Student Developer Pack. Set *Settings → Pages → Source: GitHub Actions*, then add the repository variable `PAGES` = `true` (*Settings → Secrets and variables → Actions → Variables*).

## Add or change a diet
Edit **`config/diets.json`** on github.com (pencil icon) and commit. GitHub Actions checks the diet, rebuilds the
optimizer, the web page and the spreadsheet, runs every test, and commits the results back, in about 3 minutes.
A red X in the **Actions** tab means the diet has a problem; the log says what to fix. Full guide with tested examples:
[`docs/ADD_A_DIET.md`](docs/ADD_A_DIET.md).

## Team workflow
1. **Get the code:** `git clone https://github.com/ekbaker58/feasabull-diet-optimizer` (ask Ethan to add you as a collaborator first).
2. **Make a branch** for your part: `git checkout -b yourname/what-you-change`.
3. **Edit, then commit and push:** `git add -A && git commit -m "what changed" && git push -u origin yourname/what-you-change`.
4. **Open a Pull Request** on GitHub so someone else looks before it goes into `main`.

Change diets in **`config/diets.json`**, and food prices or foods in **`scripts/foods_v2.py`**. Never edit the generated files (`src/lib/dietOptimizer.js`, `web/index.html`, `data/foods.json`, `docs/FOOD_LIST.md`); GitHub Actions rebuilds them on every push.

## Rebuild everything
GitHub Actions does this on every push. To run it yourself you need Python 3 (`pip install openpyxl numpy scipy highspy`), Node 18+, and optionally LibreOffice (to store the spreadsheet's calculated values).
```bash
bash scripts/fetch_usda.sh      # once: downloads USDA SR28 into vendor/ (not committed)
python scripts/build_all.py     # check diets -> data -> optimizer JS -> planner page -> tests -> workbook -> recalc
```
`build_all.py` runs the HiGHS cross-check and stops if any result disagrees.

## Data sources
- **Nutrients:** USDA National Nutrient Database for Standard Reference, Release 28 (SR28) — same foods as FoodData Central "SR Legacy".
- **Prices:** Walmart.com / business.walmart.com, observed Oct 26, 2026 (regular prices, not Rollback sales). BLS U.S. city-average prices (Sep 2026) are kept as a reference column and a price-source switch.
- **Targets:** Dietary Reference Intakes (National Academies); Dietary Guidelines for Americans 2025–2030 daily servings by calorie level.
- **Waste:** USDA ERS consumer-level food loss by food group (Buzby, Wells & Hyman, 2014, EIB-121).
- **Benchmark:** USDA Food Plans, Cost of Food at Home, May 2026.

## Known limits (say these out loud in the presentation)
- One retailer's online prices; store prices vary. Yellow cells on Food Data are older/undated listings to re-check.
- Each food has a fixed meal pattern, so lunch and dinner share a batch-cooked base (meal prep), not a varied menu.
- A linear program cannot require "a normal portion or none" (needs integer variables), so small amounts can appear.
  Amounts are daily averages over a week: 0.5 bagel a day means a bagel every other day.
- Cooked weights come from a mass balance between USDA's raw and cooked entries (conservative), not from weighing.
- Waste rates are U.S. averages from 2010; a careful shopper wastes less (set waste to None).
- Taste, cooking time, vitamin B12/D and other nutrients are not modeled.
