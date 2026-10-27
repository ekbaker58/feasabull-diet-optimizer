/**
 * FeasaBULL diet optimizer — linear programming solved with the two-phase Simplex method.
 * EGN4450 Team 9 (Sinister Seven), USF, Fall 2026.  GENERATED FILE: edit scripts/solver_template.js
 * and the data in scripts/foods_v2.py, then run `python scripts/build_all.py`.
 *
 * THE MODEL (matrix form)
 *   x  (n x 1)  diet vector: x_j = amount of food j eaten per day, in 100 g units
 *   c  (n x 1)  cost vector: c_j = $ per 100 g of edible food j
 *   A  (m x n)  nutrient matrix: A_ij = amount of nutrient i in 100 g of food j (USDA SR28)
 *   M  (n x 4)  meal matrix: M_jk = share of food j eaten at meal k (Breakfast, Lunch, Dinner, Snacks)
 *
 *   minimize    c^T x                                   (cost per day)
 *   subject to  b_min <= A x <= b_max                   (daily nutrient targets)
 *               4 p^T x - s_lo e^T x >= 0  (and <= s_hi) (macro split as % of the plan's actual calories; same for carbs, 9x fat)
 *               k_lo <= (A_kcal o M)^T x <= k_hi         (each meal's share of calories)
 *               (p o (M_k - beta 1))^T x >= 0            (each main meal carries >= beta of the protein)
 *               p_j x_j - alpha p^T x <= 0               (no food supplies > alpha of the protein)
 *               g_min <= G x <= g_max                   (vegetable/fruit cup-equivalents; caps on meat, beans,
 *                                                        cheese, grains, oils and snacks as groups)
 *               0 <= x <= u                             (portion caps; u_j = 0 when the diet excludes food j)
 *
 * THE SOLVER
 *   Two-phase Simplex on a dense tableau. Each pivot is a Gauss-Jordan elimination step
 *   (scale the pivot row, subtract multiples of it from every other row). Bland's rule
 *   prevents cycling. Results were checked against SciPy's HiGHS solver (tests/).
 */

