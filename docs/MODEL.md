# The model, in linear-algebra terms

## Variables and data
| Symbol | Size | Meaning |
|---|---|---|
| **x** | 71 × 1 | amount of each food **eaten** per day, in 100 g units **as eaten** (cooked rice, roasted chicken) |
| **c** | 71 × 1 | $ per 100 g as eaten = price ÷ (package grams × edible yield × cook yield × (1 − household waste)) × 100 |
| **A** | 11 × 71 | nutrients per 100 g as eaten (USDA SR28; cooked entries for foods you cook): calories, protein, carbs, fat, fiber, sugars, calcium, iron, potassium, sodium, vitamin C |
| **D** | 6 × 71 | Dietary Guidelines servings per 100 g: protein foods, dairy, vegetables, fruits, whole grains, healthy fats |
| **M** | 71 × 4 | meal matrix: share of food *j* eaten at breakfast, lunch, dinner, snacks (rows sum to 1) |
| **F** | 71 × 7 | food attribute matrix (red meat, pork, poultry, fish, eggs, dairy, gluten), 0/1 |
| **f_d** | 7 × 1 | attributes a diet forbids, 0/1 (plus a list of individual foods it excludes; both set u_j = 0). Diets are defined in `config/diets.json` |
| **u** | 71 × 1 | upper bounds: portion cap, or the variety cap if smaller; u_j = 0 when the diet excludes food j |

**As eaten.** For foods you cook or drain, nutrients come from USDA's cooked entry and
`cook yield` = grams eaten per gram bought. It is a mass balance between the raw and cooked USDA entries:
min(kcal_raw / kcal_cooked, protein_raw / protein_cooked). Cooking in water conserves energy and protein, so
either ratio estimates the weight change, and the smaller one is conservative. Where USDA lists a measured yield
(frozen vegetables: "a 10 oz package yields 250 g"), that is used instead. Examples: white rice 2.65,
lentils 2.73, chicken breast 0.73, ground beef 80/20 0.64.

## The linear program
minimize **cᵀx** subject to:

1. **Nutrient targets:** b_min ≤ **A x** ≤ b_max (calories ±5%, protein ≥ 1.6 g/kg, fiber/calcium/iron/potassium/vitamin C minimums, sodium maximum).
2. **Macro split as a share of the plan's own calories** (stays linear because both sides are linear in x):
   4·(protein row)·x − s_lo·(calorie row)·x ≥ 0 and ≤ 0 with s_hi; same for carbs (×4) and fat (×9).
3. **Meal balance** using M: calories at meal k = (A_kcal ∘ M_k)ᵀ x, kept inside each meal's band;
   protein at each main meal ≥ 20% of the day: (p ∘ (M_k − 0.20·1))ᵀ x ≥ 0.
4. **Protein diversity:** for each food with ≥ 8.5 g protein/100 g as eaten, p_j x_j − 0.35·pᵀx ≤ 0.
5. **Group caps:** meat/poultry/fish ≤ 9 oz cooked, beans & lentils ≤ 4 servings, cheese ≤ 3, grains ≤ 12, oils & butter ≤ 4 tbsp, snacks ≤ 2.

**Realistic model (default)** adds:

6. **Dietary Guidelines 2025–2030 servings** for the person's calorie level (rounded to 200 kcal, 1,000–3,200):
   **d_min ≤ D x ≤ d_max**. For 3,000 kcal: protein foods 4–5, dairy 3, vegetables 4¾ cups, fruits 2½ cups,
   whole grains 3¼–6½, healthy fats 7 tsp. A group the diet excludes entirely is skipped, and the page says so.
7. **At least half the grains whole:** refined-grain servings − whole-grain servings ≤ 0.
8. **Saturated fat < 10% of calories:** 9·(sat-fat row)·x − 0.10·(calorie row)·x ≤ 0.
9. **Variety:** a bound x_j ≤ v · d_min,g / D_gj, so no food supplies more than v of its group's servings
   (v = 50% by default → at least 2 foods per group). Near-duplicates (whole and 2% milk, the two ground beefs) share one
   slot, which takes one extra row each.
10. **Household waste** is in c (USDA ERS consumer-level loss rates: 9% for nuts up to 31% for fish).

**Textbook model** (Plan type = Textbook) keeps rules 1–5 plus vegetables ≥ 2.5 and fruit ≥ 2 cup-equivalents.
It is the classic Stigler/Dantzig diet problem, cheapest on paper.

All rules stack into one constraint matrix **G** (77 rows in the workbook, inside Excel Solver's 100-row limit),
so the whole check is a single product **G·x**.

## The weekly budget: a parametric LP
A smaller variety share v forces more foods into each group, so the cost rises as v falls (the feasible set
shrinks). Given a weekly budget B, the website solves the LP for v = 100%, 50%, 33%, 25%, 20% (five Simplex
solves) and keeps the most varied plan with 7·cᵀx ≤ B. If even v = 100% costs more than B, it reports the
shortfall. For the example person: $39.69, $43.01, $47.29, $50.56 and $56.59 per week.

## How the Simplex method solves it
Each constraint becomes an equation by adding a slack (≤) or surplus + artificial (≥) variable, giving the
tableau [G | I | b]. **Phase 1** minimizes the sum of the artificial variables to reach a feasible corner;
**Phase 2** minimizes cᵀx. Every pivot is one round of **Gauss-Jordan elimination**: divide the pivot row by
the pivot element, subtract multiples of it from every other row. Rows are scaled so the largest coefficient
is 1. Pivoting uses the steepest reduced cost, falling back to Bland's rule on degenerate corners so the method cannot cycle.

## Why the answer is optimal (Optimality Proof sheet)
At the optimal corner for the example person (Balanced, realistic), 11 rules are tight. With the 11 basic foods
as unknowns and the 10 foods held at their bound moved to the right-hand side, the tight rules form a **square system**

  **B x_B = r**, with r = b_T − N u_N,

where B is 11 × 11 and det(B) ≈ 5.3 × 10⁷ ≠ 0, so **x_B = B⁻¹ r** is unique and reproduces the Simplex answer.
The same inverse gives the **shadow prices** yᵀ = c_Bᵀ B⁻¹. For example, each extra cup of vegetables
costs about $0.44/day, each extra cup of fruit about $0.53/day, and each extra gram of protein about $0.037/day.
The **reduced costs** d = c − yᵀG_T are ≥ 0 for every food not eaten and ≤ 0 for every food at its bound.
That is the certificate that no swap can lower the cost.

## Verification
`tests/verify_highs.py` re-solves every model with SciPy's HiGHS solver:
the 8 diets, 300 random people/preferences (both models, every variety level, waste on and off), and 3 impossible requests.
Status agrees in every case, cost agrees to about 10⁻¹³ relative, and constraint violation is below 10⁻¹⁰.
