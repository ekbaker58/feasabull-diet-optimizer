# Handoff for the cloud agent — FeasaBULL Diet Optimizer (EGN4450, Team 9)

Read this file completely before doing anything. Then read `README.md`, `docs/HOW_IT_WORKS.md` and `docs/MODEL.md`.

## 0. What this project is
- **Class project:** EGN4450 (Intro to Linear Systems), USF. The team is "Sinister Seven" (Team 9).
- **Site:** FeasaBULL Calories, https://feasabull-fuel-stats.base44.app, built with Base44. A person enters sex, age, height, weight, activity and goal, and the site computes daily nutrient targets.
- **What this repo adds:** a linear program solved with the Simplex method that turns those targets into the cheapest daily meal plan from 71 foods. Linear algebra and matrices are the core of the grade, so keep the matrix framing everywhere: A, x, b, c, B⁻¹, shadow prices.
- **Owner:** Ethan (GitHub `ekbaker58`). Repo: `ekbaker58/feasabull-diet-optimizer` (private).
  - `main`: the class version.
  - `supabase-setup`: main plus a Supabase schema, seed and loader. PR #1 is open. **Do not merge PR #1.**

### Pipeline
```
person form ─► src/lib/personTargets.js ─► targets (b vector) ─► src/lib/dietOptimizer.js (Simplex) ─► meals, grams, $/day
```
- **Site calculator:** `personTargets.js` replicates it. 81 people match the site's own output with 0 mismatches (`tests/person_targets.test.mjs`).
- **One known bug in the live site:**
  - It applies the men's activity coefficients to everyone, and gives teen girls +20 kcal instead of +25.
  - Our code uses the correct IOM 2005 sex-specific values by default. `{coefficients:"site"}` reproduces the site exactly.
- **Optimizer:**
  - minimize cᵀx subject to b_min ≤ A·x ≤ b_max, plus macro-ratio, meal-split, protein-share and food-group rows, with 0 ≤ x ≤ u.
  - Two-phase Simplex in plain JS. Cross-checked against SciPy HiGHS: 0 mismatches across 8 diets, 300 random cases and 3 infeasible cases.
- **Spreadsheet:** `spreadsheet/FeasaBULL_Diet_Optimizer.xlsx`, a formula-driven version of the whole chain. Sheets:
  - Planner (person inputs → targets → plan)
  - DRI Tables
  - Food Data, Diets
  - Matrix Model (A, Mᵀ, c, u, G, MMULT, Excel Solver setup)
  - Diet Comparison (A·X)
  - Optimality Proof (8×8 basis B, MINVERSE, MDETERM, shadow prices, reduced costs → "PROVEN OPTIMAL")
  - Notes & Sources
- **Planner web page:** `web/index.html`, a standalone file built from `web/app.html` with both modules inlined.

### Reference numbers (use these to check that nothing broke)
| Check | Expected |
|---|---|
| Example person: Male, 21, 5′8″, 155 lb, Active, Maintain | 173 cm, 70.3 kg → **3,030 kcal**, protein ≥ 112 g, fiber ≥ 42 g, Ca 1,000 mg, Fe 8 mg, K 3,400 mg, vit C 90 mg |
| Balanced plan for that person | **$3.02/day ($21.13/week)**, every target met |
| Diet costs for that person | Balanced 3.02 · High-Protein 4.83 · Low-Carb 4.05 · Vegetarian 3.02 · Vegan 3.66 · Pescatarian 3.02 · Gluten-Free 3.02 · No Pork 3.02 |
| Typical student day (`tests/typical_day.mjs`) | about 2,948 kcal, **$6.89**; misses protein, fiber, potassium, the sodium cap and the fat limit |
| Workbook recalc | 0 formula errors (about 9,466 formulas) |

The cheapest Balanced plan contains no meat, which is why Balanced, Vegetarian, Pescatarian and No Pork all cost the same. The "no meat" restriction doesn't bind, so its shadow price is zero. That is a real finding, so explain it on a slide rather than hiding it.

---

## 1. Setup (do this first and confirm every result)
```bash
git clone https://github.com/ekbaker58/feasabull-diet-optimizer && cd feasabull-diet-optimizer
bash scripts/fetch_usda.sh                     # npm pack fda-nutrient-database@1.0.2 -> vendor/sr28 (gitignored)
pip install --break-system-packages openpyxl numpy scipy highspy
npm test
```
`npm test` must report all of the following:
- `scripts/diets.py`: config/diets.json is valid; `tests/test_diets_config.py`: 9 bad configs rejected.
- `tests/person_targets.test.mjs`: 81 people, 0 mismatches.
- `tests/diets.test.mjs`: diet mechanics OK (food-level exclusions, custom diet objects).
- `run_diets.mjs`: all 8 diets optimal.
- `stress.mjs`: 300 random cases plus 3 impossible ones, handled correctly.
- `verify_highs.py`: 0 mismatches against HiGHS.

