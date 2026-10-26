"""Food list v2: ~70 common foods, grouped by type, priced at one store (Walmart) on one date.

Each row:
  id, name, group, type, store product, price $, package grams (as bought), price note,
  BLS U.S.-average reference (price, grams per BLS unit) or None,
  edible yield (1 - refuse), USDA SR28 NDB number, serving grams, serving label, max servings/day,
  meal pattern (fractions for Breakfast, Lunch, Dinner, Snack), attribute flags.

Attribute flags drive the diet filters: meat (beef/pork), pork, poultry, fish, egg, dairy, gluten.
Prices: Walmart.com / business.walmart.com, observed Oct 2026 unless the note says otherwise.
Rule: when an item was on Rollback (temporary sale), the regular price is used.
"""
LB, OZ = 453.592, 28.3495

# meal patterns: (B, L, D, S) — share of a food's daily amount eaten at each meal
B, BS, LD, L_, D_, S_, BL, LS, BD = (1, 0, 0, 0), (.5, 0, 0, .5), (0, .5, .5, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1), (.5, .5, 0, 0), (0, .5, 0, .5), (.5, 0, .5, 0)

def F(id, name, group, typ, product, price, pkg_g, note, bls, yld, ndb, sg, sdesc, mx, meal, flags=""):
    return dict(id=id, name=name, group=group, type=typ, product=product, price=price, package_g=round(pkg_g, 1),
                price_note=note, bls=bls, edible_yield=yld, ndb=ndb, serving_g=sg, serving_desc=sdesc,
                max_servings=mx, meal=meal, flags=[f for f in flags.split(',') if f])

