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

# Diet presets now live in config/diets.json (easy to edit, no Python needed); scripts/diets.py checks them
# and expands "no" into forbidden attributes + forbidden food ids.
from diets import load_diets, ATTR_ALIASES
assert list(ATTR_ALIASES) == ATTRS, "scripts/diets.py ATTR_ALIASES must list the same attributes as ATTRS"
DIETS = load_diets(FOODS)

MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"]

# ---------------------------------------------------------------------------------------------------------------
# AS EATEN. Nobody eats dry rice or raw chicken, so the model works in grams AS EATEN. For foods that are cooked or
# drained first, nutrients come from the USDA SR28 entry for the cooked/drained form, and
#     cook_yield = grams as eaten per gram as bought (edible part)
# is a mass balance between the two USDA entries: min(kcal_raw / kcal_cooked, protein_raw / protein_cooked).
# Energy and protein are conserved by cooking in water, so either ratio estimates the weight change; taking the
# smaller one is conservative (fewer cooked grams per dollar). 'yield' overrides it where USDA lists a measured yield.
# id: (NDB of the eaten form, name as eaten, serving grams as eaten, serving label, measured yield or None, source)
AS_EATEN = dict(
    white_rice=("20045", "White rice, cooked", 79, "1/2 cup cooked", None, ""),
    brown_rice=("20037", "Brown rice, cooked", 101, "1/2 cup cooked", None, ""),
    quinoa=("20137", "Quinoa, cooked", 92.5, "1/2 cup cooked", None, ""),
    oats=("08121", "Oatmeal (made with water)", 117, "1/2 cup cooked", None, ""),
    spaghetti=("20121", "Spaghetti, cooked", 62, "1/2 cup cooked", None, ""),
    ww_pasta=("20125", "Whole-wheat spaghetti, cooked", 58.5, "1/2 cup cooked", None, ""),
    lentils=("16070", "Lentils, cooked", 99, "1/2 cup cooked", None, ""),
    pinto_beans=("16043", "Pinto beans, cooked", 85.5, "1/2 cup cooked", None, ""),
    chicken_breast=("05064", "Chicken breast, roasted", 85, "3 oz cooked", None, ""),
    chicken_thigh=("05098", "Chicken thighs, roasted", 85, "3 oz cooked", None, ""),
    drumsticks=("05069", "Chicken drumsticks, roasted (meat & skin)", 85, "3 oz cooked (about 1 drumstick)", None, ""),
    ground_turkey=("05666", "Ground turkey 93/7, cooked", 85, "3 oz cooked", None, ""),
    ground_beef=("23575", "Ground beef 80/20, cooked", 85, "3 oz cooked", None, ""),
    lean_beef=("23476", "Ground beef 93/7, cooked", 85, "3 oz cooked", None, ""),
    sirloin=("13932", "Top sirloin steak, broiled", 85, "3 oz cooked", None, ""),
    pork_chops=("10189", "Pork loin chops, pan-cooked", 85, "3 oz cooked", None, ""),
    bacon=("10862", "Bacon, cooked", 11.5, "1 slice cooked", None, ""),
    salmon=("15237", "Salmon, baked", 85, "3 oz cooked", None, ""),
    tilapia=("15262", "Tilapia, baked", 85, "3 oz cooked", None, ""),
    shrimp=("15151", "Shrimp, cooked", 85, "3 oz cooked", None, ""),
    potatoes=("11674", "Baked potato (with skin)", 173, "1 medium potato", None, ""),
    sweet_potatoes=("11508", "Baked sweet potato", 100, "1/2 cup", None, ""),
    broccoli=("11095", "Broccoli, cooked (from frozen)", 92, "1/2 cup cooked", 250 / 283.5,
              "USDA SR28: a 10 oz package yields 250 g cooked"),
    corn=("11179", "Corn, cooked (from frozen)", 82.5, "1/2 cup cooked", 284 / 283.5,
          "USDA SR28: a 10 oz package yields 284 g cooked"),
    mixed_veg=("11584", "Mixed vegetables, cooked (from frozen)", 91, "1/2 cup cooked", 275 / 283.5,
               "USDA SR28: a 10 oz package yields 275 g cooked"),
    green_beans=("11056", "Green beans (canned, drained)", 135, "1 cup drained", None, ""),
)

