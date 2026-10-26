"""Food list v2: the 71 core foods (priced at one store, Walmart, on one date) plus added foods priced from
official U.S. averages (BLS Average Price Data; USDA ERS Fruit and Vegetable Prices scaled by the BLS CPI).

Each row:
  id, name, group, type, store product, price $, package grams (as bought), price note,
  BLS U.S.-average reference (price, grams per BLS unit) or None,
  edible yield (1 - refuse), USDA SR28 NDB number, serving grams, serving label, max servings/day,
  meal pattern (fractions for Breakfast, Lunch, Dinner, Snack), attribute flags.

Attribute flags drive the diet and allergy filters: meat (beef/pork), pork, poultry, fish, egg, dairy, gluten,
shellfish, peanut, treenut, soy. Allergy flags mark foods that ARE the allergen; packaged foods can still contain
or be cross-contaminated with allergens, so the site tells people to read labels.
Core prices: Walmart.com / business.walmart.com, observed Oct 2026 unless the note says otherwise.
Added foods (core=False): see ADDED_FOODS below for the price method.
Rule: when an item was on Rollback (temporary sale), the regular price is used.
"""
LB, OZ = 453.592, 28.3495

# meal patterns: (B, L, D, S) — share of a food's daily amount eaten at each meal
B, BS, LD, L_, D_, S_, BL, LS, BD = (1, 0, 0, 0), (.5, 0, 0, .5), (0, .5, .5, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1), (.5, .5, 0, 0), (0, .5, 0, .5), (.5, 0, .5, 0)

