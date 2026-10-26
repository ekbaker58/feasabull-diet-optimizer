# Team 9 minutes — draft sections (Ethan)

EGN4450 Intro to Linear Systems · Team 9 (Sinister Seven) · FeasaBULL Diet Optimizer · draft for the Oct 28, 2026 minutes

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Drafting notes for Ethan — delete this box before submitting.</strong></p>
<ul>
<li><p>The minutes template was not attached, so these are standalone sections to paste in. The team's 12 existing references were also not available to me, so I could not check them or fix the Feron entry in place. The reference list at the end is self-contained (16 entries, each checked against a live source) and already meets the 15+ target.</p></li>
<li><p>Every number comes from the repository (commit 0c5b67f): the workbook's own computed values, the test outputs and scripts/foods_v2.py. None are retyped from memory.</p></li>
<li><p>Corrections to the handoff notes, already applied below: the foods fall into <strong>7 groups</strong>, not 8. The proof basis is <strong>8×8 with 4 capped foods</strong> (docs/MODEL.md still said 7×7; fixed in the same PR). The Feron notes are hosted on <strong>web.mit.edu</strong>, not ocw.mit.edu. The SR28 files we use are the <strong>Sept 2015</strong> release, not 2016.</p></li>
<li><p>Section 4 describes what is in the repo under your name. Only you know which parts you wrote yourself and which were AI-assisted. Edit it to match what you actually did, and follow the course's AI-use policy.</p></li>
</ul></td>
</tr>
</tbody>
</table>

## 1. Food data, prices, nutrient targets, and assumptions

### Foods and prices

The model uses 71 common grocery foods in 7 groups: Proteins (22), Carbohydrates (15), Vegetables (9), Dairy & Alternatives (8), Fruits (8), Fats, Oils & Nuts (5) and Snacks & Sweets (4). The groups are split into 14 food types such as Poultry, Plant Proteins and Grains & Bread. Each food has a store product, a package price, the package weight, an edible yield, a USDA food number, a serving size, a maximum number of servings per day, and a meal pattern.

Prices are Walmart online listings (walmart.com and business.walmart.com). They are regular prices: when an item was on Rollback, we used the regular price. The store location was not recorded, so we treat the prices as national online prices. Of the 71 prices, 59 were observed in October 2026. Nine listings are undated, two are older listings (Gala apples, June 2025; chocolate-chip cookies, July 2025), and romaine lettuce uses the BLS U.S. average for September 2026 because Walmart sells romaine by count rather than by weight. BLS Average Price Data is stored for 25 of the 71 foods as an alternative price source.

Price is converted to cost per 100 g of **edible** food:

**c_j = price_j ÷ (package grams_j × edible yield_j) × 100**

Edible yield removes bone, peel and shell, so foods with waste do not look cheaper than they are. For example, chicken drumsticks have a yield of 0.67, bananas 0.64 and eggs 0.88. Bananas at \$0.50/lb therefore cost 0.50 ÷ (453.6 g × 0.64) × 100 = **\$0.172 per 100 g edible**.

### Nutrients

Nutrient values per 100 g come from the USDA National Nutrient Database for Standard Reference, Release 28 (SR28; the same foods appear in FoodData Central as "SR Legacy"). We track 11 nutrients: calories, protein, carbohydrate, fat, fiber, total sugars, calcium, iron, potassium, sodium and vitamin C. Values are for the food as bought (raw meat, dry rice, dry beans), and cooking losses are ignored. Together these values form the nutrient matrix A (11 × 71).

### Nutrient targets (the b vector)

Targets come from the same equations as our FeasaBULL Calories site. A replication test checks our code against 81 people computed by the site itself (81 people × 11 fields, 0 mismatches).