**If any of these fail on a clean clone, stop and report it. Do not "fix" the tests to make them pass.**

Full rebuild after changing data or code:
```bash
python scripts/build_all.py                    # diets check -> data -> js -> web -> tests -> xlsx -> LibreOffice recalc
```
`scripts/recalc_xlsx.py` (called by `build_all.py` when LibreOffice is installed) recalculates the workbook and fails on any formula error.
- Install LibreOffice if it is missing: `apt-get install -y libreoffice-calc`.
- The workbook must recalculate with **0 errors**. openpyxl writes formulas without cached values, so an un-recalculated file shows blanks in some viewers.

## 2. Rules (hard)
1. **Diets** are edited only in `config/diets.json` (guide: `docs/ADD_A_DIET.md`). **Food data and prices** only in `scripts/foods_v2.py`. Then rebuild. Pushing is enough: `.github/workflows/build.yml` rebuilds and commits the generated files.
2. **Generated files:** never hand-edit `src/lib/dietOptimizer.js`, `data/foods.json`, `web/index.html`, `web/artifact.html`, `docs/FOOD_LIST.md` or `supabase/migrations/*_seed_diet_data.sql`. Edit the generator instead:
   - `scripts/solver_template.js` + `scripts/build_js.py`
   - `web/app.html` + `scripts/build_web.py`
   - `scripts/build_supabase.py` (supabase-setup branch only)
3. **Branches:** one branch per task, then open a PR into `main`. Never push large changes directly to `main`. After a PR to main is merged, merge `main` into `supabase-setup`, regenerate, run the tests and push, so PR #1 stays mergeable.
4. **Do not merge PR #1.** First, Ethan has to check in the Supabase dashboard whether the GitHub integration has "Deploy to production" turned on. If it does, merging applies migrations to the live database.
5. **Privacy:** the team's meeting minutes contain student names and U-numbers. Never commit those to the repo, and never include U-numbers in any document you produce. Team member names appear only where the class requires them (contribution slides), and only if Ethan supplies them.
6. **Secrets:** never commit a Supabase service-role key or any other secret. Front-end code may only use the anon key, read from config.
7. **Tests:**
   - Every change ends with `npm test` passing. If you touched the workbook, it also needs a 0-error recalc.
   - When you change the model, add a HiGHS cross-check for the new behavior.
8. **Honesty:**
   - Never invent a price, nutrient value, citation, DOI or URL.
   - If you can't verify something, mark it "unverified" and say so in the PR description.
   - Report limitations plainly. Ethan wants accurate work, not flattering summaries.
9. **References:** every reference must be checked against a live source (publisher page, DOI resolver, or official site) before it goes into a deliverable. Use APA 7.

## 3. Task list, in priority order

### TASK 1 — Meeting-minutes sections (DUE Oct 28, 2026, 11:59 pm) — highest priority
**Needs from Ethan:** the meeting-minutes template/document. It is not in the repo, on purpose. If it wasn't attached to your session, ask for it with the U-numbers removed, or write the sections as standalone text he can paste.

**Write these sections**, factual and in a student report voice. Use the reference numbers above. No hype.
1. **"Food data, prices, nutrient targets, and assumptions"**
   - **Foods and prices:** 71 foods in 8 groups.
     - Prices are Walmart (walmart.com online listings, mostly Oct 2026; store location not recorded, so treat as national-online), with BLS Average Price Data as an alternative.
     - Edible yield is applied (e.g., chicken drumstick 0.67, bananas 0.64). Cost = price / (package g × yield) × 100.
   - **Nutrients:** USDA SR28, per 100 g, for 11 nutrients.
   - **Targets:**
     - IOM 2005 EER; goal −500/0/+350 kcal.
     - Protein 1.6 g/kg (clamped to 10–30% of kcal); fat 30%; fiber 14 g/1,000 kcal.
     - DRI table by age and sex; sodium ≤ 2,300 mg.
   - **Assumptions and limits:**
     - One retailer.
     - Some prices undated (see Task 3).
     - Continuous LP amounts (no whole-package rounding).
     - Lunch and dinner use the same food pattern.
     - Not medical advice.