def F(id, name, group, typ, product, price, pkg_g, note, bls, yld, ndb, sg, sdesc, mx, meal, flags="", src="walmart", core=True):
    return dict(id=id, name=name, group=group, type=typ, product=product, price=price, package_g=round(pkg_g, 1),
                price_note=note, bls=bls, edible_yield=yld, ndb=ndb, serving_g=sg, serving_desc=sdesc,
                max_servings=mx, meal=meal, flags=[f for f in flags.split(',') if f], price_source=src, core=core)

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
 F("shrimp","Shrimp (raw, peeled)","Proteins","Fish & Seafood","Great Value frozen, 2 lb",15.96,2*LB,"",None,1.0,"15149",113,"4 oz raw",2,D_,"fish,shellfish"),
 F("eggs","Eggs (large)","Proteins","Eggs","Great Value large, 12 ct",1.67,12*50/0.88,"Dozen = 12 x 50 g edible; shell is 12% of weight",(2.272,12*50/0.88),0.88,"01123",50,"1 large egg",3,B,"egg"),
 F("tofu","Tofu (extra firm)","Proteins","Plant Proteins","Nasoya extra firm, 14 oz",2.97,14*OZ,"Price undated (Walmart Business listing)",None,1.0,"16212",85,"3 oz",3,LD,"soy"),
 F("lentils","Lentils (dry)","Proteins","Plant Proteins","Great Value, 1 lb",1.92,LB,"",None,1.0,"16069",48,"1/4 cup dry (~3/4 cup cooked)",3,LD,""),
 F("black_beans","Black beans (canned)","Proteins","Plant Proteins","Great Value no salt added, 15 oz",0.92,15*OZ,"Nutrients for solids + liquid",None,1.0,"16316",120,"1/2 cup",3,LD,""),
 F("chickpeas","Chickpeas (canned)","Proteins","Plant Proteins","Great Value, 15.5 oz",0.92,15.5*OZ,"Nutrients for solids + liquid",None,1.0,"16058",120,"1/2 cup",3,LD,""),
 F("pinto_beans","Pinto beans (dry)","Proteins","Plant Proteins","Great Value, 2 lb",1.98,2*LB,"",(1.669,LB),1.0,"16042",48,"1/4 cup dry (~3/4 cup cooked)",3,LD,""),
 F("peanut_butter","Peanut butter","Proteins","Plant Proteins","Great Value creamy, 40 oz",3.98,40*OZ,"",None,1.0,"16098",32,"2 tbsp",2,BS,"peanut"),
 # ---------------- DAIRY ----------------
 F("milk_whole","Whole milk","Dairy & Alternatives","Milk & Yogurt","Great Value, 1 gal",3.48,16*244,"Gallon = 16 cups x 244 g",(4.106,16*244),1.0,"01077",244,"1 cup",3,BS,"dairy"),
 F("milk_2pct","2% milk","Dairy & Alternatives","Milk & Yogurt","Great Value, 1 gal",3.31,16*244,"Gallon = 16 cups x 244 g",None,1.0,"01079",244,"1 cup",3,BS,"dairy"),
 F("soy_milk","Soy milk (calcium-fortified)","Dairy & Alternatives","Milk & Yogurt","Silk original, 64 fl oz",4.57,8*243,"Half gallon = 8 cups x 243 g",None,1.0,"16139",243,"1 cup",3,BS,"soy"),
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
 F("romaine","Romaine lettuce","Vegetables","Vegetables","Romaine, per lb (BLS U.S. average)",3.312,LB,"BLS Sep 2026 price (Walmart sells by count)",(3.312,LB),0.94,"11251",94,"2 cups shredded",2,LD,"",src="bls"),
 F("tomatoes","Tomatoes (roma)","Vegetables","Vegetables","Fresh roma, per lb",0.85,LB,"",(1.992,LB),0.91,"11529",180,"1 cup chopped",2,LD,""),
 F("onions","Onions (yellow)","Vegetables","Vegetables","Fresh yellow, 3 lb bag",2.96,3*LB,"Price undated (Walmart.com listing)",None,0.90,"11282",80,"1/2 cup chopped",2,LD,""),
 F("bell_pepper","Green bell pepper","Vegetables","Vegetables","Fresh, each (~145 g)",0.86,145,"Each ~145 g as bought (119 g edible, USDA)",None,0.82,"11333",149,"1 cup chopped",1,LD,""),
 F("mixed_veg","Mixed vegetables (frozen)","Vegetables","Vegetables","Great Value, 32 oz",2.58,32*OZ,"",None,1.0,"11583",95,"2/3 cup",3,LD,""),
 F("green_beans","Green beans (canned)","Vegetables","Vegetables","Great Value cut, 14.5 oz",0.84,14.5*OZ,"Regular price; was on Rollback at $0.50",None,1.0,"11054",120,"1/2 cup",3,LD,""),
 # ---------------- FATS ----------------
 F("olive_oil","Olive oil (extra virgin)","Fats, Oils & Nuts","Oils & Fats","Great Value, 51 fl oz",17.87,6.375*216,"51 fl oz = 6.375 cups x 216 g",None,1.0,"04053",13.5,"1 tbsp",3,LD,""),
 F("canola_oil","Canola oil","Fats, Oils & Nuts","Oils & Fats","Great Value, 48 fl oz",4.08,6*218,"48 fl oz = 6 cups x 218 g",None,1.0,"04582",14,"1 tbsp",3,LD,""),
 F("butter","Butter (salted)","Fats, Oils & Nuts","Oils & Fats","Great Value, 2 x 16 oz",5.96,2*LB,"",None,1.0,"01001",14.2,"1 tbsp",2,BD,"dairy"),
 F("almonds","Almonds","Fats, Oils & Nuts","Nuts & Seeds","Great Value whole, 16 oz",9.48,LB,"Price undated (Walmart.com listing)",None,1.0,"12061",28,"1 oz (~23 almonds)",2,S_,"treenut"),
 F("avocado","Avocado (Hass)","Fats, Oils & Nuts","Nuts & Seeds","Fresh, each (~203 g)",0.87,203,"Each ~203 g as bought (136 g edible, USDA)",None,0.67,"09038",68,"1/2 avocado",2,LD,""),
 # ---------------- SNACKS ----------------
 F("chips","Potato chips","Snacks & Sweets","Snacks","Great Value original, 8 oz",1.87,8*OZ,"From 10-pack price $18.70",(6.668,LB),1.0,"19411",28,"1 oz",1,S_,""),
 F("cookies","Chocolate chip cookies","Snacks & Sweets","Snacks","Great Value chewy, 13 oz",3.02,13*OZ,"Older listing (Jul 2025) — verify",(5.152,LB),1.0,"18159",26,"2 cookies",1,S_,"gluten,dairy,egg"),
 F("granola_bar","Granola bars (chocolate chip)","Snacks & Sweets","Snacks","Great Value chewy, 10 ct",2.28,8.4*OZ,"Price undated (Walmart Business listing)",None,1.0,"19404",24,"1 bar",2,S_,"gluten,dairy"),
 F("ice_cream","Vanilla ice cream","Snacks & Sweets","Snacks","Great Value, 48 fl oz",3.12,6*132,"48 fl oz = 6 cups x 132 g",(5.931,8*132),1.0,"19095",66,"1/2 cup",1,S_,"dairy"),
]

