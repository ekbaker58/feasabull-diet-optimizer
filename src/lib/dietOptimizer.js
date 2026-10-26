/**
 * FeasaBULL diet optimizer — linear programming solved with the Simplex method.
 * Team 9 (Sinister Seven), EGN4450, USF, Fall 2026.
 *
 * THE MODEL (matrix form)
 *   x  (n x 1)  diet vector: x_j = amount of food j eaten per day, in 100 g units
 *   c  (n x 1)  cost vector: c_j = $ per 100 g edible portion of food j
 *   A  (m x n)  nutrient matrix: A_ij = amount of nutrient i in 100 g of food j
 *   b_min, b_max (m x 1)  daily nutrient targets from the calculator
 *
 *   minimize    c^T x                 (total cost per day)
 *   subject to  A x >= b_min          (meet every minimum)
 *               A x <= b_max          (stay under every maximum)
 *               0 <= x <= u           (portion caps / food exclusions)
 *
 * THE SOLVER
 *   Two-phase Simplex on a dense tableau. Every pivot is a Gauss-Jordan step made of
 *   elementary row operations (scale the pivot row, then subtract multiples of it
 *   from every other row). Bland's rule picks entering/leaving variables so the
 *   method cannot cycle.
 *
 * DATA
 *   Prices: U.S. Bureau of Labor Statistics, Average Price Data, U.S. city average, September 2026.
 *   Nutrients: USDA National Nutrient Database for Standard Reference, Release 28 (SR28),
 *   per 100 g edible portion. Prices are converted to $ per 100 g EDIBLE portion using
 *   USDA refuse percentages (bone, peel, shell).
 */

export const PRICE_SOURCE = "BLS Average Price Data, U.S. city average, September 2026";
export const NUTRIENT_SOURCE = "USDA National Nutrient Database for Standard Reference, Release 28";

export const NUTRIENTS = [{"key": "kcal", "label": "Calories", "unit": "kcal"}, {"key": "protein", "label": "Protein", "unit": "g"}, {"key": "carb", "label": "Carbohydrate", "unit": "g"}, {"key": "fat", "label": "Fat", "unit": "g"}, {"key": "fiber", "label": "Fiber", "unit": "g"}, {"key": "sugar", "label": "Total sugars", "unit": "g"}, {"key": "calcium", "label": "Calcium", "unit": "mg"}, {"key": "iron", "label": "Iron", "unit": "mg"}, {"key": "potassium", "label": "Potassium", "unit": "mg"}, {"key": "sodium", "label": "Sodium", "unit": "mg"}, {"key": "vitc", "label": "Vitamin C", "unit": "mg"}];

