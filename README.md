# FeasaBULL Diet Optimizer — EGN4450 Team 9 (Sinister Seven)

**Person in, cheapest balanced day of food out.** Enter sex, age, height, weight, activity and goal. The
same equations as the team's FeasaBULL Calories site (https://feasabull-fuel-stats.base44.app) turn them into
daily targets, and **linear programming solved with the Simplex method** finds the cheapest meal plan
that meets them, for the diet the person chooses. The planner page then offers **several plans** (lowest cost, your
picks, and variety menus for a rotating week), compares every diet for that person, and turns a week into a shopping
list. How the steps connect: [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md).

```
minimize    cᵀx                      cost per day
subject to  b_min ≤ A·x ≤ b_max      nutrient targets (calories, fiber, calcium, iron, potassium, vitamin C, sodium)
            macro split as % of the plan's own calories (linear ratio rows)
            meal balance via the meal matrix M (calories per meal, protein at every main meal)
            protein diversity: no single food > 35% of the day's protein
            food-group rules: vegetables ≥ 2.5 cups, fruit ≥ 2 cups; caps on meat, beans, cheese, grains, oils, snacks
            0 ≤ x ≤ u                portion caps; u_j = 0 when the diet excludes food j
```
`x` = grams of each food per day (in 100 g units) · `A` = USDA nutrient matrix (12 nutrients × 146 foods) ·
`c` = $ per 100 g edible · preferences enter as a diagonal matrix D in the objective (D c)ᵀx ·
full write-up in [`docs/MODEL.md`](docs/MODEL.md).

## What's in the repo
| Path | What it is |
|---|---|
| `spreadsheet/FeasaBULL_Diet_Optimizer.xlsx` | The workbook: **Planner** (person → targets → answer by meal), **DRI Tables**, **Food Data** (71 foods sorted by group/type), **Diets** (8 presets), **Matrix Model** (A, M, G, c, u, x with MMULT), **Diet Comparison** (A·X for every diet + a typical day), **Optimality Proof** (B⁻¹, det, shadow prices), **Notes & Sources** |
| `web/index.html` | **The connected planner page**: person → targets → plan options → week and shopping list, all in the browser. Open the file or host the `web/` folder (see Deploy) |
| `src/lib/personTargets.js` | Person → daily targets (same equations as the FeasaBULL site, with the IOM activity-coefficient fix) |
| `src/lib/dietOptimizer.js` | Targets → plans (two-phase Simplex, no dependencies). `optimizeDiet`, `planOptions`, `compareDiets`, `weekPlan` |
| `docs/BASE44_INTEGRATION.md` | Step-by-step: add the optimizer to the website + the exact prompt for Base44's AI |
| `docs/MODEL.md` | The math, written for the report/slides |
| `docs/DATA_SOURCES.md` | Where every price and nutrient comes from (Walmart, BLS, USDA ERS × CPI), with checks and known gaps |
| `data/foods.json` | Prices, price sources, yields, servings, meal pattern, diet and allergy flags, USDA nutrients for all 146 foods |
| `scripts/` | Rebuild everything from source (see below) |
| `tests/` | Example diets, plan options, 300 random stress cases and impossible cases, all checked against SciPy's HiGHS solver; `npm run test:web` checks the page in a browser |

## Results for the example person
The site's own placeholder person: male, 21, 5′8″, 155 lb, Active, Maintain → **3,030 kcal, protein ≥ 112 g, fiber ≥ 42 g**.

| Diet | All 146 foods | Core 71 foods |
|---|---|---|
| Balanced | $2.87 | $3.02 |
| High-Protein | $4.73 | $4.83 |
| Low-Carb | $3.95 | $4.05 |
| Vegetarian | $2.88 | $3.02 |
| Vegan | $3.58 | $3.66 |
| Pescatarian | $2.88 | $3.02 |
| Gluten-Free | $2.88 | $3.02 |
| No Pork | $2.87 | $3.02 |
| Dairy-Free (new) | $3.35 | $3.50 |
| DASH-Style (new) | $2.97 | $3.10 |
| *Typical student day (not optimized)* | *$6.89. Misses protein, fiber, potassium, sodium and fat limits* | |

Balanced ($2.874994) and Vegetarian ($2.875043) differ by less than a hundredth of a cent; they just round to different cents.
Plan options for Balanced (all foods): A · Lowest cost $2.87, B · Something different $3.42, C · Mix it up $3.66.

## Team workflow
1. **Get the code:** `git clone https://github.com/ekbaker58/feasabull-diet-optimizer` (ask Ethan to add you as a collaborator first).
2. **Make a branch** for your part: `git checkout -b yourname/what-you-change`.
3. **Edit, then commit and push:** `git add -A && git commit -m "what changed" && git push -u origin yourname/what-you-change`.
4. **Open a Pull Request** on GitHub so someone else looks before it goes into `main`.

Change food prices or add foods in **`scripts/foods_v2.py`** (not in the generated files), then rebuild.

## Deploy the planner page
`web/index.html` is one self-contained file (no build step, no server code), so any static host works.
`netlify.toml` already tells Netlify to publish the `web/` folder.

**Netlify (free):** sign in at app.netlify.com with GitHub → **Add new site → Import an existing project** → pick
`ekbaker58/feasabull-diet-optimizer` → leave the build command empty (the publish directory `web` comes from
`netlify.toml`) → **Deploy**. Every push to `main` redeploys.

**GitHub Pages:** private repos need GitHub Pro, which is free for students through the GitHub Student Developer Pack.
Then go to repo **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**, and open `…/web/`.

Live URL: _(add here after the first deploy)_

## Rebuild everything
Needs Python 3 (`pip install openpyxl numpy scipy highspy`) and Node 18+.
```bash
bash scripts/fetch_usda.sh      # once: downloads USDA SR28 into vendor/ (not committed)
python scripts/build_all.py     # data -> optimizer JS -> planner page -> solve all diets -> workbook -> checks
```
`build_all.py` runs the HiGHS cross-check and stops if any result disagrees.

## Data sources
- **Nutrients:** USDA National Nutrient Database for Standard Reference, Release 28 (SR28) — same foods as FoodData Central "SR Legacy".
- **Prices, core 71 foods:** Walmart.com / business.walmart.com, observed Oct 26, 2026 (regular prices, not Rollback sales). BLS U.S. city-average prices (Sep 2026) are kept as a reference column and a price-source switch.
- **Prices, 75 added foods:** BLS Average Price Data (Sep 2026), or USDA ERS Fruit and Vegetable Prices (2023) scaled to Sep 2026 with the BLS CPI. These are national-average estimates; details in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).
- **DASH-Style diet:** MedlinePlus (NIH) DASH goals.
- **Targets:** Dietary Reference Intakes (National Academies), Dietary Guidelines for Americans 2020–2025 cup-equivalents.

## Known limits (say these out loud in the presentation)
- One retailer's online prices for the core foods, and national averages (some CPI-scaled from 2023) for the added foods; store prices vary. Yellow cells on Food Data are older/undated listings to re-check.
- Each food has a fixed meal pattern, so lunch and dinner share a batch-cooked base (meal prep), not a varied menu.
- A linear program cannot require "a normal portion or none" (needs integer variables), so small amounts can appear.
- Taste and cooking time are not modeled; variety comes from extra LPs that penalize foods already used, not from a taste model. Vitamins A, D, B12, magnesium and zinc are not tracked.
- Allergy filters remove foods that are the allergen; they cannot see packaged foods' ingredient labels.