# ---------------- ADDED FOODS (Oct 2026) ----------------
# Walmart.com answers automated lookups with a bot check, so these foods are NOT priced from Walmart. They use
# official U.S. average prices instead, and every note says which:
#  * BLS Average Price Data, U.S. city average, September 2026 (each value read from its data.bls.gov series page).
#  * USDA ERS "Fruit and Vegetable Prices" (2023 retail scanner data, files updated 12/9/2025), moved to
#    September 2026 with the BLS CPI-U index for the same category: price_2026 = price_2023 x CPI(Sep 2026) / CPI(2023 avg).
#    This is an estimate of a national average, not a store shelf price. Cross-check: scaled ERS bananas $0.647/lb,
#    potatoes $0.977/lb and iceberg lettuce $1.567/lb vs BLS Sep 2026 $0.656, $0.989 and $1.636.
# Package = 1 lb (prices are per pound). Edible yield = 1 - USDA SR28 refuse for fresh produce; 1 for frozen, canned
# (nutrients are for solids + liquid) and dried foods.
CPI = {  # BLS CPI-U, U.S. city average, not seasonally adjusted: (series, label, 2023 average = mean of the two half-year averages, Sep 2026)
    "fresh_fruit": ("CUUR0000SEFK", "fresh fruits", (407.940 + 410.217) / 2, 433.870),
    "fresh_veg": ("CUUR0000SEFL", "fresh vegetables", (377.524 + 377.302) / 2, 400.183),
    "canned": ("CUUR0000SEFM01", "canned fruits and vegetables", (211.354 + 214.721) / 2, 235.069),
    "frozen": ("CUUR0000SEFM02", "frozen fruits and vegetables", (186.973 + 188.486) / 2, 191.463),
    "dried": ("CUUR0000SEFM03", "other processed fruits and vegetables including dried", (187.896 + 188.078) / 2, 202.923),
}
FORM = {"fresh_fruit": "Fresh", "fresh_veg": "Fresh", "canned": "Canned (can contents)", "frozen": "Frozen", "dried": "Dried"}

def E(id, name, group, typ, p2023, cpi, yld, ndb, sg, sdesc, mx, meal, flags="", extra=""):
    """Food priced from USDA ERS 2023 average $/lb, scaled to Sep 2026 by the matching BLS CPI index."""
    series, label, base, now = CPI[cpi]
    price = round(p2023 * now / base, 3)
    note = (f"Estimate: USDA ERS 2023 U.S. average ${p2023:.4f}/lb x BLS CPI {label} ({series}) Sep 2026 / 2023 avg "
            f"= {now / base:.4f}" + (f"; {extra}" if extra else ""))
    return F(id, name, group, typ, f"{FORM[cpi]}, per lb (USDA ERS U.S. average)", price, LB, note, None, yld, ndb,
             sg, sdesc, mx, meal, flags, src="ers", core=False)

def BLS(id, name, group, typ, series, item, price, yld, ndb, sg, sdesc, mx, meal, flags="", extra=""):
    """Food priced from BLS Average Price Data, U.S. city average, September 2026."""
    note = f"BLS {series} \"{item}\", U.S. city average, Sep 2026" + (f"; {extra}" if extra else "")
    return F(id, name, group, typ, f"{item} (BLS U.S. average)", price, LB, note, (price, LB), yld, ndb,
             sg, sdesc, mx, meal, flags, src="bls", core=False)

