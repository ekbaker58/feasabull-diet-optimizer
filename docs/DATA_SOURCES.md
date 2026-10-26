# Where the food data comes from

146 foods: the **71 core foods** from the original class model, plus **75 added foods** (Oct 2026).
All food data and prices live in `scripts/foods_v2.py`; everything else is generated from it.

| | Core 71 | Added 75 |
|---|---|---|
| Nutrients | USDA SR28 (Sept 2015 release), per 100 g edible | same |
| Prices | Walmart.com / business.walmart.com, Oct 2026, regular (non-Rollback) prices; romaine from BLS | 5 from **BLS Average Price Data** (Sep 2026); 70 from **USDA ERS Fruit and Vegetable Prices** (2023) scaled to Sep 2026 with the **BLS CPI** |
| `price_source` field | `walmart` (romaine: `bls`) | `bls` or `ers` |
| `core` field | `true` | `false` |

`prefs.foodSet = "core"` (website: *Food list → Core 71 foods*; workbook: *Planner → Food list*) restricts the model to
the original 71 foods. For the example person that reproduces the documented **$3.02/day** (tested in `tests/run_diets.mjs`).

## Why the added foods are not Walmart prices
Walmart.com answers automated requests with a "confirm that you're human" check, so its prices could not be read.
No prices were guessed and no other store was used. The added foods use official U.S. averages instead, and every
food's `price_note` says exactly where its price came from.

## BLS Average Price Data (U.S. city average, September 2026)
Each value was read from its series page on data.bls.gov.

| Food | Series | BLS item | $/lb |
|---|---|---|---|
| Whole chicken | APU0000706111 | Chicken, fresh, whole | 2.064 |
| Beef for stew | APU0000703432 | Beef for stew, boneless | 8.533 |
| Round steak | APU0000703511 | Steak, round, USDA Choice, boneless | 9.838 |
| Grapefruit | APU0000711411 | Grapefruit | 1.624 |
| Iceberg lettuce | APU0000712211 | Lettuce, iceberg | 1.636 |

## USDA ERS Fruit and Vegetable Prices, moved to September 2026
ERS publishes average retail prices per pound for about 150 fruit and vegetable forms, from 2023 Circana scanner data
(files updated Dec 9, 2025). To compare them with 2026 prices, each one is multiplied by the change in the BLS
Consumer Price Index (CPI-U, U.S. city average, not seasonally adjusted) for the same category:

  price(Sep 2026) = price(2023) × CPI(Sep 2026) ÷ CPI(2023 average)

| Category | CPI series | 2023 average | Sep 2026 | Factor |
|---|---|---|---|---|
| Fresh fruits | CUUR0000SEFK | 409.079 | 433.870 | 1.0606 |
| Fresh vegetables | CUUR0000SEFL | 377.413 | 400.183 | 1.0603 |
| Canned fruits and vegetables | CUUR0000SEFM01 | 213.038 | 235.069 | 1.1034 |
| Frozen fruits and vegetables | CUUR0000SEFM02 | 187.730 | 191.463 | 1.0199 |
| Other processed incl. dried (dried beans, dried fruit) | CUUR0000SEFM03 | 187.987 | 202.923 | 1.0795 |

The 2023 average is the mean of BLS's two published half-year averages. **These are estimates of a national
average, not a store's shelf price.** ERS itself warns that its averages are best used for one year, not for price
trends. Scaling by a category CPI assumes every item in the category changed by the same percentage.

**Check against current BLS prices** (items that have both):

| Item | ERS 2023 × CPI | BLS Sep 2026 |
|---|---|---|
| Bananas | $0.647/lb | $0.656/lb |
| Potatoes | $0.977/lb | $0.989/lb |
| Iceberg lettuce | $1.567/lb | $1.636/lb |

So the scaled ERS prices land within about 4% of current BLS prices for these items.

## Units, yields and cup-equivalents for added foods
- **Package = 1 lb.** ERS and BLS prices are per pound, so the shopping list buys these by weight.
- **Edible yield** = 1 − USDA SR28 refuse for fresh produce (for example, watermelon 0.52, whole chicken 0.68).
  It is 1 for frozen, canned and dried foods. Canned nutrients are for solids + liquid, which matches ERS's per-pound
  can-contents price. Prunes and dates are sold pitted, so SR28's pit refuse is not applied.
- **Cup-equivalents** (for the "≥ 2.5 cups vegetables / ≥ 2 cups fruit" rules) use the USDA SR28 household weight for
  1 cup, 2 cups for raw leafy greens, and ½ cup for dried fruit, the same method as the core foods. Where SR28 has no
  cup measure (frozen kale, collards, okra and Brussels sprouts; clementines; baby carrots), the ERS cup-equivalent is
  used. For frozen vegetables that is the ERS cooked cup divided by ERS's cooking yield, to get frozen grams.
- **Serving sizes and max servings per day** are team choices, like the core foods.

## Known gaps
- Blank SR28 values count as 0: total sugars for several frozen greens, acorn squash, canned black-eyed peas, frozen
  lima beans, chickpeas, quinoa and mixed vegetables; vitamin C for dry navy beans, whole-wheat pasta, quinoa and tofu;
  potassium for tofu; saturated fat for clementines. For "at least" targets this can only under-count.
- One retailer for the core foods, national averages for the added foods. Real prices vary by store and week.
- Allergy flags (`shellfish`, `peanut`, `treenut`, `soy`, plus `dairy`, `egg`, `gluten`, `fish`) mark foods that *are*
  the allergen. Ingredient labels of packaged foods (bread, cookies, granola bars) were not checked.

## References
- U.S. Department of Agriculture, Agricultural Research Service, Nutrient Data Laboratory. (2015). *USDA National Nutrient Database for Standard Reference, Release 28* [Data set]. https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/sr11-sr28/
- U.S. Department of Agriculture, Economic Research Service. (2025). *Fruit and vegetable prices* [Data set; 2023 retail scanner data, updated December 9, 2025]. https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices
- U.S. Bureau of Labor Statistics. (n.d.). *CPI: Average price data*. Retrieved October 26, 2026, from https://www.bls.gov/cpi/factsheets/average-prices.htm
- U.S. Bureau of Labor Statistics. (2026). *Consumer Price Index for All Urban Consumers* (series CUUR0000SEFK, CUUR0000SEFL, CUUR0000SEFM01, CUUR0000SEFM02, CUUR0000SEFM03) [Data series]. https://data.bls.gov/timeseries/CUUR0000SEFK
- MedlinePlus. (n.d.). *High blood pressure and diet*. U.S. National Library of Medicine. Retrieved October 26, 2026, from https://medlineplus.gov/ency/article/007483.htm (DASH goals used by the DASH-Style diet)
