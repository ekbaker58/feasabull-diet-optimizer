"""Generate src/lib/dietOptimizer.js = scripts/solver_template.js + data/foods.json."""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
d = json.load(open(os.path.join(ROOT, 'data', 'foods.json')))
keep = ['id', 'name', 'group', 'type', 'product', 'price', 'price_note', 'price_source', 'core', 'package_g', 'edible_yield', 'cost_per_100g', 'bls_cost_per_100g',
        'serving_g', 'serving_desc', 'max_servings', 'meal', 'flags', 'cup_eq_g', 'cap_group', 'ndb', 'per100g']
foods = [{k: f[k] for k in keep} for f in d['foods']]
data = (f"export const PRICE_SOURCE = {json.dumps(d['price_source'])};\n"
        f"export const NUTRIENT_SOURCE = {json.dumps(d['nutrient_source'])};\n"
        f"export const NUTRIENTS = {json.dumps(d['nutrients'])};\n"
        f"export const MEALS = {json.dumps(d['meals'])};\n"
        f"export const ATTRS = {json.dumps(d['attrs'])};\n"
        f"export const ALLERGENS = {json.dumps(d['allergens'])};\n"
        f"export const CPI = {json.dumps(d['cpi'])};\n"
        f"export const DIETS = {json.dumps(d['diets'], indent=1)};\n"
        f"export const SETTINGS = {json.dumps(d['settings'], indent=1)};\n"
        f"export const GROUP_CAPS = {json.dumps(d['group_caps'], indent=1)};\n"
        "// per100g = USDA SR28 per 100 g edible; cost_per_100g = Walmart price / (package_g x edible_yield) x 100\n"
        "// meal = share eaten at [Breakfast, Lunch, Dinner, Snacks]; flags drive diet filters\n"
        "export const FOODS = [\n" + ",\n".join("  " + json.dumps(f) for f in foods) + "\n];\n")
src = open(os.path.join(ROOT, 'scripts', 'solver_template.js')).read().replace('/*__DATA__*/', data)
os.makedirs(os.path.join(ROOT, 'src', 'lib'), exist_ok=True)
open(os.path.join(ROOT, 'src', 'lib', 'dietOptimizer.js'), 'w').write(src)
print('src/lib/dietOptimizer.js', len(src), 'bytes')
