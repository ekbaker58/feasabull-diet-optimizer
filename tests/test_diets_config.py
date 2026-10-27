"""The diet checker must reject bad entries in config/diets.json with a message a teammate can act on."""
import json, os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from diets import load_diets, DietError
from foods_v2 import FOODS, DIETS

OK = dict(name='T', description='d', protein_pct=[10, 35], carbs_pct=[45, 65], fat_pct=[20, 35], no=[])

def check(diets, expect, raw=None):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as fh:
        fh.write(raw if raw is not None else json.dumps({'diets': diets}))
    try:
        load_diets(FOODS, fh.name)
    except DietError as e:
        assert expect in str(e), f'expected "{expect}" in:\n{e}'
        return
    finally:
        os.unlink(fh.name)
    raise AssertionError(f'no error raised; expected "{expect}"')

check([dict(OK, no=['peanut buttr'])], 'closest: peanut butter')
check([dict(OK, no=['bacn'])], 'is not an attribute, food group, food type or food')
check([dict(OK, protein_pct=[40, 35])], '0 <= min <= max <= 100')
check([dict(OK, protein_pct=[50, 60], carbs_pct=[45, 65])], 'minimums add up to 115%')
check([dict(OK, protein_pct=[10, 20], carbs_pct=[20, 30], fat_pct=[20, 30])], 'maximums add up to 80%')
check([dict(OK, protien_pct=[10, 35])], 'did you mean "protein_pct"')
check([OK, dict(OK)], 'another diet already uses this name')
check([dict(OK, no='pork')], '"no" must be a list')
check(None, 'not valid JSON', raw='{"diets": [ {"name": "T",} ]}')

# the real file: names resolve the way the docs say
by = {d['name']: d for d in DIETS}
assert by['Vegan']['forbid'] == ['meat', 'pork', 'poultry', 'fish', 'egg', 'dairy'] and by['Vegan']['forbid_foods'] == []
with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as fh:
    json.dump({'diets': [dict(OK, no=['Nuts & Seeds', 'Peanut butter', 'GLUTEN'])]}, fh)
d = load_diets(FOODS, fh.name)[0]; os.unlink(fh.name)
assert d['forbid'] == ['gluten'] and 'peanut_butter' in d['forbid_foods'] and 'almonds' in d['forbid_foods'], d
print(f'diet checker: 9 bad configs rejected with clear messages; {len(DIETS)} real diets valid')