// price = BLS Sep-2026 U.S. city average in price_unit (null = not priced by BLS; pass prefs.prices to fill in)
// purchase_g = grams per price unit as bought; edible_yield = 1 - USDA refuse fraction; per100g = USDA SR28 per 100 g edible
export const FOODS = [
  {"id": "rice", "name": "White rice (dry)", "category": "Grains", "price": 1.118, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 46, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 4, "tags": [], "ndb": "20044", "bls_item": "Rice, white, long grain, uncooked", "per100g": {"kcal": 365.0, "protein": 7.13, "carb": 79.95, "fat": 0.66, "fiber": 1.3, "sugar": 0.12, "calcium": 28.0, "iron": 4.31, "potassium": 115.0, "sodium": 5.0, "vitc": 0.0}},
  {"id": "pasta", "name": "Spaghetti / macaroni (dry)", "category": "Grains", "price": 1.375, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 57, "serving_desc": "2 oz dry", "max_servings": 3, "tags": [], "ndb": "20120", "bls_item": "Spaghetti and macaroni", "per100g": {"kcal": 371.0, "protein": 13.04, "carb": 74.67, "fat": 1.51, "fiber": 3.2, "sugar": 2.67, "calcium": 21.0, "iron": 3.3, "potassium": 223.0, "sodium": 6.0, "vitc": 0.0}},
  {"id": "bread", "name": "White bread", "category": "Grains", "price": 1.83, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 29, "serving_desc": "1 slice", "max_servings": 6, "tags": ["may-contain-dairy"], "ndb": "18069", "bls_item": "Bread, white, pan", "per100g": {"kcal": 266.0, "protein": 8.85, "carb": 49.42, "fat": 3.33, "fiber": 2.7, "sugar": 5.67, "calcium": 144.0, "iron": 3.61, "potassium": 126.0, "sodium": 490.0, "vitc": 0.0}},
  {"id": "flour", "name": "All-purpose flour", "category": "Grains", "price": 0.545, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 31, "serving_desc": "1/4 cup", "max_servings": 3, "tags": [], "ndb": "20081", "bls_item": "Flour, white, all purpose", "per100g": {"kcal": 364.0, "protein": 10.33, "carb": 76.31, "fat": 0.98, "fiber": 2.7, "sugar": 0.27, "calcium": 15.0, "iron": 4.64, "potassium": 107.0, "sodium": 2.0, "vitc": 0.0}},
  {"id": "beans", "name": "Dried pinto beans", "category": "Legumes", "price": 1.669, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 48, "serving_desc": "1/4 cup dry (~3/4 cup cooked)", "max_servings": 4, "tags": [], "ndb": "16042", "bls_item": "Beans, dried, any type, all sizes", "per100g": {"kcal": 347.0, "protein": 21.42, "carb": 62.55, "fat": 1.23, "fiber": 15.5, "sugar": 2.11, "calcium": 113.0, "iron": 5.07, "potassium": 1393.0, "sodium": 12.0, "vitc": 6.3}},
  {"id": "ground_beef", "name": "Ground beef (regular)", "category": "Meat", "price": 6.792, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "tags": ["meat"], "ndb": "23572", "bls_item": "Ground beef, 100% beef", "per100g": {"kcal": 254.0, "protein": 17.17, "carb": 0.0, "fat": 20.0, "fiber": 0.0, "sugar": 0.0, "calcium": 18.0, "iron": 1.94, "potassium": 270.0, "sodium": 66.0, "vitc": 0.0}},
  {"id": "lean_beef", "name": "Ground beef (lean)", "category": "Meat", "price": 8.461, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "tags": ["meat"], "ndb": "23562", "bls_item": "Ground beef, lean and extra lean", "per100g": {"kcal": 176.0, "protein": 20.0, "carb": 0.0, "fat": 10.0, "fiber": 0.0, "sugar": 0.0, "calcium": 12.0, "iron": 2.24, "potassium": 321.0, "sodium": 66.0, "vitc": 0.0}},
  {"id": "sirloin", "name": "Sirloin steak", "category": "Meat", "price": 14.106, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.97, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "tags": ["meat"], "ndb": "13931", "bls_item": "Steak, sirloin, USDA Choice, boneless", "per100g": {"kcal": 214.0, "protein": 19.92, "carb": 0.0, "fat": 14.28, "fiber": 0.0, "sugar": 0.0, "calcium": 25.0, "iron": 1.46, "potassium": 309.0, "sodium": 51.0, "vitc": 0.0}},
  {"id": "bacon", "name": "Bacon", "category": "Meat", "price": 6.756, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 28, "serving_desc": "1 slice raw", "max_servings": 3, "tags": ["meat", "pork"], "ndb": "10123", "bls_item": "Bacon, sliced", "per100g": {"kcal": 417.0, "protein": 12.62, "carb": 1.28, "fat": 39.69, "fiber": 0.0, "sugar": 1.0, "calcium": 5.0, "iron": 0.41, "potassium": 198.0, "sodium": 662.0, "vitc": 0.0}},
  {"id": "pork_chops", "name": "Pork chops (boneless)", "category": "Meat", "price": 4.55, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 2, "tags": ["meat", "pork"], "ndb": "10164", "bls_item": "Chops, boneless", "per100g": {"kcal": 201.0, "protein": 21.14, "carb": 0.0, "fat": 12.96, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.48, "potassium": 345.0, "sodium": 82.0, "vitc": 0.0}},
  {"id": "ham", "name": "Ham (boneless)", "category": "Meat", "price": 5.45, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 56, "serving_desc": "2 slices", "max_servings": 2, "tags": ["meat", "pork"], "ndb": "07029", "bls_item": "Ham, boneless, excluding canned", "per100g": {"kcal": 163.0, "protein": 16.6, "carb": 3.83, "fat": 8.6, "fiber": 1.3, "sugar": 0.0, "calcium": 24.0, "iron": 1.02, "potassium": 287.0, "sodium": 1143.0, "vitc": 4.0}},
  {"id": "whole_chicken", "name": "Whole chicken", "category": "Poultry", "price": 2.064, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.68, "serving_g": 113, "serving_desc": "4 oz raw meat & skin", "max_servings": 2, "tags": ["meat"], "ndb": "05006", "bls_item": "Chicken, fresh, whole", "per100g": {"kcal": 215.0, "protein": 18.6, "carb": 0.0, "fat": 15.06, "fiber": 0.0, "sugar": 0.0, "calcium": 11.0, "iron": 0.9, "potassium": 189.0, "sodium": 70.0, "vitc": 1.6}},
  {"id": "chicken_breast", "name": "Chicken breast (boneless)", "category": "Poultry", "price": 4.203, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 113, "serving_desc": "4 oz raw", "max_servings": 3, "tags": ["meat"], "ndb": "05062", "bls_item": "Chicken breast, boneless", "per100g": {"kcal": 120.0, "protein": 22.5, "carb": 0.0, "fat": 2.62, "fiber": 0.0, "sugar": 0.0, "calcium": 5.0, "iron": 0.37, "potassium": 334.0, "sodium": 45.0, "vitc": 0.0}},
  {"id": "chicken_legs", "name": "Chicken legs (bone-in)", "category": "Poultry", "price": 1.739, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.73, "serving_g": 113, "serving_desc": "4 oz raw meat & skin", "max_servings": 2, "tags": ["meat"], "ndb": "05075", "bls_item": "Chicken legs, bone-in", "per100g": {"kcal": 214.0, "protein": 16.37, "carb": 0.17, "fat": 15.95, "fiber": 0.0, "sugar": 0.0, "calcium": 9.0, "iron": 0.69, "potassium": 203.0, "sodium": 84.0, "vitc": 0.2}},
  {"id": "eggs", "name": "Eggs (large)", "category": "Eggs & Dairy", "price": 2.272, "price_unit": "per dozen", "purchase_g": 681.8182, "edible_yield": 0.88, "serving_g": 50, "serving_desc": "1 large egg", "max_servings": 4, "tags": ["egg"], "ndb": "01123", "bls_item": "Eggs, grade A, large", "per100g": {"kcal": 143.0, "protein": 12.56, "carb": 0.72, "fat": 9.51, "fiber": 0.0, "sugar": 0.37, "calcium": 56.0, "iron": 1.75, "potassium": 138.0, "sodium": 142.0, "vitc": 0.0}},
  {"id": "milk", "name": "Whole milk", "category": "Eggs & Dairy", "price": 4.106, "price_unit": "per gallon", "purchase_g": 3904, "edible_yield": 1.0, "serving_g": 244, "serving_desc": "1 cup", "max_servings": 4, "tags": ["dairy"], "ndb": "01077", "bls_item": "Milk, fresh, whole, fortified", "per100g": {"kcal": 61.0, "protein": 3.15, "carb": 4.8, "fat": 3.25, "fiber": 0.0, "sugar": 5.05, "calcium": 113.0, "iron": 0.03, "potassium": 132.0, "sodium": 43.0, "vitc": 0.0}},
  {"id": "cheddar", "name": "Cheddar cheese", "category": "Eggs & Dairy", "price": 6.133, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 3, "tags": ["dairy"], "ndb": "01009", "bls_item": "Cheddar cheese, natural", "per100g": {"kcal": 404.0, "protein": 22.87, "carb": 3.09, "fat": 33.31, "fiber": 0.0, "sugar": 0.48, "calcium": 710.0, "iron": 0.14, "potassium": 76.0, "sodium": 653.0, "vitc": 0.0}},
  {"id": "american", "name": "American cheese", "category": "Eggs & Dairy", "price": 4.737, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 28, "serving_desc": "1 slice", "max_servings": 3, "tags": ["dairy"], "ndb": "01042", "bls_item": "American processed cheese", "per100g": {"kcal": 366.0, "protein": 18.13, "carb": 4.78, "fat": 30.71, "fiber": 0.0, "sugar": 2.26, "calcium": 1045.0, "iron": 0.63, "potassium": 132.0, "sodium": 1671.0, "vitc": 0.0}},
  {"id": "ice_cream", "name": "Vanilla ice cream", "category": "Snacks & Sweets", "price": 5.931, "price_unit": "per 1/2 gallon", "purchase_g": 1056, "edible_yield": 1.0, "serving_g": 66, "serving_desc": "1/2 cup", "max_servings": 2, "tags": ["dairy"], "ndb": "19095", "bls_item": "Ice cream, prepackaged, bulk, regular", "per100g": {"kcal": 207.0, "protein": 3.5, "carb": 23.6, "fat": 11.0, "fiber": 0.7, "sugar": 21.22, "calcium": 128.0, "iron": 0.09, "potassium": 199.0, "sodium": 80.0, "vitc": 0.6}},
  {"id": "bananas", "name": "Bananas", "category": "Fruit", "price": 0.656, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.64, "serving_g": 118, "serving_desc": "1 medium", "max_servings": 3, "tags": [], "ndb": "09040", "bls_item": "Bananas", "per100g": {"kcal": 89.0, "protein": 1.09, "carb": 22.84, "fat": 0.33, "fiber": 2.6, "sugar": 12.23, "calcium": 5.0, "iron": 0.26, "potassium": 358.0, "sodium": 1.0, "vitc": 8.7}},
  {"id": "oranges", "name": "Navel oranges", "category": "Fruit", "price": 1.723, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.68, "serving_g": 140, "serving_desc": "1 orange", "max_servings": 3, "tags": [], "ndb": "09202", "bls_item": "Oranges, Navel", "per100g": {"kcal": 49.0, "protein": 0.91, "carb": 12.54, "fat": 0.15, "fiber": 2.2, "sugar": 8.5, "calcium": 43.0, "iron": 0.13, "potassium": 166.0, "sodium": 1.0, "vitc": 59.1}},
  {"id": "strawberries", "name": "Strawberries", "category": "Fruit", "price": 2.84, "price_unit": "per 12 oz", "purchase_g": 340.2, "edible_yield": 0.94, "serving_g": 152, "serving_desc": "1 cup halves", "max_servings": 2, "tags": [], "ndb": "09316", "bls_item": "Strawberries, dry pint", "per100g": {"kcal": 32.0, "protein": 0.67, "carb": 7.68, "fat": 0.3, "fiber": 2.0, "sugar": 4.89, "calcium": 16.0, "iron": 0.41, "potassium": 153.0, "sodium": 1.0, "vitc": 58.8}},
  {"id": "potatoes", "name": "White potatoes", "category": "Vegetables", "price": 0.989, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.75, "serving_g": 150, "serving_desc": "1 cup diced", "max_servings": 3, "tags": [], "ndb": "11352", "bls_item": "Potatoes, white", "per100g": {"kcal": 77.0, "protein": 2.05, "carb": 17.49, "fat": 0.09, "fiber": 2.1, "sugar": 0.82, "calcium": 12.0, "iron": 0.81, "potassium": 425.0, "sodium": 6.0, "vitc": 19.7}},
  {"id": "iceberg", "name": "Iceberg lettuce", "category": "Vegetables", "price": 1.636, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.95, "serving_g": 72, "serving_desc": "1 cup shredded", "max_servings": 4, "tags": [], "ndb": "11252", "bls_item": "Lettuce, iceberg", "per100g": {"kcal": 14.0, "protein": 0.9, "carb": 2.97, "fat": 0.14, "fiber": 1.2, "sugar": 1.97, "calcium": 18.0, "iron": 0.41, "potassium": 141.0, "sodium": 10.0, "vitc": 2.8}},
  {"id": "romaine", "name": "Romaine lettuce", "category": "Vegetables", "price": 3.312, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.94, "serving_g": 47, "serving_desc": "1 cup shredded", "max_servings": 4, "tags": [], "ndb": "11251", "bls_item": "Lettuce, romaine", "per100g": {"kcal": 17.0, "protein": 1.23, "carb": 3.29, "fat": 0.3, "fiber": 2.1, "sugar": 1.19, "calcium": 33.0, "iron": 0.97, "potassium": 247.0, "sodium": 8.0, "vitc": 4.0}},
  {"id": "tomatoes", "name": "Tomatoes", "category": "Vegetables", "price": 1.992, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.91, "serving_g": 180, "serving_desc": "1 cup chopped", "max_servings": 2, "tags": [], "ndb": "11529", "bls_item": "Tomatoes, field grown", "per100g": {"kcal": 18.0, "protein": 0.88, "carb": 3.89, "fat": 0.2, "fiber": 1.2, "sugar": 2.63, "calcium": 10.0, "iron": 0.27, "potassium": 237.0, "sodium": 5.0, "vitc": 13.7}},
  {"id": "sugar", "name": "White sugar", "category": "Snacks & Sweets", "price": 1.019, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 4.2, "serving_desc": "1 tsp", "max_servings": 6, "tags": [], "ndb": "19335", "bls_item": "Sugar, white, all sizes", "per100g": {"kcal": 387.0, "protein": 0.0, "carb": 99.98, "fat": 0.0, "fiber": 0.0, "sugar": 99.8, "calcium": 1.0, "iron": 0.05, "potassium": 2.0, "sodium": 1.0, "vitc": 0.0}},
  {"id": "cookies", "name": "Chocolate chip cookies", "category": "Snacks & Sweets", "price": 5.152, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 25.8, "serving_desc": "2 cookies", "max_servings": 2, "tags": ["contains-dairy-egg"], "ndb": "18159", "bls_item": "Cookies, chocolate chip", "per100g": {"kcal": 492.0, "protein": 5.1, "carb": 65.36, "fat": 24.72, "fiber": 2.0, "sugar": 32.9, "calcium": 21.0, "iron": 5.58, "potassium": 171.0, "sodium": 311.0, "vitc": 0.0}},
  {"id": "chips", "name": "Potato chips", "category": "Snacks & Sweets", "price": 6.668, "price_unit": "per 16 oz", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 28, "serving_desc": "1 oz", "max_servings": 2, "tags": [], "ndb": "19411", "bls_item": "Potato chips", "per100g": {"kcal": 532.0, "protein": 6.39, "carb": 53.83, "fat": 33.98, "fiber": 3.1, "sugar": 0.33, "calcium": 21.0, "iron": 1.28, "potassium": 1196.0, "sodium": 527.0, "vitc": 21.6}},
  {"id": "peanut_butter", "name": "Peanut butter", "category": "Legumes", "price": null, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 32, "serving_desc": "2 tbsp", "max_servings": 2, "tags": [], "ndb": "16098", "bls_item": "(BLS series discontinued Dec 2017)", "per100g": {"kcal": 598.0, "protein": 22.21, "carb": 22.31, "fat": 51.36, "fiber": 5.0, "sugar": 10.49, "calcium": 49.0, "iron": 1.74, "potassium": 558.0, "sodium": 426.0, "vitc": 0.0}},
  {"id": "oats", "name": "Rolled oats (dry)", "category": "Grains", "price": null, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 40.5, "serving_desc": "1/2 cup dry", "max_servings": 3, "tags": [], "ndb": "08120", "bls_item": "(not priced by BLS)", "per100g": {"kcal": 379.0, "protein": 13.15, "carb": 67.7, "fat": 6.52, "fiber": 10.1, "sugar": 0.99, "calcium": 52.0, "iron": 4.25, "potassium": 362.0, "sodium": 6.0, "vitc": 0.0}},
  {"id": "broccoli", "name": "Broccoli", "category": "Vegetables", "price": null, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.61, "serving_g": 91, "serving_desc": "1 cup chopped", "max_servings": 3, "tags": [], "ndb": "11090", "bls_item": "(BLS series discontinued Mar 2020)", "per100g": {"kcal": 34.0, "protein": 2.82, "carb": 6.64, "fat": 0.37, "fiber": 2.6, "sugar": 1.7, "calcium": 47.0, "iron": 0.73, "potassium": 316.0, "sodium": 33.0, "vitc": 89.2}},
  {"id": "carrots", "name": "Carrots", "category": "Vegetables", "price": null, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.89, "serving_g": 128, "serving_desc": "1 cup chopped", "max_servings": 2, "tags": [], "ndb": "11124", "bls_item": "(BLS series discontinued Mar 2014)", "per100g": {"kcal": 41.0, "protein": 0.93, "carb": 9.58, "fat": 0.24, "fiber": 2.8, "sugar": 4.74, "calcium": 33.0, "iron": 0.3, "potassium": 320.0, "sodium": 69.0, "vitc": 5.9}},
  {"id": "apples", "name": "Apples", "category": "Fruit", "price": null, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 0.9, "serving_g": 125, "serving_desc": "1 cup chopped", "max_servings": 3, "tags": [], "ndb": "09003", "bls_item": "(BLS series discontinued Oct 2017)", "per100g": {"kcal": 52.0, "protein": 0.26, "carb": 13.81, "fat": 0.17, "fiber": 2.4, "sugar": 10.39, "calcium": 6.0, "iron": 0.12, "potassium": 107.0, "sodium": 1.0, "vitc": 4.6}},
  {"id": "tuna", "name": "Canned light tuna (drained)", "category": "Fish", "price": null, "price_unit": "per lb drained", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 85, "serving_desc": "3 oz drained", "max_servings": 2, "tags": ["fish"], "ndb": "15121", "bls_item": "(not priced by BLS)", "per100g": {"kcal": 86.0, "protein": 19.44, "carb": 0.0, "fat": 0.96, "fiber": 0.0, "sugar": 0.0, "calcium": 17.0, "iron": 1.63, "potassium": 179.0, "sodium": 247.0, "vitc": 0.0}},
  {"id": "butter", "name": "Butter (salted)", "category": "Eggs & Dairy", "price": null, "price_unit": "per lb", "purchase_g": 453.6, "edible_yield": 1.0, "serving_g": 14.2, "serving_desc": "1 tbsp", "max_servings": 2, "tags": ["dairy"], "ndb": "01001", "bls_item": "(BLS series discontinued Apr 2012)", "per100g": {"kcal": 717.0, "protein": 0.85, "carb": 0.06, "fat": 81.11, "fiber": 0.0, "sugar": 0.06, "calcium": 24.0, "iron": 0.02, "potassium": 24.0, "sodium": 643.0, "vitc": 0.0}}
];