| **Target**                          | **How it is calculated**                                                                                                                                                                                                                        |
|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Calories                            | IOM (2005) Estimated Energy Requirement, healthy-weight equations, rounded to 10 kcal; goal adjustment −500 (lose), 0 (maintain) or +350 (build); floor of 1,500 kcal (men) or 1,200 kcal (women). The plan must land within ±5% of the target. |
| Protein (minimum)                   | 1.6 g per kg of body weight, kept between 10% and 30% of calories. This is at the top of the 1.2–1.6 g/kg range in the Dietary Guidelines 2025–2030.                                                                                            |
| Fiber (minimum)                     | 14 g per 1,000 kcal (IOM, 2005)                                                                                                                                                                                                                 |
| Calcium, iron, potassium, vitamin C | DRI table by age bracket and sex. Potassium uses the NASEM (2019) Adequate Intakes.                                                                                                                                                             |
| Sodium (maximum)                    | 2,300 mg (NASEM, 2019)                                                                                                                                                                                                                          |
| Macronutrient split                 | Each diet sets a range as a share of calories. Balanced uses the AMDR: protein 10–35%, carbohydrate 45–65%, fat 20–35%. (The calculator page shows fat as a single 30% figure, but the optimizer uses the range.)                               |
| Vegetables, fruit                   | At least 2.5 cup-equivalents of vegetables and 2 of fruit per day, from the 2,000-kcal Healthy U.S.-Style pattern in the Dietary Guidelines 2020–2025                                                                                           |

**Correction to the live site.** The site uses the men's physical-activity coefficients for everyone, and adds +20 kcal instead of +25 for teen girls. The IOM (2005) coefficients are sex-specific (for example, Active is 1.25 for men and 1.27 for women), so our code uses the IOM values by default and keeps the site's behavior as an option. Across the 81 test people, the correction changes women's maintenance calories by −80 to +340 kcal.

**Note on the newer guidelines.** The Dietary Guidelines for Americans 2025–2030 were released on January 7, 2026. They give vegetables and fruit as "3 servings" and "2 servings" per day for a 2,000-calorie pattern, without the gram-based cup-equivalent definitions. We kept the 2020–2025 cup-equivalent rules because they can be written as linear rows in grams. The newer guidelines keep sodium under 2,300 mg for ages 14 and up.

### Assumptions and limitations

- **One retailer at one point in time.** Prices vary by store and by week. 12 of the 71 prices are not October 2026 Walmart prices (9 undated, 2 older, 1 BLS), and we are re-checking them.

- **Continuous amounts.** The linear program can pick any amount, such as 3 g of oats, and it does not buy whole packages. Real checkout cost for a week will be higher than 7 × the daily cost.

- **Calories sit at the low edge.** Calories cost money, so the cheapest plan takes the lowest allowed calories: 2,878.5 kcal for a 3,030 kcal target (−5%).

- **Same lunch and dinner.** Each food has a fixed meal pattern (the meal matrix M), so lunch and dinner share the same batch-cooked base. This is realistic for meal prep, but it is not a varied menu.

- **Design rules.** Group caps, the 35% protein-share rule and the meal calorie bands are our design choices to keep plans realistic. They are not nutrition science.

- **Nutrients not modeled.** Vitamins A, D and B12, magnesium and zinc are not constraints yet.

- **Scope.** This is an educational estimate for healthy-weight people aged 14 and up. It is not medical advice.

## 2. Linear algebra model, solution, and demonstration

### The model in matrix form

**minimize cᵀx subject to b_min ≤ A x ≤ b_max, (other rule rows of G) x ≥ or ≤ b, 0 ≤ x ≤ u**

| **Symbol** | **Size** | **Meaning**                                                                                      |
|------------|----------|--------------------------------------------------------------------------------------------------|
| x          | 71 × 1   | Amount of each food per day, in 100 g units (the unknowns)                                       |
| c          | 71 × 1   | Dollars per 100 g of edible food                                                                 |
| A          | 11 × 71  | Nutrients per 100 g (USDA SR28)                                                                  |
| M          | 71 × 4   | Meal matrix: share of each food eaten at breakfast, lunch, dinner and snacks (rows sum to 1)     |
| u          | 71 × 1   | Portion caps (serving × max servings ÷ 100); u_j = 0 for foods the chosen diet excludes          |
| G          | 68 × 71  | Every rule stacked as one row (workbook); the whole plan is checked with one product G·x (MMULT) |

Rules that look nonlinear are rewritten as linear rows. For example, "carbohydrate ≤ 65% of calories" becomes 4·(carb row)·x − 0.65·(calorie row)·x ≤ 0. Meal calories are (A_kcal ∘ M_k)ᵀ x. The protein-share rule p_j x_j − 0.35 pᵀx ≤ 0 says that no single food supplies more than 35% of the day's protein.

