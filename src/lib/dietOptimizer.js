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
 *               g_min <= G x <= g_max                   (caps on meat, beans, cheese, grains, oils and snacks as groups)
 *   REALISTIC model (default; settings.realistic) adds
 *               d_min <= D x <= d_max                   (Dietary Guidelines 2025-2030 daily servings for the person's
 *                                                        calorie level: protein foods, dairy, vegetables, fruits,
 *                                                        whole grains, healthy fats; D_gj = servings of group g in 100 g)
 *               r^T x - w^T x <= 0                      (refined-grain servings <= whole-grain servings)
 *               9 sf^T x - 0.10 e^T x <= 0              (saturated fat < 10% of calories)
 *               x_j <= v * d_min,g / D_gj               (variety: one food <= v of its group's servings; a bound)
 *               c_j = price / (package x edible yield x cook yield x (1 - household waste))
 *   TEXTBOOK model: vegetables/fruit cup-equivalent minimums instead of D, no variety, no waste.
 *               0 <= x <= u                             (portion caps; u_j = 0 when the diet excludes food j)
 *   x is in grams AS EATEN (cooked rice, roasted chicken); the shopping list converts back to grams as bought.
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
 "share_rule_min_protein": 8.5,
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
  "meat_fish": 255,
  "legumes": 4,
  "cheese": 3,
  "grains": 12,
  "added_fats": 4,
  "snacks": 2
 },
 "realistic": true,
 "variety": 0.5,
 "max_satfat_share": 0.1,
 "include_waste": true
};
export const GROUP_CAPS = [
 {
  "key": "meat_fish",
  "label": "Meat, poultry & fish",
  "unit": "grams",
  "max": 255,
  "note": "9 oz cooked (about 12 oz raw) per day",
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
  "max": 4,
  "note": "2 cups cooked per day",
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
  "max": 12,
  "note": "1/2 cup cooked, 1 slice, 1 tortilla",
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
export const DGA_SOURCE = "Dietary Guidelines for Americans, 2025-2030 (USDA & HHS, Jan 2026): daily servings by calorie level";
export const DGA_SERVINGS = {"1000": {"protein": [1, 1.5], "dairy": 2, "veg": 1.25, "fruit": 1, "wgrain": [1, 2], "fat": 2}, "1200": {"protein": [1.5, 2], "dairy": 2.5, "veg": 1.75, "fruit": 1, "wgrain": [1.5, 2.75], "fat": 2.5}, "1400": {"protein": [2, 2.5], "dairy": 2.5, "veg": 1.75, "fruit": 1.5, "wgrain": [1.75, 3.25], "fat": 2.5}, "1600": {"protein": [2.5, 3.5], "dairy": 3, "veg": 2.5, "fruit": 1.5, "wgrain": [1.75, 3.25], "fat": 3.5}, "1800": {"protein": [2.5, 3.5], "dairy": 3, "veg": 3, "fruit": 1.5, "wgrain": [2, 4], "fat": 4}, "2000": {"protein": [3, 4], "dairy": 3, "veg": 3, "fruit": 2, "wgrain": [2, 4], "fat": 4.5}, "2200": {"protein": [3.5, 4.5], "dairy": 3, "veg": 3.5, "fruit": 2, "wgrain": [2.25, 4.5], "fat": 4.5}, "2400": {"protein": [3.5, 4.5], "dairy": 3, "veg": 3.5, "fruit": 2, "wgrain": [2.75, 5.25], "fat": 5}, "2600": {"protein": [3.5, 4.5], "dairy": 3, "veg": 4.25, "fruit": 2, "wgrain": [3, 6], "fat": 5.5}, "2800": {"protein": [4, 5], "dairy": 3, "veg": 4.25, "fruit": 2.5, "wgrain": [3.25, 6.5], "fat": 6}, "3000": {"protein": [4, 5], "dairy": 3, "veg": 4.75, "fruit": 2.5, "wgrain": [3.25, 6.5], "fat": 7}, "3200": {"protein": [4, 5], "dairy": 3, "veg": 4.75, "fruit": 2.5, "wgrain": [3.25, 6.5], "fat": 8}};
export const DGA_GROUP_LABELS = {"protein": "Protein foods", "dairy": "Dairy", "veg": "Vegetables", "fruit": "Fruits", "wgrain": "Whole grains", "fat": "Healthy fats"};
export const WASTE_NOTE = "Typical household food waste by food group: Buzby, Wells & Hyman (2014), USDA ERS EIB-121, Table 1. Beans and tofu use the processed-vegetable rate (18%), an assumption.";
export const USDA_FOOD_PLANS = {"month": "May 2026", "thrifty": {"male": {"14-19": 74.9, "20-50": 73.2, "51-70": 64.6, "71+": 61.6}, "female": {"14-19": 59.8, "20-50": 58.2, "51-70": 54.2, "71+": 60.0}}, "low": {"male": {"14-18": 73.9, "19-50": 72.9, "51-70": 68.8, "71+": 68.0}, "female": {"14-18": 62.3, "19-50": 63.4, "51-70": 61.7, "71+": 61.7}}, "moderate": {"male": {"14-18": 92.6, "19-50": 91.6, "51-70": 86.4, "71+": 84.0}, "female": {"14-18": 74.4, "19-50": 77.5, "51-70": 76.2, "71+": 76.1}}, "liberal": {"male": {"14-18": 109.0, "19-50": 111.8, "51-70": 103.4, "71+": 103.3}, "female": {"14-18": 91.8, "19-50": 98.8, "51-70": 91.8, "71+": 91.0}}};
// per100g = USDA SR28 per 100 g AS EATEN; cost_per_100g = price / (package_g x edible_yield x cook_yield) x 100
// meal = share eaten at [Breakfast, Lunch, Dinner, Snacks]; flags drive diet filters
export const FOODS = [
  {"id": "chicken_breast", "name": "Chicken breast, roasted", "buy_name": "Chicken breast (boneless, skinless)", "product": "Great Value frozen, 3 lb", "group": "Proteins", "type": "Poultry", "price": 9.84, "package_g": 1360.8, "edible_yield": 1.0, "cook_yield": 0.7253, "waste": 0.22, "cost_per_100g": 0.996972, "bls_cost_per_100g": 1.277545, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "chicken_breast", "satfat": 1.01, "ndb": "05064", "per100g": {"kcal": 165.0, "protein": 31.02, "carb": 0.0, "fat": 3.57, "fiber": 0.0, "sugar": 0.0, "calcium": 15.0, "iron": 1.04, "potassium": 256.0, "sodium": 74.0, "vitc": 0.0}},
  {"id": "drumsticks", "name": "Chicken drumsticks, roasted (meat & skin)", "buy_name": "Chicken drumsticks (bone-in)", "product": "Great Value frozen, 4 lb", "group": "Proteins", "type": "Poultry", "price": 4.83, "package_g": 1814.4, "edible_yield": 0.67, "cook_yield": 0.7743, "waste": 0.22, "cost_per_100g": 0.513133, "bls_cost_per_100g": 0.73901, "serving_g": 85, "serving_desc": "3 oz cooked (about 1 drumstick)", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "drumsticks", "satfat": 2.74, "ndb": "05069", "per100g": {"kcal": 191.0, "protein": 23.35, "carb": 0.0, "fat": 10.15, "fiber": 0.0, "sugar": 0.0, "calcium": 11.0, "iron": 1.11, "potassium": 247.0, "sodium": 123.0, "vitc": 0.0}},
  {"id": "chicken_thigh", "name": "Chicken thighs, roasted", "buy_name": "Chicken thighs (boneless, skinless)", "product": "Great Value frozen, 3 lb", "group": "Proteins", "type": "Poultry", "price": 9.87, "package_g": 1360.8, "edible_yield": 1.0, "cook_yield": 0.676, "waste": 0.22, "cost_per_100g": 1.072942, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "chicken_thigh", "satfat": 2.311, "ndb": "05098", "per100g": {"kcal": 179.0, "protein": 24.76, "carb": 0.0, "fat": 8.15, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 1.13, "potassium": 269.0, "sodium": 106.0, "vitc": 0.0}},
  {"id": "deli_turkey", "name": "Deli turkey breast (sliced)", "buy_name": "Deli turkey breast (sliced)", "product": "Great Value thin sliced, 16 oz", "group": "Proteins", "type": "Poultry", "price": 5.97, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.22, "cost_per_100g": 1.316138, "bls_cost_per_100g": null, "serving_g": 56, "serving_desc": "2 oz (about 4 slices)", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "deli_turkey", "satfat": 0.318, "ndb": "07081", "per100g": {"kcal": 100.0, "protein": 16.33, "carb": 2.34, "fat": 2.37, "fiber": 0.0, "sugar": 3.28, "calcium": 7.0, "iron": 0.34, "potassium": 401.0, "sodium": 922.0, "vitc": 0.0}},
  {"id": "ground_turkey", "name": "Ground turkey 93/7, cooked", "buy_name": "Ground turkey 93/7", "product": "Jennie-O, 16 oz", "group": "Proteins", "type": "Poultry", "price": 5.56, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 0.6911, "waste": 0.22, "cost_per_100g": 1.773621, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["poultry"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "ground_turkey", "satfat": 2.966, "ndb": "05666", "per100g": {"kcal": 213.0, "protein": 27.1, "carb": 0.0, "fat": 11.6, "fiber": 0.0, "sugar": 0.0, "calcium": 31.0, "iron": 1.56, "potassium": 304.0, "sodium": 90.0, "vitc": 0.0}},
  {"id": "bacon", "name": "Bacon, cooked", "buy_name": "Bacon", "product": "Great Value hickory smoked, 16 oz", "group": "Proteins", "type": "Red Meat & Pork", "price": 4.24, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 0.3721, "waste": 0.22, "cost_per_100g": 2.512078, "bls_cost_per_100g": 4.002806, "serving_g": 11.5, "serving_desc": "1 slice cooked", "max_servings": 2.5, "meal": [1, 0, 0, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "bacon", "satfat": 11.964, "ndb": "10862", "per100g": {"kcal": 468.0, "protein": 33.92, "carb": 1.7, "fat": 35.09, "fiber": 0.0, "sugar": 0.0, "calcium": 11.0, "iron": 0.95, "potassium": 499.0, "sodium": 1684.0, "vitc": 0.0}},
  {"id": "ground_beef", "name": "Ground beef 80/20, cooked", "buy_name": "Ground beef 80/20", "product": "80/20 ground chuck, 1 lb roll", "group": "Proteins", "type": "Red Meat & Pork", "price": 6.43, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 0.6359, "waste": 0.22, "cost_per_100g": 2.2292, "bls_cost_per_100g": 2.354743, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 1.5, "meal": [0, 0.5, 0.5, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "ground beef", "satfat": 6.546, "ndb": "23575", "per100g": {"kcal": 272.0, "protein": 27.0, "carb": 0.0, "fat": 17.36, "fiber": 0.0, "sugar": 0.0, "calcium": 28.0, "iron": 2.78, "potassium": 380.0, "sodium": 91.0, "vitc": 0.0}},
  {"id": "lean_beef", "name": "Ground beef 93/7, cooked", "buy_name": "Ground beef 93/7 (lean)", "product": "93/7 lean ground beef, 1 lb", "group": "Proteins", "type": "Red Meat & Pork", "price": 7.87, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 0.722, "waste": 0.22, "cost_per_100g": 2.403059, "bls_cost_per_100g": 2.583563, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "ground beef", "satfat": 3.897, "ndb": "23476", "per100g": {"kcal": 209.0, "protein": 28.88, "carb": 0.0, "fat": 9.51, "fiber": 0.0, "sugar": 0.0, "calcium": 12.0, "iron": 3.17, "potassium": 449.0, "sodium": 86.0, "vitc": 0.0}},
  {"id": "ham", "name": "Ham (sliced, cooked)", "buy_name": "Ham (sliced, cooked)", "product": "Great Value cooked ham, 16 oz", "group": "Proteins", "type": "Red Meat & Pork", "price": 4.97, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.22, "cost_per_100g": 1.095679, "bls_cost_per_100g": 1.20152, "serving_g": 56, "serving_desc": "2 oz (2 slices)", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "ham", "satfat": 2.936, "ndb": "07029", "per100g": {"kcal": 163.0, "protein": 16.6, "carb": 3.83, "fat": 8.6, "fiber": 1.3, "sugar": 0.0, "calcium": 24.0, "iron": 1.02, "potassium": 287.0, "sodium": 1143.0, "vitc": 4.0}},
  {"id": "pork_chops", "name": "Pork loin chops, pan-cooked", "buy_name": "Pork loin chops (boneless)", "product": "Family pack, per lb", "group": "Proteins", "type": "Red Meat & Pork", "price": 4.17, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 0.7924, "waste": 0.22, "cost_per_100g": 1.160162, "bls_cost_per_100g": 1.265906, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["meat", "pork"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "pork_chops", "satfat": 4.89, "ndb": "10189", "per100g": {"kcal": 229.0, "protein": 26.68, "carb": 0.0, "fat": 13.6, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.62, "potassium": 366.0, "sodium": 86.0, "vitc": 0.0}},
  {"id": "sirloin", "name": "Top sirloin steak, broiled", "buy_name": "Top sirloin steak", "product": "Choice Angus top sirloin, per lb", "group": "Proteins", "type": "Red Meat & Pork", "price": 12.94, "package_g": 453.6, "edible_yield": 0.97, "cook_yield": 0.7433, "waste": 0.22, "cost_per_100g": 3.956629, "bls_cost_per_100g": 4.31323, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0, 1, 0], "flags": ["meat"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "sirloin", "satfat": 6.202, "ndb": "13932", "per100g": {"kcal": 257.0, "protein": 26.8, "carb": 0.0, "fat": 15.75, "fiber": 0.0, "sugar": 0.0, "calcium": 18.0, "iron": 1.81, "potassium": 327.0, "sodium": 54.0, "vitc": 0.0}},
  {"id": "tuna", "name": "Canned light tuna (in water)", "buy_name": "Canned light tuna (in water)", "product": "Great Value chunk light, 5 oz can", "group": "Proteins", "type": "Fish & Seafood", "price": 0.96, "package_g": 141.7, "edible_yield": 0.79, "cook_yield": 1.0, "waste": 0.31, "cost_per_100g": 0.857579, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz drained", "max_servings": 2, "meal": [0, 1, 0, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "tuna", "satfat": 0.211, "ndb": "15121", "per100g": {"kcal": 86.0, "protein": 19.44, "carb": 0.0, "fat": 0.96, "fiber": 0.0, "sugar": 0.0, "calcium": 17.0, "iron": 1.63, "potassium": 179.0, "sodium": 247.0, "vitc": 0.0}},
  {"id": "salmon", "name": "Salmon, baked", "buy_name": "Salmon (Atlantic, fillet)", "product": "Marketside frozen portions, 2 lb", "group": "Proteins", "type": "Fish & Seafood", "price": 21.94, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 0.924, "waste": 0.31, "cost_per_100g": 2.617349, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.5, "meal": [0, 0, 1, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "salmon", "satfat": 2.397, "ndb": "15237", "per100g": {"kcal": 206.0, "protein": 22.1, "carb": 0.0, "fat": 12.35, "fiber": 0.0, "sugar": 0.0, "calcium": 15.0, "iron": 0.34, "potassium": 384.0, "sodium": 61.0, "vitc": 3.7}},
  {"id": "shrimp", "name": "Shrimp, cooked", "buy_name": "Shrimp (raw, peeled)", "product": "Great Value frozen, 2 lb", "group": "Proteins", "type": "Fish & Seafood", "price": 15.96, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 0.5966, "waste": 0.31, "cost_per_100g": 2.948809, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 1.5, "meal": [0, 0, 1, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "shrimp", "satfat": 0.521, "ndb": "15151", "per100g": {"kcal": 119.0, "protein": 22.78, "carb": 1.52, "fat": 1.7, "fiber": 0.0, "sugar": 0.0, "calcium": 91.0, "iron": 0.32, "potassium": 170.0, "sodium": 947.0, "vitc": 0.0}},
  {"id": "tilapia", "name": "Tilapia, baked", "buy_name": "Tilapia (fillet)", "product": "Great Value frozen, 2 lb", "group": "Proteins", "type": "Fish & Seafood", "price": 8.87, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 0.75, "waste": 0.31, "cost_per_100g": 1.303645, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": ["fish"], "cup_eq_g": null, "cap_group": "meat_fish", "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "tilapia", "satfat": 0.94, "ndb": "15262", "per100g": {"kcal": 128.0, "protein": 26.15, "carb": 0.0, "fat": 2.65, "fiber": 0.0, "sugar": 0.0, "calcium": 14.0, "iron": 0.69, "potassium": 380.0, "sodium": 56.0, "vitc": 0.0}},
  {"id": "eggs", "name": "Eggs (large)", "buy_name": "Eggs (large)", "product": "Great Value large, 12 ct", "group": "Proteins", "type": "Eggs", "price": 1.67, "package_g": 681.8, "edible_yield": 0.88, "cook_yield": 1.0, "waste": 0.21, "cost_per_100g": 0.278341, "bls_cost_per_100g": 0.378667, "serving_g": 50, "serving_desc": "1 large egg", "max_servings": 3, "meal": [1, 0, 0, 0], "flags": ["egg"], "cup_eq_g": null, "cap_group": null, "dga_group": "protein", "dga_serving_g": 50, "refined_serving_g": null, "variety_key": "eggs", "satfat": 3.126, "ndb": "01123", "per100g": {"kcal": 143.0, "protein": 12.56, "carb": 0.72, "fat": 9.51, "fiber": 0.0, "sugar": 0.37, "calcium": 56.0, "iron": 1.75, "potassium": 138.0, "sodium": 142.0, "vitc": 0.0}},
  {"id": "black_beans", "name": "Black beans (canned)", "buy_name": "Black beans (canned)", "product": "Great Value no salt added, 15 oz", "group": "Proteins", "type": "Plant Proteins", "price": 0.92, "package_g": 425.2, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.18, "cost_per_100g": 0.216369, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "dga_group": "protein", "dga_serving_g": 120, "refined_serving_g": null, "variety_key": "black_beans", "satfat": 0.075, "ndb": "16316", "per100g": {"kcal": 91.0, "protein": 6.03, "carb": 16.55, "fat": 0.29, "fiber": 6.9, "sugar": 0.23, "calcium": 35.0, "iron": 1.9, "potassium": 308.0, "sodium": 138.0, "vitc": 2.7}},
  {"id": "chickpeas", "name": "Chickpeas (canned)", "buy_name": "Chickpeas (canned)", "product": "Great Value, 15.5 oz", "group": "Proteins", "type": "Plant Proteins", "price": 0.92, "package_g": 439.4, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.18, "cost_per_100g": 0.209376, "bls_cost_per_100g": null, "serving_g": 120, "serving_desc": "1/2 cup", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "dga_group": "protein", "dga_serving_g": 120, "refined_serving_g": null, "variety_key": "chickpeas", "satfat": 0.204, "ndb": "16058", "per100g": {"kcal": 88.0, "protein": 4.92, "carb": 13.49, "fat": 1.95, "fiber": 4.4, "sugar": 0.0, "calcium": 35.0, "iron": 1.23, "potassium": 144.0, "sodium": 278.0, "vitc": 0.1}},
  {"id": "lentils", "name": "Lentils, cooked", "buy_name": "Lentils (dry)", "product": "Great Value, 1 lb", "group": "Proteins", "type": "Plant Proteins", "price": 1.92, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 2.7306, "waste": 0.18, "cost_per_100g": 0.155014, "bls_cost_per_100g": null, "serving_g": 99, "serving_desc": "1/2 cup cooked", "max_servings": 4.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "dga_group": "protein", "dga_serving_g": 99, "refined_serving_g": null, "variety_key": "lentils", "satfat": 0.053, "ndb": "16070", "per100g": {"kcal": 116.0, "protein": 9.02, "carb": 20.13, "fat": 0.38, "fiber": 7.9, "sugar": 1.8, "calcium": 19.0, "iron": 3.33, "potassium": 369.0, "sodium": 2.0, "vitc": 1.5}},
  {"id": "peanut_butter", "name": "Peanut butter", "buy_name": "Peanut butter", "product": "Great Value creamy, 40 oz", "group": "Proteins", "type": "Plant Proteins", "price": 3.98, "package_g": 1134.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.09, "cost_per_100g": 0.35097, "bls_cost_per_100g": null, "serving_g": 32, "serving_desc": "2 tbsp", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": null, "cap_group": null, "dga_group": "protein", "dga_serving_g": 32, "refined_serving_g": null, "variety_key": "peanut_butter", "satfat": 10.325, "ndb": "16098", "per100g": {"kcal": 598.0, "protein": 22.21, "carb": 22.31, "fat": 51.36, "fiber": 5.0, "sugar": 10.49, "calcium": 49.0, "iron": 1.74, "potassium": 558.0, "sodium": 426.0, "vitc": 0.0}},
  {"id": "pinto_beans", "name": "Pinto beans, cooked", "buy_name": "Pinto beans (dry)", "product": "Great Value, 2 lb", "group": "Proteins", "type": "Plant Proteins", "price": 1.98, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 2.3774, "waste": 0.18, "cost_per_100g": 0.091804, "bls_cost_per_100g": 0.154771, "serving_g": 85.5, "serving_desc": "1/2 cup cooked", "max_servings": 4.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "legumes", "dga_group": "protein", "dga_serving_g": 85.5, "refined_serving_g": null, "variety_key": "pinto_beans", "satfat": 0.136, "ndb": "16043", "per100g": {"kcal": 143.0, "protein": 9.01, "carb": 26.22, "fat": 0.65, "fiber": 9.0, "sugar": 0.34, "calcium": 46.0, "iron": 2.09, "potassium": 436.0, "sodium": 1.0, "vitc": 0.8}},
  {"id": "tofu", "name": "Tofu (extra firm)", "buy_name": "Tofu (extra firm)", "product": "Nasoya extra firm, 14 oz", "group": "Proteins", "type": "Plant Proteins", "price": 2.97, "package_g": 396.9, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.18, "cost_per_100g": 0.748299, "bls_cost_per_100g": null, "serving_g": 85, "serving_desc": "3 oz", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "dga_group": "protein", "dga_serving_g": 85, "refined_serving_g": null, "variety_key": "tofu", "satfat": 0.7, "ndb": "16212", "per100g": {"kcal": 98.0, "protein": 10.1, "carb": 2.6, "fat": 5.2, "fiber": 1.3, "sugar": 0.4, "calcium": 77.0, "iron": 1.6, "potassium": 0.0, "sodium": 4.0, "vitc": 0.0}},
  {"id": "milk_2pct", "name": "2% milk", "buy_name": "2% milk", "product": "Great Value, 1 gal", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 3.31, "package_g": 3904, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.2, "cost_per_100g": 0.084785, "bls_cost_per_100g": null, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "dga_group": "dairy", "dga_serving_g": 244, "refined_serving_g": null, "variety_key": "milk", "satfat": 1.257, "ndb": "01079", "per100g": {"kcal": 50.0, "protein": 3.3, "carb": 4.8, "fat": 1.98, "fiber": 0.0, "sugar": 5.06, "calcium": 120.0, "iron": 0.02, "potassium": 140.0, "sodium": 47.0, "vitc": 0.2}},
  {"id": "greek_yogurt", "name": "Greek yogurt (plain, nonfat)", "buy_name": "Greek yogurt (plain, nonfat)", "product": "Great Value, 32 oz", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 3.28, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.361552, "bls_cost_per_100g": null, "serving_g": 170, "serving_desc": "1 container (6 oz)", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "dga_group": "dairy", "dga_serving_g": 170, "refined_serving_g": null, "variety_key": "greek_yogurt", "satfat": 0.117, "ndb": "01256", "per100g": {"kcal": 59.0, "protein": 10.19, "carb": 3.6, "fat": 0.39, "fiber": 0.0, "sugar": 3.24, "calcium": 110.0, "iron": 0.07, "potassium": 141.0, "sodium": 36.0, "vitc": 0.0}},
  {"id": "soy_milk", "name": "Soy milk (calcium-fortified)", "buy_name": "Soy milk (calcium-fortified)", "product": "Silk original, 64 fl oz", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 4.57, "package_g": 1944, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.2, "cost_per_100g": 0.235082, "bls_cost_per_100g": null, "serving_g": 243, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": null, "cap_group": null, "dga_group": "dairy", "dga_serving_g": 243, "refined_serving_g": null, "variety_key": "soy_milk", "satfat": 0.205, "ndb": "16139", "per100g": {"kcal": 43.0, "protein": 2.6, "carb": 4.92, "fat": 1.47, "fiber": 0.2, "sugar": 3.65, "calcium": 123.0, "iron": 0.42, "potassium": 122.0, "sodium": 47.0, "vitc": 0.0}},
  {"id": "milk_whole", "name": "Whole milk", "buy_name": "Whole milk", "product": "Great Value, 1 gal", "group": "Dairy & Alternatives", "type": "Milk & Yogurt", "price": 3.48, "package_g": 3904, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.2, "cost_per_100g": 0.089139, "bls_cost_per_100g": 0.105174, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 3, "meal": [0.5, 0, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": null, "dga_group": "dairy", "dga_serving_g": 244, "refined_serving_g": null, "variety_key": "milk", "satfat": 1.865, "ndb": "01077", "per100g": {"kcal": 61.0, "protein": 3.15, "carb": 4.8, "fat": 3.25, "fiber": 0.0, "sugar": 5.05, "calcium": 113.0, "iron": 0.03, "potassium": 132.0, "sodium": 43.0, "vitc": 0.0}},
  {"id": "american_cheese", "name": "American cheese (singles)", "buy_name": "American cheese (singles)", "product": "Great Value, 16 oz / 24 slices", "group": "Dairy & Alternatives", "type": "Cheese", "price": 2.48, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.546737, "bls_cost_per_100g": 1.044331, "serving_g": 19, "serving_desc": "1 slice", "max_servings": 3, "meal": [0, 1, 0, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "dga_group": "dairy", "dga_serving_g": 28, "refined_serving_g": null, "variety_key": "american_cheese", "satfat": 18.057, "ndb": "01042", "per100g": {"kcal": 366.0, "protein": 18.13, "carb": 4.78, "fat": 30.71, "fiber": 0.0, "sugar": 2.26, "calcium": 1045.0, "iron": 0.63, "potassium": 132.0, "sodium": 1671.0, "vitc": 0.0}},
  {"id": "cheddar", "name": "Cheddar cheese", "buy_name": "Cheddar cheese", "product": "Great Value medium block, 8 oz", "group": "Dairy & Alternatives", "type": "Cheese", "price": 1.87, "package_g": 226.8, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.824515, "bls_cost_per_100g": 1.352096, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "dga_group": "dairy", "dga_serving_g": 28, "refined_serving_g": null, "variety_key": "cheddar", "satfat": 18.867, "ndb": "01009", "per100g": {"kcal": 404.0, "protein": 22.87, "carb": 3.09, "fat": 33.31, "fiber": 0.0, "sugar": 0.48, "calcium": 710.0, "iron": 0.14, "potassium": 76.0, "sodium": 653.0, "vitc": 0.0}},
  {"id": "cottage_cheese", "name": "Cottage cheese (2%)", "buy_name": "Cottage cheese (2%)", "product": "Great Value small curd, 24 oz", "group": "Dairy & Alternatives", "type": "Cheese", "price": 2.87, "package_g": 680.4, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.421811, "bls_cost_per_100g": null, "serving_g": 113, "serving_desc": "1/2 cup", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "dga_group": "dairy", "dga_serving_g": 452, "refined_serving_g": null, "variety_key": "cottage_cheese", "satfat": 1.235, "ndb": "01015", "per100g": {"kcal": 81.0, "protein": 10.45, "carb": 4.76, "fat": 2.27, "fiber": 0.0, "sugar": 4.0, "calcium": 111.0, "iron": 0.13, "potassium": 125.0, "sodium": 308.0, "vitc": 0.0}},
  {"id": "string_cheese", "name": "Mozzarella string cheese", "buy_name": "Mozzarella string cheese", "product": "Great Value part-skim, 12 ct", "group": "Dairy & Alternatives", "type": "Cheese", "price": 3.28, "package_g": 340.2, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.964139, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 stick", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "cheese", "dga_group": "dairy", "dga_serving_g": 28, "refined_serving_g": null, "variety_key": "string_cheese", "satfat": 11.295, "ndb": "01029", "per100g": {"kcal": 295.0, "protein": 23.75, "carb": 5.58, "fat": 19.78, "fiber": 0.0, "sugar": 1.9, "calcium": 697.0, "iron": 0.22, "potassium": 188.0, "sodium": 666.0, "vitc": 0.0}},
  {"id": "bagel", "name": "Bagels (plain)", "buy_name": "Bagels (plain)", "product": "Great Value, 6 ct / 20 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.14, "package_g": 567.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.377425, "bls_cost_per_100g": null, "serving_g": 94, "serving_desc": "1 bagel", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": null, "dga_serving_g": null, "refined_serving_g": 28, "variety_key": "bagel", "satfat": 0.36, "ndb": "18001", "per100g": {"kcal": 264.0, "protein": 10.56, "carb": 52.38, "fat": 1.32, "fiber": 1.6, "sugar": 8.43, "calcium": 219.0, "iron": 3.57, "potassium": 107.0, "sodium": 422.0, "vitc": 0.0}},
  {"id": "brown_rice", "name": "Brown rice, cooked", "buy_name": "Brown rice (dry)", "product": "Great Value long grain, 32 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.72, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 2.7518, "waste": 0.19, "cost_per_100g": 0.068898, "bls_cost_per_100g": null, "serving_g": 101, "serving_desc": "1/2 cup cooked", "max_servings": 5.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "dga_group": "wgrain", "dga_serving_g": 101, "refined_serving_g": null, "variety_key": "brown_rice", "satfat": 0.26, "ndb": "20037", "per100g": {"kcal": 123.0, "protein": 2.74, "carb": 25.58, "fat": 0.97, "fiber": 1.6, "sugar": 0.24, "calcium": 3.0, "iron": 0.56, "potassium": 86.0, "sodium": 4.0, "vitc": 0.0}},
  {"id": "cheerios", "name": "Cheerios", "buy_name": "Cheerios", "product": "Cheerios family size, 18 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 4.97, "package_g": 510.3, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.973937, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 cup", "max_servings": 2, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "dga_group": "wgrain", "dga_serving_g": 28, "refined_serving_g": null, "variety_key": "cheerios", "satfat": 1.5, "ndb": "08013", "per100g": {"kcal": 376.0, "protein": 12.09, "carb": 73.23, "fat": 6.73, "fiber": 9.4, "sugar": 4.36, "calcium": 401.0, "iron": 33.17, "potassium": 641.0, "sodium": 497.0, "vitc": 21.6}},
  {"id": "corn_tortilla", "name": "Corn tortillas", "buy_name": "Corn tortillas", "product": "Mission yellow corn, 30 ct", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.48, "package_g": 791.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.313527, "bls_cost_per_100g": null, "serving_g": 26, "serving_desc": "1 tortilla", "max_servings": 6, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "dga_group": null, "dga_serving_g": null, "refined_serving_g": 26, "variety_key": "corn_tortilla", "satfat": 0.453, "ndb": "18363", "per100g": {"kcal": 218.0, "protein": 5.7, "carb": 44.64, "fat": 2.85, "fiber": 6.3, "sugar": 0.88, "calcium": 81.0, "iron": 1.23, "potassium": 186.0, "sodium": 45.0, "vitc": 0.0}},
  {"id": "flour_tortilla", "name": "Flour tortillas", "buy_name": "Flour tortillas", "product": "Great Value medium, 10 ct / 16 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.98, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.436508, "bls_cost_per_100g": null, "serving_g": 45, "serving_desc": "1 tortilla", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": null, "dga_serving_g": null, "refined_serving_g": 30, "variety_key": "flour_tortilla", "satfat": 1.225, "ndb": "18970", "per100g": {"kcal": 297.0, "protein": 8.01, "carb": 49.27, "fat": 7.58, "fiber": 2.4, "sugar": 2.66, "calcium": 163.0, "iron": 3.32, "potassium": 133.0, "sodium": 742.0, "vitc": 0.0}},
  {"id": "oats", "name": "Oatmeal (made with water)", "buy_name": "Rolled oats (dry)", "product": "Great Value old fashioned, 42 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 4.38, "package_g": 1190.7, "edible_yield": 1.0, "cook_yield": 5.1772, "waste": 0.19, "cost_per_100g": 0.071052, "bls_cost_per_100g": null, "serving_g": 117, "serving_desc": "1/2 cup cooked", "max_servings": 3.5, "meal": [1, 0, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": "wgrain", "dga_serving_g": 117, "refined_serving_g": null, "variety_key": "oats", "satfat": 0.31, "ndb": "08121", "per100g": {"kcal": 71.0, "protein": 2.54, "carb": 12.0, "fat": 1.52, "fiber": 1.7, "sugar": 0.27, "calcium": 9.0, "iron": 0.9, "potassium": 70.0, "sodium": 4.0, "vitc": 0.0}},
  {"id": "quinoa", "name": "Quinoa, cooked", "buy_name": "Quinoa (dry)", "product": "Great Value organic, 16 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 3.44, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 3.0667, "waste": 0.19, "cost_per_100g": 0.247294, "bls_cost_per_100g": null, "serving_g": 92.5, "serving_desc": "1/2 cup cooked", "max_servings": 4.5, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "dga_group": "wgrain", "dga_serving_g": 92.5, "refined_serving_g": null, "variety_key": "quinoa", "satfat": 0.231, "ndb": "20137", "per100g": {"kcal": 120.0, "protein": 4.4, "carb": 21.3, "fat": 1.92, "fiber": 2.8, "sugar": 0.87, "calcium": 17.0, "iron": 1.49, "potassium": 172.0, "sodium": 7.0, "vitc": 0.0}},
  {"id": "spaghetti", "name": "Spaghetti, cooked", "buy_name": "Spaghetti (dry)", "product": "Great Value, 16 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.36, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 2.2483, "waste": 0.19, "cost_per_100g": 0.133356, "bls_cost_per_100g": 0.134829, "serving_g": 62, "serving_desc": "1/2 cup cooked", "max_servings": 6.0, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": null, "dga_serving_g": null, "refined_serving_g": 62, "variety_key": "spaghetti", "satfat": 0.176, "ndb": "20121", "per100g": {"kcal": 158.0, "protein": 5.8, "carb": 30.86, "fat": 0.93, "fiber": 1.8, "sugar": 0.56, "calcium": 7.0, "iron": 1.28, "potassium": 44.0, "sodium": 1.0, "vitc": 0.0}},
  {"id": "white_bread", "name": "White bread", "buy_name": "White bread", "product": "Great Value, 20 oz loaf", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.52, "package_g": 567.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.268078, "bls_cost_per_100g": 0.403446, "serving_g": 28, "serving_desc": "1 slice", "max_servings": 4, "meal": [0.5, 0.5, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": null, "dga_serving_g": null, "refined_serving_g": 28, "variety_key": "white_bread", "satfat": 0.698, "ndb": "18069", "per100g": {"kcal": 266.0, "protein": 8.85, "carb": 49.42, "fat": 3.33, "fiber": 2.7, "sugar": 5.67, "calcium": 144.0, "iron": 3.61, "potassium": 126.0, "sodium": 490.0, "vitc": 0.0}},
  {"id": "white_rice", "name": "White rice, cooked", "buy_name": "White rice (dry)", "product": "Great Value long grain, 5 lb", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.48, "package_g": 2268.0, "edible_yield": 1.0, "cook_yield": 2.6506, "waste": 0.19, "cost_per_100g": 0.041254, "bls_cost_per_100g": 0.092989, "serving_g": 79, "serving_desc": "1/2 cup cooked", "max_servings": 6.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "grains", "dga_group": null, "dga_serving_g": null, "refined_serving_g": 79, "variety_key": "white_rice", "satfat": 0.077, "ndb": "20045", "per100g": {"kcal": 130.0, "protein": 2.69, "carb": 28.17, "fat": 0.28, "fiber": 0.4, "sugar": 0.05, "calcium": 10.0, "iron": 1.2, "potassium": 35.0, "sodium": 1.0, "vitc": 0.0}},
  {"id": "wheat_bread", "name": "Whole-wheat bread", "buy_name": "Whole-wheat bread", "product": "Great Value 100% whole wheat, 20 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 2.02, "package_g": 567.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.356261, "bls_cost_per_100g": null, "serving_g": 32, "serving_desc": "1 slice", "max_servings": 4, "meal": [0.5, 0.5, 0, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": "wgrain", "dga_serving_g": 32, "refined_serving_g": null, "variety_key": "wheat_bread", "satfat": 0.722, "ndb": "18075", "per100g": {"kcal": 252.0, "protein": 12.45, "carb": 42.71, "fat": 3.5, "fiber": 6.0, "sugar": 4.34, "calcium": 161.0, "iron": 2.47, "potassium": 254.0, "sodium": 455.0, "vitc": 0.0}},
  {"id": "ww_pasta", "name": "Whole-wheat spaghetti, cooked", "buy_name": "Whole-wheat spaghetti (dry)", "product": "Great Value, 16 oz", "group": "Carbohydrates", "type": "Grains & Bread", "price": 1.74, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 2.3155, "waste": 0.19, "cost_per_100g": 0.165665, "bls_cost_per_100g": null, "serving_g": 58.5, "serving_desc": "1/2 cup cooked", "max_servings": 7.0, "meal": [0, 0.5, 0.5, 0], "flags": ["gluten"], "cup_eq_g": null, "cap_group": "grains", "dga_group": "wgrain", "dga_serving_g": 58.5, "refined_serving_g": null, "variety_key": "ww_pasta", "satfat": 0.243, "ndb": "20125", "per100g": {"kcal": 149.0, "protein": 5.99, "carb": 30.07, "fat": 1.71, "fiber": 3.9, "sugar": 0.75, "calcium": 13.0, "iron": 1.72, "potassium": 96.0, "sodium": 4.0, "vitc": 0.0}},
  {"id": "potatoes", "name": "Baked potato (with skin)", "buy_name": "Potatoes (russet)", "product": "Russet, 5 lb bag", "group": "Carbohydrates", "type": "Starchy Vegetables", "price": 4.86, "package_g": 2268.0, "edible_yield": 0.75, "cook_yield": 0.82, "waste": 0.24, "cost_per_100g": 0.348432, "bls_cost_per_100g": 0.354532, "serving_g": 173, "serving_desc": "1 medium potato", "max_servings": 1.5, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 173, "cap_group": null, "dga_group": "veg", "dga_serving_g": 173, "refined_serving_g": null, "variety_key": "potatoes", "satfat": 0.034, "ndb": "11674", "per100g": {"kcal": 93.0, "protein": 2.5, "carb": 21.15, "fat": 0.13, "fiber": 2.2, "sugar": 1.18, "calcium": 15.0, "iron": 1.08, "potassium": 535.0, "sodium": 10.0, "vitc": 9.6}},
  {"id": "sweet_potatoes", "name": "Baked sweet potato", "buy_name": "Sweet potatoes", "product": "3 lb bag", "group": "Carbohydrates", "type": "Starchy Vegetables", "price": 3.62, "package_g": 1360.8, "edible_yield": 0.72, "cook_yield": 0.7811, "waste": 0.24, "cost_per_100g": 0.473015, "bls_cost_per_100g": null, "serving_g": 100, "serving_desc": "1/2 cup", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 200, "cap_group": null, "dga_group": "veg", "dga_serving_g": 200, "refined_serving_g": null, "variety_key": "sweet_potatoes", "satfat": 0.052, "ndb": "11508", "per100g": {"kcal": 90.0, "protein": 2.01, "carb": 20.71, "fat": 0.15, "fiber": 3.3, "sugar": 6.48, "calcium": 38.0, "iron": 0.69, "potassium": 475.0, "sodium": 36.0, "vitc": 19.6}},
  {"id": "corn", "name": "Corn, cooked (from frozen)", "buy_name": "Corn (frozen)", "product": "Great Value whole kernel, 12 oz", "group": "Carbohydrates", "type": "Starchy Vegetables", "price": 0.98, "package_g": 340.2, "edible_yield": 1.0, "cook_yield": 1.0018, "waste": 0.18, "cost_per_100g": 0.287548, "bls_cost_per_100g": null, "serving_g": 82.5, "serving_desc": "1/2 cup cooked", "max_servings": 2.5, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 165, "cap_group": null, "dga_group": "veg", "dga_serving_g": 165, "refined_serving_g": null, "variety_key": "corn", "satfat": 0.103, "ndb": "11179", "per100g": {"kcal": 81.0, "protein": 2.55, "carb": 19.3, "fat": 0.67, "fiber": 2.4, "sugar": 3.07, "calcium": 3.0, "iron": 0.47, "potassium": 233.0, "sodium": 1.0, "vitc": 3.5}},
  {"id": "apples", "name": "Apples (Gala)", "buy_name": "Apples (Gala)", "product": "Fresh Gala, 3 lb bag", "group": "Fruits", "type": "Fruit", "price": 3.92, "package_g": 1360.8, "edible_yield": 0.9, "cook_yield": 1.0, "waste": 0.25, "cost_per_100g": 0.320073, "bls_cost_per_100g": null, "serving_g": 125, "serving_desc": "1 small apple", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 125, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 125, "refined_serving_g": null, "variety_key": "apples", "satfat": 0.028, "ndb": "09003", "per100g": {"kcal": 52.0, "protein": 0.26, "carb": 13.81, "fat": 0.17, "fiber": 2.4, "sugar": 10.39, "calcium": 6.0, "iron": 0.12, "potassium": 107.0, "sodium": 1.0, "vitc": 4.6}},
  {"id": "bananas", "name": "Bananas", "buy_name": "Bananas", "product": "Fresh, per lb", "group": "Fruits", "type": "Fruit", "price": 0.5, "package_g": 453.6, "edible_yield": 0.64, "cook_yield": 1.0, "waste": 0.25, "cost_per_100g": 0.172233, "bls_cost_per_100g": 0.225974, "serving_g": 118, "serving_desc": "1 medium", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 118, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 118, "refined_serving_g": null, "variety_key": "bananas", "satfat": 0.112, "ndb": "09040", "per100g": {"kcal": 89.0, "protein": 1.09, "carb": 22.84, "fat": 0.33, "fiber": 2.6, "sugar": 12.23, "calcium": 5.0, "iron": 0.26, "potassium": 358.0, "sodium": 1.0, "vitc": 8.7}},
  {"id": "blueberries", "name": "Blueberries (frozen)", "buy_name": "Blueberries (frozen)", "product": "Great Value, 48 oz", "group": "Fruits", "type": "Fruit", "price": 7.97, "package_g": 1360.8, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.11, "cost_per_100g": 0.585685, "bls_cost_per_100g": null, "serving_g": 155, "serving_desc": "1 cup", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": 155, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 155, "refined_serving_g": null, "variety_key": "blueberries", "satfat": 0.053, "ndb": "09054", "per100g": {"kcal": 51.0, "protein": 0.42, "carb": 12.17, "fat": 0.64, "fiber": 2.7, "sugar": 8.45, "calcium": 8.0, "iron": 0.18, "potassium": 54.0, "sodium": 1.0, "vitc": 2.5}},
  {"id": "grapes", "name": "Grapes (red seedless)", "buy_name": "Grapes (red seedless)", "product": "Fresh, per lb", "group": "Fruits", "type": "Fruit", "price": 1.87, "package_g": 453.6, "edible_yield": 0.96, "cook_yield": 1.0, "waste": 0.25, "cost_per_100g": 0.429435, "bls_cost_per_100g": null, "serving_g": 151, "serving_desc": "1 cup", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 151, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 151, "refined_serving_g": null, "variety_key": "grapes", "satfat": 0.054, "ndb": "09132", "per100g": {"kcal": 69.0, "protein": 0.72, "carb": 18.1, "fat": 0.16, "fiber": 0.9, "sugar": 15.48, "calcium": 10.0, "iron": 0.36, "potassium": 191.0, "sodium": 2.0, "vitc": 3.2}},
  {"id": "orange_juice", "name": "Orange juice (100%)", "buy_name": "Orange juice (100%)", "product": "Great Value not-from-concentrate, 52 fl oz", "group": "Fruits", "type": "Fruit", "price": 3.96, "package_g": 1618.5, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.11, "cost_per_100g": 0.244671, "bls_cost_per_100g": null, "serving_g": 249, "serving_desc": "1 cup", "max_servings": 1, "meal": [1, 0, 0, 0], "flags": [], "cup_eq_g": 249, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 249, "refined_serving_g": null, "variety_key": "orange_juice", "satfat": 0.014, "ndb": "09209", "per100g": {"kcal": 49.0, "protein": 0.68, "carb": 11.54, "fat": 0.12, "fiber": 0.3, "sugar": 8.31, "calcium": 11.0, "iron": 0.13, "potassium": 178.0, "sodium": 2.0, "vitc": 33.6}},
  {"id": "oranges", "name": "Oranges (navel)", "buy_name": "Oranges (navel)", "product": "Fresh navel, 4 lb bag", "group": "Fruits", "type": "Fruit", "price": 5.97, "package_g": 1814.4, "edible_yield": 0.68, "cook_yield": 1.0, "waste": 0.25, "cost_per_100g": 0.483874, "bls_cost_per_100g": 0.558613, "serving_g": 140, "serving_desc": "1 orange", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 140, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 140, "refined_serving_g": null, "variety_key": "oranges", "satfat": 0.017, "ndb": "09202", "per100g": {"kcal": 49.0, "protein": 0.91, "carb": 12.54, "fat": 0.15, "fiber": 2.2, "sugar": 8.5, "calcium": 43.0, "iron": 0.13, "potassium": 166.0, "sodium": 1.0, "vitc": 59.1}},
  {"id": "raisins", "name": "Raisins", "buy_name": "Raisins", "product": "Great Value, 20 oz", "group": "Fruits", "type": "Fruit", "price": 4.38, "package_g": 567.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.11, "cost_per_100g": 0.772487, "bls_cost_per_100g": null, "serving_g": 41, "serving_desc": "1/4 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": 82, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 82, "refined_serving_g": null, "variety_key": "raisins", "satfat": 0.058, "ndb": "09298", "per100g": {"kcal": 299.0, "protein": 3.07, "carb": 79.18, "fat": 0.46, "fiber": 3.7, "sugar": 59.19, "calcium": 50.0, "iron": 1.88, "potassium": 749.0, "sodium": 11.0, "vitc": 2.3}},
  {"id": "strawberries", "name": "Strawberries", "buy_name": "Strawberries", "product": "Fresh, 1 lb", "group": "Fruits", "type": "Fruit", "price": 2.97, "package_g": 453.6, "edible_yield": 0.94, "cook_yield": 1.0, "waste": 0.25, "cost_per_100g": 0.696555, "bls_cost_per_100g": 0.888088, "serving_g": 152, "serving_desc": "1 cup halves", "max_servings": 2, "meal": [0.5, 0, 0, 0.5], "flags": [], "cup_eq_g": 152, "cap_group": null, "dga_group": "fruit", "dga_serving_g": 152, "refined_serving_g": null, "variety_key": "strawberries", "satfat": 0.015, "ndb": "09316", "per100g": {"kcal": 32.0, "protein": 0.67, "carb": 7.68, "fat": 0.3, "fiber": 2.0, "sugar": 4.89, "calcium": 16.0, "iron": 0.41, "potassium": 153.0, "sodium": 1.0, "vitc": 58.8}},
  {"id": "broccoli", "name": "Broccoli, cooked (from frozen)", "buy_name": "Broccoli (frozen)", "product": "Great Value florets, 12 oz", "group": "Vegetables", "type": "Vegetables", "price": 1.16, "package_g": 340.2, "edible_yield": 1.0, "cook_yield": 0.8818, "waste": 0.18, "cost_per_100g": 0.386682, "bls_cost_per_100g": null, "serving_g": 92, "serving_desc": "1/2 cup cooked", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 184, "cap_group": null, "dga_group": "veg", "dga_serving_g": 184, "refined_serving_g": null, "variety_key": "broccoli", "satfat": 0.018, "ndb": "11095", "per100g": {"kcal": 28.0, "protein": 3.1, "carb": 5.36, "fat": 0.11, "fiber": 3.0, "sugar": 1.47, "calcium": 51.0, "iron": 0.61, "potassium": 180.0, "sodium": 24.0, "vitc": 40.1}},
  {"id": "carrots", "name": "Carrots", "buy_name": "Carrots", "product": "Fresh whole, 2 lb bag", "group": "Vegetables", "type": "Vegetables", "price": 2.26, "package_g": 907.2, "edible_yield": 0.89, "cook_yield": 1.0, "waste": 0.24, "cost_per_100g": 0.279908, "bls_cost_per_100g": null, "serving_g": 128, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0, 0.5], "flags": [], "cup_eq_g": 128, "cap_group": null, "dga_group": "veg", "dga_serving_g": 128, "refined_serving_g": null, "variety_key": "carrots", "satfat": 0.037, "ndb": "11124", "per100g": {"kcal": 41.0, "protein": 0.93, "carb": 9.58, "fat": 0.24, "fiber": 2.8, "sugar": 4.74, "calcium": 33.0, "iron": 0.3, "potassium": 320.0, "sodium": 69.0, "vitc": 5.9}},
  {"id": "green_beans", "name": "Green beans (canned, drained)", "buy_name": "Green beans (canned)", "product": "Great Value cut, 14.5 oz", "group": "Vegetables", "type": "Vegetables", "price": 0.84, "package_g": 411.1, "edible_yield": 1.0, "cook_yield": 0.6818, "waste": 0.18, "cost_per_100g": 0.299692, "bls_cost_per_100g": null, "serving_g": 135, "serving_desc": "1 cup drained", "max_servings": 2.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 135, "cap_group": null, "dga_group": "veg", "dga_serving_g": 135, "refined_serving_g": null, "variety_key": "green_beans", "satfat": 0.103, "ndb": "11056", "per100g": {"kcal": 22.0, "protein": 1.12, "carb": 4.32, "fat": 0.46, "fiber": 1.9, "sugar": 0.78, "calcium": 38.0, "iron": 1.06, "potassium": 96.0, "sodium": 230.0, "vitc": 2.8}},
  {"id": "bell_pepper", "name": "Green bell pepper", "buy_name": "Green bell pepper", "product": "Fresh, each (~145 g)", "group": "Vegetables", "type": "Vegetables", "price": 0.86, "package_g": 145, "edible_yield": 0.82, "cook_yield": 1.0, "waste": 0.24, "cost_per_100g": 0.723297, "bls_cost_per_100g": null, "serving_g": 149, "serving_desc": "1 cup chopped", "max_servings": 1, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 149, "cap_group": null, "dga_group": "veg", "dga_serving_g": 149, "refined_serving_g": null, "variety_key": "bell_pepper", "satfat": 0.058, "ndb": "11333", "per100g": {"kcal": 20.0, "protein": 0.86, "carb": 4.64, "fat": 0.17, "fiber": 1.7, "sugar": 2.4, "calcium": 10.0, "iron": 0.34, "potassium": 175.0, "sodium": 3.0, "vitc": 80.4}},
  {"id": "mixed_veg", "name": "Mixed vegetables, cooked (from frozen)", "buy_name": "Mixed vegetables (frozen)", "product": "Great Value, 32 oz", "group": "Vegetables", "type": "Vegetables", "price": 2.58, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 0.97, "waste": 0.18, "cost_per_100g": 0.293187, "bls_cost_per_100g": null, "serving_g": 91, "serving_desc": "1/2 cup cooked", "max_servings": 3.0, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 182, "cap_group": null, "dga_group": "veg", "dga_serving_g": 182, "refined_serving_g": null, "variety_key": "mixed_veg", "satfat": 0.031, "ndb": "11584", "per100g": {"kcal": 65.0, "protein": 2.86, "carb": 13.09, "fat": 0.15, "fiber": 4.4, "sugar": 3.12, "calcium": 25.0, "iron": 0.82, "potassium": 169.0, "sodium": 35.0, "vitc": 3.2}},
  {"id": "onions", "name": "Onions (yellow)", "buy_name": "Onions (yellow)", "product": "Fresh yellow, 3 lb bag", "group": "Vegetables", "type": "Vegetables", "price": 2.96, "package_g": 1360.8, "edible_yield": 0.9, "cook_yield": 1.0, "waste": 0.24, "cost_per_100g": 0.241688, "bls_cost_per_100g": null, "serving_g": 80, "serving_desc": "1/2 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 160, "cap_group": null, "dga_group": "veg", "dga_serving_g": 160, "refined_serving_g": null, "variety_key": "onions", "satfat": 0.042, "ndb": "11282", "per100g": {"kcal": 40.0, "protein": 1.1, "carb": 9.34, "fat": 0.1, "fiber": 1.7, "sugar": 4.24, "calcium": 23.0, "iron": 0.21, "potassium": 146.0, "sodium": 4.0, "vitc": 7.4}},
  {"id": "romaine", "name": "Romaine lettuce", "buy_name": "Romaine lettuce", "product": "Romaine, per lb (BLS U.S. average)", "group": "Vegetables", "type": "Vegetables", "price": 3.312, "package_g": 453.6, "edible_yield": 0.94, "cook_yield": 1.0, "waste": 0.24, "cost_per_100g": 0.776765, "bls_cost_per_100g": 0.776778, "serving_g": 94, "serving_desc": "2 cups shredded", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 94, "cap_group": null, "dga_group": "veg", "dga_serving_g": 94, "refined_serving_g": null, "variety_key": "romaine", "satfat": 0.039, "ndb": "11251", "per100g": {"kcal": 17.0, "protein": 1.23, "carb": 3.29, "fat": 0.3, "fiber": 2.1, "sugar": 1.19, "calcium": 33.0, "iron": 0.97, "potassium": 247.0, "sodium": 8.0, "vitc": 4.0}},
  {"id": "spinach", "name": "Spinach (fresh)", "buy_name": "Spinach (fresh)", "product": "Marketside, 10 oz bag", "group": "Vegetables", "type": "Vegetables", "price": 1.97, "package_g": 283.5, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.24, "cost_per_100g": 0.694885, "bls_cost_per_100g": null, "serving_g": 60, "serving_desc": "2 cups raw", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 60, "cap_group": null, "dga_group": "veg", "dga_serving_g": 60, "refined_serving_g": null, "variety_key": "spinach", "satfat": 0.063, "ndb": "11457", "per100g": {"kcal": 23.0, "protein": 2.86, "carb": 3.63, "fat": 0.39, "fiber": 2.2, "sugar": 0.42, "calcium": 99.0, "iron": 2.71, "potassium": 558.0, "sodium": 79.0, "vitc": 28.1}},
  {"id": "tomatoes", "name": "Tomatoes (roma)", "buy_name": "Tomatoes (roma)", "product": "Fresh roma, per lb", "group": "Vegetables", "type": "Vegetables", "price": 0.85, "package_g": 453.6, "edible_yield": 0.91, "cook_yield": 1.0, "waste": 0.24, "cost_per_100g": 0.205923, "bls_cost_per_100g": 0.482595, "serving_g": 180, "serving_desc": "1 cup chopped", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": 180, "cap_group": null, "dga_group": "veg", "dga_serving_g": 180, "refined_serving_g": null, "variety_key": "tomatoes", "satfat": 0.028, "ndb": "11529", "per100g": {"kcal": 18.0, "protein": 0.88, "carb": 3.89, "fat": 0.2, "fiber": 1.2, "sugar": 2.63, "calcium": 10.0, "iron": 0.27, "potassium": 237.0, "sodium": 5.0, "vitc": 13.7}},
  {"id": "butter", "name": "Butter (salted)", "buy_name": "Butter (salted)", "product": "Great Value, 2 x 16 oz", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "price": 5.96, "package_g": 907.2, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.17, "cost_per_100g": 0.656966, "bls_cost_per_100g": null, "serving_g": 14.2, "serving_desc": "1 tbsp", "max_servings": 2, "meal": [0.5, 0, 0.5, 0], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "added_fats", "dga_group": "fat", "dga_serving_g": 4.733, "refined_serving_g": null, "variety_key": "butter", "satfat": 51.368, "ndb": "01001", "per100g": {"kcal": 717.0, "protein": 0.85, "carb": 0.06, "fat": 81.11, "fiber": 0.0, "sugar": 0.06, "calcium": 24.0, "iron": 0.02, "potassium": 24.0, "sodium": 643.0, "vitc": 0.0}},
  {"id": "canola_oil", "name": "Canola oil", "buy_name": "Canola oil", "product": "Great Value, 48 fl oz", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "price": 4.08, "package_g": 1308, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.17, "cost_per_100g": 0.311927, "bls_cost_per_100g": null, "serving_g": 14, "serving_desc": "1 tbsp", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "added_fats", "dga_group": "fat", "dga_serving_g": 4.667, "refined_serving_g": null, "variety_key": "canola_oil", "satfat": 7.365, "ndb": "04582", "per100g": {"kcal": 884.0, "protein": 0.0, "carb": 0.0, "fat": 100.0, "fiber": 0.0, "sugar": 0.0, "calcium": 0.0, "iron": 0.0, "potassium": 0.0, "sodium": 0.0, "vitc": 0.0}},
  {"id": "olive_oil", "name": "Olive oil (extra virgin)", "buy_name": "Olive oil (extra virgin)", "product": "Great Value, 51 fl oz", "group": "Fats, Oils & Nuts", "type": "Oils & Fats", "price": 17.87, "package_g": 1377.0, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.17, "cost_per_100g": 1.297749, "bls_cost_per_100g": null, "serving_g": 13.5, "serving_desc": "1 tbsp", "max_servings": 3, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": "added_fats", "dga_group": "fat", "dga_serving_g": 4.5, "refined_serving_g": null, "variety_key": "olive_oil", "satfat": 13.808, "ndb": "04053", "per100g": {"kcal": 884.0, "protein": 0.0, "carb": 0.0, "fat": 100.0, "fiber": 0.0, "sugar": 0.0, "calcium": 1.0, "iron": 0.56, "potassium": 1.0, "sodium": 2.0, "vitc": 0.0}},
  {"id": "almonds", "name": "Almonds", "buy_name": "Almonds", "product": "Great Value whole, 16 oz", "group": "Fats, Oils & Nuts", "type": "Nuts & Seeds", "price": 9.48, "package_g": 453.6, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.09, "cost_per_100g": 2.089947, "bls_cost_per_100g": null, "serving_g": 28, "serving_desc": "1 oz (~23 almonds)", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": null, "cap_group": null, "dga_group": "protein", "dga_serving_g": 28, "refined_serving_g": null, "variety_key": "almonds", "satfat": 3.802, "ndb": "12061", "per100g": {"kcal": 579.0, "protein": 21.15, "carb": 21.55, "fat": 49.93, "fiber": 12.5, "sugar": 4.35, "calcium": 269.0, "iron": 3.71, "potassium": 733.0, "sodium": 1.0, "vitc": 0.0}},
  {"id": "avocado", "name": "Avocado (Hass)", "buy_name": "Avocado (Hass)", "product": "Fresh, each (~203 g)", "group": "Fats, Oils & Nuts", "type": "Nuts & Seeds", "price": 0.87, "package_g": 203, "edible_yield": 0.67, "cook_yield": 1.0, "waste": 0.25, "cost_per_100g": 0.639659, "bls_cost_per_100g": null, "serving_g": 68, "serving_desc": "1/2 avocado", "max_servings": 2, "meal": [0, 0.5, 0.5, 0], "flags": [], "cup_eq_g": null, "cap_group": null, "dga_group": null, "dga_serving_g": null, "refined_serving_g": null, "variety_key": "avocado", "satfat": 2.126, "ndb": "09038", "per100g": {"kcal": 167.0, "protein": 1.96, "carb": 8.64, "fat": 15.41, "fiber": 6.8, "sugar": 0.3, "calcium": 13.0, "iron": 0.61, "potassium": 507.0, "sodium": 8.0, "vitc": 8.8}},
  {"id": "cookies", "name": "Chocolate chip cookies", "buy_name": "Chocolate chip cookies", "product": "Great Value chewy, 13 oz", "group": "Snacks & Sweets", "type": "Snacks", "price": 3.02, "package_g": 368.5, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.819539, "bls_cost_per_100g": 1.135823, "serving_g": 26, "serving_desc": "2 cookies", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": ["gluten", "dairy", "egg"], "cup_eq_g": null, "cap_group": "snacks", "dga_group": null, "dga_serving_g": null, "refined_serving_g": null, "variety_key": "cookies", "satfat": 8.091, "ndb": "18159", "per100g": {"kcal": 492.0, "protein": 5.1, "carb": 65.36, "fat": 24.72, "fiber": 2.0, "sugar": 32.9, "calcium": 21.0, "iron": 5.58, "potassium": 171.0, "sodium": 311.0, "vitc": 0.0}},
  {"id": "granola_bar", "name": "Granola bars (chocolate chip)", "buy_name": "Granola bars (chocolate chip)", "product": "Great Value chewy, 10 ct", "group": "Snacks & Sweets", "type": "Snacks", "price": 2.28, "package_g": 238.1, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.957581, "bls_cost_per_100g": null, "serving_g": 24, "serving_desc": "1 bar", "max_servings": 2, "meal": [0, 0, 0, 1], "flags": ["gluten", "dairy"], "cup_eq_g": null, "cap_group": "snacks", "dga_group": null, "dga_serving_g": null, "refined_serving_g": null, "variety_key": "granola_bar", "satfat": 6.061, "ndb": "19404", "per100g": {"kcal": 418.0, "protein": 5.65, "carb": 70.2, "fat": 16.57, "fiber": 3.8, "sugar": 28.92, "calcium": 41.0, "iron": 2.19, "potassium": 237.0, "sodium": 251.0, "vitc": 0.0}},
  {"id": "chips", "name": "Potato chips", "buy_name": "Potato chips", "product": "Great Value original, 8 oz", "group": "Snacks & Sweets", "type": "Snacks", "price": 1.87, "package_g": 226.8, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.18, "cost_per_100g": 0.824515, "bls_cost_per_100g": 1.470044, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": [], "cup_eq_g": null, "cap_group": "snacks", "dga_group": null, "dga_serving_g": null, "refined_serving_g": null, "variety_key": "chips", "satfat": 3.4, "ndb": "19411", "per100g": {"kcal": 532.0, "protein": 6.39, "carb": 53.83, "fat": 33.98, "fiber": 3.1, "sugar": 0.33, "calcium": 21.0, "iron": 1.28, "potassium": 1196.0, "sodium": 527.0, "vitc": 21.6}},
  {"id": "ice_cream", "name": "Vanilla ice cream", "buy_name": "Vanilla ice cream", "product": "Great Value, 48 fl oz", "group": "Snacks & Sweets", "type": "Snacks", "price": 3.12, "package_g": 792, "edible_yield": 1.0, "cook_yield": 1.0, "waste": 0.19, "cost_per_100g": 0.393939, "bls_cost_per_100g": 0.561648, "serving_g": 66, "serving_desc": "1/2 cup", "max_servings": 1, "meal": [0, 0, 0, 1], "flags": ["dairy"], "cup_eq_g": null, "cap_group": "snacks", "dga_group": null, "dga_serving_g": null, "refined_serving_g": null, "variety_key": "ice_cream", "satfat": 6.79, "ndb": "19095", "per100g": {"kcal": 207.0, "protein": 3.5, "carb": 23.6, "fat": 11.0, "fiber": 0.7, "sugar": 21.22, "calcium": 128.0, "iron": 0.09, "potassium": 199.0, "sodium": 80.0, "vitc": 0.6}}
];


const BIG = 1e9;
const EPS = 1e-9;

/** A diet by name (from config/diets.json), or pass a diet object to try a custom one without rebuilding:
 *  { name, desc, protein: [0.10, 0.35], carb: [0.45, 0.65], fat: [0.20, 0.35], forbid: ["pork"], forbid_foods: ["almonds"] } */
export function getDiet(name) {
  if (name && typeof name === "object") {   // missing macro ranges fall back to Balanced's
    const base = DIETS.find((x) => x.name === "Balanced") || {};
    return { protein: base.protein, carb: base.carb, fat: base.fat, name: "Custom", desc: "", forbid: [], forbid_foods: [], ...name };
  }
  const d = DIETS.find((x) => x.name.toLowerCase() === String(name || "Balanced").toLowerCase());
  if (!d) throw new Error(`Unknown diet "${name}". Options: ${DIETS.map((x) => x.name).join(", ")}`);
  return d;
}

/** $ per 100 g AS EATEN. priceSource 'bls' uses the BLS U.S. average where one exists. With waste on, the cost
 *  covers the food that is bought but never eaten (USDA ERS household loss rate for the food's group). */
export function costPer100g(food, { prices = {}, priceSource = "walmart" } = {}, waste = false) {
  let c = food.cost_per_100g;
  if (prices[food.id] != null) c = (prices[food.id] / (food.package_g * food.edible_yield * (food.cook_yield || 1))) * 100;
  else if (priceSource === "bls" && food.bls_cost_per_100g != null) c = food.bls_cost_per_100g;
  return waste ? c / (1 - (food.waste || 0)) : c;
}

/** Dietary Guidelines calorie level used for a calorie target: nearest 200 kcal, within the table (1,000-3,200). */
export function dgaLevel(kcal, table = DGA_SERVINGS) {
  const levels = Object.keys(table).map(Number).sort((a, b) => a - b);
  const want = Math.round(kcal / 200) * 200;
  return Math.min(levels[levels.length - 1], Math.max(levels[0], want));
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
 *            prices: {foodId: package price}, priceSource: 'walmart'|'bls', settings: {...overrides} }
 */
export function buildModel(targets, prefs = {}) {
  const diet = getDiet(prefs.diet);
  const S = { ...SETTINGS, ...(prefs.settings || {}) };
  S.meal_kcal = { ...SETTINGS.meal_kcal, ...((prefs.settings || {}).meal_kcal || {}) };
  const kcal = Number(targets.calories);
  if (!(kcal > 0)) throw new Error("targets.calories is required");

  const realistic = S.realistic !== false;
  const foods = FOODS.filter((f) => isAllowed(f, diet, prefs.exclude || []))
    .map((f) => ({ ...f, cost100: costPer100g(f, prefs, realistic && S.include_waste !== false) }));
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
  // 4. Food groups. REALISTIC: Dietary Guidelines servings for the calorie level (rows of D), half grains whole,
  //    saturated fat < 10% of calories. TEXTBOOK: vegetable and fruit cup-equivalent minimums only.
  const notes = [], groupTargets = {};
  const level = dgaLevel(kcal);
  if (realistic) {
    const pattern = DGA_SERVINGS[String(level)];
    Object.entries(pattern).forEach(([g, amt]) => {
      const [lo, hi] = Array.isArray(amt) ? amt : [amt, null];
      const row = foods.map((f) => (f.dga_group === g ? 100 / f.dga_serving_g : 0));
      const n = new Set(foods.filter((f) => f.dga_group === g).map((f) => f.variety_key || f.id)).size;   // distinct choices
      if (!n) { notes.push(`${DGA_GROUP_LABELS[g]}: this diet allows no foods in the group, so its ${lo}-serving guideline is skipped.`); return; }
      groupTargets[g] = { lo, hi, n };
      add(row, ">=", lo, `${g} servings >= ${lo}`, "guideline");
      if (hi != null) add(row.slice(), "<=", hi, `${g} servings <= ${hi}`, "guideline");
    });
    const refined = foods.map((f) => (f.refined_serving_g ? 100 / f.refined_serving_g : f.dga_group === "wgrain" ? -100 / f.dga_serving_g : 0));
    if (refined.some((v) => v > 0)) add(refined, "<=", 0, "refined grains <= whole grains", "guideline");
    const sf = S.max_satfat_share ?? 0.1;
    add(foods.map((f, j) => 9 * f.satfat - sf * e[j]), "<=", 0, `saturated fat <= ${Math.round(sf * 100)}% of kcal`, "guideline");
  } else {
    const cupRow = (types) => foods.map((f) => (types.includes(f.type) ? 100 / f.cup_eq_g : 0));
    if (S.min_veg_cups > 0) add(cupRow(["Vegetables"]), ">=", S.min_veg_cups, `vegetables >= ${S.min_veg_cups} cup-eq`, "group");
    if (S.min_fruit_cups > 0) add(cupRow(["Fruit"]), ">=", S.min_fruit_cups, `fruit >= ${S.min_fruit_cups} cup-eq`, "group");
  }
  GROUP_CAPS.forEach((g) => {
    const cap = (S.group_caps || {})[g.key];
    if (cap == null) return;
    const row = foods.map((f) => (f.cap_group !== g.key ? 0 : g.unit === "grams" ? 100 : 100 / f.serving_g));
    if (row.some((v) => v)) add(row, "<=", cap, `${g.key} <= ${cap} ${g.unit}`, "group");
  });
  // 5. Portion caps and must-include foods (rows of the identity matrix)
  const caps = prefs.maxServings || {}, must = prefs.mustInclude || {};
  const variety = realistic ? Number(S.variety ?? 1) : 1;
  const u = foods.map((f) => {
    let cap = (f.serving_g * (caps[f.id] ?? f.max_servings)) / 100;
    const t = groupTargets[f.dga_group];
    if (t && variety < 1 && !caps[f.id]) cap = Math.min(cap, (Math.max(variety, 1 / t.n) * t.lo * f.dga_serving_g) / 100);
    return cap;
  });
  // near-duplicates (whole and 2% milk; 80/20 and 93/7 beef) share one variety slot: their servings together <= the cap
  if (realistic && variety < 1) {
    const slots = {};
    foods.forEach((f, j) => { if (f.variety_key && f.variety_key !== f.id && groupTargets[f.dga_group]) (slots[f.variety_key] ||= []).push(j); });
    Object.entries(slots).forEach(([key, js]) => {
      if (js.length < 2) return;
      const t = groupTargets[foods[js[0]].dga_group];
      add(foods.map((f, j) => (js.includes(j) ? 100 / f.dga_serving_g : 0)), "<=", Math.max(variety, 1 / t.n) * t.lo,
        `${key} (all kinds) <= ${Math.round(Math.max(variety, 1 / t.n) * 100)}% of ${foods[js[0]].dga_group}`, "variety");
    });
  }
  foods.forEach((f, j) => {
    const row = new Array(n).fill(0); row[j] = 1;
    add(row, "<=", u[j], `${f.id} <= cap`, "cap");
    if (must[f.id]) add(row.slice(), ">=", (f.serving_g * must[f.id]) / 100, `${f.id} >= must-include`, "must");
  });
  return { diet, settings: S, realistic, level, groupTargets, notes, foods, keys, A, c: foods.map((f) => f.cost100), u,
    rows, senses, rhs, labels, kinds };
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
  const stages = [["guideline", "The Dietary Guidelines servings for your calorie level (protein foods, dairy, vegetables, fruits, whole grains, healthy fats), half grains whole, or saturated fat under 10% cannot all be met with the allowed foods. Allow more foods, or switch to the textbook model."],
    ["variety", "The variety rule (whole and 2% milk, or the two ground beefs, count as one choice) cannot be met. Choose less variety or allow more foods."],
    ["macro", `The ${model.diet.name} diet's macro split cannot be met together with the nutrient targets.`],
    ["must", "Your must-include foods conflict with the nutrient targets."],
    ["share", "The protein-diversity rule (no food above the max share of protein) cannot be met. Allow more protein foods or raise the max share."],
    ["meal", "The meal-balance rules (calories and protein per meal) cannot be met. Relax the meal ranges or allow more breakfast foods."]];
  const on = new Set(["cap", "group", "nutrient"]);   // stages switch on one rule set at a time
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
  const info = { diet: model.diet.name, realistic: model.realistic, level: model.level, notes: model.notes,
    variety: model.realistic ? Number(model.settings.variety ?? 1) : 1 };
  if (sol.status !== "optimal")
    return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], ...info };
  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const totals = Object.fromEntries(model.keys.map((k, i) => [k, model.A[i].reduce((s, v, j) => s + v * x[j], 0)]));
  totals.satfat = model.foods.reduce((s, f, j) => s + f.satfat * x[j], 0);
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
  const groups = Object.fromEntries(Object.entries(model.groupTargets).map(([g, t]) => [g, { ...t, label: DGA_GROUP_LABELS[g],
    servings: model.foods.reduce((s, f, j) => s + (f.dga_group === g ? (x[j] * 100) / f.dga_serving_g : 0), 0) }]));
  return { status: "optimal", ...info, costPerDay: sol.objective, costPerWeek: sol.objective * 7,
    plan, meals, totals, groups, shopping: shoppingList(model, x, prefs), pivots: sol.pivots,
    model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, x, constraints: model.labels.length } };
}

/** One week of the plan as a shopping list: grams as eaten -> grams as bought (undo cooking, peel/bone, and waste)
 *  -> whole packages. `firstTrip` is what the first week costs at the register; staples (rice, oil, peanut butter)
 *  then last several weeks, so the ongoing cost per week is the plan's cost. */
export function shoppingList(model, x, prefs = {}) {
  const waste = model.realistic && model.settings.include_waste !== false;
  const items = model.foods.map((f, j) => {
    if (x[j] * 100 < 0.5) return null;
    const eatenWeek = 7 * x[j] * 100;
    const buyG = eatenWeek / (f.cook_yield || 1) / f.edible_yield / (waste ? 1 - (f.waste || 0) : 1);
    const price = prefs.prices?.[f.id] ?? f.price;
    const packages = Math.max(1, Math.ceil(buyG / f.package_g - 1e-9));
    return { id: f.id, food: f.buy_name || f.name, eatenWeek, buyG, packages, price, packageG: f.package_g,
      checkout: packages * price, weeks: (packages * f.package_g) / buyG, weekly: (buyG / f.package_g) * price };
  }).filter(Boolean).sort((a, b) => b.checkout - a.checkout);
  return { items, firstTrip: items.reduce((s, r) => s + r.checkout, 0), perWeek: items.reduce((s, r) => s + r.weekly, 0), waste };
}

/** USDA Food Plans (Cost of Food at Home) for a person's age and sex, $ per week. */
export function usdaFoodPlans(age, sex) {
  const P = USDA_FOOD_PLANS, s = sex === "female" ? "female" : "male";
  const tfp = age <= 19 ? "14-19" : age <= 50 ? "20-50" : age <= 70 ? "51-70" : "71+";
  const oth = age <= 18 ? "14-18" : age <= 50 ? "19-50" : age <= 70 ? "51-70" : "71+";
  return { month: P.month, thrifty: P.thrifty[s][tfp], low: P.low[s][oth], moderate: P.moderate[s][oth], liberal: P.liberal[s][oth],
    note: "One person in a 4-person household; USDA adds 20% for someone living alone." };
}

/**
 * Plan with a weekly budget. The realistic plan has a variety rule: one food may supply at most v of its food group's
 * daily servings. A smaller v forces more different foods into each group, which costs more. This tries v = 1 (no
 * variety rule), 1/2, 1/3, 1/4, 1/5 and returns the most varied plan whose weekly cost fits the budget: a
 * parametric linear program, one Simplex solve per level. If even v = 1 is over budget, it says by how much.
 */
export const VARIETY_LEVELS = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5];
export function planWithBudget(targets, prefs = {}, weeklyBudget) {
  const budget = Number(weeklyBudget);
  const realistic = (prefs.settings || {}).realistic ?? SETTINGS.realistic;
  const levels = realistic === false ? [1] : VARIETY_LEVELS;
  const runs = levels.map((v) => ({ variety: v, result: optimizeDiet(targets, { ...prefs, settings: { ...(prefs.settings || {}), variety: v } }) }));
  const ok = runs.filter((r) => r.result.status === "optimal");
  const summary = runs.map((r) => ({ variety: r.variety, foodsPerGroup: Math.round(1 / r.variety), status: r.result.status,
    costPerWeek: r.result.status === "optimal" ? r.result.costPerWeek : null }));
  if (!ok.length) return { status: "infeasible", budget, levels: summary, result: runs[0].result };
  if (!(budget > 0)) { const pick = ok.find((r) => Math.abs(r.variety - (SETTINGS.variety ?? 0.5)) < 1e-9) || ok[0];
    return { status: "no_budget", budget: null, levels: summary, chosen: pick.variety, result: pick.result }; }
  const fits = ok.filter((r) => r.result.costPerWeek <= budget + 1e-9);
  if (!fits.length) return { status: "over_budget", budget, levels: summary, chosen: ok[0].variety, result: ok[0].result,
    shortBy: ok[0].result.costPerWeek - budget };
  const best = fits[fits.length - 1];              // levels are ordered least -> most varied
  return { status: "within_budget", budget, levels: summary, chosen: best.variety, result: best.result,
    leftover: budget - best.result.costPerWeek };
}