/** $ per 100 g of edible food. Returns null when the food has no price yet. */
export function costPer100g(food, priceOverride) {
  const price = priceOverride ?? food.price;
  if (price == null || !(price > 0)) return null;
  const edibleGrams = food.purchase_g * food.edible_yield;
  return (price / edibleGrams) * 100;
}

const DIET_RULES = {
  none: () => true,
  vegetarian: (f) => !f.tags.includes("meat") && !f.tags.includes("fish"),
  pescatarian: (f) => !f.tags.includes("meat"),
  vegan: (f) => !["meat", "fish", "dairy", "egg", "contains-dairy-egg", "may-contain-dairy"].some((t) => f.tags.includes(t)),
  "no-pork": (f) => !f.tags.includes("pork"),
};

/**
 * Build the LP in matrix form.
 * targets: { calories, calorieTolerance (default 0.05), protein:[min,max], carb:[min,max],
 *            fat:[min,max], fiber, calcium, iron, potassium, vitc (minimums), sodium (maximum),
 *            sugar (maximum, optional) }
 * prefs:   { diet: 'none'|'vegetarian'|'pescatarian'|'vegan'|'no-pork',
 *            exclude: [foodId], mustInclude: {foodId: minServings},
 *            maxServings: {foodId: n}, prices: {foodId: price in that food's price unit} }
 */