FOODS = [
 # ---------------- PROTEINS ----------------
 F("chicken_breast","Chicken breast (boneless, skinless)","Proteins","Poultry","Great Value frozen, 3 lb",9.84,3*LB,"",(4.203,LB),1.0,"05062",113,"4 oz raw",2,LD,"poultry"),
 F("chicken_thigh","Chicken thighs (boneless, skinless)","Proteins","Poultry","Great Value frozen, 3 lb",9.87,3*LB,"",None,1.0,"05096",113,"4 oz raw",2,LD,"poultry"),
 F("drumsticks","Chicken drumsticks (bone-in)","Proteins","Poultry","Great Value frozen, 4 lb",4.83,4*LB,"Edible yield 67%: USDA lists bone twice (66%); 33% used",(1.739,LB),0.67,"05066",100,"100 g meat & skin (~1.5 drumsticks)",2,LD,"poultry"),
 F("ground_turkey","Ground turkey 93/7","Proteins","Poultry","Jennie-O, 16 oz",5.56,LB,"",None,1.0,"05665",113,"4 oz raw",2,LD,"poultry"),
 F("deli_turkey","Deli turkey breast (sliced)","Proteins","Poultry","Great Value thin sliced, 16 oz",5.97,LB,"",None,1.0,"07081",56,"2 oz (about 4 slices)",2,L_,"poultry"),
 F("ground_beef","Ground beef 80/20","Proteins","Red Meat & Pork","80/20 ground chuck, 1 lb roll",6.43,LB,"",(6.792,LB),1.0,"23572",113,"4 oz raw",2,LD,"meat"),
 F("lean_beef","Ground beef 93/7 (lean)","Proteins","Red Meat & Pork","93/7 lean ground beef, 1 lb",7.87,LB,"",(8.461,LB),1.0,"23472",113,"4 oz raw",2,LD,"meat"),
 F("sirloin","Top sirloin steak","Proteins","Red Meat & Pork","Choice Angus top sirloin, per lb",12.94,LB,"",(14.106,LB),0.97,"13931",113,"4 oz raw",2,D_,"meat"),
 F("pork_chops","Pork loin chops (boneless)","Proteins","Red Meat & Pork","Family pack, per lb",4.17,LB,"",(4.550,LB),1.0,"10164",113,"4 oz raw",2,LD,"meat,pork"),
 F("bacon","Bacon","Proteins","Red Meat & Pork","Great Value hickory smoked, 16 oz",4.24,LB,"",(6.756,LB),1.0,"10123",28,"1 slice raw",3,B,"meat,pork"),
 F("ham","Ham (sliced, cooked)","Proteins","Red Meat & Pork","Great Value cooked ham, 16 oz",4.97,LB,"Regular price; was on Rollback at $4.47",(5.450,LB),1.0,"07029",56,"2 oz (2 slices)",2,L_,"meat,pork"),
 F("tuna","Canned light tuna (in water)","Proteins","Fish & Seafood","Great Value chunk light, 5 oz can",0.96,5*OZ,"Drained solids ~79% of can weight",None,0.79,"15121",85,"3 oz drained",2,L_,"fish"),
 F("salmon","Salmon (Atlantic, fillet)","Proteins","Fish & Seafood","Marketside frozen portions, 2 lb",21.94,2*LB,"",None,1.0,"15236",113,"4 oz raw",2,D_,"fish"),
 F("tilapia","Tilapia (fillet)","Proteins","Fish & Seafood","Great Value frozen, 2 lb",8.87,2*LB,"",None,1.0,"15261",113,"4 oz raw",2,LD,"fish"),
 F("shrimp","Shrimp (raw, peeled)","Proteins","Fish & Seafood","Great Value frozen, 2 lb",15.96,2*LB,"",None,1.0,"15149",113,"4 oz raw",2,D_,"fish"),
 F("eggs","Eggs (large)","Proteins","Eggs","Great Value large, 12 ct",1.67,12*50/0.88,"Dozen = 12 x 50 g edible; shell is 12% of weight",(2.272,12*50/0.88),0.88,"01123",50,"1 large egg",3,B,"egg"),
 F("tofu","Tofu (extra firm)","Proteins","Plant Proteins","Nasoya extra firm, 14 oz",2.97,14*OZ,"Price undated (Walmart Business listing)",None,1.0,"16212",85,"3 oz",3,LD,""),
 F("lentils","Lentils (dry)","Proteins","Plant Proteins","Great Value, 1 lb",1.92,LB,"",None,1.0,"16069",48,"1/4 cup dry (~3/4 cup cooked)",3,LD,""),
 F("black_beans","Black beans (canned)","Proteins","Plant Proteins","Great Value no salt added, 15 oz",0.92,15*OZ,"Nutrients for solids + liquid",None,1.0,"16316",120,"1/2 cup",3,LD,""),
 F("chickpeas","Chickpeas (canned)","Proteins","Plant Proteins","Great Value, 15.5 oz",0.92,15.5*OZ,"Nutrients for solids + liquid",None,1.0,"16058",120,"1/2 cup",3,LD,""),
 F("pinto_beans","Pinto beans (dry)","Proteins","Plant Proteins","Great Value, 2 lb",1.98,2*LB,"",(1.669,LB),1.0,"16042",48,"1/4 cup dry (~3/4 cup cooked)",3,LD,""),
 F("peanut_butter","Peanut butter","Proteins","Plant Proteins","Great Value creamy, 40 oz",3.98,40*OZ,"",None,1.0,"16098",32,"2 tbsp",2,BS,""),
 # ---------------- DAIRY ----------------
 F("milk_whole","Whole milk","Dairy & Alternatives","Milk & Yogurt","Great Value, 1 gal",3.48,16*244,"Gallon = 16 cups x 244 g",(4.106,16*244),1.0,"01077",244,"1 cup",3,BS,"dairy"),
 F("milk_2pct","2% milk","Dairy & Alternatives","Milk & Yogurt","Great Value, 1 gal",3.31,16*244,"Gallon = 16 cups x 244 g",None,1.0,"01079",244,"1 cup",3,BS,"dairy"),
 F("soy_milk","Soy milk (calcium-fortified)","Dairy & Alternatives","Milk & Yogurt","Silk original, 64 fl oz",4.57,8*243,"Half gallon = 8 cups x 243 g",None,1.0,"16139",243,"1 cup",3,BS,""),
 F("greek_yogurt","Greek yogurt (plain, nonfat)","Dairy & Alternatives","Milk & Yogurt","Great Value, 32 oz",3.28,32*OZ,"",None,1.0,"01256",170,"1 container (6 oz)",2,BS,"dairy"),
 F("cottage_cheese","Cottage cheese (2%)","Dairy & Alternatives","Cheese","Great Value small curd, 24 oz",2.87,24*OZ,"",None,1.0,"01015",113,"1/2 cup",2,LS,"dairy"),
 F("cheddar","Cheddar cheese","Dairy & Alternatives","Cheese","Great Value medium block, 8 oz",1.87,8*OZ,"",(6.133,LB),1.0,"01009",28,"1 oz",2,LD,"dairy"),
 F("string_cheese","Mozzarella string cheese","Dairy & Alternatives","Cheese","Great Value part-skim, 12 ct",3.28,12*OZ,"Price undated (Walmart.com listing)",None,1.0,"01029",28,"1 stick",2,S_,"dairy"),
 F("american_cheese","American cheese (singles)","Dairy & Alternatives","Cheese","Great Value, 16 oz / 24 slices",2.48,LB,"",(4.737,LB),1.0,"01042",19,"1 slice",3,L_,"dairy"),
 # ---------------- CARBS ----------------
 F("white_rice","White rice (dry)","Carbohydrates","Grains & Bread","Great Value long grain, 5 lb",2.48,5*LB,"Price undated (Walmart Business listing)",(1.118,LB),1.0,"20044",46,"1/4 cup dry (~3/4 cup cooked)",4,LD,""),
 F("brown_rice","Brown rice (dry)","Carbohydrates","Grains & Bread","Great Value long grain, 32 oz",1.72,2*LB,"",None,1.0,"20036",46,"1/4 cup dry (~3/4 cup cooked)",4,LD,""),
 F("spaghetti","Spaghetti (dry)","Carbohydrates","Grains & Bread","Great Value, 16 oz",1.36,LB,"",(1.375,LB),1.0,"20120",57,"2 oz dry (~1 cup cooked)",3,LD,"gluten"),
 F("ww_pasta","Whole-wheat spaghetti (dry)","Carbohydrates","Grains & Bread","Great Value, 16 oz",1.74,LB,"Price undated (Walmart.com listing)",None,1.0,"20124",57,"2 oz dry (~1 cup cooked)",3,LD,"gluten"),
 F("quinoa","Quinoa (dry)","Carbohydrates","Grains & Bread","Great Value organic, 16 oz",3.44,LB,"",None,1.0,"20035",43,"1/4 cup dry (~3/4 cup cooked)",3,LD,""),
 F("oats","Rolled oats (dry)","Carbohydrates","Grains & Bread","Great Value old fashioned, 42 oz",4.38,42*OZ,"Not certified gluten-free",None,1.0,"08120",40,"1/2 cup dry",2,B,"gluten"),
 F("cheerios","Cheerios","Carbohydrates","Grains & Bread","Cheerios family size, 18 oz",4.97,18*OZ,"Regular price; was on Rollback at $4.50",None,1.0,"08013",28,"1 cup",2,B,""),
 F("white_bread","White bread","Carbohydrates","Grains & Bread","Great Value, 20 oz loaf",1.52,20*OZ,"",(1.830,LB),1.0,"18069",28,"1 slice",4,BL,"gluten"),
 F("wheat_bread","Whole-wheat bread","Carbohydrates","Grains & Bread","Great Value 100% whole wheat, 20 oz",2.02,20*OZ,"",None,1.0,"18075",32,"1 slice",4,BL,"gluten"),
 F("bagel","Bagels (plain)","Carbohydrates","Grains & Bread","Great Value, 6 ct / 20 oz",2.14,20*OZ,"",None,1.0,"18001",94,"1 bagel",1,B,"gluten"),
 F("flour_tortilla","Flour tortillas","Carbohydrates","Grains & Bread","Great Value medium, 10 ct / 16 oz",1.98,LB,"",None,1.0,"18970",45,"1 tortilla",3,LD,"gluten"),
 F("corn_tortilla","Corn tortillas","Carbohydrates","Grains & Bread","Mission yellow corn, 30 ct",2.48,27.9*OZ,"Weight from listed unit price (8.9 cents/oz)",None,1.0,"18363",26,"1 tortilla",6,LD,""),
 F("potatoes","Potatoes (russet)","Carbohydrates","Starchy Vegetables","Russet, 5 lb bag",4.86,5*LB,"Regular price; was on Rollback at $2.47",(0.989,LB),0.75,"11352",150,"1 cup diced",2,LD,""),
 F("sweet_potatoes","Sweet potatoes","Carbohydrates","Starchy Vegetables","3 lb bag",3.62,3*LB,"Price undated (Walmart.com listing)",None,0.72,"11507",133,"1 cup cubed",2,LD,""),
 F("corn","Corn (frozen)","Carbohydrates","Starchy Vegetables","Great Value whole kernel, 12 oz",0.98,12*OZ,"Price undated (Walmart.com listing)",None,1.0,"11178",68,"1/2 cup",3,LD,""),
 # ---------------- FRUITS ----------------
 F("bananas","Bananas","Fruits","Fruit","Fresh, per lb",0.50,LB,"",(0.656,LB),0.64,"09040",118,"1 medium",2,BS,""),
 F("apples","Apples (Gala)","Fruits","Fruit","Fresh Gala, 3 lb bag",3.92,3*LB,"Older listing (Jun 2025) — verify",None,0.90,"09003",125,"1 small apple",2,LS,""),
 F("oranges","Oranges (navel)","Fruits","Fruit","Fresh navel, 4 lb bag",5.97,4*LB,"",(1.723,LB),0.68,"09202",140,"1 orange",2,LS,""),
 F("strawberries","Strawberries","Fruits","Fruit","Fresh, 1 lb",2.97,LB,"",(2.840,340.2),0.94,"09316",152,"1 cup halves",2,BS,""),
 F("grapes","Grapes (red seedless)","Fruits","Fruit","Fresh, per lb",1.87,LB,"",None,0.96,"09132",151,"1 cup",2,S_,""),
 F("blueberries","Blueberries (frozen)","Fruits","Fruit","Great Value, 48 oz",7.97,48*OZ,"",None,1.0,"09054",155,"1 cup",1,B,""),
 F("raisins","Raisins","Fruits","Fruit","Great Value, 20 oz",4.38,20*OZ,"",None,1.0,"09298",41,"1/4 cup",1,S_,""),
 F("orange_juice","Orange juice (100%)","Fruits","Fruit","Great Value not-from-concentrate, 52 fl oz",3.96,6.5*249,"52 fl oz = 6.5 cups x 249 g",None,1.0,"09209",249,"1 cup",1,B,""),
 # ---------------- VEGETABLES ----------------
 F("broccoli","Broccoli (frozen)","Vegetables","Vegetables","Great Value florets, 12 oz",1.16,12*OZ,"",None,1.0,"11094",95,"1 cup",2,LD,""),
 F("carrots","Carrots","Vegetables","Vegetables","Fresh whole, 2 lb bag",2.26,2*LB,"",None,0.89,"11124",128,"1 cup chopped",2,LS,""),
 F("spinach","Spinach (fresh)","Vegetables","Vegetables","Marketside, 10 oz bag",1.97,10*OZ,"Bagged and washed: no refuse",None,1.0,"11457",60,"2 cups raw",3,LD,""),
 F("romaine","Romaine lettuce","Vegetables","Vegetables","Romaine, per lb (BLS U.S. average)",3.312,LB,"BLS Sep 2026 price (Walmart sells by count)",(3.312,LB),0.94,"11251",94,"2 cups shredded",2,LD,""),
 F("tomatoes","Tomatoes (roma)","Vegetables","Vegetables","Fresh roma, per lb",0.85,LB,"",(1.992,LB),0.91,"11529",180,"1 cup chopped",2,LD,""),
 F("onions","Onions (yellow)","Vegetables","Vegetables","Fresh yellow, 3 lb bag",2.96,3*LB,"Price undated (Walmart.com listing)",None,0.90,"11282",80,"1/2 cup chopped",2,LD,""),
 F("bell_pepper","Green bell pepper","Vegetables","Vegetables","Fresh, each (~145 g)",0.86,145,"Each ~145 g as bought (119 g edible, USDA)",None,0.82,"11333",149,"1 cup chopped",1,LD,""),
 F("mixed_veg","Mixed vegetables (frozen)","Vegetables","Vegetables","Great Value, 32 oz",2.58,32*OZ,"",None,1.0,"11583",95,"2/3 cup",3,LD,""),
 F("green_beans","Green beans (canned)","Vegetables","Vegetables","Great Value cut, 14.5 oz",0.84,14.5*OZ,"Regular price; was on Rollback at $0.50",None,1.0,"11054",120,"1/2 cup",3,LD,""),
 # ---------------- FATS ----------------
 F("olive_oil","Olive oil (extra virgin)","Fats, Oils & Nuts","Oils & Fats","Great Value, 51 fl oz",17.87,6.375*216,"51 fl oz = 6.375 cups x 216 g",None,1.0,"04053",13.5,"1 tbsp",3,LD,""),
 F("canola_oil","Canola oil","Fats, Oils & Nuts","Oils & Fats","Great Value, 48 fl oz",4.08,6*218,"48 fl oz = 6 cups x 218 g",None,1.0,"04582",14,"1 tbsp",3,LD,""),
 F("butter","Butter (salted)","Fats, Oils & Nuts","Oils & Fats","Great Value, 2 x 16 oz",5.96,2*LB,"",None,1.0,"01001",14.2,"1 tbsp",2,BD,"dairy"),
 F("almonds","Almonds","Fats, Oils & Nuts","Nuts & Seeds","Great Value whole, 16 oz",9.48,LB,"Price undated (Walmart.com listing)",None,1.0,"12061",28,"1 oz (~23 almonds)",2,S_,""),
 F("avocado","Avocado (Hass)","Fats, Oils & Nuts","Nuts & Seeds","Fresh, each (~203 g)",0.87,203,"Each ~203 g as bought (136 g edible, USDA)",None,0.67,"09038",68,"1/2 avocado",2,LD,""),
 # ---------------- SNACKS ----------------
 F("chips","Potato chips","Snacks & Sweets","Snacks","Great Value original, 8 oz",1.87,8*OZ,"From 10-pack price $18.70",(6.668,LB),1.0,"19411",28,"1 oz",1,S_,""),
 F("cookies","Chocolate chip cookies","Snacks & Sweets","Snacks","Great Value chewy, 13 oz",3.02,13*OZ,"Older listing (Jul 2025) — verify",(5.152,LB),1.0,"18159",26,"2 cookies",1,S_,"gluten,dairy,egg"),
 F("granola_bar","Granola bars (chocolate chip)","Snacks & Sweets","Snacks","Great Value chewy, 10 ct",2.28,8.4*OZ,"Price undated (Walmart Business listing)",None,1.0,"19404",24,"1 bar",2,S_,"gluten,dairy"),
 F("ice_cream","Vanilla ice cream","Snacks & Sweets","Snacks","Great Value, 48 fl oz",3.12,6*132,"48 fl oz = 6 cups x 132 g",(5.931,8*132),1.0,"19095",66,"1/2 cup",1,S_,"dairy"),
]