# Grams per USDA cup-equivalent, AS EATEN: 1 cup raw or cooked vegetable/fruit; 2 cups raw leafy greens;
# 1/2 cup dried fruit; 1 cup 100% juice. Cooked weights from USDA SR28 household measures.
# Starchy vegetables count as vegetables (Dietary Guidelines); MyPlate: 1 medium baked potato = 1 cup.
CUP_EQ_G = dict(broccoli=184, carrots=128, spinach=60, romaine=94, tomatoes=180, onions=160, bell_pepper=149,
                mixed_veg=182, green_beans=135, corn=165, potatoes=173, sweet_potatoes=200,
                bananas=118, apples=125, oranges=140, strawberries=152, grapes=151, blueberries=155, raisins=82,
                orange_juice=249)

# Dietary Guidelines for Americans, 2025-2030 (released Jan 7, 2026): daily servings by calorie level
# (realfood.gov "Daily Servings by Calorie Level"). Ranges are (low, high).
DGA_SERVINGS = {
    1000: dict(protein=(1, 1.5), dairy=2, veg=1.25, fruit=1, wgrain=(1, 2), fat=2),
    1200: dict(protein=(1.5, 2), dairy=2.5, veg=1.75, fruit=1, wgrain=(1.5, 2.75), fat=2.5),
    1400: dict(protein=(2, 2.5), dairy=2.5, veg=1.75, fruit=1.5, wgrain=(1.75, 3.25), fat=2.5),
    1600: dict(protein=(2.5, 3.5), dairy=3, veg=2.5, fruit=1.5, wgrain=(1.75, 3.25), fat=3.5),
    1800: dict(protein=(2.5, 3.5), dairy=3, veg=3, fruit=1.5, wgrain=(2, 4), fat=4),
    2000: dict(protein=(3, 4), dairy=3, veg=3, fruit=2, wgrain=(2, 4), fat=4.5),
    2200: dict(protein=(3.5, 4.5), dairy=3, veg=3.5, fruit=2, wgrain=(2.25, 4.5), fat=4.5),
    2400: dict(protein=(3.5, 4.5), dairy=3, veg=3.5, fruit=2, wgrain=(2.75, 5.25), fat=5),
    2600: dict(protein=(3.5, 4.5), dairy=3, veg=4.25, fruit=2, wgrain=(3, 6), fat=5.5),
    2800: dict(protein=(4, 5), dairy=3, veg=4.25, fruit=2.5, wgrain=(3.25, 6.5), fat=6),
    3000: dict(protein=(4, 5), dairy=3, veg=4.75, fruit=2.5, wgrain=(3.25, 6.5), fat=7),
    3200: dict(protein=(4, 5), dairy=3, veg=4.75, fruit=2.5, wgrain=(3.25, 6.5), fat=8),
}
DGA_GROUP_LABELS = dict(protein="Protein foods", dairy="Dairy", veg="Vegetables", fruit="Fruits",
                        wgrain="Whole grains", fat="Healthy fats")