export function buildModel(targets, prefs = {}) {
  const diet = DIET_RULES[prefs.diet || "none"];
  if (!diet) throw new Error(`Unknown diet "${prefs.diet}"`);
  const exclude = new Set(prefs.exclude || []);
  const prices = prefs.prices || {};

  const foods = FOODS.filter((f) => !exclude.has(f.id) && diet(f))
    .map((f) => ({ ...f, cost100: costPer100g(f, prices[f.id]) }))
    .filter((f) => f.cost100 != null);
  const n = foods.length;

  // Nutrient matrix A (m x n): rows = nutrients, columns = foods.
  const nutrientKeys = NUTRIENTS.map((k) => k.key);
  const A = nutrientKeys.map((k) => foods.map((f) => f.per100g[k]));

  // Target vectors b_min, b_max.
  const tol = targets.calorieTolerance ?? 0.05;
  const bounds = {
    kcal: [targets.calories * (1 - tol), targets.calories * (1 + tol)],
    protein: targets.protein, carb: targets.carb, fat: targets.fat,
    fiber: [targets.fiber, null], calcium: [targets.calcium, null], iron: [targets.iron, null],
    potassium: [targets.potassium, null], vitc: [targets.vitc, null],
    sodium: [null, targets.sodium], sugar: [null, targets.sugar],
  };

  // Stack every constraint as one row of a big system:  M x (<=, >=) rhs
  const rows = [], senses = [], rhs = [], labels = [];
  nutrientKeys.forEach((k, i) => {
    const [lo, hi] = bounds[k] || [null, null];
    if (lo != null && lo > 0) { rows.push(A[i]); senses.push(">="); rhs.push(lo); labels.push(`${k} >= min`); }
    if (hi != null) { rows.push(A[i]); senses.push("<="); rhs.push(hi); labels.push(`${k} <= max`); }
  });
  // Upper bounds x_j <= u_j and lower bounds x_j >= l_j are rows of the identity matrix.
  const caps = prefs.maxServings || {};
  const must = prefs.mustInclude || {};
  foods.forEach((f, j) => {
    const e = new Array(n).fill(0); e[j] = 1;
    const u = (f.serving_g * (caps[f.id] ?? f.max_servings)) / 100;
    rows.push(e); senses.push("<="); rhs.push(u); labels.push(`${f.id} <= cap`);
    if (must[f.id]) {
      rows.push(e.slice()); senses.push(">="); rhs.push((f.serving_g * must[f.id]) / 100); labels.push(`${f.id} >= must`);
    }
  });
  const c = foods.map((f) => f.cost100);
  return { foods, A, c, rows, senses, rhs, labels, nutrientKeys };
}