ADDED_FOODS = [
 # ---- proteins (BLS) ----
 BLS("whole_chicken","Whole chicken","Proteins","Poultry","APU0000706111","Chicken, fresh, whole, per lb",2.064,0.68,"05006",113,"4 oz raw meat & skin",2,LD,"poultry",extra="edible yield 68% (USDA refuse 32% bone)"),
 BLS("stew_beef","Beef for stew (boneless)","Proteins","Red Meat & Pork","APU0000703432","Beef for stew, boneless, per lb",8.533,1.0,"23093",113,"4 oz raw",2,D_,"meat"),
 BLS("round_steak","Round steak (boneless)","Proteins","Red Meat & Pork","APU0000703511","Steak, round, USDA Choice, boneless, per lb",9.838,1.0,"13894",113,"4 oz raw",2,D_,"meat",extra="USDA top round steak, Choice, as the nutrient match"),
 # ---- beans, dried (ERS x CPI dried) ----
 E("black_beans_dry","Black beans (dry)","Proteins","Plant Proteins",1.658510355,"dried",1.0,"16014",48,"1/4 cup dry (~3/4 cup cooked)",3,LD),
 E("kidney_beans_dry","Kidney beans (dry)","Proteins","Plant Proteins",1.99633282,"dried",1.0,"16027",48,"1/4 cup dry (~3/4 cup cooked)",3,LD),
 E("navy_beans_dry","Navy beans (dry)","Proteins","Plant Proteins",1.705845988,"dried",1.0,"16037",48,"1/4 cup dry (~3/4 cup cooked)",3,LD,extra="USDA lists no vitamin C value; counted as 0"),
 E("gn_beans_dry","Great northern beans (dry)","Proteins","Plant Proteins",1.872836969,"dried",1.0,"16024",48,"1/4 cup dry (~3/4 cup cooked)",3,LD),
 E("blackeye_dry","Black-eyed peas (dry)","Proteins","Plant Proteins",2.125516477,"dried",1.0,"16062",48,"1/4 cup dry (~3/4 cup cooked)",3,LD),
 E("lima_dry","Lima beans (dry)","Proteins","Plant Proteins",2.654307766,"dried",1.0,"16071",48,"1/4 cup dry (~3/4 cup cooked)",3,LD),
 # ---- beans, canned (ERS x CPI canned) ----
 E("kidney_beans_can","Kidney beans (canned)","Proteins","Plant Proteins",1.199920223,"canned",1.0,"16034",120,"1/2 cup",3,LD,extra="nutrients for solids + liquid"),
 E("navy_beans_can","Navy beans (canned)","Proteins","Plant Proteins",1.234459073,"canned",1.0,"16039",120,"1/2 cup",3,LD,extra="nutrients for solids + liquid"),
 E("gn_beans_can","Great northern beans (canned)","Proteins","Plant Proteins",1.167251314,"canned",1.0,"16026",120,"1/2 cup",3,LD,extra="nutrients for solids + liquid"),
 E("blackeye_can","Black-eyed peas (canned)","Proteins","Plant Proteins",1.42085767,"canned",1.0,"16064",120,"1/2 cup",3,LD,extra="nutrients for solids + liquid"),
 E("pinto_beans_can","Pinto beans (canned)","Proteins","Plant Proteins",1.2121028,"canned",1.0,"16044",120,"1/2 cup",3,LD,extra="nutrients for solids + liquid"),
 # ---- starchy vegetables ----
 E("peas_frozen","Green peas (frozen)","Carbohydrates","Starchy Vegetables",2.191018173,"frozen",1.0,"11312",67,"1/2 cup",3,LD),
 E("peas_can","Green peas (canned)","Carbohydrates","Starchy Vegetables",1.421894276,"canned",1.0,"11306",124,"1/2 cup",2,LD),
 E("lima_frozen","Baby lima beans (frozen)","Carbohydrates","Starchy Vegetables",2.834837939,"frozen",1.0,"11039",82,"1/2 cup",2,LD),
 E("corn_can","Corn (canned)","Carbohydrates","Starchy Vegetables",1.218782103,"canned",1.0,"11170",128,"1/2 cup",2,LD),
 E("fries_frozen","French fries (frozen)","Carbohydrates","Starchy Vegetables",2.520906337,"frozen",1.0,"11842",85,"3 oz (about 13 fries), baked",1,LD),
 # ---- fruit, fresh (ERS x CPI fresh fruits; grapefruit from BLS) ----
 BLS("grapefruit","Grapefruit","Fruits","Fruit","APU0000711411","Grapefruit, per lb",1.624,0.50,"09111",230,"1 cup sections",2,BS,extra="edible yield 50% (USDA refuse: peel, seeds, membrane)"),
 E("cantaloupe","Cantaloupe","Fruits","Fruit",0.791924175,"fresh_fruit",0.51,"09181",160,"1 cup cubes",2,BS),
 E("honeydew","Honeydew melon","Fruits","Fruit",1.250052787,"fresh_fruit",0.46,"09184",170,"1 cup diced",2,BS),
 E("watermelon","Watermelon","Fruits","Fruit",0.405825415,"fresh_fruit",0.52,"09326",152,"1 cup diced",2,S_),
 E("pineapple","Pineapple","Fruits","Fruit",0.668427034,"fresh_fruit",0.51,"09266",165,"1 cup chunks",2,BS),
 E("mango","Mango","Fruits","Fruit",1.458675758,"fresh_fruit",0.71,"09176",165,"1 cup pieces",2,BS),
 E("papaya","Papaya","Fruits","Fruit",1.305512939,"fresh_fruit",0.62,"09226",145,"1 cup pieces",2,BS),
 E("pears","Pears","Fruits","Fruit",1.916739424,"fresh_fruit",0.90,"09252",140,"1 cup slices",2,LS),
 E("peaches","Peaches","Fruits","Fruit",2.457099438,"fresh_fruit",0.96,"09236",154,"1 cup slices",2,BS),
 E("nectarines","Nectarines","Fruits","Fruit",2.475306142,"fresh_fruit",0.91,"09191",143,"1 cup slices",2,BS),
 E("plums","Plums","Fruits","Fruit",2.658223036,"fresh_fruit",0.94,"09279",165,"1 cup sliced",2,S_),
 E("kiwi","Kiwifruit","Fruits","Fruit",2.834707401,"fresh_fruit",0.76,"09148",180,"1 cup sliced",2,BS),
 E("clementines","Clementines","Fruits","Fruit",1.58557324,"fresh_fruit",0.77,"09433",210,"about 3 clementines",2,S_,extra="cup-equivalent 210 g from USDA ERS (no USDA cup measure); USDA lists no saturated-fat value, counted as 0"),
 E("cherries","Cherries","Fruits","Fruit",3.659903242,"fresh_fruit",0.92,"09070",154,"1 cup, pitted",1,S_),
 E("raspberries","Raspberries","Fruits","Fruit",7.966754529,"fresh_fruit",0.96,"09302",123,"1 cup",1,BS),
 E("blackberries","Blackberries","Fruits","Fruit",6.83446877,"fresh_fruit",0.96,"09042",144,"1 cup",1,BS),
 # ---- fruit, canned / frozen / dried ----
 E("applesauce","Applesauce (unsweetened)","Fruits","Fruit",1.208099427,"canned",1.0,"09019",122,"1/2 cup",2,BS),
 E("peaches_can","Peaches (canned in juice)","Fruits","Fruit",2.486758071,"canned",1.0,"09238",125,"1/2 cup",2,BS),
 E("pears_can","Pears (canned in juice)","Fruits","Fruit",2.329038064,"canned",1.0,"09254",124,"1/2 cup",2,BS),
 E("pineapple_can","Pineapple (canned in juice)","Fruits","Fruit",1.721465817,"canned",1.0,"09268",125,"1/2 cup",2,BS),
 E("fruit_cocktail","Fruit cocktail (canned in juice)","Fruits","Fruit",2.650530966,"canned",1.0,"09097",119,"1/2 cup",2,BS),
 E("strawberries_frozen","Strawberries (frozen)","Fruits","Fruit",3.46750705,"frozen",1.0,"09318",149,"1 cup",2,BS),
 E("prunes","Prunes (pitted)","Fruits","Fruit",6.906399803,"dried",1.0,"09291",44,"1/4 cup",1,S_,extra="sold pitted, so USDA's 13% pit refuse is not applied"),
 E("dates","Dates (pitted)","Fruits","Fruit",5.88786111,"dried",1.0,"09087",37,"1/4 cup chopped",1,S_,extra="sold pitted, so USDA's 10% pit refuse is not applied"),
 E("apricots_dried","Dried apricots","Fruits","Fruit",8.634283691,"dried",1.0,"09032",33,"1/4 cup halves",1,S_),
 E("cranberries_dried","Dried cranberries (sweetened)","Fruits","Fruit",5.263878609,"dried",1.0,"09079",40,"1/4 cup",1,S_),
 # ---- vegetables, fresh (ERS x CPI fresh vegetables; iceberg from BLS) ----
 BLS("iceberg","Iceberg lettuce","Vegetables","Vegetables","APU0000712211","Lettuce, iceberg, per lb",1.636,0.95,"11252",144,"2 cups shredded",2,LD),
 E("cabbage","Cabbage (green)","Vegetables","Vegetables",0.826627116,"fresh_veg",0.80,"11109",89,"1 cup chopped",2,LD),
 E("red_cabbage","Cabbage (red)","Vegetables","Vegetables",1.260671568,"fresh_veg",0.80,"11112",89,"1 cup chopped",2,LD),
 E("baby_carrots","Baby carrots","Vegetables","Vegetables",1.463044321,"fresh_veg",1.0,"11960",125,"1 cup (about 12)",2,LS,extra="cup-equivalent 125 g from USDA ERS"),
 E("celery","Celery","Vegetables","Vegetables",1.327844847,"fresh_veg",0.89,"11143",101,"1 cup chopped",2,LS),
 E("cucumber","Cucumber","Vegetables","Vegetables",1.092848382,"fresh_veg",0.97,"11205",104,"1 cup slices",2,LD),
 E("mushrooms","Mushrooms (white)","Vegetables","Vegetables",4.154521771,"fresh_veg",0.97,"11260",70,"1 cup pieces",2,LD),
 E("red_pepper","Red bell pepper","Vegetables","Vegetables",1.705233347,"fresh_veg",0.82,"11821",149,"1 cup chopped",1,LD),
 E("zucchini","Zucchini","Vegetables","Vegetables",1.639076186,"fresh_veg",0.95,"11477",124,"1 cup chopped",2,LD),
 E("butternut","Butternut squash","Vegetables","Vegetables",1.270953317,"fresh_veg",0.84,"11485",140,"1 cup cubes",2,LD),
 E("acorn_squash","Acorn squash","Vegetables","Vegetables",1.241438589,"fresh_veg",0.76,"11482",140,"1 cup cubes",2,LD,extra="USDA lists no sugars value; counted as 0"),
 E("asparagus","Asparagus","Vegetables","Vegetables",3.212453364,"fresh_veg",0.53,"11011",134,"1 cup",1,LD),
 E("radishes","Radishes","Vegetables","Vegetables",1.850976729,"fresh_veg",0.90,"11429",116,"1 cup slices",1,LD),
 E("collards","Collard greens","Vegetables","Vegetables",2.483338628,"fresh_veg",0.57,"11161",72,"2 cups chopped, raw",2,LD),
 # ---- vegetables, frozen ----
 E("green_beans_frozen","Green beans (frozen)","Vegetables","Vegetables",2.173343764,"frozen",1.0,"11060",121,"1 cup",2,LD),
 E("spinach_frozen","Spinach (frozen)","Vegetables","Vegetables",2.468972167,"frozen",1.0,"11463",156,"1 cup",2,LD),
 E("carrots_frozen","Carrots (frozen)","Vegetables","Vegetables",2.037831594,"frozen",1.0,"11130",128,"1 cup slices",2,LD),
 E("cauliflower_frozen","Cauliflower (frozen)","Vegetables","Vegetables",2.719124778,"frozen",1.0,"11137",132,"1 cup pieces",2,LD),
 E("brussels_frozen","Brussels sprouts (frozen)","Vegetables","Vegetables",2.885028256,"frozen",1.0,"11100",162,"about 1 cup",2,LD,extra="cup-equivalent from USDA ERS (cooked cup / cooking yield); USDA lists no sugars value"),
 E("kale_frozen","Kale (frozen)","Vegetables","Vegetables",2.28053379,"frozen",1.0,"11235",183,"about 1 cup",2,LD,extra="cup-equivalent from USDA ERS (cooked cup / cooking yield); USDA lists no sugars value"),
 E("collards_frozen","Collard greens (frozen)","Vegetables","Vegetables",2.723966393,"frozen",1.0,"11163",187,"about 1 cup",2,LD,extra="cup-equivalent from USDA ERS (cooked cup / cooking yield); USDA lists no sugars value"),
 E("turnip_greens_frozen","Turnip greens (frozen)","Vegetables","Vegetables",2.919789615,"frozen",1.0,"11574",164,"1 cup chopped",2,LD,extra="USDA lists no sugars value"),
 E("mustard_greens_frozen","Mustard greens (frozen)","Vegetables","Vegetables",2.920188174,"frozen",1.0,"11272",146,"1 cup chopped",2,LD,extra="USDA lists no sugars value"),
 E("okra_frozen","Okra (frozen)","Vegetables","Vegetables",2.652850328,"frozen",1.0,"11280",189,"about 1 cup",2,LD,extra="cup-equivalent from USDA ERS (cooked cup / cooking yield)"),
 # ---- vegetables, canned ----
 E("tomatoes_can","Tomatoes (canned)","Vegetables","Vegetables",1.208159726,"canned",1.0,"11531",240,"1 cup",2,LD),
 E("carrots_can","Carrots (canned)","Vegetables","Vegetables",1.320606207,"canned",1.0,"11126",246,"1 cup slices with liquid",2,LD),
 E("spinach_can","Spinach (canned)","Vegetables","Vegetables",1.670872006,"canned",1.0,"11459",234,"1 cup",2,LD),
 E("beets_can","Beets (canned)","Vegetables","Vegetables",1.257920081,"canned",1.0,"11082",246,"1 cup",1,LD),
 E("pumpkin_can","Pumpkin (canned)","Vegetables","Vegetables",2.080888289,"canned",1.0,"11424",245,"1 cup",1,LD),
 E("sauerkraut","Sauerkraut (canned)","Vegetables","Vegetables",1.630119528,"canned",1.0,"11439",236,"1 cup with liquid",1,LD),
]
FOODS = FOODS + ADDED_FOODS