2. **"Linear algebra model, solution, and demonstration"**
   - **Model:** x (71×1, 100 g units), A (11×71), c, b. The full constraint matrix G has 68 rows in the Excel version.
   - **Simplex:** two-phase, with Gauss-Jordan pivots on the tableau.
   - **Example:** the person → 3,030 kcal → $3.02/day, against the $6.89 typical day.
   - **Proof:**
     - B is the 8×8 basis.
     - Basic foods: eggs, lentils, 2% milk, brown rice, oats, bananas, mixed vegetables, canola oil.
     - At their caps: peanut butter, pinto beans, white rice, broccoli.
     - B⁻¹ via MINVERSE, det(B) ≠ 0.
     - Shadow prices yᵀ = c_Bᵀ B⁻¹; all reduced costs have the correct sign, which proves optimality.
   - **Verification:** HiGHS agreement.
   - Pull exact values from the workbook's **Optimality Proof** sheet; don't retype them from memory.
3. **"Progress, decisions, and remaining work"**
   - **Done:** data, calculator replication, optimizer, spreadsheet, planner page, GitHub repo, Supabase schema.
   - **Decisions:**
     - Macros as shares of actual calories.
     - Group caps to prevent absurd plans.
     - Cup-equivalents for vegetables and fruit.
     - IOM coefficient fix.
   - **Remaining:** Base44 wiring, price re-verification, presentation.
4. **Ethan's contribution, past and planned.**
   - His assignment in the minutes: "Create a spreadsheet with nutrition, cost, and quantity for different diets."
   - Describe what he delivered (the workbook and the data pipeline) and what's next.

**References for the minutes:**
- Fix the garbled Feron citation. It should be the MIT OpenCourseWare 16.410/16.413 linear-programming lecture notes; verify the author, year, title and URL on ocw.mit.edu.
- Verify all 12 existing references, then add at least 3 verified topic sources so the total is 15 or more. Candidates (verify each):
  - U.S. Department of Agriculture, Agricultural Research Service. *USDA National Nutrient Database for Standard Reference, Release 28* (2016).
  - U.S. Bureau of Labor Statistics. *Average Price Data* (CPI).
  - USDA & HHS. *Dietary Guidelines for Americans, 2020–2025*.
  - Institute of Medicine (2005). *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids*. https://doi.org/10.17226/10490
  - NASEM (2019). *Dietary Reference Intakes for Sodium and Potassium*. https://doi.org/10.17226/25353
  - Stigler, G. J. (1945). The cost of subsistence. *Journal of Farm Economics, 27*(2), 303–314. https://doi.org/10.2307/1231810
  - Dantzig, G. B. (1990). The diet problem. *Interfaces, 20*(4), 43–47.
  - Huangfu, Q., & Hall, J. A. J. (2018). Parallelizing the dual revised simplex method. *Mathematical Programming Computation* (the HiGHS paper).

**Deliverable:** if Ethan attached the template, return a .docx in its own format. Otherwise, return a Docs artifact or .docx titled "Team 9 minutes — draft sections (Ethan)". Also include a references list with a "verified via" note for each entry.

**Acceptance criteria:**
- Every number matches the repo.
- Every reference resolves.
- No U-numbers anywhere.

### TASK 2 — Final presentation (DUE Dec 2, 2026)
**Requirements (class):**
- A 10–12 minute PowerPoint with **25+ APA references**.
- Contribution slides.
- The creator's name on each slide they made.
- Ask Ethan for team names and who presents which part. Do not take them from the minutes file without his OK.

**Build:**
- **A .pptx.** PowerPoint is the required format. About 14 slides plus references, with speaker notes on each (~45–50 s per slide):
  1. Title
  2. Problem: cost of a nutritious diet; Stigler 1945 / Dantzig
  3. Data: the A matrix (show a 5×5 excerpt)
  4. The person calculator: the b vector, with the IOM equation
  5. LP formulation in matrix form
  6. Simplex: one pivot shown as row operations (Gauss-Jordan)
  7. The example person result: $3.02 vs. $6.89
  8. Diet comparison: the A·X table and a cost-by-diet bar chart
  9. Why four diets tie at $3.02: non-binding constraint, zero shadow price
  10. Optimality proof: B, det(B), B⁻¹, shadow prices
  11. Sensitivity (from Task 8)
  12. Demo of `web/index.html`
  13. Limitations
  14. Contributions
- **Charts**, generated from the repo's real outputs (`tests/out/*.json`). Never hand-type the data:
  - Cost by diet.
  - Typical day vs. optimized, nutrients as % of target.
  - A shadow-price table.