const EPS = 1e-9;

/** Gauss-Jordan pivot: make column `col` the unit vector e_r using elementary row operations. */
function pivot(T, r, col) {
  const pr = T[r];
  const p = pr[col];
  for (let k = 0; k < pr.length; k++) pr[k] /= p;              // R_r <- R_r / a_rc
  for (let i = 0; i < T.length; i++) {
    if (i === r) continue;
    const f = T[i][col];
    if (Math.abs(f) < EPS) continue;
    const row = T[i];
    for (let k = 0; k < row.length; k++) row[k] -= f * pr[k];   // R_i <- R_i - a_ic * R_r
  }
}

/** Run Simplex iterations on tableau T (last row = reduced costs, last column = RHS). */
function iterate(T, basis, allowed, trace) {
  const m = T.length - 1, last = T[0].length - 1;
  for (let it = 0; it < 20000; it++) {
    const z = T[m];
    let col = -1;                                         // Bland: lowest-index improving column
    for (let j = 0; j < last; j++) if (allowed[j] && z[j] < -EPS) { col = j; break; }
    if (col === -1) return "optimal";
    let r = -1, best = Infinity;
    for (let i = 0; i < m; i++) {                          // minimum-ratio test
      const a = T[i][col];
      if (a > EPS) {
        const ratio = T[i][last] / a;
        if (ratio < best - EPS || (Math.abs(ratio - best) <= EPS && basis[i] < basis[r])) { best = ratio; r = i; }
      }
    }
    if (r === -1) return "unbounded";
    pivot(T, r, col);
    basis[r] = col;
    if (trace) trace.push({ entering: col, leavingRow: r, objective: -T[m][last] });
  }
  return "iteration-limit";
}

