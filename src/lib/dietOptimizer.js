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
 *   Preferences change only the objective: minimize (D c)^T x, where D = diag(w) is a diagonal preference matrix
 *   (w_j < 1 for liked foods, > 1 for disliked or already-used foods). The reported cost is always the true c^T x.
 *   planOptions() solves several such LPs (lowest cost, your picks, variety menus); compareOptions() returns
 *   A X (nutrients x options) and the cosine-similarity Gram matrix of the options; weekPlan() turns X d into a
 *   shopping list (d = days per option).
 *
 * THE SOLVER
 *   Two-phase Simplex on a dense tableau. Each pivot is a Gauss-Jordan elimination step
 *   (scale the pivot row, subtract multiples of it from every other row). Bland's rule
 *   prevents cycling. Results were checked against SciPy's HiGHS solver (tests/).
 */

export const PRICE_SOURCE = "Core 71 foods: Walmart.com / business.walmart.com, observed October 2026 (regular, non-Rollback prices). Added foods: BLS Average Price Data (U.S. city average, Sep 2026) or USDA ERS Fruit and Vegetable Prices (2023) scaled to Sep 2026 with the BLS CPI. BLS U.S. averages are also kept as a reference column.";
export const NUTRIENT_SOURCE = "USDA National Nutrient Database for Standard Reference, Release 28 (SR28)";
export const NUTRIENTS = [{"key": "kcal", "label": "Calories", "unit": "kcal"}, {"key": "protein", "label": "Protein", "unit": "g"}, {"key": "carb", "label": "Carbohydrate", "unit": "g"}, {"key": "fat", "label": "Fat", "unit": "g"}, {"key": "fiber", "label": "Fiber", "unit": "g"}, {"key": "sugar", "label": "Total sugars", "unit": "g"}, {"key": "calcium", "label": "Calcium", "unit": "mg"}, {"key": "iron", "label": "Iron", "unit": "mg"}, {"key": "potassium", "label": "Potassium", "unit": "mg"}, {"key": "sodium", "label": "Sodium", "unit": "mg"}, {"key": "vitc", "label": "Vitamin C", "unit": "mg"}, {"key": "satfat", "label": "Saturated fat", "unit": "g"}];
export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
export const ATTRS = [{"key": "meat", "label": "Red meat"}, {"key": "pork", "label": "Pork"}, {"key": "poultry", "label": "Poultry"}, {"key": "fish", "label": "Fish"}, {"key": "egg", "label": "Eggs"}, {"key": "dairy", "label": "Dairy"}, {"key": "gluten", "label": "Gluten"}, {"key": "shellfish", "label": "Shellfish"}, {"key": "peanut", "label": "Peanuts"}, {"key": "treenut", "label": "Tree nuts"}, {"key": "soy", "label": "Soy"}];
export const ALLERGENS = ["dairy", "egg", "gluten", "fish", "shellfish", "peanut", "treenut", "soy"];
export const CPI = {"fresh_fruit": {"series": "CUUR0000SEFK", "label": "fresh fruits", "base_2023": 409.07849999999996, "sep_2026": 433.87}, "fresh_veg": {"series": "CUUR0000SEFL", "label": "fresh vegetables", "base_2023": 377.413, "sep_2026": 400.183}, "canned": {"series": "CUUR0000SEFM01", "label": "canned fruits and vegetables", "base_2023": 213.03750000000002, "sep_2026": 235.069}, "frozen": {"series": "CUUR0000SEFM02", "label": "frozen fruits and vegetables", "base_2023": 187.7295, "sep_2026": 191.463}, "dried": {"series": "CUUR0000SEFM03", "label": "other processed fruits and vegetables including dried", "base_2023": 187.987, "sep_2026": 202.923}};
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
  "forbid": []
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
  "forbid": []
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
  "forbid": []
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
  ]
 },
 {
  "name": "Dairy-Free",
  "desc": "No milk, cheese, yogurt, butter or ice cream (soy milk allowed)",
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
   "dairy"
  ]
 },
 {
  "name": "DASH-Style",
  "desc": "Heart-healthy DASH goals: saturated fat <= 6% of calories, sodium <= 1,500 mg, protein ~18%, carbs ~55%, fat ~27%",
  "protein": [
   0.15,
   0.21
  ],
  "carb": [
   0.52,
   0.58
  ],
  "fat": [
   0.24,
   0.3
  ],
  "forbid": [],
  "sodium_max": 1500,
  "satfat_max": 0.06
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
   "pinto_beans",
   "black_beans_dry",
   "kidney_beans_dry",
   "navy_beans_dry",
   "gn_beans_dry",
   "blackeye_dry",
   "lima_dry",
   "kidney_beans_can",
   "navy_beans_can",
   "gn_beans_can",
   "blackeye_can",
   "pinto_beans_can"
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
  {"id": "chicken_breast", "name": "Chicken breast (boneless, skinless)", "group": "Proteins", "type": "Poultry", "product": "Great Value frozen, 3 lb", "price": 9.84, "price_note": "", "price_source": "walmart", "core": true, "package_g": 1360.8, "edible_yield": 1.0, "cost_per_100g": 0.723104, "bls_cost_per_100g": 0.926604, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05062", "per100g": {"kcal": 120.0, "protein": 22.5, "carb": 0.0, "fat": 2.62, "fiber": 0.0, "sugar": 0.0, "calcium": 5.0, "iron": 0.37, "potassium": 334.0, "sodium": 45.0, "vitc": 0.0, "satfat": 0.563}},
  {"id": "drumsticks", "name": "Chicken drumsticks (bone-in)", "group": "Proteins", "type": "Poultry", "product": "Great Value frozen, 4 lb", "price": 4.83, "price_note": "Edible yield 67%: USDA lists bone twice (66%); 33% used", "price_source": "walmart", "core": true, "package_g": 1814.4, "edible_yield": 0.67, "cost_per_100g": 0.397319, "bls_cost_per_100g": 0.572215, "serving_g": 100, "serving_desc": "100 g meat & skin (~1.5 drumsticks)", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05066", "per100g": {"kcal": 161.0, "protein": 18.08, "carb": 0.11, "fat": 9.2, "fiber": 0.0, "sugar": 0.0, "calcium": 8.0, "iron": 0.71, "potassium": 211.0, "sodium": 106.0, "vitc": 0.0, "satfat": 2.459}},
  {"id": "chicken_thigh", "name": "Chicken thighs (boneless, skinless)", "group": "Proteins", "type": "Poultry", "product": "Great Value frozen, 3 lb", "price": 9.87, "price_note": "", "price_source": "walmart", "core": true, "package_g": 1360.8, "edible_yield": 1.0, "cost_per_100g": 0.725309, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05096", "per100g": {"kcal": 121.0, "protein": 19.66, "carb": 0.0, "fat": 4.12, "fiber": 0.0, "sugar": 0.0, "calcium": 7.0, "iron": 0.81, "potassium": 242.0, "sodium": 95.0, "vitc": 0.0, "satfat": 1.097}},
  {"id": "deli_turkey", "name": "Deli turkey breast (sliced)", "group": "Proteins", "type": "Poultry", "product": "Great Value thin sliced, 16 oz", "price": 5.97, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.316138, "bls_cost_per_100g": null, "serving_g": 56, "serving_desc": "2 oz (about 4 slices)", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "07081", "per100g": {"kcal": 100.0, "protein": 16.33, "carb": 2.34, "fat": 2.37, "fiber": 0.0, "sugar": 3.28, "calcium": 7.0, "iron": 0.34, "potassium": 401.0, "sodium": 922.0, "vitc": 0.0, "satfat": 0.318}},
  {"id": "ground_turkey", "name": "Ground turkey 93/7", "group": "Proteins", "type": "Poultry", "product": "Jennie-O, 16 oz", "price": 5.56, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.22575, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05665", "per100g": {"kcal": 150.0, "protein": 18.73, "carb": 0.0, "fat": 8.34, "fiber": 0.0, "sugar": 0.0, "calcium": 21.0, "iron": 1.17, "potassium": 213.0, "sodium": 69.0, "vitc": 0.0, "satfat": 2.17}},
  {"id": "whole_chicken", "name": "Whole chicken", "group": "Proteins", "type": "Poultry", "product": "Chicken, fresh, whole, per lb (BLS U.S. average)", "price": 2.064, "price_note": "BLS APU0000706111 \"Chicken, fresh, whole, per lb\", U.S. city average, Sep 2026; edible yield 68% (USDA refuse 32% bone)", "price_source": "bls", "core": false, "package_g": 453.6, "edible_yield": 0.68, "cost_per_100g": 0.669157, "bls_cost_per_100g": 0.669168, "serving_g": 113, "serving_desc": "4 oz raw meat & skin", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "05006", "per100g": {"kcal": 215.0, "protein": 18.6, "carb": 0.0, "fat": 15.06, "fiber": 0.0, "sugar": 0.0, "calcium": 11.0, "iron": 0.9, "potassium": 189.0, "sodium": 70.0, "vitc": 1.6, "satfat": 4.31}},
  {"id": "bacon", "name": "Bacon", "group": "Proteins", "type": "Red Meat & Pork", "product": "Great Value hickory smoked, 16 oz", "price": 4.24, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.934744, "bls_cost_per_100g": 1.489444, "serving_g": 28, "serving_desc": "1 slice raw", "max_servings": 3, "meal": [1, 0, 0, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "10123", "per100g": {"kcal": 417.0, "protein": 12.62, "carb": 1.28, "fat": 39.69, "fiber": 0.0, "sugar": 1.0, "calcium": 5.0, "iron": 0.41, "potassium": 198.0, "sodium": 662.0, "vitc": 0.0, "satfat": 13.296}},
  {"id": "stew_beef", "name": "Beef for stew (boneless)", "group": "Proteins", "type": "Red Meat & Pork", "product": "Beef for stew, boneless, per lb (BLS U.S. average)", "price": 8.533, "price_note": "BLS APU0000703432 \"Beef for stew, boneless, per lb\", U.S. city average, Sep 2026", "price_source": "bls", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.881173, "bls_cost_per_100g": 1.881206, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "23093", "per100g": {"kcal": 128.0, "protein": 21.75, "carb": 0.16, "fat": 4.48, "fiber": 0.0, "sugar": 0.0, "calcium": 13.0, "iron": 2.12, "potassium": 367.0, "sodium": 80.0, "vitc": 0.0, "satfat": 1.86}},
  {"id": "ground_beef", "name": "Ground beef 80/20", "group": "Proteins", "type": "Red Meat & Pork", "product": "80/20 ground chuck, 1 lb roll", "price": 6.43, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.417549, "bls_cost_per_100g": 1.497381, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "23572", "per100g": {"kcal": 254.0, "protein": 17.17, "carb": 0.0, "fat": 20.0, "fiber": 0.0, "sugar": 0.0, "calcium": 18.0, "iron": 1.94, "potassium": 270.0, "sodium": 66.0, "vitc": 0.0, "satfat": 7.581}},
  {"id": "lean_beef", "name": "Ground beef 93/7 (lean)", "group": "Proteins", "type": "Red Meat & Pork", "product": "93/7 lean ground beef, 1 lb", "price": 7.87, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.735009, "bls_cost_per_100g": 1.865333, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "23472", "per100g": {"kcal": 152.0, "protein": 20.85, "carb": 0.0, "fat": 7.0, "fiber": 0.0, "sugar": 0.0, "calcium": 10.0, "iron": 2.33, "potassium": 336.0, "sodium": 66.0, "vitc": 0.0, "satfat": 2.878}},
  {"id": "ham", "name": "Ham (sliced, cooked)", "group": "Proteins", "type": "Red Meat & Pork", "product": "Great Value cooked ham, 16 oz", "price": 4.97, "price_note": "Regular price; was on Rollback at $4.47", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.095679, "bls_cost_per_100g": 1.20152, "serving_g": 56, "serving_desc": "2 oz (2 slices)", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "07029", "per100g": {"kcal": 163.0, "protein": 16.6, "carb": 3.83, "fat": 8.6, "fiber": 1.3, "sugar": 0.0, "calcium": 24.0, "iron": 1.02, "potassium": 287.0, "sodium": 1143.0, "vitc": 4.0, "satfat": 2.936}},
  {"id": "pork_chops", "name": "Pork loin chops (boneless)", "group": "Proteins", "type": "Red Meat & Pork", "product": "Family pack, per lb", "price": 4.17, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.919312, "bls_cost_per_100g": 1.003104, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "10164", "per100g": {"kcal": 201.0, "protein": 21.14, "carb": 0.0, "fat": 12.96, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.48, "potassium": 345.0, "sodium": 82.0, "vitc": 0.0, "satfat": 4.413}},
  {"id": "round_steak", "name": "Round steak (boneless)", "group": "Proteins", "type": "Red Meat & Pork", "product": "Steak, round, USDA Choice, boneless, per lb (BLS U.S. average)", "price": 9.838, "price_note": "BLS APU0000703511 \"Steak, round, USDA Choice, boneless, per lb\", U.S. city average, Sep 2026; USDA top round steak, Choice, as the nutrient match", "price_source": "bls", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 2.168871, "bls_cost_per_100g": 2.16891, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "13894", "per100g": {"kcal": 168.0, "protein": 21.94, "carb": 0.0, "fat": 8.19, "fiber": 0.0, "sugar": 0.0, "calcium": 17.0, "iron": 1.97, "potassium": 341.0, "sodium": 57.0, "vitc": 0.0, "satfat": 3.224}},
  {"id": "sirloin", "name": "Top sirloin steak", "group": "Proteins", "type": "Red Meat & Pork", "product": "Choice Angus top sirloin, per lb", "price": 12.94, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 0.97, "cost_per_100g": 2.940963, "bls_cost_per_100g": 3.206024, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "13931", "per100g": {"kcal": 214.0, "protein": 19.92, "carb": 0.0, "fat": 14.28, "fiber": 0.0, "sugar": 0.0, "calcium": 25.0, "iron": 1.46, "potassium": 309.0, "sodium": 51.0, "vitc": 0.0, "satfat": 5.763}},
  {"id": "tuna", "name": "Canned light tuna (in water)", "group": "Proteins", "type": "Fish & Seafood", "product": "Great Value chunk light, 5 oz can", "price": 0.96, "price_note": "Drained solids ~79% of can weight", "price_source": "walmart", "core": true, "package_g": 141.7, "edible_yield": 0.79, "cost_per_100g": 0.857579, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz drained", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15121", "per100g": {"kcal": 86.0, "protein": 19.44, "carb": 0.0, "fat": 0.96, "fiber": 0.0, "sugar": 0.0, "calcium": 17.0, "iron": 1.63, "potassium": 179.0, "sodium": 247.0, "vitc": 0.0, "satfat": 0.211}},
  {"id": "salmon", "name": "Salmon (Atlantic, fillet)", "group": "Proteins", "type": "Fish & Seafood", "product": "Marketside frozen portions, 2 lb", "price": 21.94, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 2.41843, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15236", "per100g": {"kcal": 208.0, "protein": 20.42, "carb": 0.0, "fat": 13.42, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.34, "potassium": 363.0, "sodium": 59.0, "vitc": 3.9, "satfat": 3.05}},
  {"id": "shrimp", "name": "Shrimp (raw, peeled)", "group": "Proteins", "type": "Fish & Seafood", "product": "Great Value frozen, 2 lb", "price": 15.96, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 1.759259, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0, 1, 0], "flags": ["fish", "shellfish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15149", "per100g": {"kcal": 71.0, "protein": 13.61, "carb": 0.91, "fat": 1.01, "fiber": 0.0, "sugar": 0.0, "calcium": 54.0, "iron": 0.21, "potassium": 113.0, "sodium": 566.0, "vitc": 0.0, "satfat": 0.261}},
  {"id": "tilapia", "name": "Tilapia (fillet)", "group": "Proteins", "type": "Fish & Seafood", "product": "Great Value frozen, 2 lb", "price": 8.87, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.977734, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "ndb": "15261", "per100g": {"kcal": 96.0, "protein": 20.08, "carb": 0.0, "fat": 1.7, "fiber": 0.0, "sugar": 0.0, "calcium": 10.0, "iron": 0.56, "potassium": 302.0, "sodium": 52.0, "vitc": 0.0, "satfat": 0.585}},
  {"id": "eggs", "name": "Eggs (large)", "group": "Proteins", "type": "Eggs", "product": "Great Value large, 12 ct", "price": 1.67, "price_note": "Dozen = 12 x 50 g edible; shell is 12% of weight", "price_source": "walmart", "core": true, "package_g": 681.8, "edible_yield": 0.88, "cost_per_100g": 0.278341, "bls_cost_per_100g": 0.378667, "serving_g": 50, "serving_desc": "1 large egg", "max_servings": 3, "meal": [1, 0, 0, 0], "flags": ["egg"], "cup_eq_g": null, "cap_group": null, "ndb": "01123", "per100g": {"kcal": 143.0, "protein": 12.56, "carb": 0.72, "fat": 9.51, "fiber": 0.0, "sugar": 0.37, "calcium": 56.0, "iron": 1.75, "potassium": 138.0, "sodium": 142.0, "vitc": 0.0, "satfat": 3.126}},
  {"id": "black_beans", "name": "Black beans (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Great Value no salt added, 15 oz", "price": 0.92, "price_note": "Nutrients for solids + liquid", "price_source": "walmart", "core": true, "package_g": 425.2, "edible_yield": 1.0, "cost_per_100g": 0.216369, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16316", "per100g": {"kcal": 91.0, "protein": 6.03, "carb": 16.55, "fat": 0.29, "fiber": 6.9, "sugar": 0.23, "calcium": 35.0, "iron": 1.9, "potassium": 308.0, "sodium": 138.0, "vitc": 2.7, "satfat": 0.075}},
  {"id": "black_beans_dry", "name": "Black beans (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 1.79, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.6585/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.394621, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16014", "per100g": {"kcal": 341.0, "protein": 21.6, "carb": 62.36, "fat": 1.42, "fiber": 15.5, "sugar": 2.12, "calcium": 123.0, "iron": 5.02, "potassium": 1483.0, "sodium": 5.0, "vitc": 0.0, "satfat": 0.366}},
  {"id": "blackeye_can", "name": "Black-eyed peas (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.568, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.4209/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034; nutrients for solids + liquid", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.345679, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16064", "per100g": {"kcal": 77.0, "protein": 4.74, "carb": 13.63, "fat": 0.55, "fiber": 3.3, "sugar": 0.0, "calcium": 20.0, "iron": 0.97, "potassium": 172.0, "sodium": 293.0, "vitc": 2.7, "satfat": 0.144}},
  {"id": "blackeye_dry", "name": "Black-eyed peas (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 2.294, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.1255/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.505732, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16062", "per100g": {"kcal": 336.0, "protein": 23.52, "carb": 60.03, "fat": 1.26, "fiber": 10.6, "sugar": 6.9, "calcium": 110.0, "iron": 8.27, "potassium": 1112.0, "sodium": 16.0, "vitc": 1.5, "satfat": 0.331}},
  {"id": "chickpeas", "name": "Chickpeas (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Great Value, 15.5 oz", "price": 0.92, "price_note": "Nutrients for solids + liquid", "price_source": "walmart", "core": true, "package_g": 439.4, "edible_yield": 1.0, "cost_per_100g": 0.209376, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16058", "per100g": {"kcal": 88.0, "protein": 4.92, "carb": 13.49, "fat": 1.95, "fiber": 4.4, "sugar": 0.0, "calcium": 35.0, "iron": 1.23, "potassium": 144.0, "sodium": 278.0, "vitc": 0.1, "satfat": 0.204}},
  {"id": "gn_beans_can", "name": "Great northern beans (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.288, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.1673/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034; nutrients for solids + liquid", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.283951, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16026", "per100g": {"kcal": 114.0, "protein": 7.37, "carb": 21.02, "fat": 0.39, "fiber": 4.9, "sugar": 1.41, "calcium": 53.0, "iron": 1.57, "potassium": 351.0, "sodium": 370.0, "vitc": 1.3, "satfat": 0.12}},
  {"id": "gn_beans_dry", "name": "Great northern beans (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 2.022, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.8728/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.445767, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16024", "per100g": {"kcal": 339.0, "protein": 21.86, "carb": 62.37, "fat": 1.14, "fiber": 20.2, "sugar": 2.26, "calcium": 175.0, "iron": 5.47, "potassium": 1387.0, "sodium": 14.0, "vitc": 5.3, "satfat": 0.356}},
  {"id": "kidney_beans_can", "name": "Kidney beans (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.324, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.1999/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034; nutrients for solids + liquid", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.291887, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16034", "per100g": {"kcal": 81.0, "protein": 5.22, "carb": 14.83, "fat": 0.36, "fiber": 4.3, "sugar": 1.85, "calcium": 29.0, "iron": 1.25, "potassium": 260.0, "sodium": 256.0, "vitc": 0.8, "satfat": 0.125}},
  {"id": "kidney_beans_dry", "name": "Kidney beans (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 2.155, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.9963/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.475088, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16027", "per100g": {"kcal": 333.0, "protein": 23.58, "carb": 60.01, "fat": 0.83, "fiber": 24.9, "sugar": 2.23, "calcium": 143.0, "iron": 8.2, "potassium": 1406.0, "sodium": 24.0, "vitc": 4.5, "satfat": 0.12}},
  {"id": "lentils", "name": "Lentils (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Great Value, 1 lb", "price": 1.92, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.42328, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16069", "per100g": {"kcal": 352.0, "protein": 24.63, "carb": 63.35, "fat": 1.06, "fiber": 10.7, "sugar": 2.03, "calcium": 35.0, "iron": 6.51, "potassium": 677.0, "sodium": 6.0, "vitc": 4.5, "satfat": 0.154}},
  {"id": "lima_dry", "name": "Lima beans (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 2.865, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.6543/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.631614, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16071", "per100g": {"kcal": 338.0, "protein": 21.46, "carb": 63.38, "fat": 0.69, "fiber": 19.0, "sugar": 8.5, "calcium": 81.0, "iron": 7.51, "potassium": 1724.0, "sodium": 18.0, "vitc": 0.0, "satfat": 0.161}},
  {"id": "navy_beans_can", "name": "Navy beans (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.362, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2345/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034; nutrients for solids + liquid", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.300265, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16039", "per100g": {"kcal": 113.0, "protein": 7.53, "carb": 20.45, "fat": 0.43, "fiber": 5.1, "sugar": 0.28, "calcium": 47.0, "iron": 1.85, "potassium": 288.0, "sodium": 336.0, "vitc": 0.7, "satfat": 0.112}},
  {"id": "navy_beans_dry", "name": "Navy beans (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 1.841, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.7058/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795; USDA lists no vitamin C value; counted as 0", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.405864, "bls_cost_per_100g": null, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16037", "per100g": {"kcal": 337.0, "protein": 22.33, "carb": 60.75, "fat": 1.5, "fiber": 15.3, "sugar": 3.88, "calcium": 147.0, "iron": 5.49, "potassium": 1185.0, "sodium": 5.0, "vitc": 0.0, "satfat": 0.17}},
  {"id": "peanut_butter", "name": "Peanut butter", "group": "Proteins", "type": "Plant Proteins", "product": "Great Value creamy, 40 oz", "price": 3.98, "price_note": "", "price_source": "walmart", "core": true, "package_g": 1134.0, "edible_yield": 1.0, "cost_per_100g": 0.35097, "bls_cost_per_100g": null, "serving_g": 32, "serving_desc": "2 tbsp", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": ["peanut"], "cup_eq_g": null, "cap_group": null, "ndb": "16098", "per100g": {"kcal": 598.0, "protein": 22.21, "carb": 22.31, "fat": 51.36, "fiber": 5.0, "sugar": 10.49, "calcium": 49.0, "iron": 1.74, "potassium": 558.0, "sodium": 426.0, "vitc": 0.0, "satfat": 10.325}},
  {"id": "pinto_beans_can", "name": "Pinto beans (canned)", "group": "Proteins", "type": "Plant Proteins", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.337, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2121/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034; nutrients for solids + liquid", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.294753, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16044", "per100g": {"kcal": 82.0, "protein": 4.6, "carb": 15.18, "fat": 0.56, "fiber": 4.6, "sugar": 1.02, "calcium": 47.0, "iron": 1.47, "potassium": 276.0, "sodium": 268.0, "vitc": 0.7, "satfat": 0.123}},
  {"id": "pinto_beans", "name": "Pinto beans (dry)", "group": "Proteins", "type": "Plant Proteins", "product": "Great Value, 2 lb", "price": 1.98, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.218254, "bls_cost_per_100g": 0.367952, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "ndb": "16042", "per100g": {"kcal": 347.0, "protein": 21.42, "carb": 62.55, "fat": 1.23, "fiber": 15.5, "sugar": 2.11, "calcium": 113.0, "iron": 5.07, "potassium": 1393.0, "sodium": 12.0, "vitc": 6.3, "satfat": 0.235}},
  {"id": "tofu", "name": "Tofu (extra firm)", "group": "Proteins", "type": "Plant Proteins", "product": "Nasoya extra firm, 14 oz", "price": 2.97, "price_note": "Price undated (Walmart Business listing)", "price_source": "walmart", "core": true, "package_g": 396.9, "edible_yield": 1.0, "cost_per_100g": 0.748299, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["soy"], "cup_eq_g": null, "cap_group": null, "ndb": "16212", "per100g": {"kcal": 98.0, "protein": 10.1, "carb": 2.6, "fat": 5.2, "fiber": 1.3, "sugar": 0.4, "calcium": 77.0, "iron": 1.6, "potassium": 0.0, "sodium": 4.0, "vitc": 0.0, "satfat": 0.7}},
  {"id": "milk_2pct", "name": "2% milk", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "product": "Great Value, 1 gal", "price": 3.31, "price_note": "Gallon = 16 cups x 244 g", "price_source": "walmart", "core": true, "package_g": 3904, "edible_yield": 1.0, "cost_per_100g": 0.084785, "bls_cost_per_100g": null, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "ndb": "01079", "per100g": {"kcal": 50.0, "protein": 3.3, "carb": 4.8, "fat": 1.98, "fiber": 0.0, "sugar": 5.06, "calcium": 120.0, "iron": 0.02, "potassium": 140.0, "sodium": 47.0, "vitc": 0.2, "satfat": 1.257}},
  {"id": "greek_yogurt", "name": "Greek yogurt (plain, nonfat)", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "product": "Great Value, 32 oz", "price": 3.28, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.361552, "bls_cost_per_100g": null, "serving_g": 170, "serving_desc": "1 container (6 oz)", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "ndb": "01256", "per100g": {"kcal": 59.0, "protein": 10.19, "carb": 3.6, "fat": 0.39, "fiber": 0.0, "sugar": 3.24, "calcium": 110.0, "iron": 0.07, "potassium": 141.0, "sodium": 36.0, "vitc": 0.0, "satfat": 0.117}},
  {"id": "soy_milk", "name": "Soy milk (calcium-fortified)", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "product": "Silk original, 64 fl oz", "price": 4.57, "price_note": "Half gallon = 8 cups x 243 g", "price_source": "walmart", "core": true, "package_g": 1944, "edible_yield": 1.0, "cost_per_100g": 0.235082, "bls_cost_per_100g": null, "serving_g": 243, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["soy"], "cup_eq_g": null, "cap_group": null, "ndb": "16139", "per100g": {"kcal": 43.0, "protein": 2.6, "carb": 4.92, "fat": 1.47, "fiber": 0.2, "sugar": 3.65, "calcium": 123.0, "iron": 0.42, "potassium": 122.0, "sodium": 47.0, "vitc": 0.0, "satfat": 0.205}},
  {"id": "milk_whole", "name": "Whole milk", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "product": "Great Value, 1 gal", "price": 3.48, "price_note": "Gallon = 16 cups x 244 g", "price_source": "walmart", "core": true, "package_g": 3904, "edible_yield": 1.0, "cost_per_100g": 0.089139, "bls_cost_per_100g": 0.105174, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "ndb": "01077", "per100g": {"kcal": 61.0, "protein": 3.15, "carb": 4.8, "fat": 3.25, "fiber": 0.0, "sugar": 5.05, "calcium": 113.0, "iron": 0.03, "potassium": 132.0, "sodium": 43.0, "vitc": 0.0, "satfat": 1.865}},
  {"id": "american_cheese", "name": "American cheese (singles)", "group": "Dairy & Alternatives", "type": "Cheese", "product": "Great Value, 16 oz / 24 slices", "price": 2.48, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.546737, "bls_cost_per_100g": 1.044331, "serving_g": 19, "serving_desc": "1 slice", "max_servings": 3, "meal": [0, 1, 0, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01042", "per100g": {"kcal": 366.0, "protein": 18.13, "carb": 4.78, "fat": 30.71, "fiber": 0.0, "sugar": 2.26, "calcium": 1045.0, "iron": 0.63, "potassium": 132.0, "sodium": 1671.0, "vitc": 0.0, "satfat": 18.057}},
  {"id": "cheddar", "name": "Cheddar cheese", "group": "Dairy & Alternatives", "type": "Cheese", "product": "Great Value medium block, 8 oz", "price": 1.87, "price_note": "", "price_source": "walmart", "core": true, "package_g": 226.8, "edible_yield": 1.0, "cost_per_100g": 0.824515, "bls_cost_per_100g": 1.352096, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01009", "per100g": {"kcal": 404.0, "protein": 22.87, "carb": 3.09, "fat": 33.31, "fiber": 0.0, "sugar": 0.48, "calcium": 710.0, "iron": 0.14, "potassium": 76.0, "sodium": 653.0, "vitc": 0.0, "satfat": 18.867}},
  {"id": "cottage_cheese", "name": "Cottage cheese (2%)", "group": "Dairy & Alternatives", "type": "Cheese", "product": "Great Value small curd, 24 oz", "price": 2.87, "price_note": "", "price_source": "walmart", "core": true, "package_g": 680.4, "edible_yield": 1.0, "cost_per_100g": 0.421811, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01015", "per100g": {"kcal": 81.0, "protein": 10.45, "carb": 4.76, "fat": 2.27, "fiber": 0.0, "sugar": 4.0, "calcium": 111.0, "iron": 0.13, "potassium": 125.0, "sodium": 308.0, "vitc": 0.0, "satfat": 1.235}},
  {"id": "string_cheese", "name": "Mozzarella string cheese", "group": "Dairy & Alternatives", "type": "Cheese", "product": "Great Value part-skim, 12 ct", "price": 3.28, "price_note": "Price undated (Walmart.com listing)", "price_source": "walmart", "core": true, "package_g": 340.2, "edible_yield": 1.0, "cost_per_100g": 0.964139, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 stick", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "ndb": "01029", "per100g": {"kcal": 295.0, "protein": 23.75, "carb": 5.58, "fat": 19.78, "fiber": 0.0, "sugar": 1.9, "calcium": 697.0, "iron": 0.22, "potassium": 188.0, "sodium": 666.0, "vitc": 0.0, "satfat": 11.295}},
  {"id": "bagel", "name": "Bagels (plain)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value, 6 ct / 20 oz", "price": 2.14, "price_note": "", "price_source": "walmart", "core": true, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.377425, "bls_cost_per_100g": null, "serving_g": 94, "serving_desc": "1 bagel", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18001", "per100g": {"kcal": 264.0, "protein": 10.56, "carb": 52.38, "fat": 1.32, "fiber": 1.6, "sugar": 8.43, "calcium": 219.0, "iron": 3.57, "potassium": 107.0, "sodium": 422.0, "vitc": 0.0, "satfat": 0.36}},
  {"id": "brown_rice", "name": "Brown rice (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value long grain, 32 oz", "price": 1.72, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.189594, "bls_cost_per_100g": null, "serving_g": 46, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 4, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "20036", "per100g": {"kcal": 367.0, "protein": 7.54, "carb": 76.25, "fat": 3.2, "fiber": 3.6, "sugar": 0.66, "calcium": 9.0, "iron": 1.29, "potassium": 250.0, "sodium": 5.0, "vitc": 0.0, "satfat": 0.591}},
  {"id": "cheerios", "name": "Cheerios", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Cheerios family size, 18 oz", "price": 4.97, "price_note": "Regular price; was on Rollback at $4.50", "price_source": "walmart", "core": true, "package_g": 510.3, "edible_yield": 1.0, "cost_per_100g": 0.973937, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 cup", "max_servings": 2, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "08013", "per100g": {"kcal": 376.0, "protein": 12.09, "carb": 73.23, "fat": 6.73, "fiber": 9.4, "sugar": 4.36, "calcium": 401.0, "iron": 33.17, "potassium": 641.0, "sodium": 497.0, "vitc": 21.6, "satfat": 1.5}},
  {"id": "corn_tortilla", "name": "Corn tortillas", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Mission yellow corn, 30 ct", "price": 2.48, "price_note": "Weight from listed unit price (8.9 cents/oz)", "price_source": "walmart", "core": true, "package_g": 791.0, "edible_yield": 1.0, "cost_per_100g": 0.313527, "bls_cost_per_100g": null, "serving_g": 26, "serving_desc": "1 tortilla", "max_servings": 6, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "18363", "per100g": {"kcal": 218.0, "protein": 5.7, "carb": 44.64, "fat": 2.85, "fiber": 6.3, "sugar": 0.88, "calcium": 81.0, "iron": 1.23, "potassium": 186.0, "sodium": 45.0, "vitc": 0.0, "satfat": 0.453}},
  {"id": "flour_tortilla", "name": "Flour tortillas", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value medium, 10 ct / 16 oz", "price": 1.98, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.436508, "bls_cost_per_100g": null, "serving_g": 45, "serving_desc": "1 tortilla", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18970", "per100g": {"kcal": 297.0, "protein": 8.01, "carb": 49.27, "fat": 7.58, "fiber": 2.4, "sugar": 2.66, "calcium": 163.0, "iron": 3.32, "potassium": 133.0, "sodium": 742.0, "vitc": 0.0, "satfat": 1.225}},
  {"id": "quinoa", "name": "Quinoa (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value organic, 16 oz", "price": 3.44, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.758377, "bls_cost_per_100g": null, "serving_g": 43, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "20035", "per100g": {"kcal": 368.0, "protein": 14.12, "carb": 64.16, "fat": 6.07, "fiber": 7.0, "sugar": 0.0, "calcium": 47.0, "iron": 4.57, "potassium": 563.0, "sodium": 5.0, "vitc": 0.0, "satfat": 0.706}},
  {"id": "oats", "name": "Rolled oats (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value old fashioned, 42 oz", "price": 4.38, "price_note": "Not certified gluten-free", "price_source": "walmart", "core": true, "package_g": 1190.7, "edible_yield": 1.0, "cost_per_100g": 0.367851, "bls_cost_per_100g": null, "serving_g": 40, "serving_desc": "1/2 cup dry", "max_servings": 2, "meal": [1, 0, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "08120", "per100g": {"kcal": 379.0, "protein": 13.15, "carb": 67.7, "fat": 6.52, "fiber": 10.1, "sugar": 0.99, "calcium": 52.0, "iron": 4.25, "potassium": 362.0, "sodium": 6.0, "vitc": 0.0, "satfat": 1.11}},
  {"id": "spaghetti", "name": "Spaghetti (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value, 16 oz", "price": 1.36, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.299824, "bls_cost_per_100g": 0.303136, "serving_g": 57, "serving_desc": "2 oz dry (~1 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "20120", "per100g": {"kcal": 371.0, "protein": 13.04, "carb": 74.67, "fat": 1.51, "fiber": 3.2, "sugar": 2.67, "calcium": 21.0, "iron": 3.3, "potassium": 223.0, "sodium": 6.0, "vitc": 0.0, "satfat": 0.277}},
  {"id": "white_bread", "name": "White bread", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value, 20 oz loaf", "price": 1.52, "price_note": "", "price_source": "walmart", "core": true, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.268078, "bls_cost_per_100g": 0.403446, "serving_g": 28, "serving_desc": "1 slice", "max_servings": 4, "meal": [0.5, 0.5, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18069", "per100g": {"kcal": 266.0, "protein": 8.85, "carb": 49.42, "fat": 3.33, "fiber": 2.7, "sugar": 5.67, "calcium": 144.0, "iron": 3.61, "potassium": 126.0, "sodium": 490.0, "vitc": 0.0, "satfat": 0.698}},
  {"id": "white_rice", "name": "White rice (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value long grain, 5 lb", "price": 2.48, "price_note": "Price undated (Walmart Business listing)", "price_source": "walmart", "core": true, "package_g": 2268.0, "edible_yield": 1.0, "cost_per_100g": 0.109347, "bls_cost_per_100g": 0.246477, "serving_g": 46, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 4, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "ndb": "20044", "per100g": {"kcal": 365.0, "protein": 7.13, "carb": 79.95, "fat": 0.66, "fiber": 1.3, "sugar": 0.12, "calcium": 28.0, "iron": 4.31, "potassium": 115.0, "sodium": 5.0, "vitc": 0.0, "satfat": 0.18}},
  {"id": "wheat_bread", "name": "Whole-wheat bread", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value 100% whole wheat, 20 oz", "price": 2.02, "price_note": "", "price_source": "walmart", "core": true, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.356261, "bls_cost_per_100g": null, "serving_g": 32, "serving_desc": "1 slice", "max_servings": 4, "meal": [0.5, 0.5, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "18075", "per100g": {"kcal": 252.0, "protein": 12.45, "carb": 42.71, "fat": 3.5, "fiber": 6.0, "sugar": 4.34, "calcium": 161.0, "iron": 2.47, "potassium": 254.0, "sodium": 455.0, "vitc": 0.0, "satfat": 0.722}},
  {"id": "ww_pasta", "name": "Whole-wheat spaghetti (dry)", "group": "Carbohydrates", "type": "Grains & Bread", "product": "Great Value, 16 oz", "price": 1.74, "price_note": "Price undated (Walmart.com listing)", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.383598, "bls_cost_per_100g": null, "serving_g": 57, "serving_desc": "2 oz dry (~1 cup cooked)", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "ndb": "20124", "per100g": {"kcal": 352.0, "protein": 13.87, "carb": 73.37, "fat": 2.93, "fiber": 9.2, "sugar": 2.74, "calcium": 29.0, "iron": 3.62, "potassium": 434.0, "sodium": 6.0, "vitc": 0.0, "satfat": 0.428}},
  {"id": "lima_frozen", "name": "Baby lima beans (frozen)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.891, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.8348/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.637346, "bls_cost_per_100g": null, "serving_g": 82, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11039", "per100g": {"kcal": 132.0, "protein": 7.59, "carb": 25.14, "fat": 0.44, "fiber": 6.0, "sugar": 0.0, "calcium": 35.0, "iron": 2.21, "potassium": 452.0, "sodium": 52.0, "vitc": 8.3, "satfat": 0.102}},
  {"id": "corn_can", "name": "Corn (canned)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.345, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2188/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.296517, "bls_cost_per_100g": null, "serving_g": 128, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11170", "per100g": {"kcal": 61.0, "protein": 1.95, "carb": 13.86, "fat": 0.77, "fiber": 1.7, "sugar": 4.15, "calcium": 4.0, "iron": 0.36, "potassium": 136.0, "sodium": 195.0, "vitc": 2.6, "satfat": 0.077}},
  {"id": "corn", "name": "Corn (frozen)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Great Value whole kernel, 12 oz", "price": 0.98, "price_note": "Price undated (Walmart.com listing)", "price_source": "walmart", "core": true, "package_g": 340.2, "edible_yield": 1.0, "cost_per_100g": 0.288066, "bls_cost_per_100g": null, "serving_g": 68, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11178", "per100g": {"kcal": 88.0, "protein": 3.02, "carb": 20.71, "fat": 0.78, "fiber": 2.1, "sugar": 2.5, "calcium": 4.0, "iron": 0.42, "potassium": 213.0, "sodium": 3.0, "vitc": 6.4, "satfat": 0.119}},
  {"id": "fries_frozen", "name": "French fries (frozen)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.571, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.5209/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.566799, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz (about 13 fries), baked", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11842", "per100g": {"kcal": 150.0, "protein": 2.24, "carb": 24.81, "fat": 4.66, "fiber": 1.9, "sugar": 0.2, "calcium": 9.0, "iron": 0.62, "potassium": 408.0, "sodium": 23.0, "vitc": 17.3, "satfat": 0.94}},
  {"id": "peas_can", "name": "Green peas (canned)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.569, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.4219/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.345899, "bls_cost_per_100g": null, "serving_g": 124, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11306", "per100g": {"kcal": 58.0, "protein": 3.01, "carb": 10.6, "fat": 0.48, "fiber": 3.3, "sugar": 3.2, "calcium": 20.0, "iron": 1.29, "potassium": 106.0, "sodium": 185.0, "vitc": 7.8, "satfat": 0.086}},
  {"id": "peas_frozen", "name": "Green peas (frozen)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.235, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.1910/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.492725, "bls_cost_per_100g": null, "serving_g": 67, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11312", "per100g": {"kcal": 77.0, "protein": 5.22, "carb": 13.62, "fat": 0.4, "fiber": 4.5, "sugar": 5.0, "calcium": 22.0, "iron": 1.53, "potassium": 153.0, "sodium": 108.0, "vitc": 18.0, "satfat": 0.066}},
  {"id": "potatoes", "name": "Potatoes (russet)", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "Russet, 5 lb bag", "price": 4.86, "price_note": "Regular price; was on Rollback at $2.47", "price_source": "walmart", "core": true, "package_g": 2268.0, "edible_yield": 0.75, "cost_per_100g": 0.285714, "bls_cost_per_100g": 0.290716, "serving_g": 150, "serving_desc": "1 cup diced", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11352", "per100g": {"kcal": 77.0, "protein": 2.05, "carb": 17.49, "fat": 0.09, "fiber": 2.1, "sugar": 0.82, "calcium": 12.0, "iron": 0.81, "potassium": 425.0, "sodium": 6.0, "vitc": 19.7, "satfat": 0.025}},
  {"id": "sweet_potatoes", "name": "Sweet potatoes", "group": "Carbohydrates", "type": "Starchy Vegetables", "product": "3 lb bag", "price": 3.62, "price_note": "Price undated (Walmart.com listing)", "price_source": "walmart", "core": true, "package_g": 1360.8, "edible_yield": 0.72, "cost_per_100g": 0.369472, "bls_cost_per_100g": null, "serving_g": 133, "serving_desc": "1 cup cubed", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "11507", "per100g": {"kcal": 86.0, "protein": 1.57, "carb": 20.12, "fat": 0.05, "fiber": 3.0, "sugar": 4.18, "calcium": 30.0, "iron": 0.61, "potassium": 337.0, "sodium": 55.0, "vitc": 2.4, "satfat": 0.018}},
  {"id": "apples", "name": "Apples (Gala)", "group": "Fruits", "type": "Fruit", "product": "Fresh Gala, 3 lb bag", "price": 3.92, "price_note": "Older listing (Jun 2025) \u2014 verify", "price_source": "walmart", "core": true, "package_g": 1360.8, "edible_yield": 0.9, "cost_per_100g": 0.320073, "bls_cost_per_100g": null, "serving_g": 125, "serving_desc": "1 small apple", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 125, "cap_group": null, "ndb": "09003", "per100g": {"kcal": 52.0, "protein": 0.26, "carb": 13.81, "fat": 0.17, "fiber": 2.4, "sugar": 10.39, "calcium": 6.0, "iron": 0.12, "potassium": 107.0, "sodium": 1.0, "vitc": 4.6, "satfat": 0.028}},
  {"id": "applesauce", "name": "Applesauce (unsweetened)", "group": "Fruits", "type": "Fruit", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.333, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2081/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.293871, "bls_cost_per_100g": null, "serving_g": 122, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 244, "cap_group": null, "ndb": "09019", "per100g": {"kcal": 42.0, "protein": 0.17, "carb": 11.27, "fat": 0.1, "fiber": 1.1, "sugar": 9.39, "calcium": 4.0, "iron": 0.23, "potassium": 74.0, "sodium": 2.0, "vitc": 1.0, "satfat": 0.008}},
  {"id": "bananas", "name": "Bananas", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb", "price": 0.5, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 0.64, "cost_per_100g": 0.172233, "bls_cost_per_100g": 0.225974, "serving_g": 118, "serving_desc": "1 medium", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 118, "cap_group": null, "ndb": "09040", "per100g": {"kcal": 89.0, "protein": 1.09, "carb": 22.84, "fat": 0.33, "fiber": 2.6, "sugar": 12.23, "calcium": 5.0, "iron": 0.26, "potassium": 358.0, "sodium": 1.0, "vitc": 8.7, "satfat": 0.112}},
  {"id": "blackberries", "name": "Blackberries", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 7.249, "price_note": "Estimate: USDA ERS 2023 U.S. average $6.8345/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.96, "cost_per_100g": 1.664692, "bls_cost_per_100g": null, "serving_g": 144, "serving_desc": "1 cup", "max_servings": 1, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 144, "cap_group": null, "ndb": "09042", "per100g": {"kcal": 43.0, "protein": 1.39, "carb": 9.61, "fat": 0.49, "fiber": 5.3, "sugar": 4.88, "calcium": 29.0, "iron": 0.62, "potassium": 162.0, "sodium": 1.0, "vitc": 21.0, "satfat": 0.014}},
  {"id": "blueberries", "name": "Blueberries (frozen)", "group": "Fruits", "type": "Fruit", "product": "Great Value, 48 oz", "price": 7.97, "price_note": "", "price_source": "walmart", "core": true, "package_g": 1360.8, "edible_yield": 1.0, "cost_per_100g": 0.585685, "bls_cost_per_100g": null, "serving_g": 155, "serving_desc": "1 cup", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": 155, "cap_group": null, "ndb": "09054", "per100g": {"kcal": 51.0, "protein": 0.42, "carb": 12.17, "fat": 0.64, "fiber": 2.7, "sugar": 8.45, "calcium": 8.0, "iron": 0.18, "potassium": 54.0, "sodium": 1.0, "vitc": 2.5, "satfat": 0.053}},
  {"id": "cantaloupe", "name": "Cantaloupe", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 0.84, "price_note": "Estimate: USDA ERS 2023 U.S. average $0.7919/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.51, "cost_per_100g": 0.363108, "bls_cost_per_100g": null, "serving_g": 160, "serving_desc": "1 cup cubes", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 160, "cap_group": null, "ndb": "09181", "per100g": {"kcal": 34.0, "protein": 0.84, "carb": 8.16, "fat": 0.19, "fiber": 0.9, "sugar": 7.86, "calcium": 9.0, "iron": 0.21, "potassium": 267.0, "sodium": 16.0, "vitc": 36.7, "satfat": 0.051}},
  {"id": "cherries", "name": "Cherries", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 3.882, "price_note": "Estimate: USDA ERS 2023 U.S. average $3.6599/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.92, "cost_per_100g": 0.930239, "bls_cost_per_100g": null, "serving_g": 154, "serving_desc": "1 cup, pitted", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 154, "cap_group": null, "ndb": "09070", "per100g": {"kcal": 63.0, "protein": 1.06, "carb": 16.01, "fat": 0.2, "fiber": 2.1, "sugar": 12.82, "calcium": 13.0, "iron": 0.36, "potassium": 222.0, "sodium": 0.0, "vitc": 7.0, "satfat": 0.038}},
  {"id": "clementines", "name": "Clementines", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.682, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.5856/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606; cup-equivalent 210 g from USDA ERS (no USDA cup measure); USDA lists no saturated-fat value, counted as 0", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.77, "cost_per_100g": 0.481573, "bls_cost_per_100g": null, "serving_g": 210, "serving_desc": "about 3 clementines", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 210, "cap_group": null, "ndb": "09433", "per100g": {"kcal": 47.0, "protein": 0.85, "carb": 12.02, "fat": 0.15, "fiber": 1.7, "sugar": 9.18, "calcium": 30.0, "iron": 0.14, "potassium": 177.0, "sodium": 1.0, "vitc": 48.8, "satfat": 0.0}},
  {"id": "dates", "name": "Dates (pitted)", "group": "Fruits", "type": "Fruit", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 6.356, "price_note": "Estimate: USDA ERS 2023 U.S. average $5.8879/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795; sold pitted, so USDA's 10% pit refuse is not applied", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.401235, "bls_cost_per_100g": null, "serving_g": 37, "serving_desc": "1/4 cup chopped", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 73.5, "cap_group": null, "ndb": "09087", "per100g": {"kcal": 282.0, "protein": 2.45, "carb": 75.03, "fat": 0.39, "fiber": 8.0, "sugar": 63.35, "calcium": 39.0, "iron": 1.02, "potassium": 656.0, "sodium": 2.0, "vitc": 0.4, "satfat": 0.032}},
  {"id": "apricots_dried", "name": "Dried apricots", "group": "Fruits", "type": "Fruit", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 9.32, "price_note": "Estimate: USDA ERS 2023 U.S. average $8.6343/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 2.054674, "bls_cost_per_100g": null, "serving_g": 33, "serving_desc": "1/4 cup halves", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 65, "cap_group": null, "ndb": "09032", "per100g": {"kcal": 241.0, "protein": 3.39, "carb": 62.64, "fat": 0.51, "fiber": 7.3, "sugar": 53.44, "calcium": 55.0, "iron": 2.66, "potassium": 1162.0, "sodium": 10.0, "vitc": 1.0, "satfat": 0.017}},
  {"id": "cranberries_dried", "name": "Dried cranberries (sweetened)", "group": "Fruits", "type": "Fruit", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 5.682, "price_note": "Estimate: USDA ERS 2023 U.S. average $5.2639/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.252646, "bls_cost_per_100g": null, "serving_g": 40, "serving_desc": "1/4 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 80, "cap_group": null, "ndb": "09079", "per100g": {"kcal": 308.0, "protein": 0.17, "carb": 82.8, "fat": 1.09, "fiber": 5.3, "sugar": 72.56, "calcium": 9.0, "iron": 0.39, "potassium": 49.0, "sodium": 5.0, "vitc": 0.2, "satfat": 0.088}},
  {"id": "fruit_cocktail", "name": "Fruit cocktail (canned in juice)", "group": "Fruits", "type": "Fruit", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 2.925, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.6505/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.644841, "bls_cost_per_100g": null, "serving_g": 119, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 237, "cap_group": null, "ndb": "09097", "per100g": {"kcal": 46.0, "protein": 0.46, "carb": 11.86, "fat": 0.01, "fiber": 1.0, "sugar": 10.86, "calcium": 8.0, "iron": 0.21, "potassium": 95.0, "sodium": 4.0, "vitc": 2.7, "satfat": 0.001}},
  {"id": "grapefruit", "name": "Grapefruit", "group": "Fruits", "type": "Fruit", "product": "Grapefruit, per lb (BLS U.S. average)", "price": 1.624, "price_note": "BLS APU0000711411 \"Grapefruit, per lb\", U.S. city average, Sep 2026; edible yield 50% (USDA refuse: peel, seeds, membrane)", "price_source": "bls", "core": false, "package_g": 453.6, "edible_yield": 0.5, "cost_per_100g": 0.716049, "bls_cost_per_100g": 0.716062, "serving_g": 230, "serving_desc": "1 cup sections", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 230, "cap_group": null, "ndb": "09111", "per100g": {"kcal": 32.0, "protein": 0.63, "carb": 8.08, "fat": 0.1, "fiber": 1.1, "sugar": 6.98, "calcium": 12.0, "iron": 0.09, "potassium": 139.0, "sodium": 0.0, "vitc": 34.4, "satfat": 0.014}},
  {"id": "grapes", "name": "Grapes (red seedless)", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb", "price": 1.87, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 0.96, "cost_per_100g": 0.429435, "bls_cost_per_100g": null, "serving_g": 151, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 151, "cap_group": null, "ndb": "09132", "per100g": {"kcal": 69.0, "protein": 0.72, "carb": 18.1, "fat": 0.16, "fiber": 0.9, "sugar": 15.48, "calcium": 10.0, "iron": 0.36, "potassium": 191.0, "sodium": 2.0, "vitc": 3.2, "satfat": 0.054}},
  {"id": "honeydew", "name": "Honeydew melon", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.326, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2501/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.46, "cost_per_100g": 0.635496, "bls_cost_per_100g": null, "serving_g": 170, "serving_desc": "1 cup diced", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 170, "cap_group": null, "ndb": "09184", "per100g": {"kcal": 36.0, "protein": 0.54, "carb": 9.09, "fat": 0.14, "fiber": 0.8, "sugar": 8.12, "calcium": 6.0, "iron": 0.17, "potassium": 228.0, "sodium": 18.0, "vitc": 18.0, "satfat": 0.038}},
  {"id": "kiwi", "name": "Kiwifruit", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 3.006, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.8347/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.76, "cost_per_100g": 0.871972, "bls_cost_per_100g": null, "serving_g": 180, "serving_desc": "1 cup sliced", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 180, "cap_group": null, "ndb": "09148", "per100g": {"kcal": 61.0, "protein": 1.14, "carb": 14.66, "fat": 0.52, "fiber": 3.0, "sugar": 8.99, "calcium": 34.0, "iron": 0.31, "potassium": 312.0, "sodium": 3.0, "vitc": 92.7, "satfat": 0.029}},
  {"id": "mango", "name": "Mango", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.547, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.4587/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.71, "cost_per_100g": 0.480351, "bls_cost_per_100g": null, "serving_g": 165, "serving_desc": "1 cup pieces", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 165, "cap_group": null, "ndb": "09176", "per100g": {"kcal": 60.0, "protein": 0.82, "carb": 14.98, "fat": 0.38, "fiber": 1.6, "sugar": 13.66, "calcium": 11.0, "iron": 0.16, "potassium": 168.0, "sodium": 1.0, "vitc": 36.4, "satfat": 0.092}},
  {"id": "nectarines", "name": "Nectarines", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 2.625, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.4753/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.91, "cost_per_100g": 0.635938, "bls_cost_per_100g": null, "serving_g": 143, "serving_desc": "1 cup slices", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 143, "cap_group": null, "ndb": "09191", "per100g": {"kcal": 44.0, "protein": 1.06, "carb": 10.55, "fat": 0.32, "fiber": 1.7, "sugar": 7.89, "calcium": 6.0, "iron": 0.28, "potassium": 201.0, "sodium": 0.0, "vitc": 5.4, "satfat": 0.025}},
  {"id": "orange_juice", "name": "Orange juice (100%)", "group": "Fruits", "type": "Fruit", "product": "Great Value not-from-concentrate, 52 fl oz", "price": 3.96, "price_note": "52 fl oz = 6.5 cups x 249 g", "price_source": "walmart", "core": true, "package_g": 1618.5, "edible_yield": 1.0, "cost_per_100g": 0.244671, "bls_cost_per_100g": null, "serving_g": 249, "serving_desc": "1 cup", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": 249, "cap_group": null, "ndb": "09209", "per100g": {"kcal": 49.0, "protein": 0.68, "carb": 11.54, "fat": 0.12, "fiber": 0.3, "sugar": 8.31, "calcium": 11.0, "iron": 0.13, "potassium": 178.0, "sodium": 2.0, "vitc": 33.6, "satfat": 0.014}},
  {"id": "oranges", "name": "Oranges (navel)", "group": "Fruits", "type": "Fruit", "product": "Fresh navel, 4 lb bag", "price": 5.97, "price_note": "", "price_source": "walmart", "core": true, "package_g": 1814.4, "edible_yield": 0.68, "cost_per_100g": 0.483874, "bls_cost_per_100g": 0.558613, "serving_g": 140, "serving_desc": "1 orange", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 140, "cap_group": null, "ndb": "09202", "per100g": {"kcal": 49.0, "protein": 0.91, "carb": 12.54, "fat": 0.15, "fiber": 2.2, "sugar": 8.5, "calcium": 43.0, "iron": 0.13, "potassium": 166.0, "sodium": 1.0, "vitc": 59.1, "satfat": 0.017}},
  {"id": "papaya", "name": "Papaya", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.385, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.3055/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.62, "cost_per_100g": 0.492476, "bls_cost_per_100g": null, "serving_g": 145, "serving_desc": "1 cup pieces", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 145, "cap_group": null, "ndb": "09226", "per100g": {"kcal": 43.0, "protein": 0.47, "carb": 10.82, "fat": 0.26, "fiber": 1.7, "sugar": 7.82, "calcium": 20.0, "iron": 0.25, "potassium": 182.0, "sodium": 8.0, "vitc": 60.9, "satfat": 0.081}},
  {"id": "peaches", "name": "Peaches", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 2.606, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.4571/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.96, "cost_per_100g": 0.598453, "bls_cost_per_100g": null, "serving_g": 154, "serving_desc": "1 cup slices", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 154, "cap_group": null, "ndb": "09236", "per100g": {"kcal": 39.0, "protein": 0.91, "carb": 9.54, "fat": 0.25, "fiber": 1.5, "sugar": 8.39, "calcium": 6.0, "iron": 0.25, "potassium": 190.0, "sodium": 0.0, "vitc": 6.6, "satfat": 0.019}},
  {"id": "peaches_can", "name": "Peaches (canned in juice)", "group": "Fruits", "type": "Fruit", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 2.744, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.4868/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.604938, "bls_cost_per_100g": null, "serving_g": 125, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 250, "cap_group": null, "ndb": "09238", "per100g": {"kcal": 44.0, "protein": 0.63, "carb": 11.57, "fat": 0.03, "fiber": 1.3, "sugar": 10.27, "calcium": 6.0, "iron": 0.27, "potassium": 128.0, "sodium": 4.0, "vitc": 3.6, "satfat": 0.004}},
  {"id": "pears", "name": "Pears", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 2.033, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.9167/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.9, "cost_per_100g": 0.497991, "bls_cost_per_100g": null, "serving_g": 140, "serving_desc": "1 cup slices", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 140, "cap_group": null, "ndb": "09252", "per100g": {"kcal": 57.0, "protein": 0.36, "carb": 15.23, "fat": 0.14, "fiber": 3.1, "sugar": 9.75, "calcium": 9.0, "iron": 0.18, "potassium": 116.0, "sodium": 1.0, "vitc": 4.3, "satfat": 0.022}},
  {"id": "pears_can", "name": "Pears (canned in juice)", "group": "Fruits", "type": "Fruit", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 2.57, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.3290/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.566578, "bls_cost_per_100g": null, "serving_g": 124, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 248, "cap_group": null, "ndb": "09254", "per100g": {"kcal": 50.0, "protein": 0.34, "carb": 12.94, "fat": 0.07, "fiber": 1.6, "sugar": 9.7, "calcium": 9.0, "iron": 0.29, "potassium": 96.0, "sodium": 4.0, "vitc": 1.6, "satfat": 0.004}},
  {"id": "pineapple", "name": "Pineapple", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 0.709, "price_note": "Estimate: USDA ERS 2023 U.S. average $0.6684/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.51, "cost_per_100g": 0.306481, "bls_cost_per_100g": null, "serving_g": 165, "serving_desc": "1 cup chunks", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 165, "cap_group": null, "ndb": "09266", "per100g": {"kcal": 50.0, "protein": 0.54, "carb": 13.12, "fat": 0.12, "fiber": 1.4, "sugar": 9.85, "calcium": 13.0, "iron": 0.29, "potassium": 109.0, "sodium": 1.0, "vitc": 47.8, "satfat": 0.009}},
  {"id": "pineapple_can", "name": "Pineapple (canned in juice)", "group": "Fruits", "type": "Fruit", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.899, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.7215/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.418651, "bls_cost_per_100g": null, "serving_g": 125, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 249, "cap_group": null, "ndb": "09268", "per100g": {"kcal": 60.0, "protein": 0.42, "carb": 15.7, "fat": 0.08, "fiber": 0.8, "sugar": 14.45, "calcium": 14.0, "iron": 0.28, "potassium": 122.0, "sodium": 1.0, "vitc": 9.5, "satfat": 0.006}},
  {"id": "plums", "name": "Plums", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 2.819, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.6582/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.94, "cost_per_100g": 0.661141, "bls_cost_per_100g": null, "serving_g": 165, "serving_desc": "1 cup sliced", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 165, "cap_group": null, "ndb": "09279", "per100g": {"kcal": 46.0, "protein": 0.7, "carb": 11.42, "fat": 0.28, "fiber": 1.4, "sugar": 9.92, "calcium": 6.0, "iron": 0.17, "potassium": 157.0, "sodium": 0.0, "vitc": 9.5, "satfat": 0.017}},
  {"id": "prunes", "name": "Prunes (pitted)", "group": "Fruits", "type": "Fruit", "product": "Dried, per lb (USDA ERS U.S. average)", "price": 7.455, "price_note": "Estimate: USDA ERS 2023 U.S. average $6.9064/lb x BLS CPI other processed fruits and vegetables including dried (CUUR0000SEFM03) Sep 2026 / 2023 avg = 1.0795; sold pitted, so USDA's 13% pit refuse is not applied", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 1.643519, "bls_cost_per_100g": null, "serving_g": 44, "serving_desc": "1/4 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 87, "cap_group": null, "ndb": "09291", "per100g": {"kcal": 240.0, "protein": 2.18, "carb": 63.88, "fat": 0.38, "fiber": 7.1, "sugar": 38.13, "calcium": 43.0, "iron": 0.93, "potassium": 732.0, "sodium": 2.0, "vitc": 0.6, "satfat": 0.088}},
  {"id": "raisins", "name": "Raisins", "group": "Fruits", "type": "Fruit", "product": "Great Value, 20 oz", "price": 4.38, "price_note": "", "price_source": "walmart", "core": true, "package_g": 567.0, "edible_yield": 1.0, "cost_per_100g": 0.772487, "bls_cost_per_100g": null, "serving_g": 41, "serving_desc": "1/4 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 82, "cap_group": null, "ndb": "09298", "per100g": {"kcal": 299.0, "protein": 3.07, "carb": 79.18, "fat": 0.46, "fiber": 3.7, "sugar": 59.19, "calcium": 50.0, "iron": 1.88, "potassium": 749.0, "sodium": 11.0, "vitc": 2.3, "satfat": 0.058}},
  {"id": "raspberries", "name": "Raspberries", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 8.45, "price_note": "Estimate: USDA ERS 2023 U.S. average $7.9668/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.96, "cost_per_100g": 1.940495, "bls_cost_per_100g": null, "serving_g": 123, "serving_desc": "1 cup", "max_servings": 1, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 123, "cap_group": null, "ndb": "09302", "per100g": {"kcal": 52.0, "protein": 1.2, "carb": 11.94, "fat": 0.65, "fiber": 6.5, "sugar": 4.42, "calcium": 25.0, "iron": 0.69, "potassium": 151.0, "sodium": 1.0, "vitc": 26.2, "satfat": 0.019}},
  {"id": "strawberries", "name": "Strawberries", "group": "Fruits", "type": "Fruit", "product": "Fresh, 1 lb", "price": 2.97, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 0.94, "cost_per_100g": 0.696555, "bls_cost_per_100g": 0.888088, "serving_g": 152, "serving_desc": "1 cup halves", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 152, "cap_group": null, "ndb": "09316", "per100g": {"kcal": 32.0, "protein": 0.67, "carb": 7.68, "fat": 0.3, "fiber": 2.0, "sugar": 4.89, "calcium": 16.0, "iron": 0.41, "potassium": 153.0, "sodium": 1.0, "vitc": 58.8, "satfat": 0.015}},
  {"id": "strawberries_frozen", "name": "Strawberries (frozen)", "group": "Fruits", "type": "Fruit", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 3.536, "price_note": "Estimate: USDA ERS 2023 U.S. average $3.4675/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.779541, "bls_cost_per_100g": null, "serving_g": 149, "serving_desc": "1 cup", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 149, "cap_group": null, "ndb": "09318", "per100g": {"kcal": 35.0, "protein": 0.43, "carb": 9.13, "fat": 0.11, "fiber": 2.1, "sugar": 4.56, "calcium": 16.0, "iron": 0.75, "potassium": 148.0, "sodium": 2.0, "vitc": 41.2, "satfat": 0.006}},
  {"id": "watermelon", "name": "Watermelon", "group": "Fruits", "type": "Fruit", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 0.43, "price_note": "Estimate: USDA ERS 2023 U.S. average $0.4058/lb x BLS CPI fresh fruits (CUUR0000SEFK) Sep 2026 / 2023 avg = 1.0606", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.52, "cost_per_100g": 0.182302, "bls_cost_per_100g": null, "serving_g": 152, "serving_desc": "1 cup diced", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 152, "cap_group": null, "ndb": "09326", "per100g": {"kcal": 30.0, "protein": 0.61, "carb": 7.55, "fat": 0.15, "fiber": 0.4, "sugar": 6.2, "calcium": 7.0, "iron": 0.24, "potassium": 112.0, "sodium": 1.0, "vitc": 8.1, "satfat": 0.016}},
  {"id": "acorn_squash", "name": "Acorn squash", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.316, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2414/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603; USDA lists no sugars value; counted as 0", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.76, "cost_per_100g": 0.381741, "bls_cost_per_100g": null, "serving_g": 140, "serving_desc": "1 cup cubes", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 140, "cap_group": null, "ndb": "11482", "per100g": {"kcal": 40.0, "protein": 0.8, "carb": 10.42, "fat": 0.1, "fiber": 1.5, "sugar": 0.0, "calcium": 33.0, "iron": 0.7, "potassium": 347.0, "sodium": 3.0, "vitc": 11.0, "satfat": 0.021}},
  {"id": "asparagus", "name": "Asparagus", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 3.406, "price_note": "Estimate: USDA ERS 2023 U.S. average $3.2125/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.53, "cost_per_100g": 1.416758, "bls_cost_per_100g": null, "serving_g": 134, "serving_desc": "1 cup", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 134, "cap_group": null, "ndb": "11011", "per100g": {"kcal": 20.0, "protein": 2.2, "carb": 3.88, "fat": 0.12, "fiber": 2.1, "sugar": 1.88, "calcium": 24.0, "iron": 2.14, "potassium": 202.0, "sodium": 2.0, "vitc": 5.6, "satfat": 0.04}},
  {"id": "baby_carrots", "name": "Baby carrots", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.551, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.4630/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603; cup-equivalent 125 g from USDA ERS", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.341931, "bls_cost_per_100g": null, "serving_g": 125, "serving_desc": "1 cup (about 12)", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 125, "cap_group": null, "ndb": "11960", "per100g": {"kcal": 35.0, "protein": 0.64, "carb": 8.24, "fat": 0.13, "fiber": 2.9, "sugar": 4.76, "calcium": 32.0, "iron": 0.89, "potassium": 237.0, "sodium": 78.0, "vitc": 2.6, "satfat": 0.023}},
  {"id": "beets_can", "name": "Beets (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.388, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2579/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.305996, "bls_cost_per_100g": null, "serving_g": 246, "serving_desc": "1 cup", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 246, "cap_group": null, "ndb": "11082", "per100g": {"kcal": 30.0, "protein": 0.73, "carb": 7.14, "fat": 0.09, "fiber": 1.2, "sugar": 6.53, "calcium": 18.0, "iron": 0.73, "potassium": 159.0, "sodium": 143.0, "vitc": 2.8, "satfat": 0.011}},
  {"id": "broccoli", "name": "Broccoli (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Great Value florets, 12 oz", "price": 1.16, "price_note": "", "price_source": "walmart", "core": true, "package_g": 340.2, "edible_yield": 1.0, "cost_per_100g": 0.340976, "bls_cost_per_100g": null, "serving_g": 95, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 91, "cap_group": null, "ndb": "11094", "per100g": {"kcal": 29.0, "protein": 3.06, "carb": 5.35, "fat": 0.34, "fiber": 3.0, "sugar": 1.47, "calcium": 41.0, "iron": 0.72, "potassium": 250.0, "sodium": 17.0, "vitc": 68.3, "satfat": 0.052}},
  {"id": "brussels_frozen", "name": "Brussels sprouts (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.942, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.8850/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199; cup-equivalent from USDA ERS (cooked cup / cooking yield); USDA lists no sugars value", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.648589, "bls_cost_per_100g": null, "serving_g": 162, "serving_desc": "about 1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 162, "cap_group": null, "ndb": "11100", "per100g": {"kcal": 41.0, "protein": 3.78, "carb": 7.86, "fat": 0.41, "fiber": 3.8, "sugar": 0.0, "calcium": 26.0, "iron": 0.93, "potassium": 370.0, "sodium": 10.0, "vitc": 74.1, "satfat": 0.084}},
  {"id": "butternut", "name": "Butternut squash", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.348, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2710/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.84, "cost_per_100g": 0.353783, "bls_cost_per_100g": null, "serving_g": 140, "serving_desc": "1 cup cubes", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 140, "cap_group": null, "ndb": "11485", "per100g": {"kcal": 45.0, "protein": 1.0, "carb": 11.69, "fat": 0.1, "fiber": 2.0, "sugar": 2.2, "calcium": 48.0, "iron": 0.7, "potassium": 352.0, "sodium": 4.0, "vitc": 21.0, "satfat": 0.021}},
  {"id": "cabbage", "name": "Cabbage (green)", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 0.876, "price_note": "Estimate: USDA ERS 2023 U.S. average $0.8266/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.8, "cost_per_100g": 0.241402, "bls_cost_per_100g": null, "serving_g": 89, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 89, "cap_group": null, "ndb": "11109", "per100g": {"kcal": 25.0, "protein": 1.28, "carb": 5.8, "fat": 0.1, "fiber": 2.5, "sugar": 3.2, "calcium": 40.0, "iron": 0.47, "potassium": 170.0, "sodium": 18.0, "vitc": 36.6, "satfat": 0.034}},
  {"id": "red_cabbage", "name": "Cabbage (red)", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.337, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2607/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.8, "cost_per_100g": 0.368441, "bls_cost_per_100g": null, "serving_g": 89, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 89, "cap_group": null, "ndb": "11112", "per100g": {"kcal": 31.0, "protein": 1.43, "carb": 7.37, "fat": 0.16, "fiber": 2.1, "sugar": 3.83, "calcium": 45.0, "iron": 0.8, "potassium": 243.0, "sodium": 27.0, "vitc": 57.0, "satfat": 0.021}},
  {"id": "carrots", "name": "Carrots", "group": "Vegetables", "type": "Vegetables", "product": "Fresh whole, 2 lb bag", "price": 2.26, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 0.89, "cost_per_100g": 0.279908, "bls_cost_per_100g": null, "serving_g": 128, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 128, "cap_group": null, "ndb": "11124", "per100g": {"kcal": 41.0, "protein": 0.93, "carb": 9.58, "fat": 0.24, "fiber": 2.8, "sugar": 4.74, "calcium": 33.0, "iron": 0.3, "potassium": 320.0, "sodium": 69.0, "vitc": 5.9, "satfat": 0.037}},
  {"id": "carrots_can", "name": "Carrots (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.457, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.3206/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.321208, "bls_cost_per_100g": null, "serving_g": 246, "serving_desc": "1 cup slices with liquid", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 246, "cap_group": null, "ndb": "11126", "per100g": {"kcal": 23.0, "protein": 0.58, "carb": 5.37, "fat": 0.14, "fiber": 1.8, "sugar": 2.46, "calcium": 31.0, "iron": 0.52, "potassium": 173.0, "sodium": 240.0, "vitc": 2.0, "satfat": 0.025}},
  {"id": "carrots_frozen", "name": "Carrots (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.078, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.0378/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.458113, "bls_cost_per_100g": null, "serving_g": 128, "serving_desc": "1 cup slices", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 128, "cap_group": null, "ndb": "11130", "per100g": {"kcal": 36.0, "protein": 0.78, "carb": 7.9, "fat": 0.46, "fiber": 3.3, "sugar": 4.76, "calcium": 36.0, "iron": 0.44, "potassium": 235.0, "sodium": 68.0, "vitc": 2.5, "satfat": 0.047}},
  {"id": "cauliflower_frozen", "name": "Cauliflower (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.773, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.7191/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.611332, "bls_cost_per_100g": null, "serving_g": 132, "serving_desc": "1 cup pieces", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 132, "cap_group": null, "ndb": "11137", "per100g": {"kcal": 24.0, "protein": 2.01, "carb": 4.68, "fat": 0.27, "fiber": 2.3, "sugar": 2.22, "calcium": 22.0, "iron": 0.54, "potassium": 193.0, "sodium": 24.0, "vitc": 48.8, "satfat": 0.041}},
  {"id": "celery", "name": "Celery", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.408, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.3278/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.89, "cost_per_100g": 0.34877, "bls_cost_per_100g": null, "serving_g": 101, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 101, "cap_group": null, "ndb": "11143", "per100g": {"kcal": 16.0, "protein": 0.69, "carb": 2.97, "fat": 0.17, "fiber": 1.6, "sugar": 1.34, "calcium": 40.0, "iron": 0.2, "potassium": 260.0, "sodium": 80.0, "vitc": 3.1, "satfat": 0.042}},
  {"id": "collards", "name": "Collard greens", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 2.633, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.4833/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.57, "cost_per_100g": 1.018364, "bls_cost_per_100g": null, "serving_g": 72, "serving_desc": "2 cups chopped, raw", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 72, "cap_group": null, "ndb": "11161", "per100g": {"kcal": 32.0, "protein": 3.02, "carb": 5.42, "fat": 0.61, "fiber": 4.0, "sugar": 0.46, "calcium": 232.0, "iron": 0.47, "potassium": 213.0, "sodium": 17.0, "vitc": 35.3, "satfat": 0.055}},
  {"id": "collards_frozen", "name": "Collard greens (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.778, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.7240/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199; cup-equivalent from USDA ERS (cooked cup / cooking yield); USDA lists no sugars value", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.612434, "bls_cost_per_100g": null, "serving_g": 187, "serving_desc": "about 1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 187, "cap_group": null, "ndb": "11163", "per100g": {"kcal": 33.0, "protein": 2.69, "carb": 6.46, "fat": 0.37, "fiber": 3.6, "sugar": 0.0, "calcium": 201.0, "iron": 1.07, "potassium": 253.0, "sodium": 48.0, "vitc": 40.0, "satfat": 0.048}},
  {"id": "cucumber", "name": "Cucumber", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.159, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.0928/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.97, "cost_per_100g": 0.263414, "bls_cost_per_100g": null, "serving_g": 104, "serving_desc": "1 cup slices", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 104, "cap_group": null, "ndb": "11205", "per100g": {"kcal": 15.0, "protein": 0.65, "carb": 3.63, "fat": 0.11, "fiber": 0.5, "sugar": 1.67, "calcium": 16.0, "iron": 0.28, "potassium": 147.0, "sodium": 2.0, "vitc": 2.8, "satfat": 0.037}},
  {"id": "green_beans", "name": "Green beans (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Great Value cut, 14.5 oz", "price": 0.84, "price_note": "Regular price; was on Rollback at $0.50", "price_source": "walmart", "core": true, "package_g": 411.1, "edible_yield": 1.0, "cost_per_100g": 0.20433, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 235, "cap_group": null, "ndb": "11054", "per100g": {"kcal": 15.0, "protein": 0.72, "carb": 3.27, "fat": 0.17, "fiber": 1.5, "sugar": 1.25, "calcium": 29.0, "iron": 1.02, "potassium": 92.0, "sodium": 192.0, "vitc": 2.2, "satfat": 0.04}},
  {"id": "green_beans_frozen", "name": "Green beans (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.217, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.1733/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.488757, "bls_cost_per_100g": null, "serving_g": 121, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 121, "cap_group": null, "ndb": "11060", "per100g": {"kcal": 39.0, "protein": 1.79, "carb": 7.54, "fat": 0.21, "fiber": 2.6, "sugar": 2.21, "calcium": 42.0, "iron": 0.85, "potassium": 186.0, "sodium": 3.0, "vitc": 12.9, "satfat": 0.047}},
  {"id": "bell_pepper", "name": "Green bell pepper", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, each (~145 g)", "price": 0.86, "price_note": "Each ~145 g as bought (119 g edible, USDA)", "price_source": "walmart", "core": true, "package_g": 145, "edible_yield": 0.82, "cost_per_100g": 0.723297, "bls_cost_per_100g": null, "serving_g": 149, "serving_desc": "1 cup chopped", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 149, "cap_group": null, "ndb": "11333", "per100g": {"kcal": 20.0, "protein": 0.86, "carb": 4.64, "fat": 0.17, "fiber": 1.7, "sugar": 2.4, "calcium": 10.0, "iron": 0.34, "potassium": 175.0, "sodium": 3.0, "vitc": 80.4, "satfat": 0.058}},
  {"id": "iceberg", "name": "Iceberg lettuce", "group": "Vegetables", "type": "Vegetables", "product": "Lettuce, iceberg, per lb (BLS U.S. average)", "price": 1.636, "price_note": "BLS APU0000712211 \"Lettuce, iceberg, per lb\", U.S. city average, Sep 2026", "price_source": "bls", "core": false, "package_g": 453.6, "edible_yield": 0.95, "cost_per_100g": 0.379653, "bls_cost_per_100g": 0.37966, "serving_g": 144, "serving_desc": "2 cups shredded", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 144, "cap_group": null, "ndb": "11252", "per100g": {"kcal": 14.0, "protein": 0.9, "carb": 2.97, "fat": 0.14, "fiber": 1.2, "sugar": 1.97, "calcium": 18.0, "iron": 0.41, "potassium": 141.0, "sodium": 10.0, "vitc": 2.8, "satfat": 0.018}},
  {"id": "kale_frozen", "name": "Kale (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.326, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.2805/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199; cup-equivalent from USDA ERS (cooked cup / cooking yield); USDA lists no sugars value", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.512787, "bls_cost_per_100g": null, "serving_g": 183, "serving_desc": "about 1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 183, "cap_group": null, "ndb": "11235", "per100g": {"kcal": 28.0, "protein": 2.66, "carb": 4.9, "fat": 0.46, "fiber": 2.0, "sugar": 0.0, "calcium": 136.0, "iron": 0.93, "potassium": 333.0, "sodium": 15.0, "vitc": 39.3, "satfat": 0.059}},
  {"id": "mixed_veg", "name": "Mixed vegetables (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Great Value, 32 oz", "price": 2.58, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.284392, "bls_cost_per_100g": null, "serving_g": 95, "serving_desc": "2/3 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 136, "cap_group": null, "ndb": "11583", "per100g": {"kcal": 72.0, "protein": 3.33, "carb": 13.47, "fat": 0.52, "fiber": 4.0, "sugar": 0.0, "calcium": 25.0, "iron": 0.95, "potassium": 212.0, "sodium": 47.0, "vitc": 10.4, "satfat": 0.098}},
  {"id": "mushrooms", "name": "Mushrooms (white)", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 4.405, "price_note": "Estimate: USDA ERS 2023 U.S. average $4.1545/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.97, "cost_per_100g": 1.001155, "bls_cost_per_100g": null, "serving_g": 70, "serving_desc": "1 cup pieces", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 70, "cap_group": null, "ndb": "11260", "per100g": {"kcal": 22.0, "protein": 3.09, "carb": 3.26, "fat": 0.34, "fiber": 1.0, "sugar": 1.98, "calcium": 3.0, "iron": 0.5, "potassium": 318.0, "sodium": 5.0, "vitc": 2.1, "satfat": 0.05}},
  {"id": "mustard_greens_frozen", "name": "Mustard greens (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.978, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.9202/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199; USDA lists no sugars value", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.656526, "bls_cost_per_100g": null, "serving_g": 146, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 146, "cap_group": null, "ndb": "11272", "per100g": {"kcal": 20.0, "protein": 2.49, "carb": 3.41, "fat": 0.27, "fiber": 3.3, "sugar": 0.0, "calcium": 116.0, "iron": 1.29, "potassium": 170.0, "sodium": 29.0, "vitc": 25.3, "satfat": 0.014}},
  {"id": "okra_frozen", "name": "Okra (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.706, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.6529/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199; cup-equivalent from USDA ERS (cooked cup / cooking yield)", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.596561, "bls_cost_per_100g": null, "serving_g": 189, "serving_desc": "about 1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 189, "cap_group": null, "ndb": "11280", "per100g": {"kcal": 30.0, "protein": 1.69, "carb": 6.63, "fat": 0.25, "fiber": 2.2, "sugar": 2.97, "calcium": 81.0, "iron": 0.57, "potassium": 211.0, "sodium": 3.0, "vitc": 12.4, "satfat": 0.065}},
  {"id": "onions", "name": "Onions (yellow)", "group": "Vegetables", "type": "Vegetables", "product": "Fresh yellow, 3 lb bag", "price": 2.96, "price_note": "Price undated (Walmart.com listing)", "price_source": "walmart", "core": true, "package_g": 1360.8, "edible_yield": 0.9, "cost_per_100g": 0.241688, "bls_cost_per_100g": null, "serving_g": 80, "serving_desc": "1/2 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 160, "cap_group": null, "ndb": "11282", "per100g": {"kcal": 40.0, "protein": 1.1, "carb": 9.34, "fat": 0.1, "fiber": 1.7, "sugar": 4.24, "calcium": 23.0, "iron": 0.21, "potassium": 146.0, "sodium": 4.0, "vitc": 7.4, "satfat": 0.042}},
  {"id": "pumpkin_can", "name": "Pumpkin (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 2.296, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.0809/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.506173, "bls_cost_per_100g": null, "serving_g": 245, "serving_desc": "1 cup", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 245, "cap_group": null, "ndb": "11424", "per100g": {"kcal": 34.0, "protein": 1.1, "carb": 8.09, "fat": 0.28, "fiber": 2.9, "sugar": 3.3, "calcium": 26.0, "iron": 1.39, "potassium": 206.0, "sodium": 5.0, "vitc": 4.2, "satfat": 0.146}},
  {"id": "radishes", "name": "Radishes", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.963, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.8510/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.9, "cost_per_100g": 0.480845, "bls_cost_per_100g": null, "serving_g": 116, "serving_desc": "1 cup slices", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 116, "cap_group": null, "ndb": "11429", "per100g": {"kcal": 16.0, "protein": 0.68, "carb": 3.4, "fat": 0.1, "fiber": 1.6, "sugar": 1.86, "calcium": 25.0, "iron": 0.34, "potassium": 233.0, "sodium": 39.0, "vitc": 14.8, "satfat": 0.032}},
  {"id": "red_pepper", "name": "Red bell pepper", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.808, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.7052/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.82, "cost_per_100g": 0.486084, "bls_cost_per_100g": null, "serving_g": 149, "serving_desc": "1 cup chopped", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 149, "cap_group": null, "ndb": "11821", "per100g": {"kcal": 31.0, "protein": 0.99, "carb": 6.03, "fat": 0.3, "fiber": 2.1, "sugar": 4.2, "calcium": 7.0, "iron": 0.43, "potassium": 211.0, "sodium": 4.0, "vitc": 127.7, "satfat": 0.027}},
  {"id": "romaine", "name": "Romaine lettuce", "group": "Vegetables", "type": "Vegetables", "product": "Romaine, per lb (BLS U.S. average)", "price": 3.312, "price_note": "BLS Sep 2026 price (Walmart sells by count)", "price_source": "bls", "core": true, "package_g": 453.6, "edible_yield": 0.94, "cost_per_100g": 0.776765, "bls_cost_per_100g": 0.776778, "serving_g": 94, "serving_desc": "2 cups shredded", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 94, "cap_group": null, "ndb": "11251", "per100g": {"kcal": 17.0, "protein": 1.23, "carb": 3.29, "fat": 0.3, "fiber": 2.1, "sugar": 1.19, "calcium": 33.0, "iron": 0.97, "potassium": 247.0, "sodium": 8.0, "vitc": 4.0, "satfat": 0.039}},
  {"id": "sauerkraut", "name": "Sauerkraut (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.799, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.6301/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.396605, "bls_cost_per_100g": null, "serving_g": 236, "serving_desc": "1 cup with liquid", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 236, "cap_group": null, "ndb": "11439", "per100g": {"kcal": 19.0, "protein": 0.91, "carb": 4.28, "fat": 0.14, "fiber": 2.9, "sugar": 1.78, "calcium": 30.0, "iron": 1.47, "potassium": 170.0, "sodium": 661.0, "vitc": 14.7, "satfat": 0.034}},
  {"id": "spinach_can", "name": "Spinach (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.844, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.6709/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.406526, "bls_cost_per_100g": null, "serving_g": 234, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 234, "cap_group": null, "ndb": "11459", "per100g": {"kcal": 19.0, "protein": 2.11, "carb": 2.92, "fat": 0.37, "fiber": 1.6, "sugar": 0.33, "calcium": 83.0, "iron": 1.58, "potassium": 230.0, "sodium": 319.0, "vitc": 13.5, "satfat": 0.06}},
  {"id": "spinach", "name": "Spinach (fresh)", "group": "Vegetables", "type": "Vegetables", "product": "Marketside, 10 oz bag", "price": 1.97, "price_note": "Bagged and washed: no refuse", "price_source": "walmart", "core": true, "package_g": 283.5, "edible_yield": 1.0, "cost_per_100g": 0.694885, "bls_cost_per_100g": null, "serving_g": 60, "serving_desc": "2 cups raw", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 60, "cap_group": null, "ndb": "11457", "per100g": {"kcal": 23.0, "protein": 2.86, "carb": 3.63, "fat": 0.39, "fiber": 2.2, "sugar": 0.42, "calcium": 99.0, "iron": 2.71, "potassium": 558.0, "sodium": 79.0, "vitc": 28.1, "satfat": 0.063}},
  {"id": "spinach_frozen", "name": "Spinach (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.518, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.4690/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.555115, "bls_cost_per_100g": null, "serving_g": 156, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 156, "cap_group": null, "ndb": "11463", "per100g": {"kcal": 29.0, "protein": 3.63, "carb": 4.21, "fat": 0.57, "fiber": 2.9, "sugar": 0.65, "calcium": 129.0, "iron": 1.89, "potassium": 346.0, "sodium": 74.0, "vitc": 5.5, "satfat": 0.041}},
  {"id": "tomatoes_can", "name": "Tomatoes (canned)", "group": "Vegetables", "type": "Vegetables", "product": "Canned (can contents), per lb (USDA ERS U.S. average)", "price": 1.333, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.2082/lb x BLS CPI canned fruits and vegetables (CUUR0000SEFM01) Sep 2026 / 2023 avg = 1.1034", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.293871, "bls_cost_per_100g": null, "serving_g": 240, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 240, "cap_group": null, "ndb": "11531", "per100g": {"kcal": 16.0, "protein": 0.79, "carb": 3.47, "fat": 0.25, "fiber": 1.9, "sugar": 2.55, "calcium": 33.0, "iron": 0.57, "potassium": 191.0, "sodium": 115.0, "vitc": 12.6, "satfat": 0.034}},
  {"id": "tomatoes", "name": "Tomatoes (roma)", "group": "Vegetables", "type": "Vegetables", "product": "Fresh roma, per lb", "price": 0.85, "price_note": "", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 0.91, "cost_per_100g": 0.205923, "bls_cost_per_100g": 0.482595, "serving_g": 180, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 180, "cap_group": null, "ndb": "11529", "per100g": {"kcal": 18.0, "protein": 0.88, "carb": 3.89, "fat": 0.2, "fiber": 1.2, "sugar": 2.63, "calcium": 10.0, "iron": 0.27, "potassium": 237.0, "sodium": 5.0, "vitc": 13.7, "satfat": 0.028}},
  {"id": "turnip_greens_frozen", "name": "Turnip greens (frozen)", "group": "Vegetables", "type": "Vegetables", "product": "Frozen, per lb (USDA ERS U.S. average)", "price": 2.978, "price_note": "Estimate: USDA ERS 2023 U.S. average $2.9198/lb x BLS CPI frozen fruits and vegetables (CUUR0000SEFM02) Sep 2026 / 2023 avg = 1.0199; USDA lists no sugars value", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 0.656526, "bls_cost_per_100g": null, "serving_g": 164, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 164, "cap_group": null, "ndb": "11574", "per100g": {"kcal": 22.0, "protein": 2.47, "carb": 3.67, "fat": 0.31, "fiber": 2.5, "sugar": 0.0, "calcium": 118.0, "iron": 1.51, "potassium": 184.0, "sodium": 12.0, "vitc": 26.8, "satfat": 0.073}},
  {"id": "zucchini", "name": "Zucchini", "group": "Vegetables", "type": "Vegetables", "product": "Fresh, per lb (USDA ERS U.S. average)", "price": 1.738, "price_note": "Estimate: USDA ERS 2023 U.S. average $1.6391/lb x BLS CPI fresh vegetables (CUUR0000SEFL) Sep 2026 / 2023 avg = 1.0603", "price_source": "ers", "core": false, "package_g": 453.6, "edible_yield": 0.95, "cost_per_100g": 0.403323, "bls_cost_per_100g": null, "serving_g": 124, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 124, "cap_group": null, "ndb": "11477", "per100g": {"kcal": 17.0, "protein": 1.21, "carb": 3.11, "fat": 0.32, "fiber": 1.0, "sugar": 2.5, "calcium": 16.0, "iron": 0.37, "potassium": 261.0, "sodium": 8.0, "vitc": 17.9, "satfat": 0.084}},
  {"id": "butter", "name": "Butter (salted)", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "product": "Great Value, 2 x 16 oz", "price": 5.96, "price_note": "", "price_source": "walmart", "core": true, "package_g": 907.2, "edible_yield": 1.0, "cost_per_100g": 0.656966, "bls_cost_per_100g": null, "serving_g": 14.2, "serving_desc": "1 tbsp", "max_servings": 2, "meal": [0.5, 0, 0.5, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "added_fats", "ndb": "01001", "per100g": {"kcal": 717.0, "protein": 0.85, "carb": 0.06, "fat": 81.11, "fiber": 0.0, "sugar": 0.06, "calcium": 24.0, "iron": 0.02, "potassium": 24.0, "sodium": 643.0, "vitc": 0.0, "satfat": 51.368}},
  {"id": "canola_oil", "name": "Canola oil", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "product": "Great Value, 48 fl oz", "price": 4.08, "price_note": "48 fl oz = 6 cups x 218 g", "price_source": "walmart", "core": true, "package_g": 1308, "edible_yield": 1.0, "cost_per_100g": 0.311927, "bls_cost_per_100g": null, "serving_g": 14, "serving_desc": "1 tbsp", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "added_fats", "ndb": "04582", "per100g": {"kcal": 884.0, "protein": 0.0, "carb": 0.0, "fat": 100.0, "fiber": 0.0, "sugar": 0.0, "calcium": 0.0, "iron": 0.0, "potassium": 0.0, "sodium": 0.0, "vitc": 0.0, "satfat": 7.365}},
  {"id": "olive_oil", "name": "Olive oil (extra virgin)", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "product": "Great Value, 51 fl oz", "price": 17.87, "price_note": "51 fl oz = 6.375 cups x 216 g", "price_source": "walmart", "core": true, "package_g": 1377.0, "edible_yield": 1.0, "cost_per_100g": 1.297749, "bls_cost_per_100g": null, "serving_g": 13.5, "serving_desc": "1 tbsp", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "added_fats", "ndb": "04053", "per100g": {"kcal": 884.0, "protein": 0.0, "carb": 0.0, "fat": 100.0, "fiber": 0.0, "sugar": 0.0, "calcium": 1.0, "iron": 0.56, "potassium": 1.0, "sodium": 2.0, "vitc": 0.0, "satfat": 13.808}},
  {"id": "almonds", "name": "Almonds", "group": "Fats, Oils & Nuts", "type": "Nuts & Seeds", "product": "Great Value whole, 16 oz", "price": 9.48, "price_note": "Price undated (Walmart.com listing)", "price_source": "walmart", "core": true, "package_g": 453.6, "edible_yield": 1.0, "cost_per_100g": 2.089947, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 oz (~23 almonds)", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["treenut"], "cup_eq_g": null, "cap_group": null, "ndb": "12061", "per100g": {"kcal": 579.0, "protein": 21.15, "carb": 21.55, "fat": 49.93, "fiber": 12.5, "sugar": 4.35, "calcium": 269.0, "iron": 3.71, "potassium": 733.0, "sodium": 1.0, "vitc": 0.0, "satfat": 3.802}},
  {"id": "avocado", "name": "Avocado (Hass)", "group": "Fats, Oils & Nuts", "type": "Nuts & Seeds", "product": "Fresh, each (~203 g)", "price": 0.87, "price_note": "Each ~203 g as bought (136 g edible, USDA)", "price_source": "walmart", "core": true, "package_g": 203, "edible_yield": 0.67, "cost_per_100g": 0.639659, "bls_cost_per_100g": null, "serving_g": 68, "serving_desc": "1/2 avocado", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "ndb": "09038", "per100g": {"kcal": 167.0, "protein": 1.96, "carb": 8.64, "fat": 15.41, "fiber": 6.8, "sugar": 0.3, "calcium": 13.0, "iron": 0.61, "potassium": 507.0, "sodium": 8.0, "vitc": 8.8, "satfat": 2.126}},
  {"id": "cookies", "name": "Chocolate chip cookies", "group": "Snacks & Sweets", "type": "Snacks", "product": "Great Value chewy, 13 oz", "price": 3.02, "price_note": "Older listing (Jul 2025) \u2014 verify", "price_source": "walmart", "core": true, "package_g": 368.5, "edible_yield": 1.0, "cost_per_100g": 0.819539, "bls_cost_per_100g": 1.135823, "serving_g": 26, "serving_desc": "2 cookies", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": ["gluten", "dairy", "egg"], "cup_eq_g": null, "cap_group": "snacks", "ndb": "18159", "per100g": {"kcal": 492.0, "protein": 5.1, "carb": 65.36, "fat": 24.72, "fiber": 2.0, "sugar": 32.9, "calcium": 21.0, "iron": 5.58, "potassium": 171.0, "sodium": 311.0, "vitc": 0.0, "satfat": 8.091}},
  {"id": "granola_bar", "name": "Granola bars (chocolate chip)", "group": "Snacks & Sweets", "type": "Snacks", "product": "Great Value chewy, 10 ct", "price": 2.28, "price_note": "Price undated (Walmart Business listing)", "price_source": "walmart", "core": true, "package_g": 238.1, "edible_yield": 1.0, "cost_per_100g": 0.957581, "bls_cost_per_100g": null, "serving_g": 24, "serving_desc": "1 bar", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["gluten", "dairy"], "cup_eq_g": null, "cap_group": "snacks", "ndb": "19404", "per100g": {"kcal": 418.0, "protein": 5.65, "carb": 70.2, "fat": 16.57, "fiber": 3.8, "sugar": 28.92, "calcium": 41.0, "iron": 2.19, "potassium": 237.0, "sodium": 251.0, "vitc": 0.0, "satfat": 6.061}},
  {"id": "chips", "name": "Potato chips", "group": "Snacks & Sweets", "type": "Snacks", "product": "Great Value original, 8 oz", "price": 1.87, "price_note": "From 10-pack price $18.70", "price_source": "walmart", "core": true, "package_g": 226.8, "edible_yield": 1.0, "cost_per_100g": 0.824515, "bls_cost_per_100g": 1.470044, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": null, "cap_group": "snacks", "ndb": "19411", "per100g": {"kcal": 532.0, "protein": 6.39, "carb": 53.83, "fat": 33.98, "fiber": 3.1, "sugar": 0.33, "calcium": 21.0, "iron": 1.28, "potassium": 1196.0, "sodium": 527.0, "vitc": 21.6, "satfat": 3.4}},
  {"id": "ice_cream", "name": "Vanilla ice cream", "group": "Snacks & Sweets", "type": "Snacks", "product": "Great Value, 48 fl oz", "price": 3.12, "price_note": "48 fl oz = 6 cups x 132 g", "price_source": "walmart", "core": true, "package_g": 792, "edible_yield": 1.0, "cost_per_100g": 0.393939, "bls_cost_per_100g": 0.561648, "serving_g": 66, "serving_desc": "1/2 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "snacks", "ndb": "19095", "per100g": {"kcal": 207.0, "protein": 3.5, "carb": 23.6, "fat": 11.0, "fiber": 0.7, "sugar": 21.22, "calcium": 128.0, "iron": 0.09, "potassium": 199.0, "sodium": 80.0, "vitc": 0.6, "satfat": 6.79}}
];


const BIG = 1e9;
const EPS = 1e-9;

export function getDiet(name) {
  const d = DIETS.find((x) => x.name.toLowerCase() === String(name || "Balanced").toLowerCase());
  if (!d) throw new Error(`Unknown diet "${name}". Options: ${DIETS.map((x) => x.name).join(", ")}`);
  return d;
}

/** $ per 100 g of edible food. priceSource 'bls' uses the BLS U.S. average where one exists. */
export function costPer100g(food, { prices = {}, priceSource = "walmart" } = {}) {
  if (prices[food.id] != null) return (prices[food.id] / (food.package_g * food.edible_yield)) * 100;
  if (priceSource === "bls" && food.bls_cost_per_100g != null) return food.bls_cost_per_100g;
  return food.cost_per_100g;
}

/** prefs.exclude: food ids; prefs.avoid: allergy/attribute flags; prefs.foodSet: 'all' (default) | 'core' (the 71 class foods). */
export function isAllowed(food, diet, exclude = [], prefs = {}) {
  if (exclude.includes(food.id)) return false;
  if (prefs.foodSet === "core" && !food.core) return false;
  const avoid = prefs.avoid || [];
  return !food.flags.some((f) => diet.forbid.includes(f) || avoid.includes(f));
}

/**
 * Build the LP.
 * targets: { calories, fiber, calcium, iron, potassium, vitc (daily minimums), sodium (daily maximum),
 *            sugarMax (optional), proteinMin (optional floor in g, e.g. 0.8 g/kg from the calculator) }
 * prefs:   { diet: 'Balanced'|'High-Protein'|'Low-Carb'|'Vegetarian'|'Vegan'|'Pescatarian'|'Gluten-Free'|'No Pork',
 *            exclude: [foodId], mustInclude: {foodId: servings}, maxServings: {foodId: servings},
 *            prices: {foodId: package price}, priceSource: 'walmart'|'bls', settings: {...overrides} }
 */
export function buildModel(targets, prefs = {}) {
  const diet = getDiet(prefs.diet);
  const S = { ...SETTINGS, ...(prefs.settings || {}) };
  S.meal_kcal = { ...SETTINGS.meal_kcal, ...((prefs.settings || {}).meal_kcal || {}) };
  const kcal = Number(targets.calories);
  if (!(kcal > 0)) throw new Error("targets.calories is required");

  const foods = FOODS.filter((f) => isAllowed(f, diet, prefs.exclude || [], prefs))
    .map((f) => ({ ...f, cost100: costPer100g(f, prefs) }));
  const weights = prefs.weights || {};            // diagonal of the preference matrix D (default 1)
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
    sodium: [null, Math.min(targets.sodium ?? Infinity, diet.sodium_max ?? Infinity)], satfat: [null, null], sugar: [null, targets.sugarMax ?? null],
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
  if (diet.satfat_max != null)                     // saturated fat as a share of the plan's calories (DASH: <= 6%)
    add(A[keys.indexOf("satfat")].map((v, j) => 9 * v - diet.satfat_max * e[j]), "<=", 0,
      `satfat% <= ${Math.round(diet.satfat_max * 100)}% of kcal`, "macro");
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
  GROUP_CAPS.forEach((g) => {
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
  const c = foods.map((f) => f.cost100);
  const cObj = foods.map((f, j) => c[j] * (weights[f.id] ?? 1));     // D c
  return { diet, settings: S, foods, keys, A, c, cObj, u, rows, senses, rhs, labels, kinds };
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

/** Main entry point: person's targets + preferences -> cheapest balanced daily plan, split by meal.
 *  prefs.weights {foodId: w} scales food j's cost in the OBJECTIVE only (minimize (Dc)^T x); costPerDay is the true c^T x. */
export function optimizeDiet(targets, prefs = {}) {
  const model = buildModel(targets, prefs);
  if (!model.foods.length) return { status: "infeasible", reasons: ["No foods are left after applying the diet and exclusions."] };
  const sol = simplex(model.cObj, model.rows, model.senses, model.rhs);
  if (sol.status !== "optimal")
    return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], diet: model.diet.name };
  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const cost = model.c.reduce((s, cj, j) => s + cj * x[j], 0);           // true cost c^T x
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
  return { status: "optimal", diet: model.diet.name, costPerDay: cost, costPerWeek: cost * 7, objective: sol.objective,
    plan, meals, totals, pivots: sol.pivots,
    model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, cObj: model.cObj, x, constraints: model.labels.length,
             labels: model.labels } };
}

/** How preferences and variety enter the objective (diagonal of D). Team design choices, not nutrition rules. */
export const OPTION_RULES = {
  like: 0.6,          // a liked food is treated as 40% cheaper when choosing (its real price is still what you pay)
  dislike: 1.75,      // a food you'd rather avoid is treated as 75% more expensive (it can still appear if it is needed)
  repeat: 1.5,        // variety menus: each earlier option that used a food (>= 15 g) multiplies its cost by 1.5
  minGrams: 15,
};

/**
 * Several plans for the same person and diet, each the solution of one LP with a different objective D c:
 *   1. "Lowest cost": D = I (the true minimum).
 *   2. "Your picks" (only when the person liked or disliked foods): D from their likes/dislikes.
 *   3+. "Something different" / "Mix it up": D also penalizes foods that earlier options already used.
 * Every option meets every rule; only the objective changes.
 */
export function planOptions(targets, prefs = {}, { count = 3 } = {}) {
  const pref = {};
  for (const id of prefs.likes || []) pref[id] = OPTION_RULES.like;
  for (const id of prefs.dislikes || []) pref[id] = OPTION_RULES.dislike;
  const hasPrefs = Object.keys(pref).length > 0;
  const base = { ...prefs, weights: {} };
  const cheapest = optimizeDiet(targets, base);
  if (cheapest.status !== "optimal") return { status: cheapest.status, reasons: cheapest.reasons, diet: cheapest.diet, options: [] };
  const options = [{ key: "cheapest", title: "Lowest cost", blurb: "The cheapest day that meets every target.", weights: {}, result: cheapest }];
  if (hasPrefs) {
    // Liked foods: at least one serving each (a lower bound l_j on x_j) when the rules allow it, plus the D weights.
    const diet = getDiet(prefs.diet);
    const liked = (prefs.likes || []).filter((id) => { const f = FOODS.find((x) => x.id === id); return f && isAllowed(f, diet, prefs.exclude || [], prefs); });
    const must = { ...(prefs.mustInclude || {}) };
    for (const id of liked) must[id] = Math.max(must[id] || 0, Math.min(1, FOODS.find((x) => x.id === id).max_servings));
    let r = liked.length ? optimizeDiet(targets, { ...prefs, weights: pref, mustInclude: must }) : { status: "skip" };
    let blurb = "Includes a serving of each food you like, and leans away from the ones you'd rather skip.", mustInclude = must;
    if (r.status !== "optimal") {
      r = optimizeDiet(targets, { ...prefs, weights: pref }); mustInclude = prefs.mustInclude;
      blurb = "Leans toward the foods you like (not all of them fit your targets at once).";
    }
    if (r.status === "optimal") options.push({ key: "picks", title: "Your picks", blurb, weights: pref, mustInclude, result: r });
  }
  const variety = [["different", "Something different", "Swaps out the main foods of the plans above."],
                   ["mix", "Mix it up", "A third menu, so a week can rotate between plans."],
                   ["fourth", "One more", "Another rotation menu."]];
  const uses = {};
  for (let v = 0; options.length < count + (hasPrefs ? 1 : 0) && v < variety.length; v++) {
    for (const o of options.slice(-1)) for (const it of o.result.plan) if (it.grams >= OPTION_RULES.minGrams) uses[it.id] = (uses[it.id] || 0) + 1;
    const w = { ...(hasPrefs ? pref : {}) };
    for (const [id, k] of Object.entries(uses)) w[id] = (w[id] ?? 1) * OPTION_RULES.repeat ** k;
    const r = optimizeDiet(targets, { ...prefs, weights: w });
    if (r.status !== "optimal") break;
    const [key, title, blurb] = variety[v];
    const same = options.some((o) => compareOptions([o.result, r]).similarity[0][1] > 0.999);
    options.push({ key, title, blurb, weights: w, result: r, duplicate: same });
  }
  const kept = options.filter((o, k) => k === 0 || !(o.duplicate || (o.key === "picks" && compareOptions([cheapest, o.result]).similarity[0][1] > 0.999)));
  kept.forEach((o, k) => { o.letter = "ABCDE"[k]; o.extraPerDay = o.result.costPerDay - cheapest.costPerDay; delete o.duplicate; });
  return { status: "optimal", diet: cheapest.diet, options: kept, ...compareOptions(kept.map((o) => o.result)) };
}

/** Options side by side. X = grams matrix (foods x options); A X = nutrients x options; S = cosine-similarity Gram matrix of
 *  the calorie vectors (e o x): S_ab = 1 means two menus get their calories from the same foods in the same proportions. */
export function compareOptions(results) {
  const grams = results.map((r) => Object.fromEntries(r.model.foods.map((id, j) => [id, r.model.x[j] * 100])));  // full x, not the display list
  const ids = FOODS.map((f) => f.id).filter((id) => grams.some((g) => g[id] > 0));
  const byId = Object.fromEntries(FOODS.map((f) => [f.id, f]));
  const X = ids.map((id) => grams.map((g) => g[id] ?? 0));                                              // grams, foods x options
  const AX = NUTRIENTS.map((n) => results.map((_, k) => ids.reduce((s, id, j) => s + byId[id].per100g[n.key] * X[j][k] / 100, 0)));
  const K = ids.map((id, j) => X[j].map((g) => byId[id].per100g.kcal * g / 100));                    // calorie vectors
  const dot = (a, b) => K.reduce((s, row) => s + row[a] * row[b], 0);
  const S = results.map((_, a) => results.map((_, b) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b) || 1)));
  return { foods: ids, X, AX, similarity: S };
}

/** Cheapest plan for every diet (same person, same allergy/food choices): which diets fit, and what each costs. */
export function compareDiets(targets, prefs = {}) {
  return DIETS.map((d) => {
    const r = optimizeDiet(targets, { ...prefs, diet: d.name, weights: {} });
    return { diet: d.name, desc: d.desc, status: r.status, costPerDay: r.costPerDay ?? null, protein: r.totals?.protein ?? null,
      foods: r.plan?.length ?? 0, reasons: r.reasons || [] };
  });
}

/** A week: d_k = days on option k. Weekly grams g = X d (a matrix-vector product), then whole packages to buy.
 *  Foods priced per pound are bought by weight; others round up to whole packages, so checkout >= LP cost. */
export function weekPlan(results, days, { priceSource = "walmart" } = {}) {
  const { foods, X } = compareOptions(results);
  const byId = Object.fromEntries(FOODS.map((f) => [f.id, f]));
  const lines = foods.map((id, j) => {
    const f = byId[id];
    const grams = X[j].reduce((s, g, k) => s + g * (days[k] || 0), 0);                         // (X d)_j
    const edible = f.package_g * f.edible_yield;
    const byWeight = /per lb/i.test(f.product);
    const pkgPrice = priceSource === "bls" && f.bls_cost_per_100g != null ? f.bls_cost_per_100g * edible / 100 : f.price;
    const packages = byWeight ? grams / edible : Math.ceil(grams / edible - 1e-9);
    return { id, name: f.name, group: f.group, product: f.product, grams, byWeight, packages, pounds: grams / f.edible_yield / 453.592,
      checkout: packages * pkgPrice, eaten: grams / edible * pkgPrice, source: f.price_source };
  }).filter((l) => l.grams > 0).sort((a, b) => a.group.localeCompare(b.group) || b.checkout - a.checkout);
  const eaten = lines.reduce((s, l) => s + l.eaten, 0), checkout = lines.reduce((s, l) => s + l.checkout, 0);
  return { lines, eaten, checkout, leftover: checkout - eaten, days };
}