# What counts as ONE serving (grams as eaten). DGA 2025-2030: 3 oz cooked meat/poultry/seafood, 1 egg, 1/2 cup
# beans/lentils, 1 oz nuts, 2 tbsp nut butter, 3 oz soy; 1 cup milk, 3/4 cup yogurt, 1 oz cheese; 1/2 cup cooked
# whole grain, 1 slice bread, 1 tortilla; 1 tsp olive oil or butter. Not in the 2025-2030 list, so from MyPlate:
# fortified soy milk counts as dairy (1 cup); 2 cups cottage cheese = 1 dairy serving; 1 cup cold cereal = 1 grain.
DGA_FOOD = dict(
    protein=dict(chicken_breast=85, chicken_thigh=85, drumsticks=85, ground_turkey=85, deli_turkey=85, ground_beef=85,
                 lean_beef=85, sirloin=85, pork_chops=85, bacon=85, ham=85, tuna=85, salmon=85, tilapia=85, shrimp=85,
                 eggs=50, tofu=85, lentils=99, black_beans=120, chickpeas=120, pinto_beans=85.5, peanut_butter=32,
                 almonds=28),
    dairy=dict(milk_whole=244, milk_2pct=244, soy_milk=243, greek_yogurt=170, cheddar=28, string_cheese=28,
               american_cheese=28, cottage_cheese=452),
    wgrain=dict(brown_rice=101, quinoa=92.5, oats=117, ww_pasta=58.5, wheat_bread=32, cheerios=28),
    fat=dict(canola_oil=14 / 3, olive_oil=13.5 / 3, butter=14.2 / 3),
)
DGA_FOOD['veg'] = {k: v for k, v in CUP_EQ_G.items() if k not in ('bananas', 'apples', 'oranges', 'strawberries',
                                                                  'grapes', 'blueberries', 'raisins', 'orange_juice')}
DGA_FOOD['fruit'] = {k: v for k, v in CUP_EQ_G.items() if k not in DGA_FOOD['veg']}
# Near-duplicates share one variety slot (whole vs 2% milk is not variety).
VARIETY_KEYS = dict(milk_whole="milk", milk_2pct="milk", ground_beef="ground beef", lean_beef="ground beef")

# Refined grains, in grain servings (1/2 cup cooked, 1 oz bread, 1 small tortilla), for "at least half your grains
# whole" (DGA 2020-2025 key recommendation; 2025-2030 says limit refined grains). Corn tortillas counted as refined
# to be conservative.
REFINED_GRAINS = dict(white_rice=79, spaghetti=62, white_bread=28, bagel=28, flour_tortilla=30, corn_tortilla=26)

# Household food waste: share of food bought that is never eaten (spoilage, plate waste), consumer level, 2010.
# Buzby, Wells & Hyman (2014), USDA ERS EIB-121, Table 1. Applied to the raw, as-bought amount: you buy
# eaten / (1 - waste). Processed = frozen/canned/dried.
WASTE_BY_TYPE = {"Poultry": .22, "Red Meat & Pork": .22, "Fish & Seafood": .31, "Eggs": .21, "Plant Proteins": .18,
                 "Milk & Yogurt": .20, "Cheese": .19, "Grains & Bread": .19, "Starchy Vegetables": .24, "Fruit": .25,
                 "Vegetables": .24, "Oils & Fats": .17, "Nuts & Seeds": .09, "Snacks": .19}
WASTE_OVERRIDES = dict(blueberries=.11, raisins=.11, orange_juice=.11,          # processed fruit
                       broccoli=.18, mixed_veg=.18, green_beans=.18, corn=.18,   # processed vegetables
                       peanut_butter=.09, avocado=.25, chips=.18, greek_yogurt=.19)
WASTE_NOTE = ("Typical household food waste by food group: Buzby, Wells & Hyman (2014), USDA ERS EIB-121, Table 1. "
              "Beans and tofu use the processed-vegetable rate (18%), an assumption.")