/** Minimize c.x subject to rows (<=, >=, =) rhs and x >= 0. Two-phase Simplex. */
export function simplex(c, rows, senses, rhs, { trace = false } = {}) {
  const n = c.length, m = rows.length;
  rows = rows.map((r) => r.slice()); senses = senses.slice(); rhs = rhs.slice();
  for (let i = 0; i < m; i++) if (rhs[i] < 0) {                // make every RHS >= 0
    rows[i] = rows[i].map((v) => -v); rhs[i] = -rhs[i];
    senses[i] = senses[i] === "<=" ? ">=" : senses[i] === ">=" ? "<=" : "=";
  }
  const nSlack = senses.filter((s) => s !== "=").length;
  const nArt = senses.filter((s) => s !== "<=").length;
  const N = n + nSlack + nArt;                                  // total columns
  const T = [], basis = [];
  let s = n, a = n + nSlack;
  const isArt = new Array(N).fill(false);
  for (let i = 0; i < m; i++) {                                 // [A | S | Art | b]
    const row = new Float64Array(N + 1);
    for (let j = 0; j < n; j++) row[j] = rows[i][j];
    if (senses[i] === "<=") { row[s] = 1; basis.push(s++); }
    else {
      if (senses[i] === ">=") row[s++] = -1;
      row[a] = 1; isArt[a] = true; basis.push(a++);
    }
    row[N] = rhs[i];
    T.push(row);
  }
  const steps = trace ? [] : null;

  // Phase 1: minimize the sum of artificial variables to find a feasible corner.
  const z1 = new Float64Array(N + 1);
  for (let j = 0; j < N; j++) if (isArt[j]) z1[j] = 1;
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) for (let k = 0; k <= N; k++) z1[k] -= T[i][k];
  T.push(z1);
  const all = new Array(N).fill(true);
  let status = iterate(T, basis, all, steps);
  const phase1Iterations = steps ? steps.length : null;
  if (-T[m][N] > 1e-7) return { status: "infeasible" };

  // Drive any artificial variable that is still basic (at zero) out of the basis.
  for (let i = 0; i < m; i++) if (isArt[basis[i]]) {
    let j = 0;
    while (j < N && (isArt[j] || Math.abs(T[i][j]) < EPS)) j++;
    if (j < N) { pivot(T, i, j); basis[i] = j; }
  }

  // Phase 2: minimize the real cost, never letting an artificial re-enter.
  const z2 = new Float64Array(N + 1);
  for (let j = 0; j < n; j++) z2[j] = c[j];
  for (let i = 0; i < m; i++) { const cb = basis[i] < n ? c[basis[i]] : 0; if (cb) for (let k = 0; k <= N; k++) z2[k] -= cb * T[i][k]; }
  T[m] = z2;
  status = iterate(T, basis, isArt.map((v) => !v), steps);
  if (status !== "optimal") return { status };

  const x = new Array(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
  return { status, x, objective: -T[m][N], iterations: steps ? steps.length : undefined, phase1Iterations, steps };
}