GROUP_ORDER = ["Proteins", "Dairy & Alternatives", "Carbohydrates", "Fruits", "Vegetables", "Fats, Oils & Nuts", "Snacks & Sweets"]
TYPE_ORDER = ["Poultry", "Red Meat & Pork", "Fish & Seafood", "Eggs", "Plant Proteins", "Milk & Yogurt", "Cheese",
              "Grains & Bread", "Starchy Vegetables", "Fruit", "Vegetables", "Oils & Fats", "Nuts & Seeds", "Snacks"]

ATTRS = ["meat", "pork", "poultry", "fish", "egg", "dairy", "gluten"]
ATTR_LABELS = ["Red meat", "Pork", "Poultry", "Fish", "Eggs", "Dairy", "Gluten"]

# Diet presets: macro split (% of calories) + which attributes are not allowed
DIETS = [
 dict(name="Balanced", desc="USDA Acceptable Macronutrient Distribution Ranges; all foods allowed",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=[]),
 dict(name="High-Protein", desc="For muscle gain: protein 25-35% of calories",
      protein=(0.25, 0.35), carb=(0.40, 0.55), fat=(0.20, 0.30), forbid=[]),
 dict(name="Low-Carb", desc="Moderate low-carb: carbs 20-35%, fat 35-50% (below the AMDR carb range)",
      protein=(0.20, 0.35), carb=(0.20, 0.35), fat=(0.35, 0.50), forbid=[]),
 dict(name="Vegetarian", desc="Lacto-ovo: no meat, poultry or fish",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=["meat", "pork", "poultry", "fish"]),
 dict(name="Vegan", desc="No animal products",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=["meat", "pork", "poultry", "fish", "egg", "dairy"]),
 dict(name="Pescatarian", desc="Fish and seafood, no meat or poultry",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=["meat", "pork", "poultry"]),
 dict(name="Gluten-Free", desc="No wheat, barley, rye or non-certified oats",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=["gluten"]),
 dict(name="No Pork", desc="All foods except pork",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=["pork"]),
]

MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"]

# Grams per USDA "cup-equivalent" (MyPlate), used for the vegetable and fruit minimums.
# 1 cup raw/cooked vegetable or fruit = 1 cup-eq; 2 cups raw leafy greens = 1; 1/2 cup dried fruit = 1; 1 cup 100% juice = 1.
CUP_EQ_G = dict(broccoli=91, carrots=128, spinach=60, romaine=94, tomatoes=180, onions=160, bell_pepper=149,
                mixed_veg=136, green_beans=235,   # canned: 1 cup drained ~ 235 g of can contents (solids + liquid basis)
                bananas=118, apples=125, oranges=140, strawberries=152, grapes=151, blueberries=155, raisins=82,
                orange_juice=249)

# Group caps ("no absurd amounts" across similar foods). unit: 'grams' of food or 'servings' as defined per food.
GROUP_CAPS = [
    dict(key="meat_fish", label="Meat, poultry & fish", unit="grams", max=340,
         note="12 oz raw (~9 oz cooked) per day", types=["Poultry", "Red Meat & Pork", "Fish & Seafood"]),
    dict(key="legumes", label="Beans & lentils", unit="servings", max=3,
         note="about 2-2.25 cups cooked per day", ids=["lentils", "black_beans", "chickpeas", "pinto_beans"]),
    dict(key="cheese", label="Cheese", unit="servings", max=3, note="slices / oz / sticks / half-cups", types=["Cheese"]),
    dict(key="grains", label="Grains & bread", unit="servings", max=9, note="", types=["Grains & Bread"]),
    dict(key="added_fats", label="Oils & butter", unit="servings", max=4, note="tablespoons", types=["Oils & Fats"]),
    dict(key="snacks", label="Snacks & sweets", unit="servings", max=2, note="", types=["Snacks"]),
]

