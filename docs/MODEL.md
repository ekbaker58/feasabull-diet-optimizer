# The model, in linear-algebra terms

## Variables and data
| Symbol | Size | Meaning |
|---|---|---|
| **x** | 71 × 1 | amount of each food eaten per day, in 100 g units (the unknown) |
| **c** | 71 × 1 | $ per 100 g of edible food = price ÷ (package grams × edible yield) × 100 |
| **A** | 11 × 71 | nutrients per 100 g (USDA SR28): rows = calories, protein, carbs, fat, fiber, sugars, calcium, iron, potassium, sodium, vitamin C |
| **M** | 71 × 4 | meal matrix: share of food *j* eaten at breakfast, lunch, dinner, snacks (rows sum to 1) |
| **F** | 71 × 7 | food attribute matrix (red meat, pork, poultry, fish, eggs, dairy, gluten), 0/1 |
| **f_d** | 7 × 1 | attributes a diet forbids, 0/1 |
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

## Version 3: 146 foods, more diets, and several plans per person
The section above describes the original 71-food model, which is still available as the **core** food list
(`prefs.foodSet = "core"`, $3.02/day for the example person). The default model now has **146 foods** (sources in
`docs/DATA_SOURCES.md`), so **A is 12 × 146**. The 12th row is saturated fat, which is used by the DASH-Style diet.

**New diets and filters.** Dairy-Free forbids the dairy attribute. DASH-Style adds two rows,
9·(sat-fat row)·x − 0.06·(calorie row)·x ≤ 0 and sodium ≤ 1,500 mg, and narrows the macro bands. Allergy filters add
four attributes (shellfish, peanut, tree nut, soy) to the attribute matrix F, so a food is allowed when
(F·(f_diet + f_allergy))_j = 0.

**Preferences are a diagonal matrix.** Likes and variety change only the objective:

  minimize (D c)ᵀ x,   D = diag(w),   w_j = 0.6 for a liked food, 1.5ᵏ for a food that k earlier menus already used

The constraints are unchanged, so every option meets every target. The cost the person pays is always the true
cᵀx. "Your picks" also sets a lower bound x_j ≥ one serving for each liked food when the rules allow it.

**Comparing options with matrices.** Stack the options' gram vectors as the columns of X:
- **A·X** gives every nutrient for every option in one product, and **cᵀX** gives every option's cost.
- **S** = the cosine-similarity Gram matrix of the calorie vectors (e∘x): S_ab = (e∘x_a)ᵀ(e∘x_b) / (‖e∘x_a‖ ‖e∘x_b‖).
  S is symmetric with 1s on the diagonal. 1 means two menus get their calories from the same foods in the same proportions.
- **A week:** d = days per option, so weekly grams = **X·d**. Packaged foods round up to whole packages; foods priced
  per pound are bought by weight.

Example person, Balanced, all 146 foods:

| Option | Cost/day | Similarity to A |
|---|---|---|
| A · Lowest cost | $2.87 | 1.00 |
| B · Something different | $3.42 | 0.67 |
| C · Mix it up | $3.66 | 0.52 |

Every diet for the same person: Balanced $2.87, High-Protein $4.73, Low-Carb $3.95, Vegetarian $2.88, Vegan $3.58,
Pescatarian $2.88, Gluten-Free $2.88, No Pork $2.87, Dairy-Free $3.35, DASH-Style $2.97. Balanced is $2.874994 and
Vegetarian is $2.875043, so they differ by less than a hundredth of a cent even though they round to different cents.

**Optimality proof for the 146-food plan** (workbook, Optimality Proof sheet):
- 7 tight rules: calories at the −5% edge, protein, calcium, carbohydrate ≤ 65%, vegetables, fruit, beans & lentils cap.
- 7 basic foods: drumsticks, lentils, 2% milk, brown rice, spaghetti, bananas, broccoli.
- 5 foods at their caps: eggs, peanut butter, pinto beans, white rice, green cabbage.
- det(B) ≈ 4.90 × 10⁷, and B⁻¹r reproduces the Simplex answer.
- Shadow prices, among others: vegetables $0.249 per extra cup, fruit $0.170 per extra cup, protein $0.019 per extra gram.
- Every reduced cost has the right sign, so the plan is proven optimal.

The corner is degenerate: lentils (and drumsticks, at about 1 g) are basic at or near 0.

**Verification.** `npm test` re-solves 415 LPs with HiGHS: 11 diet models, 300 random cases (with random allergy filters,
food lists and preference weights), 4 impossible cases and 100 option LPs. All statuses match, and costs agree to about 10⁻¹².