/** Matrix-vector product A x. */
export function matVec(A, x) { return A.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)); }

/** Explain which limits make a request impossible (checked one nutrient at a time). */
function diagnose(model) {
  const { foods, A, nutrientKeys, rows, senses, rhs, labels } = model;
  const u = foods.map((f, j) => { const k = labels.indexOf(`${f.id} <= cap`); return rhs[k]; });
  const l = foods.map((f) => { const k = labels.indexOf(`${f.id} >= must`); return k >= 0 ? rhs[k] : 0; });
  const problems = [];
  labels.forEach((lab, k) => {
    const [key, op] = lab.split(" ");
    const i = nutrientKeys.indexOf(key);
    if (i < 0) return;
    const best = A[i].reduce((s, v, j) => s + v * (op === ">=" ? u[j] : l[j]), 0);
    if (op === ">=" && best < rhs[k] - 1e-6) problems.push(`${key}: even the most your allowed foods can provide (${best.toFixed(0)}) is below the minimum (${rhs[k].toFixed(0)})`);
    if (op === "<=" && best > rhs[k] + 1e-6) problems.push(`${key}: your must-include foods alone (${best.toFixed(0)}) exceed the maximum (${rhs[k].toFixed(0)})`);
  });
  return problems.length ? problems : ["No single nutrient is impossible, but the targets conflict in combination. Try widening the calorie tolerance, allowing more foods, or raising portion caps."];
}

