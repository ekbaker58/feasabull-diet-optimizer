"""Build data/foods.json from scripts/foods_v2.py (prices) + USDA SR28 (nutrients).

Cost per 100 g EDIBLE = price / (package grams x edible yield) x 100.
Foods are sorted by group, then type, then name, so the spreadsheet and site list them by kind.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sr28 import load
from foods_v2 import (FOODS, DIETS, MEALS, SETTINGS, NUTRIENTS, GROUP_ORDER, TYPE_ORDER, ATTRS, ATTR_LABELS,
                      CUP_EQ_G, GROUP_CAPS, SR28_COLUMN, ALLERGENS, CPI)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ab, fd = load()

foods, blanks = [], []
for f in FOODS:
    a, d = ab[f['ndb']], fd[f['ndb']]
    per100 = {}
    for key, _, _ in NUTRIENTS:
        v = a[SR28_COLUMN.get(key, key)]
        if v in ('', None):
            blanks.append(f"{f['id']}.{key}")
            v = 0
        per100[key] = float(v)
    cost = f['price'] / (f['package_g'] * f['edible_yield']) * 100
    bls_cost = None
    if f['bls']:
        bp, bg = f['bls']
        bls_cost = bp / (bg * f['edible_yield']) * 100
    cap_groups = [g['key'] for g in GROUP_CAPS if f['type'] in g.get('types', []) or f['id'] in g.get('ids', [])]
    assert len(cap_groups) <= 1, f['id']
    cup = CUP_EQ_G.get(f['id'])
    assert (cup is not None) == (f['type'] in ('Vegetables', 'Fruit')), f['id']
    foods.append(dict(f, cup_eq_g=cup, cap_group=cap_groups[0] if cap_groups else None, usda_desc=d['long'], usda_refuse_pct=float(d['refuse'] or 0), usda_refuse_desc=d['refdesc'],
                      cost_per_100g=round(cost, 6), bls_cost_per_100g=None if bls_cost is None else round(bls_cost, 6),
                      per100g=per100))

foods.sort(key=lambda f: (GROUP_ORDER.index(f['group']), TYPE_ORDER.index(f['type']), f['name'].lower()))
ids = [f['id'] for f in foods]
assert len(ids) == len(set(ids)), 'duplicate food id'
for f in foods:
    assert abs(sum(f['meal']) - 1) < 1e-9, f['id']
    assert all(x in ATTRS for x in f['flags']), f['id']

out = dict(
    version=2,
    price_source='Core 71 foods: Walmart.com / business.walmart.com, observed October 2026 (regular, non-Rollback prices). '
                 'Added foods: BLS Average Price Data (U.S. city average, Sep 2026) or USDA ERS Fruit and Vegetable Prices '
                 '(2023) scaled to Sep 2026 with the BLS CPI. BLS U.S. averages are also kept as a reference column.',
    nutrient_source='USDA National Nutrient Database for Standard Reference, Release 28 (SR28)',
    nutrients=[dict(key=k, label=l, unit=u) for k, l, u in NUTRIENTS],
    attrs=[dict(key=k, label=l) for k, l in zip(ATTRS, ATTR_LABELS)], allergens=ALLERGENS,
    cpi={k: dict(series=v[0], label=v[1], base_2023=v[2], sep_2026=v[3]) for k, v in CPI.items()},
    meals=MEALS, diets=DIETS, settings=SETTINGS, group_caps=GROUP_CAPS, groups=GROUP_ORDER, types=TYPE_ORDER, foods=foods)
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'foods.json'), 'w'), indent=1)
print(f'{len(foods)} foods written; blank USDA fields treated as 0: {blanks or "none"}')
