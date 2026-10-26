"""Build foods.json: BLS Sep-2026 U.S. city average prices + USDA SR28 nutrients per 100 g edible."""
import json, sys
sys.path.insert(0, '.')
from sr import ab, fd

LB = 453.6
# id, name, category, BLS item (exact), price, price unit, purchase grams per price unit,
# USDA NDB no., serving g, serving desc, max servings/day, tags, mapping note
F = [
 ("rice","White rice (dry)","Grains","Rice, white, long grain, uncooked",1.118,"per lb",LB,"20044",46,"1/4 cup dry (~3/4 cup cooked)",4,[],""),
 ("pasta","Spaghetti / macaroni (dry)","Grains","Spaghetti and macaroni",1.375,"per lb",LB,"20120",57,"2 oz dry",3,[],""),
 ("bread","White bread","Grains","Bread, white, pan",1.830,"per lb",LB,"18069",29,"1 slice",6,["may-contain-dairy"],""),
 ("flour","All-purpose flour","Grains","Flour, white, all purpose",0.545,"per lb",LB,"20081",31,"1/4 cup",3,[],"Ingredient (pancakes, tortillas)"),
 ("beans","Dried pinto beans","Legumes","Beans, dried, any type, all sizes",1.669,"per lb",LB,"16042",48,"1/4 cup dry (~3/4 cup cooked)",4,[],"BLS item covers any dried bean; pinto used as the representative type"),
 ("ground_beef","Ground beef (regular)","Meat","Ground beef, 100% beef",6.792,"per lb",LB,"23572",113,"4 oz raw",2,["meat"],"Assumed 80/20 lean/fat; BLS does not state fat %"),
 ("lean_beef","Ground beef (lean)","Meat","Ground beef, lean and extra lean",8.461,"per lb",LB,"23562",113,"4 oz raw",2,["meat"],"Assumed 90/10 lean/fat"),
 ("sirloin","Sirloin steak","Meat","Steak, sirloin, USDA Choice, boneless",14.106,"per lb",LB,"13931",113,"4 oz raw",2,["meat"],""),
 ("bacon","Bacon","Meat","Bacon, sliced",6.756,"per lb",LB,"10123",28,"1 slice raw",3,["meat","pork"],""),
 ("pork_chops","Pork chops (boneless)","Meat","Chops, boneless",4.550,"per lb",LB,"10164",113,"4 oz raw",2,["meat","pork"],""),
 ("ham","Ham (boneless)","Meat","Ham, boneless, excluding canned",5.450,"per lb",LB,"07029",56,"2 slices",2,["meat","pork"],"Nutrients for sliced regular ham (~11% fat)"),
 ("whole_chicken","Whole chicken","Poultry","Chicken, fresh, whole",2.064,"per lb",LB,"05006",113,"4 oz raw meat & skin",2,["meat"],"Price includes bone; edible yield applied"),
 ("chicken_breast","Chicken breast (boneless)","Poultry","Chicken breast, boneless",4.203,"per lb",LB,"05062",113,"4 oz raw",3,["meat"],""),
 ("chicken_legs","Chicken legs (bone-in)","Poultry","Chicken legs, bone-in",1.739,"per lb",LB,"05075",113,"4 oz raw meat & skin",2,["meat"],"Price includes bone; edible yield applied"),
 ("eggs","Eggs (large)","Eggs & Dairy","Eggs, grade A, large",2.272,"per dozen",600/0.88,"01123",50,"1 large egg",4,["egg"],"Dozen = 12 x 50 g edible egg; shell is 12% of purchase weight"),
 ("milk","Whole milk","Eggs & Dairy","Milk, fresh, whole, fortified",4.106,"per gallon",16*244,"01077",244,"1 cup",4,["dairy"],"Gallon = 16 cups x 244 g"),
 ("cheddar","Cheddar cheese","Eggs & Dairy","Cheddar cheese, natural",6.133,"per lb",LB,"01009",28,"1 oz",3,["dairy"],""),
 ("american","American cheese","Eggs & Dairy","American processed cheese",4.737,"per lb",LB,"01042",28,"1 slice",3,["dairy"],""),
 ("ice_cream","Vanilla ice cream","Snacks & Sweets","Ice cream, prepackaged, bulk, regular",5.931,"per 1/2 gallon",8*132,"19095",66,"1/2 cup",2,["dairy"],"1/2 gallon = 8 cups x 132 g"),
 ("bananas","Bananas","Fruit","Bananas",0.656,"per lb",LB,"09040",118,"1 medium",3,[],"Price includes peel; edible yield applied"),
 ("oranges","Navel oranges","Fruit","Oranges, Navel",1.723,"per lb",LB,"09202",140,"1 orange",3,[],"Price includes peel; edible yield applied"),
 ("strawberries","Strawberries","Fruit","Strawberries, dry pint",2.840,"per 12 oz",340.2,"09316",152,"1 cup halves",2,[],""),
 ("potatoes","White potatoes","Vegetables","Potatoes, white",0.989,"per lb",LB,"11352",150,"1 cup diced",3,[],"USDA refuse assumes peeled; eating the skin raises the yield"),
 ("iceberg","Iceberg lettuce","Vegetables","Lettuce, iceberg",1.636,"per lb",LB,"11252",72,"1 cup shredded",4,[],""),
 ("romaine","Romaine lettuce","Vegetables","Lettuce, romaine",3.312,"per lb",LB,"11251",47,"1 cup shredded",4,[],""),
 ("tomatoes","Tomatoes","Vegetables","Tomatoes, field grown",1.992,"per lb",LB,"11529",180,"1 cup chopped",2,[],""),
 ("sugar","White sugar","Snacks & Sweets","Sugar, white, all sizes",1.019,"per lb",LB,"19335",4.2,"1 tsp",6,[],""),
 ("cookies","Chocolate chip cookies","Snacks & Sweets","Cookies, chocolate chip",5.152,"per lb",LB,"18159",25.8,"2 cookies",2,["contains-dairy-egg"],""),
 ("chips","Potato chips","Snacks & Sweets","Potato chips",6.668,"per 16 oz",LB,"19411",28,"1 oz",2,[],""),
 # Common foods BLS no longer prices (series discontinued) -- price to be entered locally
 ("peanut_butter","Peanut butter","Legumes","(BLS series discontinued Dec 2017)",None,"per lb",LB,"16098",32,"2 tbsp",2,[],"Enter a local price"),
 ("oats","Rolled oats (dry)","Grains","(not priced by BLS)",None,"per lb",LB,"08120",40.5,"1/2 cup dry",3,[],"Enter a local price"),
 ("broccoli","Broccoli","Vegetables","(BLS series discontinued Mar 2020)",None,"per lb",LB,"11090",91,"1 cup chopped",3,[],"Enter a local price"),
 ("carrots","Carrots","Vegetables","(BLS series discontinued Mar 2014)",None,"per lb",LB,"11124",128,"1 cup chopped",2,[],"Enter a local price"),
 ("apples","Apples","Fruit","(BLS series discontinued Oct 2017)",None,"per lb",LB,"09003",125,"1 cup chopped",3,[],"Enter a local price"),
 ("tuna","Canned light tuna (drained)","Fish","(not priced by BLS)",None,"per lb drained",LB,"15121",85,"3 oz drained",2,["fish"],"Enter a local price per lb of drained tuna"),
 ("butter","Butter (salted)","Eggs & Dairy","(BLS series discontinued Apr 2012)",None,"per lb",LB,"01001",14.2,"1 tbsp",2,["dairy"],"Enter a local price"),
]
NUTS = [("kcal","Calories","kcal"),("protein","Protein","g"),("carb","Carbohydrate","g"),("fat","Fat","g"),
        ("fiber","Fiber","g"),("sugar","Total sugars","g"),("calcium","Calcium","mg"),("iron","Iron","mg"),
        ("potassium","Potassium","mg"),("sodium","Sodium","mg"),("vitc","Vitamin C","mg")]
out = []
for (fid,name,cat,bls,price,unit,pg,ndb,sg,sd,mx,tags,note) in F:
    a, d = ab[ndb], fd[ndb]
    refuse = float(d['refuse'] or 0)
    nut = {}
    for k,_,_ in NUTS:
        v = a[k]
        nut[k] = float(v) if v not in ('', None) else 0.0
    out.append(dict(id=fid,name=name,category=cat,bls_item=bls,price=price,price_unit=unit,
        purchase_g=round(pg,4),refuse_pct=refuse,refuse_desc=d['refdesc'],edible_yield=round(1-refuse/100,2),
        ndb=ndb,usda_desc=d['long'],serving_g=sg,serving_desc=sd,max_servings=mx,tags=tags,note=note,
        per100g=nut))
json.dump(dict(nutrients=[dict(key=k,label=l,unit=u) for k,l,u in NUTS],foods=out),open('foods.json','w'),indent=1)
missing=[f['id'] for f in out if any(ab[f['ndb']][k]=='' for k,_,_ in NUTS)]
print(len(out),'foods; blank nutrient fields (treated as 0):',missing)
for f in out: print(f"{f['id']:15s} yield {f['edible_yield']:.2f} {f['per100g']}")
