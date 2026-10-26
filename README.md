# FeasaBULL Diet Optimizer — EGN4450 Team 9 (Sinister Seven)

Finds the **cheapest balanced day of food** that meets one person's nutrient targets, for the diet they choose,
using **linear programming solved with the Simplex method**. It plugs into the team's FeasaBULL Calories site
(https://feasabull-fuel-stats.base44.app), which supplies the person's targets.

```
minimize    cᵀx                      cost per day
subject to  b_min ≤ A·x ≤ b_max      nutrient targets (calories, fiber, calcium, iron, potassium, vitamin C, sodium)
            macro split as % of the plan's own calories (linear ratio rows)
            meal balance via the meal matrix M (calories per meal, protein at every main meal)
            protein diversity: no single food > 35% of the day's protein
            food-group rules: vegetables ≥ 2.5 cups, fruit ≥ 2 cups; caps on meat, beans, cheese, grains, oils, snacks
            0 ≤ x ≤ u                portion caps; u_j = 0 when the diet excludes food j
```
`x` = grams of each food per day (in 100 g units) · `A` = USDA nutrient matrix (11 nutrients × 71 foods) ·
`c` = $ per 100 g edible (Walmart prices) · full write-up in [`docs/MODEL.md`](docs/MODEL.md).

## What's in the repo
| Path | What it is |
|---|---|
| `spreadsheet/FeasaBULL_Diet_Optimizer.xlsx` | The workbook: **Planner** (inputs + answer by meal), **Food Data** (71 foods sorted by group/type), **Diets** (8 presets), **Matrix Model** (A, M, G, c, u, x with MMULT), **Diet Comparison** (A·X for every diet + a typical day), **Optimality Proof** (B⁻¹, det, shadow prices), **Notes & Sources** |
| `src/lib/dietOptimizer.js` | Drop-in optimizer for the Base44 site (no dependencies). `optimizeDiet(targets, prefs)` |
| `src/lib/supabaseData.js` | Load foods/diets from Supabase into the optimizer; save and list a user's plans |
| `supabase/` | Supabase config + migrations (tables, row level security, all food data) — see [`docs/SUPABASE.md`](docs/SUPABASE.md) |
| `docs/BASE44_INTEGRATION.md` | Step-by-step: add the optimizer to the website + the exact prompt for Base44's AI |
| `docs/MODEL.md` | The math, written for the report/slides |
| `data/foods.json` | Prices, yields, servings, meal pattern, diet flags, USDA nutrients for all 71 foods |
| `scripts/` | Rebuild everything from source (see below) |
| `tests/` | Example diets, 300 random stress cases and impossible cases, all checked against SciPy's HiGHS solver |

## Results for the example person (2,600 kcal, male 19–30, active)
| Diet | Cost/day | | Diet | Cost/day |
|---|---|---|---|---|
| Balanced | $2.53 | | Vegan | $3.13 |
| High-Protein | $4.13 | | Pescatarian | $2.53 |
| Low-Carb | $3.46 | | Gluten-Free | $2.59 |
| Vegetarian | $2.53 | | No Pork | $2.53 |
| *Typical student day (not optimized)* | *$5.82 — misses fiber, potassium, sodium and fat limits* | | | |

## Team workflow
1. **Get the code:** `git clone https://github.com/ekbaker58/feasabull-diet-optimizer` (ask Ethan to add you as a collaborator first).
2. **Make a branch** for your part: `git checkout -b yourname/what-you-change`.
3. **Edit, then commit and push:** `git add -A && git commit -m "what changed" && git push -u origin yourname/what-you-change`.
4. **Open a Pull Request** on GitHub so someone else looks before it goes into `main`.

Change food prices or add foods in **`scripts/foods_v2.py`** (not in the generated files), then rebuild.

## Rebuild everything
Needs Python 3 (`pip install openpyxl numpy scipy`) and Node 18+.
```bash
bash scripts/fetch_usda.sh      # once: downloads USDA SR28 into vendor/ (not committed)
python scripts/build_all.py     # data -> optimizer JS -> solve all diets -> workbook -> checks
```
`build_all.py` runs the HiGHS cross-check and stops if any result disagrees.

## Data sources
- **Nutrients:** USDA National Nutrient Database for Standard Reference, Release 28 (SR28) — same foods as FoodData Central "SR Legacy".
- **Prices:** Walmart.com / business.walmart.com, observed Oct 26, 2026 (regular prices, not Rollback sales). BLS U.S. city-average prices (Sep 2026) are kept as a reference column and a price-source switch.
- **Targets:** Dietary Reference Intakes (National Academies), Dietary Guidelines for Americans 2020–2025 cup-equivalents.

## Known limits (say these out loud in the presentation)
- One retailer's online prices; store prices vary. Yellow cells on Food Data are older/undated listings to re-check.
- Each food has a fixed meal pattern, so lunch and dinner share a batch-cooked base (meal prep), not a varied menu.
- A linear program cannot require "a normal portion or none" (needs integer variables), so small amounts can appear.
- Taste, variety across days, cooking time, vitamin B12/D and other nutrients are not modeled.