# USDA Food Plans: Cost of Food at Home, U.S. average, May 2026 (USDA CNPP, issued June 2026), $ per WEEK for one
# person in a 4-person household (add 20% for someone living alone). Thrifty uses ages 14-19 / 20-50; the other plans
# use 14-18 / 19-50.
USDA_FOOD_PLANS = dict(
    month="May 2026",
    thrifty=dict(male={"14-19": 74.90, "20-50": 73.20, "51-70": 64.60, "71+": 61.60},
                 female={"14-19": 59.80, "20-50": 58.20, "51-70": 54.20, "71+": 60.00}),
    low=dict(male={"14-18": 73.90, "19-50": 72.90, "51-70": 68.80, "71+": 68.00},
             female={"14-18": 62.30, "19-50": 63.40, "51-70": 61.70, "71+": 61.70}),
    moderate=dict(male={"14-18": 92.60, "19-50": 91.60, "51-70": 86.40, "71+": 84.00},
                  female={"14-18": 74.40, "19-50": 77.50, "51-70": 76.20, "71+": 76.10}),
    liberal=dict(male={"14-18": 109.00, "19-50": 111.80, "51-70": 103.40, "71+": 103.30},
                 female={"14-18": 91.80, "19-50": 98.80, "51-70": 91.80, "71+": 91.00}),
)

# Group caps ("no absurd amounts" across similar foods). unit: 'grams' as eaten, or 'servings' as defined per food.
GROUP_CAPS = [
    dict(key="meat_fish", label="Meat, poultry & fish", unit="grams", max=255,
         note="9 oz cooked (about 12 oz raw) per day", types=["Poultry", "Red Meat & Pork", "Fish & Seafood"]),
    dict(key="legumes", label="Beans & lentils", unit="servings", max=4,
         note="2 cups cooked per day", ids=["lentils", "black_beans", "chickpeas", "pinto_beans"]),
    dict(key="cheese", label="Cheese", unit="servings", max=3, note="slices / oz / sticks / half-cups", types=["Cheese"]),
    dict(key="grains", label="Grains & bread", unit="servings", max=12, note="1/2 cup cooked, 1 slice, 1 tortilla", types=["Grains & Bread"]),
    dict(key="added_fats", label="Oils & butter", unit="servings", max=4, note="tablespoons", types=["Oils & Fats"]),
    dict(key="snacks", label="Snacks & sweets", unit="servings", max=2, note="", types=["Snacks"]),
]

# Balance rules ("no absurd amounts") — defaults, editable on the Planner sheet / via prefs
SETTINGS = dict(
    calorie_tolerance=0.05,          # daily calories within ±5% of target
    max_protein_share=0.35,          # no single food supplies more than 35% of the day's protein
    share_rule_min_protein=8.5,      # ...applied to foods with >= 8.5 g protein per 100 g AS EATEN (includes cooked lentils/beans, 9 g)
    meal_kcal=dict(Breakfast=(0.20, 0.30), Lunch=(0.25, 0.35), Dinner=(0.25, 0.40), Snacks=(0.05, 0.20)),
    min_meal_protein_share=0.20,     # breakfast, lunch and dinner each carry >= 20% of the day's protein
    min_veg_cups=2.5,                # TEXTBOOK model only: vegetable cup-equivalents per day
    min_fruit_cups=2.0,              # TEXTBOOK model only: fruit cup-equivalents per day
    group_caps={g["key"]: g["max"] for g in GROUP_CAPS},
    realistic=True,                  # Dietary Guidelines 2025-2030 servings for the calorie level, half grains whole,
                                     # saturated fat < 10% of calories, variety, household waste in the cost
    variety=0.5,                     # REALISTIC: one food may supply at most this share of its group's daily servings
    max_satfat_share=0.10,           # REALISTIC: saturated fat < 10% of calories (DGA 2020-2025 and 2025-2030)
    include_waste=True,              # REALISTIC: cost includes typical household food waste (USDA ERS)
)

NUTRIENTS = [("kcal", "Calories", "kcal"), ("protein", "Protein", "g"), ("carb", "Carbohydrate", "g"), ("fat", "Fat", "g"),
             ("fiber", "Fiber", "g"), ("sugar", "Total sugars", "g"), ("calcium", "Calcium", "mg"), ("iron", "Iron", "mg"),
             ("potassium", "Potassium", "mg"), ("sodium", "Sodium", "mg"), ("vitc", "Vitamin C", "mg")]
