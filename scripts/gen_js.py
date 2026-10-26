import json
d=json.load(open('foods.json'))
keep=['id','name','category','price','price_unit','purchase_g','edible_yield','serving_g','serving_desc','max_servings','tags','ndb','bls_item','per100g']
foods=[{k:f[k] for k in keep} for f in d['foods']]
data = "export const NUTRIENTS = " + json.dumps(d['nutrients']) + ";\n\n"
data += "// price = BLS Sep-2026 U.S. city average in price_unit (null = not priced by BLS; pass prefs.prices to fill in)\n"
data += "// purchase_g = grams per price unit as bought; edible_yield = 1 - USDA refuse fraction; per100g = USDA SR28 per 100 g edible\n"
data += "export const FOODS = [\n" + ",\n".join("  "+json.dumps(f) for f in foods) + "\n];\n"
src=open('solver_template.js').read().replace('/*__DATA__*/', data)
open('diet-optimizer.js','w').write(src)
print('ok', len(src))