export const PRICE_SOURCE = "Walmart.com / business.walmart.com, observed October 2026 (regular, non-Rollback prices); BLS Average Price Data, U.S. city average, September 2026, as a reference column";
export const NUTRIENT_SOURCE = "USDA National Nutrient Database for Standard Reference, Release 28 (SR28)";
export const NUTRIENTS = [{"key": "kcal", "label": "Calories", "unit": "kcal"}, {"key": "protein", "label": "Protein", "unit": "g"}, {"key": "carb", "label": "Carbohydrate", "unit": "g"}, {"key": "fat", "label": "Fat", "unit": "g"}, {"key": "fiber", "label": "Fiber", "unit": "g"}, {"key": "sugar", "label": "Total sugars", "unit": "g"}, {"key": "calcium", "label": "Calcium", "unit": "mg"}, {"key": "iron", "label": "Iron", "unit": "mg"}, {"key": "potassium", "label": "Potassium", "unit": "mg"}, {"key": "sodium", "label": "Sodium", "unit": "mg"}, {"key": "vitc", "label": "Vitamin C", "unit": "mg"}];
export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
export const DIETS = [
 {
  "name": "Balanced",
  "desc": "USDA Acceptable Macronutrient Distribution Ranges; all foods allowed",
  "protein": [
   0.1,
   0.35
  ],
  "carb": [
   0.45,
   0.65
  ],
  "fat": [
   0.2,
   0.35
  ],
  "forbid": [],
  "forbid_foods": [],
  "no": []
 },
 {
  "name": "High-Protein",
  "desc": "For muscle gain: protein 25-35% of calories",
  "protein": [
   0.25,
   0.35
  ],
  "carb": [
   0.4,
   0.55
  ],
  "fat": [
   0.2,
   0.3
  ],
  "forbid": [],
  "forbid_foods": [],
  "no": []
 },
 {
  "name": "Low-Carb",
  "desc": "Moderate low-carb: carbs 20-35%, fat 35-50% (below the AMDR carb range)",
  "protein": [
   0.2,
   0.35
  ],
  "carb": [
   0.2,
   0.35
  ],
  "fat": [
   0.35,
   0.5
  ],
  "forbid": [],
  "forbid_foods": [],
  "no": []
 },
 {
  "name": "Vegetarian",
  "desc": "Lacto-ovo: no meat, poultry or fish",
  "protein": [
   0.1,
   0.35
  ],
  "carb": [
   0.45,
   0.65
  ],
  "fat": [
   0.2,
   0.35
  ],
  "forbid": [
   "meat",
   "pork",
   "poultry",
   "fish"
  ],
  "forbid_foods": [],
  "no": [
   "red meat",
   "pork",
   "poultry",
   "fish"
  ]
 },
 {
  "name": "Vegan",
  "desc": "No animal products",
  "protein": [
   0.1,
   0.35
  ],
  "carb": [
   0.45,
   0.65
  ],
  "fat": [
   0.2,
   0.35
  ],
  "forbid": [
   "meat",
   "pork",
   "poultry",
   "fish",
   "egg",
   "dairy"
  ],
  "forbid_foods": [],
  "no": [
   "red meat",
   "pork",
   "poultry",
   "fish",
   "eggs",
   "dairy"
  ]
 },
 {
  "name": "Pescatarian",
  "desc": "Fish and seafood, no meat or poultry",
  "protein": [
   0.1,
   0.35
  ],
  "carb": [
   0.45,
   0.65
  ],
  "fat": [
   0.2,
   0.35
  ],
  "forbid": [
   "meat",
   "pork",
   "poultry"
  ],
  "forbid_foods": [],
  "no": [
   "red meat",
   "pork",
   "poultry"
  ]
 },
 {
  "name": "Gluten-Free",
  "desc": "No wheat, barley, rye or non-certified oats",
  "protein": [
   0.1,
   0.35
  ],
  "carb": [
   0.45,
   0.65
  ],
  "fat": [
   0.2,
   0.35
  ],
  "forbid": [
   "gluten"
  ],
  "forbid_foods": [],
  "no": [
   "gluten"
  ]
 },
 {
  "name": "No Pork",
  "desc": "All foods except pork",
  "protein": [
   0.1,
   0.35
  ],
  "carb": [
   0.45,
   0.65
  ],
  "fat": [
   0.2,
   0.35
  ],
  "forbid": [
   "pork"
  ],
  "forbid_foods": [],
  "no": [
   "pork"
  ]
 }
];
export const SETTINGS = {
 "calorie_tolerance": 0.05,
 "max_protein_share": 0.35,
 "share_rule_min_protein": 10.0,
 "meal_kcal": {
  "Breakfast": [
   0.2,
   0.3
  ],
  "Lunch": [
   0.25,
   0.35
  ],
  "Dinner": [
   0.25,
   0.4
  ],
  "Snacks": [
   0.05,
   0.2
  ]
 },
 "min_meal_protein_share": 0.2,
 "min_veg_cups": 2.5,
 "min_fruit_cups": 2.0,
 "group_caps": {
  "meat_fish": 340,
  "legumes": 3,
  "cheese": 3,
  "grains": 9,
  "added_fats": 4,
  "snacks": 2
 }
};
export const GROUP_CAPS = [
 {
  "key": "meat_fish",
  "label": "Meat, poultry & fish",
  "unit": "grams",
  "max": 340,
  "note": "12 oz raw (~9 oz cooked) per day",
  "types": [
   "Poultry",
   "Red Meat & Pork",
   "Fish & Seafood"
  ]
 },
 {
  "key": "legumes",
  "label": "Beans & lentils",
  "unit": "servings",
  "max": 3,
  "note": "about 2-2.25 cups cooked per day",
  "ids": [
   "lentils",
   "black_beans",
   "chickpeas",
   "pinto_beans"
  ]
 },
 {
  "key": "cheese",
  "label": "Cheese",
  "unit": "servings",
  "max": 3,
  "note": "slices / oz / sticks / half-cups",
  "types": [
   "Cheese"
  ]
 },
 {
  "key": "grains",
  "label": "Grains & bread",
  "unit": "servings",
  "max": 9,
  "note": "",
  "types": [
   "Grains & Bread"
  ]
 },
 {
  "key": "added_fats",
  "label": "Oils & butter",
  "unit": "servings",
  "max": 4,
  "note": "tablespoons",
  "types": [
   "Oils & Fats"
  ]
 },
 {
  "key": "snacks",
  "label": "Snacks & sweets",
  "unit": "servings",
  "max": 2,
  "note": "",
  "types": [
   "Snacks"
  ]
 }
];
// per100g = USDA SR28 per 100 g edible; cost_per_100g = Walmart price / (package_g x edible_yield) x 100
// meal = share eaten at [Breakfast, Lunch, Dinner, Snacks]; flags drive diet filters
export const FOODS = [
  {"id": "chicken_breast", "name": "Chicken breast (boneless, skinless)", "group": "Proteins", "type": "Poultry", "price": 9.84, "package_g": 1360.8, "edible_yield": 1.0, "cost_per_100g": 0.723104, "bls_cost_per_100g": 0.926604, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05062", "per100g": {"kcal": 120.0, "protein": 22.5, "carb": 0.0, "fat": 2.62, "fiber": 0.0, "sugar": 0.0, "calcium": 5.0, "iron": 0.37, "potassium": 334.0, "sodium": 45.0, "vitc": 0.0}},
  {"id": "drumsticks", "name": "Chicken drumsticks (bone-in)", "group": "Proteins", "type": "Poultry", "price": 4.83, "package_g": 1814.4, "edible_yield": 0.67, "cost_per_100g": 0.397319, "bls_cost_per_100g": 0.572215, "serving_g": 100, "serving_desc": "100 g meat & skin (~1.5 drumsticks)", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05066", "per100g": {"kcal": 161.0, "protein": 18.08, "carb": 0.11, "fat": 9.2, "fiber": 0.0, "sugar": 0.0, "calcium": 8.0, "iron": 0.71, "potassium": 211.0, "sodium": 106.0, "vitc": 0.0}},
  {"id": "chicken_thigh", "name": "Chicken thighs (boneless, skinless)", "group": "Proteins", "type": "Poultry", "price": 9.87, "package_g": 1360.8, "edible_yield": 1.0, "cost_per_100g": 0.725309, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05096", "per100g": {"kcal": 121.0, "protein": 19.66, "carb": 0.0, "fat": 4.12, "fiber": 0.0, "sugar": 0.0, "calcium": 7.0, "iron": 0.81, "potassium": 242.0, "sodium": 95.0, "vitc": 0.0}},
  {"id": "deli_turkey", "name": "Deli turkey breast (sliced)", "group": "Proteins", "type": "Poultry", "price": 5.97, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.316138, "bls_cost_per_100g": null, "serving_g": 56, "serving_desc": "2 oz (about 4 slices)", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "07081", "per100g": {"kcal": 100.0, "protein": 16.33, "carb": 2.34, "fat": 2.37, "fiber": 0.0, "sugar": 3.28, "calcium": 7.0, "iron": 0.34, "potassium": 401.0, "sodium": 922.0, "vitc": 0.0}},
  {"id": "ground_turkey", "name": "Ground turkey 93/7", "group": "Proteins", "type": "Poultry", "price": 5.56, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.22575, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05665", "per100g": {"kcal": 150.0, "protein": 18.73, "carb": 0.0, "fat": 8.34, "fiber": 0.0, "sugar": 0.0, "calcium": 21.0, "iron": 1.17, "potassium": 213.0, "sodium": 69.0, "vitc": 0.0}},
  {"id": "bacon", "name": "Bacon", "group": "Proteins", "type": "Red Meat & Pork", "price": 4.24, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.934744, "bls_cost_per_100g": 1.489444, "serving_g": 28, "serving_desc": "1 slice raw", "max_servings": 3, "meal": [1, 0, 0, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "10123", "per100g": {"kcal": 417.0, "protein": 12.62, "carb": 1.28, "fat": 39.69, "fiber": 0.0, "sugar": 1.0, "calcium": 5.0, "iron": 0.41, "potassium": 198.0, "sodium": 662.0, "vitc": 0.0}},
  {"id": "ground_beef", "name": "Ground beef 80/20", "group": "Proteins", "type": "Red Meat & Pork", "price": 6.43, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.417549, "bls_cost_per_100g": 1.497381, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "23572", "per100g": {"kcal": 254.0, "protein": 17.17, "carb": 0.0, "fat": 20.0, "fiber": 0.0, "sugar": 0.0, "calcium": 18.0, "iron": 1.94, "potassium": 270.0, "sodium": 66.0, "vitc": 0.0}},
  {"id": "lean_beef", "name": "Ground beef 93/7 (lean)", "group": "Proteins", "type": "Red Meat & Pork", "price": 7.87, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.735009, "bls_cost_per_100g": 1.865333, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "23472", "per100g": {"kcal": 152.0, "protein": 20.85, "carb": 0.0, "fat": 7.0, "fiber": 0.0, "sugar": 0.0, "calcium": 10.0, "iron": 2.33, "potassium": 336.0, "sodium": 66.0, "vitc": 0.0}},
  {"id": "ham", "name": "Ham (sliced, cooked)", "group": "Proteins", "type": "Red Meat & Pork", "price": 4.97, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.095679, "bls_cost_per_100g": 1.20152, "serving_g": 56, "serving_desc": "2 oz (2 slices)", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "07029", "per100g": {"kcal": 163.0, "protein": 16.6, "carb": 3.83, "fat": 8.6, "fiber": 1.3, "sugar": 0.0, "calcium": 24.0, "iron": 1.02, "potassium": 287.0, "sodium": 1143.0, "vitc": 4.0}},
  {"id": "pork_chops", "name": "Pork loin chops (boneless)", "group": "Proteins", "type": "Red Meat & Pork", "price": 4.17, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.919312, "bls_cost_per_100g": 1.003104, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "10164", "per100g": {"kcal": 201.0, "protein": 21.14, "carb": 0.0, "fat": 12.96, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.48, "potassium": 345.0, "sodium": 82.0, "vitc": 0.0}},
  {"id": "sirloin", "name": "Top sirloin steak", "group": "Proteins", "type": "Red Meat & Pork", "price": 12.94, "package_g": 453.6, "edible_yield": 0.97, "cost_per_100g": 2.940963, "bls_cost_per_100g": 3.206024, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "13931", "per100g": {"kcal": 214.0, "protein": 19.92, "carb": 0.0, "fat": 14.28, "fiber": 0.0, "sugar": 0.0, "calcium": 25.0, "iron": 1.46, "potassium": 309.0, "sodium": 51.0, "vitc": 0.0}},
  {"id": "tuna", "name": "Canned light tuna (in water)", "group": "Proteins", "type": "Fish & Seafood", "price": 0.96, "package_g": 141.7, "edible_yield": 0.79, "cost_per_100g": 0.857579, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz drained", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15121", "per100g": {"kcal": 86.0, "protein": 19.44, "carb": 0.0, "fat": 0.96, "fiber": 0.0, "sugar": 0.0, "calcium": 17.0, "iron": 1.63, "potassium": 179.0, "sodium": 247.0, "vitc": 0.0}},
  {"id": "salmon", "name": "Salmon (Atlantic, fillet)", "group": "Proteins", "type": "Fish & Seafood", "price": 21.94, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 2.41843, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15236", "per100g": {"kcal": 208.0, "protein": 20.42, "carb": 0.0, "fat": 13.42, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.34, "potassium": 363.0, "sodium": 59.0, "vitc": 3.9}},
  {"id": "shrimp", "name": "Shrimp (raw, peeled)", "group": "Proteins", "type": "Fish & Seafood", "price": 15.96, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 1.759259, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15149", "per100g": {"kcal": 71.0, "protein": 13.61, "carb": 0.91, "fat": 1.01, "fiber": 0.0, "sugar": 0.0, "calcium": 54.0, "iron": 0.21, "potassium": 113.0, "sodium": 566.0, "vitc": 0.0}},
  {"id": "tilapia", "name": "Tilapia (fillet)", "group": "Proteins", "type": "Fish & Seafood", "price": 8.87, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.977734, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15261", "per100g": {"kcal": 96.0, "protein": 20.08, "carb": 0.0, "fat": 1.7, "fiber": 0.0, "sugar": 0.0, "calcium": 10.0, "iron": 0.56, "potassium": 302.0, "sodium": 52.0, "vitc": 0.0}},
  {"id": "eggs", "name": "Eggs (large)", "group": "Proteins", "type": "Eggs", "price": 1.67, "package_g": 681.8, "edible_yield": 0.88, "cost_per_100g": 0.278341, "bls_cost_per_100g": 0.378667, "serving_g": 50, "serving_desc": "1 large egg", "max_servings": 3, "meal": [1, 0, 0, 0], "flags": ["egg"], "cup_eq_g": null, "cap_group": null, "ndb": "01123", "per100g": {"kcal": 143.0, "protein": 12.56, "carb": 0.72, "fat": 9.51, "fiber": 0.0, "sugar": 0.37, "calcium": 56.0, "iron": 1.75, "potassium": 138.0, "sodium": 142.0, "vitc": 0.0}},
  {"id": "black_beans", "name": "Black beans (canned)", "group": "Proteins", "type": "Plant Proteins", "price": 0.92, "package_g": 425.2, "edible_yield": 1.0, "cost_per_100g": 0.216369, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16316", "per100g": {"kcal": 91.0, "protein": 6.03, "carb": 16.55, "fat": 0.29, "fiber": 6.9, "sugar": 0.23, "calcium": 35.0, "iron": 1.9, "potassium": 308.0, "sodium": 138.0, "vitc": 2.7}},
  {"id": "chickpeas", "name": "Chickpeas (canned)", "group": "Proteins", "type": "Plant Proteins", "price": 0.92, "package_g": 439.4, "edible_yield": 1.0, "cost_per_100g": 0.209376, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16058", "per100g": {"kcal": 88.0, "protein": 4.92, "carb": 13.49, "fat": 1.95, "fiber": 4.4, "sugar": 0.0, "calcium": 35.0, "iron": 1.23, "potassium": 144.0, "sodium": 278.0, "vitc": 0.1}},
  {"id": "lentils", "name": "Lentils (dry)", "group": "Proteins", "type": "Plant Proteins", "price": 1.92, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.42328, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16069", "per100g": {"kcal": 352.0, "protein": 24.63, "carb": 63.35, "fat": 1.06, "fiber": 10.7, "sugar": 2.03, "calcium": 35.0, "iron": 6.51, "potassium": 677.0, "sodium": 6.0, "vitc": 4.5}},
  {"id": "peanut_butter", "name": "Peanut butter", "group": "Proteins", "type": "Plant Proteins", "price": 3.98, "package_g": 1134.0, "edible_yield": 1.0, "cost_per_100g": 0.35097, "bls_cost_per_100g": null, "serving_g": 32, "serving_desc": "2 tbsp", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "16098", "per100g": {"kcal": 598.0, "protein": 22.21, "carb": 22.31, "fat": 51.36, "fiber": 5.0, "sugar": 10.49, "calcium": 49.0, "iron": 1.74, "potassium": 558.0, "sodium": 426.0, "vitc": 0.0}},
  {"id": "pinto_beans", "name": "Pinto beans (dry)", "group": "Proteins", "type": "Plant Proteins", "price": 1.98, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.218254, "bls_cost_per_100g": 0.367952, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16042", "per100g": {"kcal": 347.0, "protein": 21.42, "carb": 62.55, "fat": 1.23, "fiber": 15.5, "sugar": 2.11, "calcium": 113.0, "iron": 5.07, "potassium": 1393.0, "sodium": 12.0, "vitc": 6.3}},
  {"id": "tofu", "name": "Tofu (extra firm)", "group": "Proteins", "type": "Plant Proteins", "price": 2.97, "package_g": 396.9, "edible_yield": 1.0, "cost_per_100g": 0.748299, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "16212", "per100g": {"kcal": 98.0, "protein": 10.1, "carb": 2.6, "fat": 5.2, "fiber": 1.3, "sugar": 0.4, "calcium": 77.0, "iron": 1.6, "potassium": 0.0, "sodium": 4.0, "vitc": 0.0}},
  {"id": "milk_2pct", "name": "2% milk", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 3.31, "package_g": 3904, "edible_yield": 1.0, "cost_per_100g": 0.084785, "bls_cost_per_100g": null, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "ndb": "01079", "per100g": {"kcal": 50.0, "protein": 3.3, "carb": 4.8, "fat": 1.98, "fiber": 0.0, "sugar": 5.06, "calcium": 120.0, "iron": 0.02, "potassium": 140.0, "sodium": 47.0, "vitc": 0.2}},
  {"id": "greek_yogurt", "name": "Greek yogurt (plain, nonfat)", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 3.28, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.361552, "bls_cost_per_100g": null, "serving_g": 170, "serving_desc": "1 container (6 oz)", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "ndb": "01256", "per100g": {"kcal": 59.0, "protein": 10.19, "carb": 3.6, "fat": 0.39, "fiber": 0.0, "sugar": 3.24, "calcium": 110.0, "iron": 0.07, "potassium": 141.0, "sodium": 36.0, "vitc": 0.0}},
  {"id": "soy_milk", "name": "Soy milk (calcium-fortified)", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 4.57, "package_g": 1944, "edible_yield": 1.0, "cost_per_100g": 0.235082, "bls_cost_per_100g": null, "serving_g": 243, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "16139", "per100g": {"kcal": 43.0, "protein": 2.6, "carb": 4.92, "fat": 1.47, "fiber": 0.2, "sugar": 3.65, "calcium": 123.0, "iron": 0.42, "potassium": 122.0, "sodium": 47.0, "vitc": 0.0}},
  {"id": "milk_whole", "name": "Whole milk", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 3.48, "package_g": 3904, "edible_yield": 1.0, "cost_per_100g": 0.089139, "bls_cost_per_100g": 0.105174, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "ndb": "01077", "per100g": {"kcal": 61.0, "protein": 3.15, "carb": 4.8, "fat": 3.25, "fiber": 0.0, "sugar": 5.05, "calcium": 113.0, "iron": 0.03, "potassium": 132.0, "sodium": 43.0, "vitc": 0.0}},
  {"id": "american_cheese", "name": "American cheese (singles)", "group": "Dairy & Alternatives", "type": "Cheese", "price": 2.48, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.546737, "bls_cost_per_100g": 1.044331, "serving_g": 19, "serving_desc": "1 slice", "max_servings": 3, "meal": [0, 1, 0, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01042", "per100g": {"kcal": 366.0, "protein": 18.13, "carb": 4.78, "fat": 30.71, "fiber": 0.0, "sugar": 2.26, "calcium": 1045.0, "iron": 0.63, "potassium": 132.0, "sodium": 1671.0, "vitc": 0.0}},
  {"id": "cheddar", "name": "Cheddar cheese", "group": "Dairy & Alternatives", "type": "Cheese", "price": 1.87, "package_g": 226.8, "edible_yield": 1.0, "cost_per_100g": 0.824515, "bls_cost_per_100g": 1.352096, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01009", "per100g": {"kcal": 404.0, "protein": 22.87, "carb": 3.09, "fat": 33.31, "fiber": 0.0, "sugar": 0.48, "calcium": 710.0, "iron": 0.14, "potassium": 76.0, "sodium": 653.0, "vitc": 0.0}},
  {"id": "cottage_cheese", "name": "Cottage cheese (2%)", "group": "Dairy & Alternatives", "type": "Cheese", "price": 2.87, "package_g": 680.4, "edible_yield": 1.0, "cost_per_100g": 0.421811, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01015", "per100g": {"kcal": 81.0, "protein": 10.45, "carb": 4.76, "fat": 2.27, "fiber": 0.0, "sugar": 4.0, "calcium": 111.0, "iron": 0.13, "potassium": 125.0, "sodium": 308.0, "vitc": 0.0}},
  {"id": "string_cheese", "name": "Mozzarella string cheese", "group": "Dairy & Alternatives", "type": "Cheese", "price": 3.28, "package_g": 340.2, "edible_yield": 1.0, "cost_per_100g": 0.964139, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 stick", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01029", "per100g": {"kcal": 295.0, "protein": 23.75, "carb": 5.58, "fat": 19.78, "fiber": 0.0, "sugar": 1.9, "calcium": 697.0, "iron": 0.22, "potassium": 188.0, "sodium": 666.0, "vitc": 0.0}},
  {"id": "bagel", "name": "Bagels (plain)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.14, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.377425, "bls_cost_per_100g": null, "serving_g": 94, "serving_desc": "1 bagel", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18001", "per100g": {"kcal": 264.0, "protein": 10.56, "carb": 52.38, "fat": 1.32, "fiber": 1.6, "sugar": 8.43, "calcium": 219.0, "iron": 3.57, "potassium": 107.0, "sodium": 422.0, "vitc": 0.0}},
  {"id": "brown_rice", "name": "Brown rice (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.72, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.189594, "bls_cost_per_100g": null, "serving_g": 46, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 4, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "20036", "per100g": {"kcal": 367.0, "protein": 7.54, "carb": 76.25, "fat": 3.2, "fiber": 3.6, "sugar": 0.66, "calcium": 9.0, "iron": 1.29, "potassium": 250.0, "sodium": 5.0, "vitc": 0.0}},
  {"id": "cheerios", "name": "Cheerios", "group": "Carbohydrates", "type": "Grains & Bread", "price": 4.97, "package_g": 510.3, "edible_yield": 1.0, "cost_per_100g": 0.973937, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 cup", "max_servings": 2, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "08013", "per100g": {"kcal": 376.0, "protein": 12.09, "carb": 73.23, "fat": 6.73, "fiber": 9.4, "sugar": 4.36, "calcium": 401.0, "iron": 33.17, "potassium": 641.0, "sodium": 497.0, "vitc": 21.6}},
  {"id": "corn_tortilla", "name": "Corn tortillas", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.48, "package_g": 791.0, "edible_yield": 1.0, "cost_per_100g": 0.313527, "bls_cost_per_100g": null, "serving_g": 26, "serving_desc": "1 tortilla", "max_servings": 6, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "18363", "per100g": {"kcal": 218.0, "protein": 5.7, "carb": 44.64, "fat": 2.85, "fiber": 6.3, "sugar": 0.88, "calcium": 81.0, "iron": 1.23, "potassium": 186.0, "sodium": 45.0, "vitc": 0.0}},
  {"id": "flour_tortilla", "name": "Flour tortillas", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.98, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.436508, "bls_cost_per_100g": null, "serving_g": 45, "serving_desc": "1 tortilla", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18970", "per100g": {"kcal": 297.0, "protein": 8.01, "carb": 49.27, "fat": 7.58, "fiber": 2.4, "sugar": 2.66, "calcium": 163.0, "iron": 3.32, "potassium": 133.0, "sodium": 742.0, "vitc": 0.0}},
  {"id": "quinoa", "name": "Quinoa (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 3.44, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.758377, "bls_cost_per_100g": null, "serving_g": 43, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "20035", "per100g": {"kcal": 368.0, "protein": 14.12, "carb": 64.16, "fat": 6.07, "fiber": 7.0, "sugar": 0.0, "calcium": 47.0, "iron": 4.57, "potassium": 563.0, "sodium": 5.0, "vitc": 0.0}},
  {"id": "oats", "name": "Rolled oats (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 4.38, "package_g": 1190.7, "edible_yield": 1.0, "cost_per_100g": 0.367851, "bls_cost_per_100g": null, "serving_g": 40, "serving_desc": "1/2 cup dry", "max_servings": 2, "meal": [1, 0, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "08120", "per100g": {"kcal": 379.0, "protein": 13.15, "carb": 67.7, "fat": 6.52, "fiber": 10.1, "sugar": 0.99, "calcium": 52.0, "iron": 4.25, "potassium": 362.0, "sodium": 6.0, "vitc": 0.0}},
  {"id": "spaghetti", "name": "Spaghetti (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.36, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.299824, "bls_cost_per_100g": 0.303136, "serving_g": 57, "serving_desc": "2 oz dry (~1 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "20120", "per100g": {"kcal": 371.0, "protein": 13.04, "carb": 74.67, "fat": 1.51, "fiber": 3.2, "sugar": 2.67, "calcium": 21.0, "iron": 3.3, "potassium": 223.0, "sodium": 6.0, "vitc": 0.0}},
  {"id": "white_bread", "name": "White bread", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.52, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.268078, "bls_cost_per_100g": 0.403446, "serving_g": 28, "serving_desc": "1 slice", "max_servings": 4, "meal": [0.5, 0.5, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18069", "per100g": {"kcal": 266.0, "protein": 8.85, "carb": 49.42, "fat": 3.33, "fiber": 2.7, "sugar": 5.67, "calcium": 144.0, "iron": 3.61, "potassium": 126.0, "sodium": 490.0, "vitc": 0.0}},
  {"id": "white_rice", "name": "White rice (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.48, "package_g": 2268.0, "edible_yield": 1.0, "cost_per_100g": 0.109347, "bls_cost_per_100g": 0.246477, "serving_g": 46, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 4, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "20044", "per100g": {"kcal": 365.0, "protein": 7.13, "carb": 79.95, "fat": 0.66, "fiber": 1.3, "sugar": 0.12, "calcium": 28.0, "iron": 4.31, "potassium": 115.0, "sodium": 5.0, "vitc": 0.0}},
  {"id": "wheat_bread", "name": "Whole-wheat bread", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.02, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.356261, "bls_cost_per_100g": null, "serving_g": 32, "serving_desc": "1 slice", "max_servings": 4, "meal": [0.5, 0.5, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18075", "per100g": {"kcal": 252.0, "protein": 12.45, "carb": 42.71, "fat": 3.5, "fiber": 6.0, "sugar": 4.34, "calcium": 161.0, "iron": 2.47, "potassium": 254.0, "sodium": 455.0, "vitc": 0.0}},
  {"id": "ww_pasta", "name": "Whole-wheat spaghetti (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.74, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.383598, "bls_cost_per_100g": null, "serving_g": 57, "serving_desc": "2 oz dry (~1 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "20124", "per100g": {"kcal": 352.0, "protein": 13.87, "carb": 73.37, "fat": 2.93, "fiber": 9.2, "sugar": 2.74, "calcium": 29.0, "iron": 3.62, "potassium": 434.0, "sodium": 6.0, "vitc": 0.0}},
  {"id": "corn", "name": "Corn (frozen)", "group": "Carbohydrates", "type": "Starchy Vegetables", "price": 0.98, "package_g": 340.2, "edible_yield": 1.0, "cost_per_100g": 0.288066, "bls_cost_per_100g": null, "serving_g": 68, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11178", "per100g": {"kcal": 88.0, "protein": 3.02, "carb": 20.71, "fat": 0.78, "fiber": 2.1, "sugar": 2.5, "calcium": 4.0, "iron": 0.42, "potassium": 213.0, "sodium": 3.0, "vitc": 6.4}},
  {"id": "potatoes", "name": "Potatoes (russet)", "group": "Carbohydrates", "type": "Starchy Vegetables", "price": 4.86, "package_g": 2268.0, "edible_yield": 0.75, "cost_per_100g": 0.285714, "bls_cost_per_100g": 0.290716, "serving_g": 150, "serving_desc": "1 cup diced", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11352", "per100g": {"kcal": 77.0, "protein": 2.05, "carb": 17.49, "fat": 0.09, "fiber": 2.1, "sugar": 0.82, "calcium": 12.0, "iron": 0.81, "potassium": 425.0, "sodium": 6.0, "vitc": 19.7}},
  {"id": "sweet_potatoes", "name": "Sweet potatoes", "group": "Carbohydrates", "type": "Starchy Vegetables", "price": 3.62, "package_g": 1360.8, "edible_yield": 0.72, "cost_per_100g": 0.369472, "bls_cost_per_100g": null, "serving_g": 133, "serving_desc": "1 cup cubed", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11507", "per100g": {"kcal": 86.0, "protein": 1.57, "carb": 20.12, "fat": 0.05, "fiber": 3.0, "sugar": 4.18, "calcium": 30.0, "iron": 0.61, "potassium": 337.0, "sodium": 55.0, "vitc": 2.4}},
  {"id": "apples", "name": "Apples (Gala)", "group": "Fruits", "type": "Fruit", "price": 3.92, "package_g": 1360.8, "edible_yield": 0.9, "cost_per_100g": 0.320073, "bls_cost_per_100g": null, "serving_g": 125, "serving_desc": "1 small apple", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 125, "cap_group": null, "ndb": "09003", "per100g": {"kcal": 52.0, "protein": 0.26, "carb": 13.81, "fat": 0.17, "fiber": 2.4, "sugar": 10.39, "calcium": 6.0, "iron": 0.12, "potassium": 107.0, "sodium": 1.0, "vitc": 4.6}},
  {"id": "bananas", "name": "Bananas", "group": "Fruits", "type": "Fruit", "price": 0.5, "package_g": 453.6, "edible_yield": 0.64, "cost_per_100g": 0.172233, "bls_cost_per_100g": 0.225974, "serving_g": 118, "serving_desc": "1 medium", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 118, "cap_group": null, "ndb": "09040", "per100g": {"kcal": 89.0, "protein": 1.09, "carb": 22.84, "fat": 0.33, "fiber": 2.6, "sugar": 12.23, "calcium": 5.0, "iron": 0.26, "potassium": 358.0, "sodium": 1.0, "vitc": 8.7}},
  {"id": "blueberries", "name": "Blueberries (frozen)", "group": "Fruits", "type": "Fruit", "price": 7.97, "package_g": 1360.8, "edible_yield": 1.0, "cost_per_100g": 0.585685, "bls_cost_per_100g": null, "serving_g": 155, "serving_desc": "1 cup", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": 155, "cap_group": null, "ndb": "09054", "per100g": {"kcal": 51.0, "protein": 0.42, "carb": 12.17, "fat": 0.64, "fiber": 2.7, "sugar": 8.45, "calcium": 8.0, "iron": 0.18, "potassium": 54.0, "sodium": 1.0, "vitc": 2.5}},
  {"id": "grapes", "name": "Grapes (red seedless)", "group": "Fruits", "type": "Fruit", "price": 1.87, "package_g": 453.6, "edible_yield": 0.96, "cost_per_100g": 0.429435, "bls_cost_per_100g": null, "serving_g": 151, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 151, "cap_group": null, "ndb": "09132", "per100g": {"kcal": 69.0, "protein": 0.72, "carb": 18.1, "fat": 0.16, "fiber": 0.9, "sugar": 15.48, "calcium": 10.0, "iron": 0.36, "potassium": 191.0, "sodium": 2.0, "vitc": 3.2}},
  {"id": "orange_juice", "name": "Orange juice (100%)", "group": "Fruits", "type": "Fruit", "price": 3.96, "package_g": 1618.5, "edible_yield": 1.0, "cost_per_100g": 0.244671, "bls_cost_per_100g": null, "serving_g": 249, "serving_desc": "1 cup", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": 249, "cap_group": null, "ndb": "09209", "per100g": {"kcal": 49.0, "protein": 0.68, "carb": 11.54, "fat": 0.12, "fiber": 0.3, "sugar": 8.31, "calcium": 11.0, "iron": 0.13, "potassium": 178.0, "sodium": 2.0, "vitc": 33.6}},
  {"id": "oranges", "name": "Oranges (navel)", "group": "Fruits", "type": "Fruit", "price": 5.97, "package_g": 1814.4, "edible_yield": 0.68, "cost_per_100g": 0.483874, "bls_cost_per_100g": 0.558613, "serving_g": 140, "serving_desc": "1 orange", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 140, "cap_group": null, "ndb": "09202", "per100g": {"kcal": 49.0, "protein": 0.91, "carb": 12.54, "fat": 0.15, "fiber": 2.2, "sugar": 8.5, "calcium": 43.0, "iron": 0.13, "potassium": 166.0, "sodium": 1.0, "vitc": 59.1}},
  {"id": "raisins", "name": "Raisins", "group": "Fruits", "type": "Fruit", "price": 4.38, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.772487, "bls_cost_per_100g": null, "serving_g": 41, "serving_desc": "1/4 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 82, "cap_group": null, "ndb": "09298", "per100g": {"kcal": 299.0, "protein": 3.07, "carb": 79.18, "fat": 0.46, "fiber": 3.7, "sugar": 59.19, "calcium": 50.0, "iron": 1.88, "potassium": 749.0, "sodium": 11.0, "vitc": 2.3}},
  {"id": "strawberries", "name": "Strawberries", "group": "Fruits", "type": "Fruit", "price": 2.97, "package_g": 453.6, "edible_yield": 0.94, "cost_per_100g": 0.696555, "bls_cost_per_100g": 0.888088, "serving_g": 152, "serving_desc": "1 cup halves", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 152, "cap_group": null, "ndb": "09316", "per100g": {"kcal": 32.0, "protein": 0.67, "carb": 7.68, "fat": 0.3, "fiber": 2.0, "sugar": 4.89, "calcium": 16.0, "iron": 0.41, "potassium": 153.0, "sodium": 1.0, "vitc": 58.8}},
  {"id": "broccoli", "name": "Broccoli (frozen)", "group": "Vegetables", "type": "Vegetables", "price": 1.16, "package_g": 340.2, "edible_yield": 1.0, "cost_per_100g": 0.340976, "bls_cost_per_100g": null, "serving_g": 95, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 91, "cap_group": null, "ndb": "11094", "per100g": {"kcal": 29.0, "protein": 3.06, "carb": 5.35, "fat": 0.34, "fiber": 3.0, "sugar": 1.47, "calcium": 41.0, "iron": 0.72, "potassium": 250.0, "sodium": 17.0, "vitc": 68.3}},
  {"id": "carrots", "name": "Carrots", "group": "Vegetables", "type": "Vegetables", "price": 2.26, "package_g": 907.2, "edible_yield": 0.89, "cost_per_100g": 0.279908, "bls_cost_per_100g": null, "serving_g": 128, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 128, "cap_group": null, "ndb": "11124", "per100g": {"kcal": 41.0, "protein": 0.93, "carb": 9.58, "fat": 0.24, "fiber": 2.8, "sugar": 4.74, "calcium": 33.0, "iron": 0.3, "potassium": 320.0, "sodium": 69.0, "vitc": 5.9}},
  {"id": "green_beans", "name": "Green beans (canned)", "group": "Vegetables", "type": "Vegetables", "price": 0.84, "package_g": 411.1, "edible_yield": 1.0, "cost_per_100g": 0.20433, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 235, "cap_group": null, "ndb": "11054", "per100g": {"kcal": 15.0, "protein": 0.72, "carb": 3.27, "fat": 0.17, "fiber": 1.5, "sugar": 1.25, "calcium": 29.0, "iron": 1.02, "potassium": 92.0, "sodium": 192.0, "vitc": 2.2}},
  {"id": "bell_pepper", "name": "Green bell pepper", "group": "Vegetables", "type": "Vegetables", "price": 0.86, "package_g": 145, "edible_yield": 0.82, "cost_per_100g": 0.723297, "bls_cost_per_100g": null, "serving_g": 149, "serving_desc": "1 cup chopped", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 149, "cap_group": null, "ndb": "11333", "per100g": {"kcal": 20.0, "protein": 0.86, "carb": 4.64, "fat": 0.17, "fiber": 1.7, "sugar": 2.4, "calcium": 10.0, "iron": 0.34, "potassium": 175.0, "sodium": 3.0, "vitc": 80.4}},
  {"id": "mixed_veg", "name": "Mixed vegetables (frozen)", "group": "Vegetables", "type": "Vegetables", "price": 2.58, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.284392, "bls_cost_per_100g": null, "serving_g": 95, "serving_desc": "2/3 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 136, "cap_group": null, "ndb": "11583", "per100g": {"kcal": 72.0, "protein": 3.33, "carb": 13.47, "fat": 0.52, "fiber": 4.0, "sugar": 0.0, "calcium": 25.0, "iron": 0.95, "potassium": 212.0, "sodium": 47.0, "vitc": 10.4}},
  {"id": "onions", "name": "Onions (yellow)", "group": "Vegetables", "type": "Vegetables", "price": 2.96, "package_g": 1360.8, "edible_yield": 0.9, "cost_per_100g": 0.241688, "bls_cost_per_100g": null, "serving_g": 80, "serving_desc": "1/2 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 160, "cap_group": null, "ndb": "11282", "per100g": {"kcal": 40.0, "protein": 1.1, "carb": 9.34, "fat": 0.1, "fiber": 1.7, "sugar": 4.24, "calcium": 23.0, "iron": 0.21, "potassium": 146.0, "sodium": 4.0, "vitc": 7.4}},
  {"id": "romaine", "name": "Romaine lettuce", "group": "Vegetables", "type": "Vegetables", "price": 3.312, "package_g": 453.6, "edible_yield": 0.94, "cost_per_100g": 0.776765, "bls_cost_per_100g": 0.776778, "serving_g": 94, "serving_desc": "2 cups shredded", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 94, "cap_group": null, "ndb": "11251", "per100g": {"kcal": 17.0, "protein": 1.23, "carb": 3.29, "fat": 0.3, "fiber": 2.1, "sugar": 1.19, "calcium": 33.0, "iron": 0.97, "potassium": 247.0, "sodium": 8.0, "vitc": 4.0}},
  {"id": "spinach", "name": "Spinach (fresh)", "group": "Vegetables", "type": "Vegetables", "price": 1.97, "package_g": 283.5, "edible_yield": 1.0, "cost_per_100g": 0.694885, "bls_cost_per_100g": null, "serving_g": 60, "serving_desc": "2 cups raw", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 60, "cap_group": null, "ndb": "11457", "per100g": {"kcal": 23.0, "protein": 2.86, "carb": 3.63, "fat": 0.39, "fiber": 2.2, "sugar": 0.42, "calcium": 99.0, "iron": 2.71, "potassium": 558.0, "sodium": 79.0, "vitc": 28.1}},
  {"id": "tomatoes", "name": "Tomatoes (roma)", "group": "Vegetables", "type": "Vegetables", "price": 0.85, "package_g": 453.6, "edible_yield": 0.91, "cost_per_100g": 0.205923, "bls_cost_per_100g": 0.482595, "serving_g": 180, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 180, "cap_group": null, "ndb": "11529", "per100g": {"kcal": 18.0, "protein": 0.88, "carb": 3.89, "fat": 0.2, "fiber": 1.2, "sugar": 2.63, "calcium": 10.0, "iron": 0.27, "potassium": 237.0, "sodium": 5.0, "vitc": 13.7}},
  {"id": "butter", "name": "Butter (salted)", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "price": 5.96, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.656966, "bls_cost_per_100g": null, "serving_g": 14.2, "serving_desc": "1 tbsp", "max_servings": 2, "meal": [0.5, 0, 0.5, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "added_fats", "ndb": "01001", "per100g": {"kcal": 717.0, "protein": 0.85, "carb": 0.06, "fat": 81.11, "fiber": 0.0, "sugar": 0.06, "calcium": 24.0, "iron": 0.02, "potassium": 24.0, "sodium": 643.0, "vitc": 0.0}},
  {"id": "canola_oil", "name": "Canola oil", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "price": 4.08, "package_g": 1308, "edible_yield": 1.0, "cost_per_100g": 0.311927, "bls_cost_per_100g": null, "serving_g": 14, "serving_desc": "1 tbsp", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "added_fats", "ndb": "04582", "per100g": {"kcal": 884.0, "protein": 0.0, "carb": 0.0, "fat": 100.0, "fiber": 0.0, "sugar": 0.0, "calcium": 0.0, "iron": 0.0, "potassium": 0.0, "sodium": 0.0, "vitc": 0.0}},
  {"id": "olive_oil", "name": "Olive oil (extra virgin)", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "price": 17.87, "package_g": 1377.0, "edible_yield": 1.0, "cost_per_100g": 1.297749, "bls_cost_per_100g": null, "serving_g": 13.5, "serving_desc": "1 tbsp", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "added_fats", "ndb": "04053", "per100g": {"kcal": 884.0, "protein": 0.0, "carb": 0.0, "fat": 100.0, "fiber": 0.0, "sugar": 0.0, "calcium": 1.0, "iron": 0.56, "potassium": 1.0, "sodium": 2.0, "vitc": 0.0}},
  {"id": "almonds", "name": "Almonds", "group": "Fats, Oils & Nuts", "type": "Nuts & Seeds", "price": 9.48, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 2.089947, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 oz (~23 almonds)", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "12061", "per100g": {"kcal": 579.0, "protein": 21.15, "carb": 21.55, "fat": 49.93, "fiber": 12.5, "sugar": 4.35, "calcium": 269.0, "iron": 3.71, "potassium": 733.0, "sodium": 1.0, "vitc": 0.0}},
  {"id": "avocado", "name": "Avocado (Hass)", "group": "Fats, Oils & Nuts", "type": "Nuts & Seeds", "price": 0.87, "package_g": 203, "edible_yield": 0.67, "cost_per_100g": 0.639659, "bls_cost_per_100g": null, "serving_g": 68, "serving_desc": "1/2 avocado", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "09038", "per100g": {"kcal": 167.0, "protein": 1.96, "carb": 8.64, "fat": 15.41, "fiber": 6.8, "sugar": 0.3, "calcium": 13.0, "iron": 0.61, "potassium": 507.0, "sodium": 8.0, "vitc": 8.8}},
  {"id": "cookies", "name": "Chocolate chip cookies", "group": "Snacks & Sweets", "type": "Snacks", "price": 3.02, "package_g": 368.5, "edible_yield": 1.0, "cost_per_100g": 0.819539, "bls_cost_per_100g": 1.135823, "serving_g": 26, "serving_desc": "2 cookies", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": ["gluten", "dairy", "egg"], "cup_eq_g": null, "cap_group": "snacks", "ndb": "18159", "per100g": {"kcal": 492.0, "protein": 5.1, "carb": 65.36, "fat": 24.72, "fiber": 2.0, "sugar": 32.9, "calcium": 21.0, "iron": 5.58, "potassium": 171.0, "sodium": 311.0, "vitc": 0.0}},
  {"id": "granola_bar", "name": "Granola bars (chocolate chip)", "group": "Snacks & Sweets", "type": "Snacks", "price": 2.28, "package_g": 238.1, "edible_yield": 1.0, "cost_per_100g": 0.957581, "bls_cost_per_100g": null, "serving_g": 24, "serving_desc": "1 bar", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["gluten", "dairy"], "cup_eq_g": null, "cap_group": "snacks", "ndb": "19404", "per100g": {"kcal": 418.0, "protein": 5.65, "carb": 70.2, "fat": 16.57, "fiber": 3.8, "sugar": 28.92, "calcium": 41.0, "iron": 2.19, "potassium": 237.0, "sodium": 251.0, "vitc": 0.0}},
  {"id": "chips", "name": "Potato chips", "group": "Snacks & Sweets", "type": "Snacks", "price": 1.87, "package_g": 226.8, "edible_yield": 1.0, "cost_per_100g": 0.824515, "bls_cost_per_100g": 1.470044, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": null, "cap_group": "snacks", "ndb": "19411", "per100g": {"kcal": 532.0, "protein": 6.39, "carb": 53.83, "fat": 33.98, "fiber": 3.1, "sugar": 0.33, "calcium": 21.0, "iron": 1.28, "potassium": 1196.0, "sodium": 527.0, "vitc": 21.6}},
  {"id": "ice_cream", "name": "Vanilla ice cream", "group": "Snacks & Sweets", "type": "Snacks", "price": 3.12, "package_g": 792, "edible_yield": 1.0, "cost_per_100g": 0.393939, "bls_cost_per_100g": 0.561648, "serving_g": 66, "serving_desc": "1/2 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "snacks", "ndb": "19095", "per100g": {"kcal": 207.0, "protein": 3.5, "carb": 23.6, "fat": 11.0, "fiber": 0.7, "sugar": 21.22, "calcium": 128.0, "iron": 0.09, "potassium": 199.0, "sodium": 80.0, "vitc": 0.6}}
];


const BIG = 1e9;
const EPS = 1e-9;

/** A diet by name (from config/diets.json, or the live list passed as `diets`), or pass a diet object to try a
 *  custom one without rebuilding:
 *  { name, desc, protein: [0.10, 0.35], carb: [0.45, 0.65], fat: [0.20, 0.35], forbid: ["pork"], forbid_foods: ["almonds"] } */
export function getDiet(name, diets = DIETS) {
  if (name && typeof name === "object") {   // missing macro ranges fall back to Balanced's
    const base = diets.find((x) => x.name === "Balanced") || {};
    return { protein: base.protein, carb: base.carb, fat: base.fat, name: "Custom", desc: "", forbid: [], forbid_foods: [], ...name };
  }
  const d = diets.find((x) => x.name.toLowerCase() === String(name || "Balanced").toLowerCase());
  if (!d) throw new Error(`Unknown diet "${name}". Options: ${diets.map((x) => x.name).join(", ")}`);
  return d;
}

/** $ per 100 g of edible food. priceSource 'bls' uses the BLS U.S. average where one exists. */
export function costPer100g(food, { prices = {}, priceSource = "walmart" } = {}) {
  if (prices[food.id] != null) return (prices[food.id] / (food.package_g * food.edible_yield)) * 100;
  if (priceSource === "bls" && food.bls_cost_per_100g != null) return food.bls_cost_per_100g;
  return food.cost_per_100g;
}

export function isAllowed(food, diet, exclude = []) {
  if (exclude.includes(food.id) || (diet.forbid_foods || []).includes(food.id)) return false;
  return !food.flags.some((f) => (diet.forbid || []).includes(f));
}

/**
 * Build the LP.
 * targets: { calories, fiber, calcium, iron, potassium, vitc (daily minimums), sodium (daily maximum),
 *            sugarMax (optional), proteinMin (optional floor in g, e.g. 0.8 g/kg from the calculator) }
 * prefs:   { diet: a diet name from config/diets.json (DIETS), or a diet object (see getDiet),
 *            exclude: [foodId], mustInclude: {foodId: servings}, maxServings: {foodId: servings},
 *            prices: {foodId: package price}, priceSource: 'walmart'|'bls', settings: {...overrides},
 *            data: { foods, diets, groupCaps, settings } — optional live data (e.g. from Supabase via supabaseData.js);
 *                  anything omitted falls back to the data built into this file }
 */
export function buildModel(targets, prefs = {}) {
  const data = prefs.data || {};
  const FOODS_ = data.foods || FOODS, DIETS_ = data.diets || DIETS, CAPS_ = data.groupCaps || GROUP_CAPS;
  const BASE = { ...SETTINGS, ...(data.settings || {}) };
  BASE.group_caps = data.groupCaps ? Object.fromEntries(CAPS_.map((g) => [g.key, g.max])) : BASE.group_caps;
  const diet = getDiet(prefs.diet, DIETS_);
  const S = { ...BASE, ...(prefs.settings || {}) };
  S.meal_kcal = { ...BASE.meal_kcal, ...((prefs.settings || {}).meal_kcal || {}) };
  S.group_caps = { ...BASE.group_caps, ...((prefs.settings || {}).group_caps || {}) };
  const kcal = Number(targets.calories);
  if (!(kcal > 0)) throw new Error("targets.calories is required");

  const foods = FOODS_.filter((f) => isAllowed(f, diet, prefs.exclude || []))
    .map((f) => ({ ...f, cost100: costPer100g(f, prefs) }));
  const n = foods.length;
  const keys = NUTRIENTS.map((k) => k.key);
  const A = keys.map((k) => foods.map((f) => f.per100g[k]));
  const p = A[keys.indexOf("protein")];
  const e = A[keys.indexOf("kcal")];

  const tol = S.calorie_tolerance;
  const bounds = {
    kcal: [kcal * (1 - tol), kcal * (1 + tol)],
    protein: [targets.proteinMin || 0, null],
    fiber: [targets.fiber, null], calcium: [targets.calcium, null], iron: [targets.iron, null],
    potassium: [targets.potassium, null], vitc: [targets.vitc, null],
    sodium: [null, targets.sodium], sugar: [null, targets.sugarMax ?? null],
  };

  const rows = [], senses = [], rhs = [], labels = [], kinds = [];
  const add = (row, sense, b, label, kind) => { rows.push(row); senses.push(sense); rhs.push(b); labels.push(label); kinds.push(kind); };

  // 1. Daily nutrient targets: rows of A
  keys.forEach((k, i) => {
    const [lo, hi] = bounds[k] || [null, null];
    if (lo != null && lo > 0) add(A[i].slice(), ">=", lo, `${k} >= min`, "nutrient");
    if (hi != null) add(A[i].slice(), "<=", hi, `${k} <= max`, "nutrient");
  });
  // 1b. Macro split as a share of the plan's ACTUAL calories: f * macro(x) - pct * kcal(x) (>= or <=) 0
  [["protein", 4], ["carb", 4], ["fat", 9]].forEach(([k, f]) => {
    const mac = A[keys.indexOf(k)], [lo, hi] = diet[k];
    add(mac.map((v, j) => f * v - lo * e[j]), ">=", 0, `${k}% >= ${Math.round(lo * 100)}% of kcal`, "macro");
    add(mac.map((v, j) => f * v - hi * e[j]), "<=", 0, `${k}% <= ${Math.round(hi * 100)}% of kcal`, "macro");
  });
  // 2. Meal balance: calories per meal, protein per main meal (uses meal matrix M)
  MEALS.forEach((meal, m) => {
    const [lo, hi] = S.meal_kcal[meal];
    const row = foods.map((f, j) => e[j] * f.meal[m]);
    add(row, ">=", lo * kcal, `${meal} kcal >= ${Math.round(lo * 100)}%`, "meal");
    add(row.slice(), "<=", hi * kcal, `${meal} kcal <= ${Math.round(hi * 100)}%`, "meal");
    if (meal !== "Snacks" && S.min_meal_protein_share > 0)
      add(foods.map((f, j) => p[j] * (f.meal[m] - S.min_meal_protein_share)), ">=", 0,
        `${meal} protein >= ${Math.round(S.min_meal_protein_share * 100)}% of day`, "meal");
  });
  // 3. Protein diversity: p_j x_j <= alpha * (p^T x) for every high-protein food
  const alpha = S.max_protein_share;
  foods.forEach((f, j) => {
    if (p[j] < S.share_rule_min_protein) return;
    add(foods.map((g, k) => (k === j ? (1 - alpha) * p[k] : -alpha * p[k])), "<=", 0,
      `${f.id} <= ${Math.round(alpha * 100)}% of protein`, "share");
  });
  // 4. Food-group minimums (USDA cup-equivalents) and group caps (grams or servings)
  const cupRow = (type) => foods.map((f) => (f.type === type ? 100 / f.cup_eq_g : 0));
  if (S.min_veg_cups > 0) add(cupRow("Vegetables"), ">=", S.min_veg_cups, `vegetables >= ${S.min_veg_cups} cup-eq`, "group");
  if (S.min_fruit_cups > 0) add(cupRow("Fruit"), ">=", S.min_fruit_cups, `fruit >= ${S.min_fruit_cups} cup-eq`, "group");
  CAPS_.forEach((g) => {
    const cap = (S.group_caps || {})[g.key];
    if (cap == null) return;
    const row = foods.map((f) => (f.cap_group !== g.key ? 0 : g.unit === "grams" ? 100 : 100 / f.serving_g));
    if (row.some((v) => v)) add(row, "<=", cap, `${g.key} <= ${cap} ${g.unit}`, "group");
  });
  // 5. Portion caps and must-include foods (rows of the identity matrix)
  const caps = prefs.maxServings || {}, must = prefs.mustInclude || {};
  const u = foods.map((f) => (f.serving_g * (caps[f.id] ?? f.max_servings)) / 100);
  foods.forEach((f, j) => {
    const row = new Array(n).fill(0); row[j] = 1;
    add(row, "<=", u[j], `${f.id} <= cap`, "cap");
    if (must[f.id]) add(row.slice(), ">=", (f.serving_g * must[f.id]) / 100, `${f.id} >= must-include`, "must");
  });
  return { diet, settings: S, foods, keys, A, c: foods.map((f) => f.cost100), u, rows, senses, rhs, labels, kinds };
}

/** Gauss-Jordan pivot: make column `col` the unit vector e_r with elementary row operations. */
function pivot(T, r, col) {
  const pr = T[r], piv = pr[col];
  for (let k = 0; k < pr.length; k++) pr[k] /= piv;                 // R_r <- R_r / a_rc
  for (let i = 0; i < T.length; i++) {
    if (i === r) continue;
    const f = T[i][col];
    if (Math.abs(f) < EPS) continue;
    const row = T[i];
    for (let k = 0; k < row.length; k++) {
      row[k] -= f * pr[k];                                           // R_i <- R_i - a_ic R_r
      if (Math.abs(row[k]) < 1e-13) row[k] = 0;                      // flush round-off
    }
  }
}

const PIV_TOL = 1e-9;   // never pivot on an element smaller than this (numerical safety)

function iterate(T, basis, allowed, counter) {
  const m = T.length - 1, last = T[0].length - 1;
  let stall = 0, lastObj = T[m][last];
  for (let it = 0; it < 50000; it++) {
    const z = T[m];
    // Entering column: most negative reduced cost (Dantzig); switch to Bland's rule while stalled on a degenerate corner
    let col = -1, most = -EPS;
    if (stall < 50) { for (let j = 0; j < last; j++) if (allowed[j] && z[j] < most) { most = z[j]; col = j; } }
    else { for (let j = 0; j < last; j++) if (allowed[j] && z[j] < -EPS) { col = j; break; } }
    if (col === -1) return "optimal";
    // Leaving row: minimum-ratio test; among (near-)ties prefer the largest pivot element for stability
    let r = -1, best = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i][col];
      if (a > PIV_TOL) {
        const ratio = Math.max(T[i][last], 0) / a;
        if (ratio < best - 1e-12 || (ratio <= best + 1e-12 && a > T[r][col])) { best = ratio; r = i; }
      }
    }
    if (r === -1) return "unbounded";
    pivot(T, r, col);
    basis[r] = col;
    counter.pivots++;
    const obj = T[m][last];
    stall = Math.abs(obj - lastObj) < 1e-12 ? stall + 1 : 0;
    lastObj = obj;
  }
  return "iteration-limit";
}

/** Minimize c.x subject to rows (<=, >=, =) rhs and x >= 0. Two-phase Simplex. */
export function simplex(c, rows, senses, rhs) {
  const n = c.length, m = rows.length;
  rows = rows.map((r) => r.slice()); senses = senses.slice(); rhs = rhs.slice();
  for (let i = 0; i < m; i++) {                                     // row scaling: largest |coefficient| = 1
    const s = Math.max(...rows[i].map(Math.abs));
    if (s > 0) { rows[i] = rows[i].map((v) => v / s); rhs[i] /= s; }
  }
  for (let i = 0; i < m; i++) if (rhs[i] < 0) {
    rows[i] = rows[i].map((v) => -v); rhs[i] = -rhs[i];
    senses[i] = senses[i] === "<=" ? ">=" : senses[i] === ">=" ? "<=" : "=";
  }
  const nSlack = senses.filter((s) => s !== "=").length;
  const nArt = senses.filter((s) => s !== "<=").length;
  const N = n + nSlack + nArt;
  const T = [], basis = [], isArt = new Array(N).fill(false);
  let s = n, a = n + nSlack;
  for (let i = 0; i < m; i++) {                                     // tableau [A | slack | artificial | b]
    const row = new Float64Array(N + 1);
    for (let j = 0; j < n; j++) row[j] = rows[i][j];
    if (senses[i] === "<=") { row[s] = 1; basis.push(s++); }
    else { if (senses[i] === ">=") row[s++] = -1; row[a] = 1; isArt[a] = true; basis.push(a++); }
    row[N] = rhs[i];
    T.push(row);
  }
  const counter = { pivots: 0 };
  const z1 = new Float64Array(N + 1);                               // Phase 1: minimize sum of artificials
  for (let j = 0; j < N; j++) if (isArt[j]) z1[j] = 1;
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) for (let k = 0; k <= N; k++) z1[k] -= T[i][k];
  T.push(z1);
  iterate(T, basis, new Array(N).fill(true), counter);
  if (-T[m][N] > 1e-7) return { status: "infeasible", pivots: counter.pivots };
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) {                // drive leftover artificials out
    let j = 0;
    while (j < N && (isArt[j] || Math.abs(T[i][j]) < EPS)) j++;
    if (j < N) { pivot(T, i, j); basis[i] = j; }
  }
  const z2 = new Float64Array(N + 1);                               // Phase 2: minimize real cost
  for (let j = 0; j < n; j++) z2[j] = c[j];
  for (let i = 0; i < m; i++) { const cb = basis[i] < n ? c[basis[i]] : 0; if (cb) for (let k = 0; k <= N; k++) z2[k] -= cb * T[i][k]; }
  T[m] = z2;
  const status = iterate(T, basis, isArt.map((v) => !v), counter);
  if (status !== "optimal") return { status, pivots: counter.pivots };
  const x = new Array(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
  return { status, x, objective: -T[m][N], pivots: counter.pivots };
}

export function matVec(A, x) { return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)); }

/** Explain an infeasible request: re-solve smaller LPs to find which rule set breaks it. */
function diagnose(model) {
  const { A, keys, labels, rhs, kinds, rows, senses } = model;
  const pick = (ok) => { const I = kinds.map((k, i) => (ok(k, i) ? i : -1)).filter((i) => i >= 0);
    return [I.map((i) => rows[i]), I.map((i) => senses[i]), I.map((i) => rhs[i])]; };
  const zero = new Array(model.foods.length).fill(0);
  const base = (k) => k === "cap" || k === "group";            // portion caps + food-group caps
  const reasons = [];
  // 1. Each nutrient alone: best value the allowed foods can reach within the caps (an LP per nutrient)
  labels.forEach((lab, k) => {
    if (kinds[k] !== "nutrient") return;
    const [key, op] = lab.split(" ");
    const i = keys.indexOf(key);
    const sol = simplex(op === ">=" ? A[i].map((v) => -v) : A[i], ...pick(base));
    if (sol.status !== "optimal") return;
    const best = op === ">=" ? -sol.objective : sol.objective;
    if (op === ">=" && best < rhs[k] - 1e-6)
      reasons.push(`${key}: the allowed foods can supply at most ${best.toFixed(0)} within the portion caps, below the ${rhs[k].toFixed(0)} minimum`);
    if (op === "<=" && best > rhs[k] + 1e-6)
      reasons.push(`${key}: even the lowest possible amount (${best.toFixed(0)}) is above the ${rhs[k].toFixed(0)} maximum`);
  });
  if (reasons.length) return reasons;
  // 2. Add rule sets one at a time to find the first one that breaks feasibility
  if (simplex(zero, ...pick((k) => base(k) || k === "nutrient")).status !== "optimal")
    return ["Your nutrient targets cannot all be met together with these foods and portion caps."];
  const sources = { protein: "protein foods", carb: "grains, fruit or starchy vegetables", fat: "oils, nuts, avocado or peanut butter" };
  const words = { protein: "protein", carb: "carbohydrate", fat: "fat" };
  for (const mac of ["protein", "carb", "fat"]) for (const side of [">=", "<="]) {
    const ok = (k, i) => base(k) || k === "nutrient" || (k === "macro" && labels[i].startsWith(`${mac}% ${side}`));
    if (simplex(zero, ...pick(ok)).status === "optimal") continue;
    const others = Object.keys(sources).filter((x) => x !== mac).map((x) => sources[x]).join(" or ");
    return [side === ">="
      ? `The ${model.diet.name} diet needs more ${words[mac]} (% of calories) than the allowed foods can give. Allow more ${sources[mac]}, or pick another diet.`
      : `The allowed foods push ${words[mac]} above the ${model.diet.name} diet's maximum share of calories. Allow more ${others}, or pick another diet.`];
  }
  const stages = [["macro", `The ${model.diet.name} diet's macro split cannot be met together with the nutrient targets.`],
    ["must", "Your must-include foods conflict with the nutrient targets."],
    ["share", "The protein-diversity rule (no food above the max share of protein) cannot be met. Allow more protein foods or raise the max share."],
    ["meal", "The meal-balance rules (calories and protein per meal) cannot be met. Relax the meal ranges or allow more breakfast foods."]];
  const on = new Set(["cap", "group", "nutrient"]);
  for (const [kind, msg] of stages) {
    on.add(kind);
    if (simplex(zero, ...pick((k) => on.has(k))).status !== "optimal") return [msg];
  }
  return ["The rules conflict in combination. Try widening the calorie tolerance or allowing more foods."];
}

/** Main entry point: person's targets + preferences -> cheapest balanced daily plan, split by meal. */
export function optimizeDiet(targets, prefs = {}) {
  const model = buildModel(targets, prefs);
  if (!model.foods.length) return { status: "infeasible", reasons: ["No foods are left after applying the diet and exclusions."] };
  const sol = simplex(model.c, model.rows, model.senses, model.rhs);
  if (sol.status !== "optimal")
    return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], diet: model.diet.name };
  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const totals = Object.fromEntries(model.keys.map((k, i) => [k, model.A[i].reduce((s, v, j) => s + v * x[j], 0)]));
  const item = (f, j, share = 1) => {
    const g = x[j] * 100 * share;
    return { id: f.id, name: f.name, group: f.group, type: f.type, grams: g, servings: g / f.serving_g, serving: f.serving_desc,
      cost: x[j] * f.cost100 * share, kcal: (f.per100g.kcal * g) / 100, protein: (f.per100g.protein * g) / 100 };
  };
  const plan = model.foods.map((f, j) => item(f, j)).filter((r) => r.grams > 0.5).sort((a, b) => b.cost - a.cost);
  const meals = MEALS.map((meal, m) => {
    const items = model.foods.map((f, j) => item(f, j, f.meal[m])).filter((r) => r.grams > 0.5).sort((a, b) => b.kcal - a.kcal);
    return { meal, items, kcal: items.reduce((s, r) => s + r.kcal, 0), protein: items.reduce((s, r) => s + r.protein, 0),
      cost: items.reduce((s, r) => s + r.cost, 0) };
  });
  return { status: "optimal", diet: model.diet.name, costPerDay: sol.objective, costPerWeek: sol.objective * 7,
    plan, meals, totals, pivots: sol.pivots,
    model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, x, constraints: model.labels.length } };
}