- **A references slide** with 25+ verified APA 7 entries: the Task 1 list plus textbooks (e.g., Strang, *Introduction to Linear Algebra*; Hillier & Lieberman, *Introduction to Operations Research*; Chvátal, *Linear Programming*), the Bland (1977) pivoting rule, Dantzig (1963) *Linear Programming and Extensions*, the Walmart product pages used, the SciPy `linprog` docs, Base44, and Supabase docs. Verify each one.

**Acceptance criteria:**
- Opens cleanly in PowerPoint.
- Every chart matches `tests/out`.
- Timing works out to 10–12 minutes from the notes.
- 25+ references, all verified.

### TASK 3 — Re-verify old and undated prices
**Items:**
- Apples, 3 lb Gala: $3.92, Jun 2025 listing.
- Chocolate-chip cookies, 13 oz: $3.02, Jul 2025 listing.
- Undated: tofu (Nasoya 14 oz, $2.97), white rice (GV 5 lb, $2.48), string cheese (GV 12 ct, $3.28), whole-wheat spaghetti (GV 16 oz, $1.74), sweet potatoes (3 lb, $3.62), frozen corn (GV 12 oz, $0.98), yellow onions (3 lb, $2.96), almonds (GV 16 oz, $9.48), granola bars (GV 10 ct, $2.28).

**Method:**
- Look each item up on walmart.com with WebSearch or WebFetch.
- If walmart.com is blocked or shows no price, say so. **Do not guess or use a different store's price silently.**
- If you use another source, label it in the `note` field.

**Updates:**
- Change `price`, `package_g` and `note` in `scripts/foods_v2.py`. The note must include the month and year, e.g., "Walmart.com, Oct 2026".
- Rule from before: if an item is on Rollback, use the regular price.

**Afterwards:** rebuild, recalc, run `npm test`, and update the reference numbers in docs/README if the $3.02 changes.

**Acceptance criteria:** the PR lists old price → new price with source and date for each item.

### TASK 4 — Host the planner page (config done; needs Ethan's account)
- **Done:**
  - `netlify.toml` builds `web/` from source on Netlify and refuses to deploy an impossible diet.
  - `.github/workflows/build.yml` has a GitHub Pages job that is skipped until the repo variable `PAGES` = `true`.
- **Left for Ethan:** connect one of them (README → "See the website"). GitHub Pages on a private repo needs GitHub Pro (free with the Student Developer Pack).
- **You:** after it's live, put the URL in the README, check the example person shows 3,030 kcal and $3.02/day, and check the layout at 375 px width.

### TASK 5 — GitHub Actions CI (done; verify)
- **Done:** `.github/workflows/build.yml` runs on every push.
  - It checks `config/diets.json`, runs `scripts/build_all.py` (all tests, the HiGHS check, the workbook build and the LibreOffice recalc), then commits regenerated files back to the same branch.
  - The workbook is only re-committed if its content changed (`scripts/same_xlsx.py`).
- **You:**
  - Confirm the first run on `main` is green, and that a test edit to `config/diets.json` on a branch produces a bot commit.
  - If the workflow file never reached GitHub (pushing it needs a token with `workflow` scope), tell Ethan to create it in the GitHub web UI from the copy in this repo.

### TASK 6 — Variety (research branch `variety`, optional; keep the base LP as the class demo)
Lunch and dinner are identical, and some amounts are tiny. Possible fixes:
- **(a) Meal-level variables x_{j,m}:**
  - The LP chooses which meal each food goes in, with per-meal kcal bands and protein shares. JS only.
  - Excel Solver's 200-variable limit makes this impossible in the workbook (71×4 = 284).
- **(b) A 7-day rotation:**
  - Solve 7 linked days with a cap on how many days the same main protein can repeat.
  - Or iteratively add "no-repeat" cuts.
- **(c) Minimum portion or zero:**
  - x_j = 0 or x_j ≥ ℓ_j, with binary y_j: ℓ_j·y_j ≤ x_j ≤ u_j·y_j.
  - This is a MILP. Prototype it in Python with highspy. Only port it to JS (branch-and-bound on the existing simplex) if the prototype is fast (< 200 ms in the browser).

**Report the trade-off:** cost increase vs. the variety gained, as a table for all 8 diets.

### TASK 7 — More nutrients
- **Add** vitamin A (RAE), vitamin D, B12, magnesium and zinc as ≥ constraints.
  - `personTargets.js` already has the DRI values.
  - SR28 ABBREV has the columns. Check the exact column names in `scripts/sr28.py`.
- **Update:**
  - The NUTRIENTS list (`foods_v2.py`) and the solver template.
  - `optimizerTargets` in `personTargets.js`.
  - Workbook sheets: Food Data, Matrix Model, Planner and Diet Comparison.
  - The web page's targets table.
  - The tests and the HiGHS check.