/** Main entry point: targets + preferences -> cheapest daily diet that meets every target. */
export function optimizeDiet(targets, prefs = {}) {
  const model = buildModel(targets, prefs);
  if (model.foods.length === 0) return { status: "infeasible", reasons: ["No foods are left after applying the preferences."] };
  const sol = simplex(model.c, model.rows, model.senses, model.rhs, { trace: true });
  if (sol.status !== "optimal") return { status: sol.status, reasons: sol.status === "infeasible" ? diagnose(model) : [], model };

  const x = sol.x.map((v) => (v < 1e-9 ? 0 : v));
  const Ax = matVec(model.A, x);
  const plan = model.foods
    .map((f, j) => ({ id: f.id, name: f.name, grams: x[j] * 100, servings: (x[j] * 100) / f.serving_g,
      serving: f.serving_desc, cost: x[j] * f.cost100 }))
    .filter((p) => p.grams > 0.5)
    .sort((p, q) => q.cost - p.cost);
  const totals = Object.fromEntries(model.nutrientKeys.map((k, i) => [k, Ax[i]]));
  return { status: "optimal", costPerDay: sol.objective, costPerWeek: sol.objective * 7, plan, totals,
    iterations: sol.iterations, model: { foods: model.foods.map((f) => f.id), A: model.A, c: model.c, x } };
}
