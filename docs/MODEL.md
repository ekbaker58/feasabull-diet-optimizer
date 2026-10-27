# The model, in linear-algebra terms

## Variables and data
| Symbol | Size | Meaning |
|---|---|---|
| **x** | 71 × 1 | amount of each food eaten per day, in 100 g units (the unknown) |
| **c** | 71 × 1 | $ per 100 g of edible food = price ÷ (package grams × edible yield) × 100 |
| **A** | 11 × 71 | nutrients per 100 g (USDA SR28): rows = calories, protein, carbs, fat, fiber, sugars, calcium, iron, potassium, sodium, vitamin C |
| **M** | 71 × 4 | meal matrix: share of food *j* eaten at breakfast, lunch, dinner, snacks (rows sum to 1) |
| **F** | 71 × 7 | food attribute matrix (red meat, pork, poultry, fish, eggs, dairy, gluten), 0/1 |
| **f_d** | 7 × 1 | attributes a diet forbids, 0/1 (plus a list of individual foods it excludes; both set u_j = 0). Diets are defined in `config/diets.json` |
| **u** | 71 × 1 | portion caps (serving × max servings ÷ 100); u_j = 0 when (F·f_d)_j > 0 |

## The linear program
minimize **cᵀx** subject to:

1. **Nutrient targets:** b_min ≤ **A x** ≤ b_max (calories ±5%, fiber/calcium/iron/potassium/vitamin C minimums, sodium maximum).
2. **Macro split as a share of the plan's own calories** (stays linear because both sides are linear in x):
   4·(protein row)·x − s_lo·(calorie row)·x ≥ 0 and ≤ 0 with s_hi; same for carbs (×4) and fat (×9).
3. **Meal balance** using M: calories at meal k = (A_kcal ∘ M_k)ᵀ x, kept inside each meal's band;
   protein at each main meal ≥ 20% of the day: (p ∘ (M_k − 0.20·1))ᵀ x ≥ 0.
4. **Protein diversity:** for each food with ≥ 10 g protein/100 g, p_j x_j − 0.35·pᵀx ≤ 0, so no single food supplies more than 35% of the protein (this forces at least 3 protein sources).
5. **Food groups:** vegetables ≥ 2.5 cup-equivalents, fruit ≥ 2; caps on meat/poultry/fish (340 g raw), beans & lentils (3 servings), cheese (3), grains (9), oils & butter (4 tbsp), snacks (2).
6. **Bounds:** 0 ≤ x ≤ u (and x ≥ l for "must include" foods).

All rules stack into one constraint matrix **G** (68 rows in the workbook), so the whole check is a single product **G·x**.

## How the Simplex method solves it
Each constraint becomes an equation by adding a slack (≤) or surplus + artificial (≥) variable, giving the
tableau [G | I | b]. **Phase 1** minimizes the sum of the artificial variables to reach a feasible corner;
**Phase 2** minimizes cᵀx. Every pivot is one round of **Gauss-Jordan elimination**: divide the pivot row by
the pivot element, subtract multiples of it from every other row. Rows are scaled so the largest coefficient
is 1. Pivoting uses the steepest reduced cost, falling back to Bland's rule on degenerate corners so the method cannot cycle.

## Why the answer is optimal (Optimality Proof sheet)
At the optimal corner for the example person (Balanced), 7 rules are tight. With the 7 basic foods as unknowns
and the 3 foods held at their cap moved to the right-hand side, the tight rules form a **square system**

  **B x_B = r**, with r = b_T − N u_N,

where B is 7 × 7 and det(B) ≠ 0, so **x_B = B⁻¹ r** is unique and reproduces the Simplex answer.
The same inverse gives the **shadow prices** yᵀ = c_Bᵀ B⁻¹. For example, each extra cup of vegetables
costs about $0.31/day. The **reduced costs** d = c − yᵀG_T are ≥ 0 for every food not eaten and ≤ 0
for every food at its cap. That is the certificate that no swap can lower the cost.

*Degeneracy:* bananas sit exactly at their cap **and** make the fruit rule tight. They are treated as basic,
which is the standard way to handle a degenerate corner.

## Verification
`tests/verify_highs.py` re-solves every model with SciPy's HiGHS solver:
the 8 diets, 300 random people/preferences, and 3 impossible requests.
Status agrees in every case, cost agrees to 10⁻¹¹ relative, and constraint violation is below 10⁻¹¹.