- **Watch the limits:**
  - Excel Solver allows 100 constraint cells, and the workbook currently uses 68, so 5 more is fine.
  - Vitamin D is hard to hit from food alone. If it makes plans infeasible or very expensive, make it a toggle and report the cost impact honestly.

### TASK 8 — Sensitivity analysis (feeds slide 11)
For the example person, Balanced diet:
- **(a) Prices:** vary each basic food's price ±10%, ±20%, ±30% and re-solve. Report the new cost and whether the basis changed.
  - Also compute the cost ranging (the allowable increase/decrease from reduced costs) and confirm it matches the re-solves.
- **(b) Targets:** report the shadow price of each binding constraint, in $ per unit (e.g., $ per extra gram of protein).
  - Check against HiGHS duals (`res.ineqlin.marginals`, sign conventions).
- **Deliverable:** a "Sensitivity" sheet in the workbook built by `build_xlsx.py` (formulas where feasible) plus `docs/SENSITIVITY.md`.

### TASK 9 — Weekly shopping list (web page)
- **What it does:** in `web/app.html`, add "Shopping list for 7 days": weekly grams per food → packages to buy (ceil(grams / (package_g × yield)), whole packages) → actual checkout cost. Show it next to the LP cost/week; it will be higher, and the page should explain why.
- **Package data:** comes from FOODS (`package_g`, `price`, `edible_yield`).
- **Then:** rebuild, add a Playwright test, and check that the layout works at 375 px width.

### TASK 10 — Supabase in the web page (only after Ethan merges PR #1)
- **Load supabase-js:** from `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4` (pinned).
- **Config:** URL and anon key via a small `config.js` that is gitignored, with a `config.example.js` committed.
- **Behavior:**
  - Fall back to the built-in data when Supabase is unreachable.
  - Saved-plans UI for signed-in users, using `savePlan` and `listPlans` from `src/lib/supabaseData.js`.
  - RLS already restricts `saved_plans` to the owner.

### TASK 11 — Base44 site wiring (Ethan must do this, or a session signed in to his Base44)
- **Materials are ready:** `docs/BASE44_INTEGRATION.md` has the paste-in file and two prompts (the optimizer section, and the coefficient fix).
- **Your job:** make sure that doc stays current whenever `dietOptimizer.js` changes.
- **Also tell Ethan about text errors on the site:**
  - It says "18 nutrients mapped" but shows 19 goals.
  - It says "Six inputs" but the form has seven fields.
- **Acceptance (once wired):** the example person shows 3,030 kcal and $3.02/day on the live site.

### TASK 12 — Optional: overweight EER option
- IOM 2005 also publishes overweight/obese EER equations (BMI ≥ 25). Add `{equations:"overweight"}` as an option. It is not the default, and the site doesn't use it.
- Verify the coefficients against the IOM report (doi 10.17226/10490) and cite the page.

## 4. Things only Ethan can do (list these in your summary to him)
- Attach the meeting-minutes template (without U-numbers) for Task 1.
- Give team names and slide ownership for Task 2.
- Check Supabase → Integrations → GitHub → "Deploy to production" before merging PR #1.
- Add teammates as collaborators: GitHub → repo → Settings → Collaborators.
- Connect Netlify, Vercel or GitHub Pages (Student Pack) for hosting.
- Sign in to Base44 and paste the integration prompts.
- Delete stale v1 files from his local folder, `C:\Users\ekbak\Downloads\Linear Systems project`. Files to delete:
  - `scripts/gen_js.py`
  - `scripts/sr.py`
  - `tests/test.mjs`
  - `spreadsheet/Team9_Diet_Optimization_Data.xlsx`

## 5. Known limitations (don't hide these in any deliverable)
- **Prices:** one retailer, one region, point-in-time. Some are undated until Task 3 is done.
- **Fractional amounts:** LP amounts are continuous. Tiny amounts (< 10 g) are grouped as "Plus a little" in the UI. Fixing this properly is a MILP (Task 6c).
- **Meals:** lunch and dinner have the same composition because of the fixed meal-pattern matrix M.
- **Rule choices:** group caps and protein-share rules are design choices that keep plans realistic. They are not nutrition science; say so.
- **Scope:** an educational estimate for healthy-weight adults and teens 14+. Not medical advice.

## 6. How to report back
For each finished task, provide:
- The PR link.
- 3–5 lines on what changed.
- Test results (pass counts, recalc errors = 0).
- Anything unverified.
- Anything Ethan must do.

Send files Ethan needs (.docx, .pptx, .xlsx) directly. Keep summaries short and factual.