GROUP_ORDER =["Proteins", "Dairy & Alternatives", "Carbohydrates", "Fruits", "Vegetables", "Fats, Oils & Nuts", "Snacks & Sweets"]
TYPE_ORDER = ["Poultry", "Red Meat & Pork", "Fish & Seafood", "Eggs", "Plant Proteins", "Milk & Yogurt", "Cheese",
              "Grains & Bread", "Starchy Vegetables", "Fruit", "Vegetables", "Oils & Fats", "Nuts & Seeds", "Snacks"]

ATTRS = ["meat", "pork", "poultry", "fish", "egg", "dairy", "gluten", "shellfish", "peanut", "treenut", "soy"]
ATTR_LABELS = ["Red meat", "Pork", "Poultry", "Fish", "Eggs", "Dairy", "Gluten", "Shellfish", "Peanuts", "Tree nuts", "Soy"]
ALLERGENS = ["dairy", "egg", "gluten", "fish", "shellfish", "peanut", "treenut", "soy"]   # offered as allergy filters on the site

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
 dict(name="Dairy-Free", desc="No milk, cheese, yogurt, butter or ice cream (soy milk allowed)",
      protein=(0.10, 0.35), carb=(0.45, 0.65), fat=(0.20, 0.35), forbid=["dairy"]),
 # DASH goals (MedlinePlus / NIH): saturated fat <= 6% of calories, total fat ~27%, protein ~18%, carbohydrate ~55%,
 # sodium <= 2,300 mg with 1,500 mg "an even more effective goal". The three macro targets add to exactly 100%,
 # so they are modeled as +/-3-point bands around them (a team design choice), with the 1,500 mg sodium goal.
 dict(name="DASH-Style", desc="Heart-healthy DASH goals: saturated fat <= 6% of calories, sodium <= 1,500 mg, protein ~18%, carbs ~55%, fat ~27%",
      protein=(0.15, 0.21), carb=(0.52, 0.58), fat=(0.24, 0.30), forbid=[], sodium_max=1500, satfat_max=0.06),
]

MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"]

# Grams per USDA "cup-equivalent" (MyPlate), used for the vegetable and fruit minimums.
# 1 cup raw/cooked vegetable or fruit = 1 cup-eq; 2 cups raw leafy greens = 1; 1/2 cup dried fruit = 1; 1 cup 100% juice = 1.
CUP_EQ_G = dict(broccoli=91, carrots=128, spinach=60, romaine=94, tomatoes=180, onions=160, bell_pepper=149,
                mixed_veg=136, green_beans=235,   # canned: 1 cup drained ~ 235 g of can contents (solids + liquid basis)
                bananas=118, apples=125, oranges=140, strawberries=152, grapes=151, blueberries=155, raisins=82,
                orange_juice=249,
                # added foods: USDA SR28 household "1 cup" weight (2 cups for raw leafy greens, 1/2 cup for dried fruit);
                # where SR28 has no cup measure, the USDA ERS cup-equivalent (see each food's note)
                grapefruit=230, cantaloupe=160, honeydew=170, watermelon=152, pineapple=165, mango=165, papaya=145, pears=140,
                peaches=154, nectarines=143, plums=165, kiwi=180, clementines=210, cherries=154, raspberries=123, blackberries=144,
                applesauce=244, peaches_can=250, pears_can=248, pineapple_can=249, fruit_cocktail=237, strawberries_frozen=149,
                prunes=87, dates=73.5, apricots_dried=65, cranberries_dried=80,
                iceberg=144, cabbage=89, red_cabbage=89, baby_carrots=125, celery=101, cucumber=104, mushrooms=70, red_pepper=149,
                zucchini=124, butternut=140, acorn_squash=140, asparagus=134, radishes=116, collards=72,
                green_beans_frozen=121, spinach_frozen=156, carrots_frozen=128, cauliflower_frozen=132, brussels_frozen=162,
                kale_frozen=183, collards_frozen=187, turnip_greens_frozen=164, mustard_greens_frozen=146, okra_frozen=189,
                tomatoes_can=240, carrots_can=246, spinach_can=234, beets_can=246, pumpkin_can=245, sauerkraut=236)

# Group caps ("no absurd amounts" across similar foods). unit: 'grams' of food or 'servings' as defined per food.
GROUP_CAPS = [
    dict(key="meat_fish", label="Meat, poultry & fish", unit="grams", max=340,
         note="12 oz raw (~9 oz cooked) per day", types=["Poultry", "Red Meat & Pork", "Fish & Seafood"]),
    dict(key="legumes", label="Beans & lentils", unit="servings", max=3,
         note="about 2-2.25 cups cooked per day", ids=["lentils", "black_beans", "chickpeas", "pinto_beans", "black_beans_dry", "kidney_beans_dry", "navy_beans_dry",
              "gn_beans_dry", "blackeye_dry", "lima_dry", "kidney_beans_can", "navy_beans_can", "gn_beans_can", "blackeye_can",
              "pinto_beans_can"]),
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
             ("potassium", "Potassium", "mg"), ("sodium", "Sodium", "mg"), ("vitc", "Vitamin C", "mg"),
             ("satfat", "Saturated fat", "g")]
SR28_COLUMN = {"satfat": "fasat"}   # NUTRIENTS keys that differ from the SR28 ABBREV column name