### Solving it: the two-phase Simplex method

Each ≤ row gets a slack variable, and each ≥ row gets a surplus variable plus an artificial variable, giving the tableau \[G \| I \| b\]. **Phase 1** minimizes the sum of the artificial variables to find a feasible corner, or proves that none exists. **Phase 2** then minimizes cᵀx from that corner. Each pivot is one round of **Gauss-Jordan elimination**: divide the pivot row by the pivot element, then subtract multiples of it from every other row. The solver chooses the most negative reduced cost and switches to Bland's rule on degenerate steps so it cannot cycle. It is written in plain JavaScript with no libraries. For the example below it takes 73 pivots, and its tableau has 138 rows, because the JavaScript version writes the 71 portion caps as rows.

### Demonstration: one person, start to finish

**Person** (the site's placeholder): male, 21, 5′8″, 155 lb, Active, Maintain → 173 cm, 70.3 kg, activity coefficient 1.25.

EER = 662 − 9.53(21) + 1.25 × (15.91 × 70.3 + 539.6 × 1.73) = 3,026.85 → **3,030 kcal**

**b vector:** protein ≥ 112 g, fiber ≥ 42 g, calcium ≥ 1,000 mg, iron ≥ 8 mg, potassium ≥ 3,400 mg, vitamin C ≥ 90 mg, sodium ≤ 2,300 mg, calories 2,878.5–3,181.5 kcal.

**Result (Balanced diet): \$3.02 per day (\$21.13 per week), with every target met.**

| **Food**                  | **Grams/day** | **Role at the optimum**         |
|---------------------------|---------------|---------------------------------|
| White rice (dry)          | 184           | at its cap                      |
| Brown rice (dry)          | 156           | basic                           |
| Pinto beans (dry)         | 144           | at its cap                      |
| 2% milk                   | 470           | basic                           |
| Eggs (large)              | 126           | basic                           |
| Peanut butter             | 64            | at its cap                      |
| Bananas                   | 236           | basic (also exactly at its cap) |
| Broccoli (frozen)         | 190           | at its cap                      |
| Mixed vegetables (frozen) | 56            | basic                           |
| Rolled oats (dry)         | 3             | basic                           |
| Canola oil                | 2             | basic                           |

Nutrients in the plan (A·x): 2,878.5 kcal, 112.0 g protein, 47.9 g fiber, 1,000 mg calcium, 23.3 mg iron, 5,248 mg potassium, 166 mg vitamin C and 769 mg sodium. Carbohydrate is 65.0% of calories (at its limit), fat 20.7% and protein 15.6%.

**Comparison with a typical student day.** A hand-built, non-optimized day of similar size (bagel with butter and orange juice, two turkey-and-cheese sandwiches with chips, spaghetti with beef and cheese, cookies and ice cream) has 2,948 kcal and costs **\$6.89 per day (\$48.25 per week)**. It misses five limits: protein (109 g, below 112 g), fiber (14.4 g, below 42 g), potassium (2,940 mg, below 3,400 mg), sodium (3,857 mg, above 2,300 mg) and fat (36% of calories, above 35%). The optimized plan costs 56% less and meets every target.

| **Diet**     | **Cost/day** | **Diet**    | **Cost/day** |
|--------------|--------------|-------------|--------------|
| Balanced     | \$3.02       | Vegan       | \$3.66       |
| High-Protein | \$4.83       | Pescatarian | \$3.02       |
| Low-Carb     | \$4.05       | Gluten-Free | \$3.02       |
| Vegetarian   | \$3.02       | No Pork     | \$3.02       |

Balanced, Vegetarian, Pescatarian and No Pork give exactly the same plan. At these prices the cheapest Balanced plan already contains no meat, so excluding meat changes nothing: those restrictions are not binding, and their shadow price is zero. Gluten-Free rounds to the same \$3.02 but is actually \$3.0215 against \$3.0180, because it drops the oats, which are not certified gluten-free.

### Proof that \$3.02 is the minimum (Optimality Proof sheet)

At the optimal corner, **8 rules are tight**: calories ≥ 2,878.5 kcal, protein ≥ 112 g, calcium ≥ 1,000 mg, carbohydrate ≤ 65% of calories, breakfast ≥ 20% of calories, vegetables ≥ 2.5 cup-eq, fruit ≥ 2 cup-eq, and beans & lentils ≤ 3 servings. There are **8 basic foods**: eggs, lentils, 2% milk, brown rice, rolled oats, bananas, mixed vegetables and canola oil. **4 foods are held at their caps**: peanut butter, pinto beans, white rice and broccoli. The corner is degenerate: lentils are basic at a value of 0, and bananas are basic while sitting exactly at their cap.

- **Step 1: square system.** B is the 8 × 8 matrix of tight rows restricted to the basic foods. Moving the capped foods to the right-hand side gives B x_B = r, where r = b_T − N u_N.

- **Step 2: inverse.** det(B) = −1.429 × 10¹¹ (MDETERM). Because det(B) ≠ 0, B is invertible and the corner is unique. x_B = B⁻¹ r (MINVERSE, MMULT) reproduces the Simplex answer to within 5 × 10⁻¹⁰.

- **Step 3: shadow prices** yᵀ = c_Bᵀ B⁻¹, the extra cost per day if a tight rule is tightened by one unit:

| **Tight rule**                 | **Shadow price**                                 |
|--------------------------------|--------------------------------------------------|
| Vegetables ≥ 2.5 cup-eq        | \$0.292 per extra cup                            |
| Fruit ≥ 2 cup-eq               | \$0.155 per extra cup                            |
| Calories ≥ minimum             | \$0.023 per extra 100 kcal                       |
| Breakfast ≥ 20% of calories    | \$0.020 per 100 kcal shifted to breakfast        |
| Protein ≥ 112 g                | \$0.015 per extra gram                           |
| Calcium ≥ 1,000 mg             | \$0.013 per extra 100 mg                         |
| Carbohydrate ≤ 65% of calories | \$0.019 saved per 100 kcal the limit is loosened |
| Beans & lentils ≤ 3 servings   | \$0.017 saved per extra serving allowed          |

- **Step 4: certificate.** The reduced costs d = c − yᵀG_T are 0 for the 8 basic foods. They are negative for the 4 capped foods (peanut butter −0.250, pinto beans −0.164, white rice −0.073, broccoli −0.038 \$/100 g), meaning we would buy more of them if the caps allowed. They are ≥ 0 for all 59 foods not eaten, so adding any of them would raise the cost. No swap can lower the cost, so the plan is optimal. The sheet's verdict is "PROVEN OPTIMAL".

The shadow prices only hold for small changes, until the set of basic foods changes. A full sensitivity analysis is planned for the presentation.

### Independent verification

Every model was re-solved with the HiGHS solver through SciPy: the 8 diets, 300 random people and preference sets, and 3 deliberately impossible requests. **Status agreed in all 311 cases**, with a maximum relative cost difference of 9.1 × 10⁻¹³ and a maximum relative constraint violation of 9.4 × 10⁻¹². All 3 impossible requests were correctly reported as infeasible, each with a reason. The workbook contains 9,456 formulas and recalculates with 0 errors.

## 3. Progress, decisions, and remaining work

### Completed

- **Food data:** 71 foods with prices, edible yields, servings, meal patterns, diet flags and USDA SR28 nutrients.

- **Calculator replication:** our code matches the site for 81 test people (0 mismatches), with the IOM coefficient correction available.

- **Optimizer:** a two-phase Simplex in JavaScript, with 8 diet presets, cross-checked against HiGHS.

- **Spreadsheet:** a formula-driven workbook with 8 sheets (Planner, DRI Tables, Food Data, Diets, Matrix Model, Diet Comparison, Optimality Proof, Notes & Sources) and an Excel Solver setup.

- **Planner web page:** a single standalone file that goes from person to targets to meal plan in the browser.

- **GitHub repository:** source, rebuild scripts and automated tests.

- **Supabase:** a database schema on a separate branch, not merged yet.

### Decisions and why

1.  **Macros as shares of the plan's actual calories,** not fixed grams. Writing each share as a ratio row (for example 4·carb − 0.65·kcal ≤ 0) keeps the model linear, and the split stays correct wherever calories land in the ±5% band.

2.  **Group caps, a protein-share limit and meal bands.** Without them the cheapest plan is unrealistic. The first version chose raw flour, so flour and sugar were removed as stand-alone foods.

3.  **USDA cup-equivalents for vegetables and fruit,** so that leafy greens, dried fruit and juice are counted fairly instead of by raw weight.

4.  **IOM sex-specific activity coefficients by default,** with the site's current behavior kept as an option for comparison.

5.  **Edible yield and regular (non-sale) prices,** so that costs are not understated.

### Remaining work

- Re-verify the 11 older or undated Walmart prices, then rebuild and report any change to the \$3.02.

- Wire the optimizer into the Base44 site (the integration prompts are written; this needs a signed-in team member).

- Final presentation (due Dec 2): slides, charts generated from the model outputs, 25+ references.

- Sensitivity analysis: price ranging and shadow prices checked against HiGHS.

- Optional: host the planner page publicly, add more nutrients (vitamins A, D and B12, magnesium, zinc), and add more variety across meals.

## 4. Ethan's contribution

**Assignment in the minutes:** "Create a spreadsheet with nutrition, cost, and quantity for different diets."

### Delivered so far

- **The workbook** (FeasaBULL_Diet_Optimizer.xlsx). It covers nutrition (USDA SR28, 11 nutrients × 71 foods), cost (Walmart prices converted to \$ per 100 g edible) and quantity (optimal grams per food) for 8 diets, compared side by side with one matrix product A·X. It also includes the person-to-targets Planner, the Matrix Model with an Excel Solver setup, and the Optimality Proof sheet.

- **The data pipeline** behind it: one food list feeds the data file, the optimizer, the web page and the workbook, so a price change is made in one place and rebuilt everywhere.

- **The optimizer and verification:** the Simplex solver, the 81-person site replication test, and the HiGHS cross-check on 311 cases.

- **The GitHub repository** and the team workflow (branches and pull requests).

### Planned

- Re-verify the older and undated prices, then update the results.

- Sensitivity analysis for the presentation.

- Slides on the data, the matrix model and the optimality proof, plus the live demo.

- Support the Base44 wiring and keep the integration notes current.

## References (APA 7)

*Each entry was checked on Oct 26, 2026. The "Verified via" line under each entry is for Ethan; delete those lines before submitting.*

Bland, R. G. (1977). New finite pivoting rules for the simplex method. *Mathematics of Operations Research, 2*(2), 103–107. https://doi.org/10.1287/moor.2.2.103

> Verified via: Crossref metadata for the DOI; doi.org resolves to pubsonline.informs.org.

Dantzig, G. B. (1990). The diet problem. *Interfaces, 20*(4), 43–47. https://doi.org/10.1287/inte.20.4.43

> Verified via: Crossref metadata; doi.org resolves to pubsonline.informs.org.

Dantzig, G. B. (1998). *Linear programming and extensions*. Princeton University Press. (Original work published 1963)

> Verified via: Princeton University Press listing (press.princeton.edu/node/25548): Princeton Landmarks paperback, Aug 23, 1998, copyright 1963.

Feron, E. (2003). *Introduction to linear programming* \[Lecture notes, updated by S. Gentry\]. 16.410 Principles of Autonomy and Decision Making, Massachusetts Institute of Technology. https://web.mit.edu/16.410/www/lectures_fall04/lp-extra-notes.pdf

> Verified via: Opened the PDF; the title slide reads "Introduction to Linear Programming, Eric Feron (updated Sommer Gentry), 16.410, Fall 2003, November 12, 2003." This replaces the garbled Feron citation. It is hosted on web.mit.edu; OCW's 16.410 (Fall 2010) is by Williams and Frazzoli and does not include it.

Huangfu, Q., & Hall, J. A. J. (2018). Parallelizing the dual revised simplex method. *Mathematical Programming Computation, 10*(1), 119–142. https://doi.org/10.1007/s12532-017-0130-5

> Verified via: Crossref: published in print March 2018, vol. 10, issue 1 (online Dec 2017); doi.org resolves to link.springer.com. This is the HiGHS paper.

Institute of Medicine. (2005). *Dietary reference intakes for energy, carbohydrate, fiber, fat, fatty acids, cholesterol, protein, and amino acids*. The National Academies Press. https://doi.org/10.17226/10490

> Verified via: Crossref (National Academies Press, 2005); doi.org resolves to nationalacademies.org/publications/10490.

National Academies of Sciences, Engineering, and Medicine. (2019). *Dietary reference intakes for sodium and potassium*. The National Academies Press. https://doi.org/10.17226/25353

> Verified via: Crossref (2019); doi.org resolves to nationalacademies.org/publications/25353.

Stigler, G. J. (1945). The cost of subsistence. *Journal of Farm Economics, 27*(2), 303–314. https://doi.org/10.2307/1231810

> Verified via: Crossref metadata; doi.org resolves to academic.oup.com.

Strang, G. (2023). *Introduction to linear algebra* (6th ed.). Wellesley-Cambridge Press.

> Verified via: Author's MIT page (math.mit.edu/~gs/linearalgebra/ila6) gives the title, 6th edition, 2023 and ISBN 978-1-7331466-7-8, and links to Wellesley-Cambridge Press for orders. The AMS bookstore listing agrees.

U.S. Bureau of Labor Statistics. (n.d.). *CPI: Average price data*. U.S. Department of Labor. Retrieved October 26, 2026, from https://www.bls.gov/cpi/factsheets/average-prices.htm

> Verified via: Page loads with the title "CPI: Average Price Data." The September 2026 values stored in the repo were not re-checked here; that is part of the price re-verification task.

U.S. Department of Agriculture, Agricultural Research Service, Nutrient Data Laboratory. (2015). *USDA National Nutrient Database for Standard Reference, Release 28* \[Data set\]. https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/sr11-sr28/

> Verified via: The ARS SR11–SR28 page loads. The files we use are the September 2015 version (fda-nutrient-database 1.0.2 metadata), so the year is 2015, not the May 2016 slightly revised release. The old URL in the workbook (ars.usda.gov/nea/bhnrc/ndl) now returns 404.

U.S. Department of Agriculture, Agricultural Research Service. (2018). *FoodData Central: SR Legacy* \[Data set\]. https://fdc.nal.usda.gov/

> Verified via: fdc.nal.usda.gov loads, and the FDC FAQ states SR Legacy was released in April 2018. The workbook currently says 2019.

U.S. Department of Agriculture & U.S. Department of Health and Human Services. (2020). *Dietary guidelines for Americans, 2020–2025* (9th ed.). https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf

> Verified via: Opened the PDF: 9th edition, December 2020. Table 1-1 gives vegetables 2½ cup-eq/day and fruits 2 cup-eq/day at the 2,000-calorie level.

U.S. Department of Agriculture & U.S. Department of Health and Human Services. (2026). *Dietary guidelines for Americans, 2025–2030*. https://cdn.realfood.gov/DGA.pdf

> Verified via: Opened the PDF (10 pages, created Jan 6–7, 2026; linked from dietaryguidelines.gov). It states protein 1.2–1.6 g/kg/day, vegetables 3 servings and fruits 2 servings, and sodium under 2,300 mg for ages 14+.

Virtanen, P., Gommers, R., Oliphant, T. E., Haberland, M., Reddy, T., Cournapeau, D., Burovski, E., Peterson, P., Weckesser, W., Bright, J., van der Walt, S. J., Brett, M., Wilson, J., Millman, K. J., Mayorov, N., Nelson, A. R. J., Jones, E., Kern, R., Larson, E., … Vázquez-Baeza, Y. (2020). SciPy 1.0: Fundamental algorithms for scientific computing in Python. *Nature Methods, 17*(3), 261–272. https://doi.org/10.1038/s41592-019-0686-2

> Verified via: Crossref metadata (vol. 17, issue 3, pp. 261–272); doi.org resolves to nature.com. First 19 authors and last author (112 total) taken from the Crossref record, following APA 7's rule for 21 or more authors.

Walmart Inc. (2026). *Product listings for 71 grocery items* \[Retail prices, observed October 2026\]. https://www.walmart.com/

> Verified via: walmart.com loads. The individual product pages were not re-opened in this task; the 11 older or undated listings are being re-checked separately.
