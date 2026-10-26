"""Reader for USDA SR28 (ABBREV.txt + FOOD_DES.txt). Run scripts/fetch_usda.sh first."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'vendor', 'sr28', 'data')

ABBREV_COLS = ['ndb', 'shrt', 'water', 'kcal', 'protein', 'fat', 'ash', 'carb', 'fiber', 'sugar', 'calcium', 'iron',
               'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc', 'copper', 'manganese', 'selenium', 'vitc',
               'thiamin', 'riboflavin', 'niacin', 'panto', 'vitb6', 'folate', 'folic', 'foodfolate', 'folatedfe',
               'choline', 'vitb12', 'vitaiu', 'vitarae', 'retinol', 'acarot', 'bcarot', 'bcrypt', 'lycopene', 'lutzea',
               'vite', 'vitdmcg', 'vitdiu', 'vitk', 'fasat', 'famono', 'fapoly', 'chol', 'gm1', 'gm1d', 'gm2', 'gm2d',
               'refuse']
FOOD_DES_COLS = ['ndb', 'grp', 'long', 'shrt', 'com', 'manuf', 'survey', 'refdesc', 'refuse', 'sci', 'nf', 'pf', 'ff', 'cf']


def _parse(path, names):
    out = {}
    with open(path, encoding='latin-1') as fh:
        for line in fh:
            parts = [p.strip('~') for p in line.rstrip('\r\n').split('^')]
            row = dict(zip(names, parts))
            out[row['ndb']] = row
    return out


def load():
    return _parse(os.path.join(DATA, 'ABBREV.txt'), ABBREV_COLS), _parse(os.path.join(DATA, 'FOOD_DES.txt'), FOOD_DES_COLS)


if __name__ == '__main__':
    import sys
    ab, fd = load()
    for q in sys.argv[1:]:
        terms = [t.strip() for t in q.lower().split('&')]
        print('== ', q)
        for k, v in fd.items():
            if all(t in v['long'].lower() for t in terms):
                a = ab[k]
                print(k, '|', v['long'], '| kcal', a['kcal'], 'P', a['protein'], 'F', a['fat'], 'C', a['carb'],
                      '| refuse', v['refuse'], v['refdesc'][:40])