# Balance rules ("no absurd amounts") — defaults, editable on the Planner sheet / via prefs
SETTINGS = dict(
    calorie_tolerance=0.05,          # daily calories within ±5% of target
    max_protein_share=0.35,          # no single food supplies more than 35% of the day's protein
    share_rule_min_protein=10.0,     # ...applied to foods with >= 10 g protein per 100 g
    meal_kcal=dict(Breakfast=(0.20, 0.30), Lunch=(0.25, 0.35), Dinner=(0.25, 0.40), Snacks=(0.05, 0.20)),
    min_meal_protein_share=0.20,     # breakfast, lunch and dinner each carry >= 20% of the day's protein
    min_veg_cups=2.5,                # cup-equivalents of non-starchy vegetables per day (DGA 2,000-kcal pattern)
    min_fruit_cups=2.0,              # cup-equivalents of fruit per day (DGA 2,000-kcal pattern)
    group_caps={g["key"]: g["max"] for g in GROUP_CAPS},
)

NUTRIENTS = [("kcal", "Calories", "kcal"), ("protein", "Protein", "g"), ("carb", "Carbohydrate", "g"), ("fat", "Fat", "g"),
             ("fiber", "Fiber", "g"), ("sugar", "Total sugars", "g"), ("calcium", "Calcium", "mg"), ("iron", "Iron", "mg"),
             ("potassium", "Potassium", "mg"), ("sodium", "Sodium", "mg"), ("vitc", "Vitamin C", "mg")]
