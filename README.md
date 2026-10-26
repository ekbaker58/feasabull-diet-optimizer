# FeasaBULL Diet Optimizer — EGN4450 Team 9 (Sinister Seven)

Finds the **cheapest daily diet that meets a person's nutrient targets** using linear programming (Simplex).

```
minimize    cᵀx                 (cost per day)
subject to  b_min ≤ A·x ≤ b_max  (nutrient targets from the FeasaBULL calculator)
            0 ≤ x ≤ u            (portion caps, diet exclusions)
```
- `A` = nutrient matrix (nutrients × foods, per 100 g edible), `c` = $ per 100 g edible, `x` = food amounts (100 g units/day).

## What's here
| Path | What it is |
|---|---|
| `spreadsheet/` | Excel workbook: Food Data, Matrix Model (A, c, b, x, MMULT, B⁻¹ proof, shadow prices) |
| `src/lib/dietOptimizer.js` | Drop-in optimizer for the Base44 site (two-phase Simplex, Gauss-Jordan pivots) |
| `data/foods.json` | Food prices + USDA nutrients used by both |
| `scripts/` | Python scripts that rebuild the data, the JS module, and the workbook |
| `tests/` | Node test cases (checked against SciPy/HiGHS) |

Work in progress — expanded food list, diet presets and meal-balance constraints coming next.
