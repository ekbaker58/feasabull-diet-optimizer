"""Build spreadsheet/FeasaBULL_Diet_Optimizer.xlsx from data/foods.json + tests/out/diets.json.

Sheets: Planner | Food Data | Diets | Matrix Model | Diet Comparison | Optimality Proof | Notes & Sources
Everything that can be a formula is a formula; the optimal x vectors come from the Simplex solver
(src/lib/dietOptimizer.js) and are pasted as values, exactly like Excel Solver would leave them.
"""
import json, os, subprocess
import numpy as np
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter as L

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = json.load(open(os.path.join(ROOT, 'data', 'foods.json')))
SOL = json.load(open(os.path.join(ROOT, 'tests', 'out', 'diets.json')))
TYP = json.loads(subprocess.check_output(['node', '-e', "import('./tests/typical_day.mjs').then(m=>console.log(JSON.stringify(m.TYPICAL_DAY)))"], cwd=ROOT))
FOODS, NUTS, DIETS, MEALS, S = D['foods'], D['nutrients'], D['diets'], D['meals'], D['settings']
ATTRS, CAPS = D['attrs'], D['group_caps']
NF = len(FOODS); IDS = [f['id'] for f in FOODS]; NK = [n['key'] for n in NUTS]
EXJ = json.load(open(os.path.join(ROOT, 'tests', 'out', 'example.json')))
EX, EXP = EXJ['targets'], EXJ['person']
EXF = dict(ft=5, inch=8, lb=155)   # example person as typed into the site's form (tests/example_person.mjs)

# ---------------------------------------------------------------- styles
BLUE, BLACK, GREEN, WHITE = '0000FF', '000000', '008000', 'FFFFFF'
def font(color=BLACK, bold=False, size=10, italic=False): return Font(name='Arial', color=color, bold=bold, size=size, italic=italic)
def fill(hex_): return PatternFill('solid', fgColor=hex_)
YELLOW, HEAD, SUB, GREY, OKF, BADF = fill('FFFF00'), fill('1F3864'), fill('D9E1F2'), fill('F2F2F2'), fill('E2EFDA'), fill('FCE4D6')
GROUP_FILL = {'Proteins': 'F8CBAD', 'Dairy & Alternatives': 'DDEBF7', 'Carbohydrates': 'FFF2CC', 'Fruits': 'FCE4EC',
              'Vegetables': 'E2EFDA', 'Fats, Oils & Nuts': 'EDE7F6', 'Snacks & Sweets': 'EDEDED'}
thin = Side(style='thin', color='BFBFBF'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
WRAP = Alignment(wrap_text=True, vertical='top')

def put(ws, ref, val, color=BLACK, bold=False, fmt=None, fl=None, al=None, box=False, italic=False, size=10):
    c = ws[ref]; c.value = val; c.font = font(color, bold, size, italic)
    if fmt: c.number_format = fmt
    if fl: c.fill = fl
    if al: c.alignment = al
    if box: c.border = BOX
    return c

def head(ws, ref, text, fl=HEAD, color=WHITE):
    return put(ws, ref, text, color, True, fl=fl, al=CENTER, box=True)

def arr(ws, rng, formula, fmt=None, bold=False, fl=None):
    first = rng.split(':')[0]
    ws[first] = ArrayFormula(rng, formula)
    cells = ws[rng] if ':' in rng else ((ws[rng],),)
    for row in cells:
        for c in row:
            c.font = font(bold=bold); c.border = BOX
            if fmt: c.number_format = fmt
            if fl: c.fill = fl

def title(ws, text, sub=None):
    put(ws, 'A1', text, bold=True, size=14)
    if sub: put(ws, 'A2', sub, italic=True)

wb = Workbook()
PL = wb.active; PL.title = 'Planner'
FD = wb.create_sheet('Food Data'); DI = wb.create_sheet('Diets'); MM = wb.create_sheet('Matrix Model')
DC = wb.create_sheet('Diet Comparison'); PR = wb.create_sheet('Optimality Proof'); NS = wb.create_sheet('Notes & Sources')

# ================================================================ PLANNER inputs (rows fixed; referenced everywhere)
P = {}  # name -> absolute ref 'Planner'!$C$n
def pin(row, key, label, val, fmt='#,##0', note=None, col='C'):
    put(PL, f'B{row}', label, box=True)
    c = put(PL, f'{col}{row}', val, BLUE, fmt=fmt, box=True)
    if note: put(PL, f'D{row}', note, italic=True)
    P[key] = f"Planner!${col}${row}"
    return c

title(PL, 'FeasaBULL Diet Planner — person in, cheapest balanced day out',
      'Step 1: enter the person (same inputs as FeasaBULL Calories). Step 2: targets are calculated with the site\'s equations. '
      'Step 3: pick a diet and re-solve (box at right). Blue = inputs.')
DT = wb.create_sheet('DRI Tables', 1)
# ---------------------------------------------------------------- DRI Tables sheet (lookup data for the person calculator)
title(DT, 'DRI Tables — the numbers behind the person calculator',
      'Same values as the FeasaBULL Calories site. Activity coefficients: IOM (2005) EER equations, healthy-weight version.')
for i, h in enumerate(['Group', 'Inactive', 'Low active', 'Active', 'Very active']): head(DT, f'{L(1+i)}4', h)
PA_ROWS = [('Men 19+', [1, 1.11, 1.25, 1.48]), ('Women 19+', [1, 1.12, 1.27, 1.45]), ('Boys 14–18', [1, 1.13, 1.26, 1.42]), ('Girls 14–18', [1, 1.16, 1.31, 1.56])]
for k, (lab, vals) in enumerate(PA_ROWS):
    put(DT, f'A{5+k}', lab, bold=True, box=True)
    for j, v in enumerate(vals): put(DT, f'{L(2+j)}{5+k}', v, BLUE, fmt='0.00', box=True)
put(DT, 'A9', 'IOM 2005 values (used by default). Below: what the live FeasaBULL site uses today (men\'s values for everyone).', italic=True)
for i, h in enumerate(['Group (site)', 'Inactive', 'Low active', 'Active', 'Very active']): head(DT, f'{L(1+i)}10', h)
SITE_ROWS = [('Men 19+', PA_ROWS[0][1]), ('Women 19+', PA_ROWS[0][1]), ('Boys 14–18', PA_ROWS[2][1]), ('Girls 14–18', PA_ROWS[2][1])]
for k, (lab, vals) in enumerate(SITE_ROWS):
    put(DT, f'A{11+k}', lab, bold=True, box=True)
    for j, v in enumerate(vals): put(DT, f'{L(2+j)}{11+k}', v, BLUE, fmt='0.00', box=True)
for i, h in enumerate(['Goal', 'kcal change']): head(DT, f'{L(1+i)}16', h)
for k, (lab, v) in enumerate([('Lose fat', -500), ('Maintain', 0), ('Build muscle', 350)]):
    put(DT, f'A{17+k}', lab, bold=True, box=True); put(DT, f'B{17+k}', v, BLUE, fmt='+0;-0;0', box=True)
put(DT, 'D16', 'Calorie floor', bold=True); put(DT, 'D17', 'Male'); put(DT, 'E17', 1500, BLUE); put(DT, 'D18', 'Female'); put(DT, 'E18', 1200, BLUE)
DRI_H = ['Age bracket', 'Ages', 'Vit C (M)', 'Vit C (F)', 'Calcium (M)', 'Calcium (F)', 'Iron (M)', 'Iron (F)', 'Potassium (M)', 'Potassium (F)']
for i, h in enumerate(DRI_H): head(DT, f'{L(1+i)}22', h)
DRI_ROWS = [('teen', '14–18', 75, 65, 1300, 1300, 11, 15, 3000, 2300), ('young', '19–30', 90, 75, 1000, 1000, 8, 18, 3400, 2600),
            ('mid', '31–50', 90, 75, 1000, 1000, 8, 18, 3400, 2600), ('older', '51–70', 90, 75, 1000, 1200, 8, 8, 3400, 2600),
            ('oldest', '71+', 90, 75, 1200, 1200, 8, 8, 3400, 2600)]
for k, row_ in enumerate(DRI_ROWS):
    for j, v in enumerate(row_): put(DT, f'{L(1+j)}{23+k}', v, BLUE if j >= 2 else BLACK, bold=j == 0, box=True, fmt='#,##0' if j >= 2 else None)
put(DT, 'A29', 'Units: vitamin C, calcium, potassium in mg; iron in mg. Fiber = 14 g per 1,000 kcal. Sodium: keep under 2,300 mg.', italic=True)
DT.column_dimensions['A'].width = 16
for c in 'BCDEFGHIJ': DT.column_dimensions[c].width = 12

# ---------------------------------------------------------------- 1. PERSON
put(PL, 'B4', '1. PERSON  (same inputs as the FeasaBULL Calories site)', bold=True, size=11)
def pv(row, key, label, val, fmt=None, note=None):
    put(PL, f'B{row}', label, box=True); c = put(PL, f'C{row}', val, BLUE, fmt=fmt, box=True, fl=YELLOW if isinstance(val, str) else None)
    if note: put(PL, f'D{row}', note, italic=True)
    P[key] = f'Planner!$C${row}'
    return c
pv(5, 'sex', 'Sex', 'Male'); pv(6, 'age', 'Age (years)', EXP['age'], fmt='0')
put(PL, 'B7', 'Height (ft, in)', box=True); put(PL, 'C7', EXF['ft'], BLUE, fmt='0" ft"', box=True); put(PL, 'D7', EXF['inch'], BLUE, fmt='0" in"', box=True)
P['ft'], P['inch'] = 'Planner!$C$7', 'Planner!$D$7'
pv(8, 'lb', 'Weight (lb)', EXF['lb'], fmt='0.0'); pv(9, 'act', 'Activity level', 'Active'); pv(10, 'goal', 'Goal', 'Maintain')
pv(11, 'coef', 'Activity coefficients', 'IOM 2005 (corrected)', note='or "Same as current site" to reproduce the live site exactly')
for ref, lst in (('C5', '"Male,Female"'), ('C9', '"Inactive,Low active,Active,Very active"'), ('C10', '"Lose fat,Maintain,Build muscle"'),
                 ('C11', '"IOM 2005 (corrected),Same as current site"')):
    dvx = DataValidation(type='list', formula1=lst, allow_blank=False); PL.add_data_validation(dvx); dvx.add(ref)
put(PL, 'B12', 'Example: the site\'s own placeholder person (male, 21, 5\'8", 155 lb, active, maintain).', italic=True)

# working values (rows 27-33), referenced by the targets
W = {}
put(PL, 'B26', 'How the targets were calculated', bold=True)
work = [('cm', 'Height (cm)', f'=ROUND(({P["ft"]}*12+N({P["inch"]}))*2.54,0)', '0'),
        ('kg', 'Weight (kg)', f'=ROUND({P["lb"]}*0.45359237,1)', '0.0'),
        ('bracket', 'Age bracket', f'=IF({P["age"]}<19,"teen",IF({P["age"]}<=30,"young",IF({P["age"]}<=50,"mid",IF({P["age"]}<=70,"older","oldest"))))', None),
        ('pa', 'Activity coefficient (PA)', None, '0.00'),
        ('maint', 'Maintenance calories (IOM EER, rounded to 10)', None, '#,##0'),
        ('delta', 'Goal adjustment (kcal)', f'=INDEX(\'DRI Tables\'!$B$17:$B$19,MATCH({P["goal"]},\'DRI Tables\'!$A$17:$A$19,0))', '+0;-0;0'),
        ('bmi', 'BMI', None, '0.0')]
for k, (key, lab, f, fmt) in enumerate(work):
    r = 27 + k; W[key] = f'$C${r}'
    put(PL, f'B{r}', lab, box=True); put(PL, f'C{r}', f, fmt=fmt, box=True)
pa_row = f'IF({P["age"]}<19,IF({P["sex"]}="Male",3,4),IF({P["sex"]}="Male",1,2))'
pa_col = f'MATCH({P["act"]},\'DRI Tables\'!$B$4:$E$4,0)'
PL[W['pa'].replace('$', '')] = (f'=IF({P["coef"]}="Same as current site",INDEX(\'DRI Tables\'!$B$11:$E$14,{pa_row},{pa_col}),'
                                f'INDEX(\'DRI Tables\'!$B$5:$E$8,{pa_row},{pa_col}))')
m_, kg_, a_, pa_ = f'({W["cm"]}/100)', W['kg'], P['age'], W['pa']
eer = (f'IF({a_}<19,IF({P["sex"]}="Male",88.5-61.9*{a_}+{pa_}*(26.7*{kg_}+903*{m_})+25,'
       f'135.3-30.8*{a_}+{pa_}*(10*{kg_}+934*{m_})+IF({P["coef"]}="Same as current site",20,25)),'
       f'IF({P["sex"]}="Male",662-9.53*{a_}+{pa_}*(15.91*{kg_}+539.6*{m_}),354-6.91*{a_}+{pa_}*(9.36*{kg_}+726*{m_})))')
PL[W['maint'].replace('$', '')] = f'=ROUND({eer}/10,0)*10'
PL[W['bmi'].replace('$', '')] = f'=ROUND({kg_}/({m_})^2,1)'
for key in ('pa', 'maint', 'bmi'):
    c = PL[W[key].replace('$', '')]; c.font = font(); c.border = BOX
PL[W['pa'].replace('$', '')].number_format = '0.00'; PL[W['maint'].replace('$', '')].number_format = '#,##0'; PL[W['bmi'].replace('$', '')].number_format = '0.0'

# ---------------------------------------------------------------- 2. TARGETS (calculated, with optional override)
put(PL, 'B14', '2. DAILY TARGETS  (calculated with the site\'s equations — type in Override to change one)', bold=True, size=11)
for c_, h in zip('BCDE', ['Target', 'Calculated', 'Override', 'Used by the model']): head(PL, f'{c_}15', h)
def dri_f(mc, fc):
    return (f'=IF({P["sex"]}="Male",INDEX(\'DRI Tables\'!${mc}$23:${mc}$27,MATCH({W["bracket"]},\'DRI Tables\'!$A$23:$A$27,0)),'
            f'INDEX(\'DRI Tables\'!${fc}$23:${fc}$27,MATCH({W["bracket"]},\'DRI Tables\'!$A$23:$A$27,0)))')
TG = [('kcal', 'Calories (kcal/day)', f'=MAX(IF({P["sex"]}="Male",\'DRI Tables\'!$E$17,\'DRI Tables\'!$E$18),ROUND(({W["maint"]}+{W["delta"]})/10,0)*10)'),
      ('pfloor', 'Protein at least (g) — 1.6 g/kg, kept in 10–30% of kcal', 'PROT'),
      ('fiber', 'Fiber at least (g) — 14 g per 1,000 kcal', 'FIB'),
      ('calcium', 'Calcium at least (mg)', dri_f('E', 'F')), ('iron', 'Iron at least (mg)', dri_f('G', 'H')),
      ('potassium', 'Potassium at least (mg)', dri_f('I', 'J')), ('vitc', 'Vitamin C at least (mg)', dri_f('C', 'D')),
      ('sodium', 'Sodium under (mg)', 2300), ('sugar', 'Total sugars under (g, optional)', None)]
for k, (key, lab, f) in enumerate(TG):
    r = 16 + k
    if f == 'PROT': f = f'=MIN(MAX(ROUND(1.6*{W["kg"]},0),ROUND(0.1*$C$16/4,0)),ROUND(0.3*$C$16/4,0))'
    if f == 'FIB': f = '=ROUND(14*$C$16/1000,0)'
    put(PL, f'B{r}', lab, box=True)
    put(PL, f'C{r}', f, BLUE if isinstance(f, (int, float)) else BLACK, fmt='#,##0', box=True)
    put(PL, f'D{r}', None, BLUE, fmt='#,##0', box=True, fl=fill('FFFDE7'))
    put(PL, f'E{r}', f'=IF(AND(D{r}="",C{r}=""),"",IF(D{r}="",C{r},D{r}))', bold=True, fmt='#,##0', box=True)
    P[key] = f'Planner!$E${r}'

# ---------------------------------------------------------------- 3. DIET & PRICES, 4. BALANCE RULES
put(PL, 'B35', '3. DIET & PRICES', bold=True, size=11)
pin(36, 'diet', 'Diet', 'Balanced', fmt='@')
PL['C36'].fill = YELLOW
put(PL, 'B37', 'What it means', box=True)
put(PL, 'C37', f"=INDEX(Diets!$B$5:$B${4+len(DIETS)},MATCH({P['diet']},Diets!$A$5:$A${4+len(DIETS)},0))", box=True, al=WRAP)
put(PL, 'B38', 'Macro split (% of calories)', box=True)
put(PL, 'C38', '="Protein "&TEXT(\'Matrix Model\'!$C$8,"0%")&"–"&TEXT(\'Matrix Model\'!$D$8,"0%")&", Carbs "&TEXT(\'Matrix Model\'!$C$9,"0%")&"–"&TEXT(\'Matrix Model\'!$D$9,"0%")&", Fat "&TEXT(\'Matrix Model\'!$C$10,"0%")&"–"&TEXT(\'Matrix Model\'!$D$10,"0%")', box=True)
pin(39, 'psrc', 'Price source', 'Walmart (Oct 2026)', fmt='@', note='or "BLS U.S. average (Sep 2026)" — sensitivity check')
dv = DataValidation(type='list', formula1=f"=Diets!$A$5:$A${4+len(DIETS)}", allow_blank=False); PL.add_data_validation(dv); dv.add('C36')
dv2 = DataValidation(type='list', formula1='"Walmart (Oct 2026),BLS U.S. average (Sep 2026)"'); PL.add_data_validation(dv2); dv2.add('C39')

put(PL, 'B41', '4. BALANCE RULES  (keep amounts realistic)', bold=True, size=11)
pin(42, 'tol', 'Calorie tolerance (±)', S['calorie_tolerance'], fmt='0%')
pin(43, 'alpha', 'Max share of the day\'s protein from ONE food', S['max_protein_share'], fmt='0%', note='applies to foods with ≥ 10 g protein / 100 g')
pin(44, 'beta', 'Min share of protein at breakfast, lunch AND dinner', S['min_meal_protein_share'], fmt='0%')
row = 45
for meal in MEALS:
    lo, hi = S['meal_kcal'][meal]
    put(PL, f'B{row}', f'{meal}: share of calories (min / max)', box=True)
    put(PL, f'C{row}', lo, BLUE, fmt='0%', box=True); put(PL, f'D{row}', hi, BLUE, fmt='0%', box=True)
    P[f'mlo_{meal}'] = f'Planner!$C${row}'; P[f'mhi_{meal}'] = f'Planner!$D${row}'
    row += 1
pin(row, 'veg', 'Vegetables minimum (cup-equivalents)', S['min_veg_cups'], fmt='0.0'); row += 1
pin(row, 'fruit', 'Fruit minimum (cup-equivalents)', S['min_fruit_cups'], fmt='0.0'); row += 1
for g in CAPS:
    pin(row, f"cap_{g['key']}", f"Max {g['label'].lower()} ({g['unit']}/day)", g['max'], fmt='0', note=g['note'] or None)
    row += 1
put(PL, f'B{row}', 'Per-food limits (max servings, exclusions, must-include) are on Food Data.', italic=True)

# ================================================================ FOOD DATA
FCOLS = [('num', '#', 4), ('group', 'Group', 14), ('type', 'Type', 15), ('name', 'Food', 30), ('product', 'Store product (Walmart)', 30),
         ('price', 'Price ($)', 9), ('pkg', 'Package as bought (g)', 11), ('yield', 'Edible yield', 8),
         ('cw', 'Walmart $ per 100 g edible', 11), ('bp', 'BLS U.S. avg price ($)', 10), ('bg', 'BLS unit (g)', 9),
         ('cb', 'BLS $ per 100 g edible', 10), ('cu', '$ per 100 g USED', 11),
         ('sg', 'Serving (g)', 8), ('sd', 'Serving', 24), ('mx', 'Max servings / day', 9), ('ex', 'Exclude? (Y)', 8), ('must', 'Must include (servings)', 9)]
FCOLS += [(f"f_{a['key']}", a['label'], 7) for a in ATTRS]
FCOLS += [('blocked', 'Blocked by diet', 8), ('allowed', 'Allowed (1/0)', 8)]
FCOLS += [(f"m_{m}", f"Meal share: {m}", 8) for m in MEALS]
FCOLS += [('cup', 'Grams per cup-equivalent', 9), ('capg', 'Group cap', 12)]
FCOLS += [(f"n_{n['key']}", f"{n['label']} ({n['unit']}/100 g)", 9) for n in NUTS]
FCOLS += [('ppd', 'Protein per $ (g)', 9), ('kpd', 'Calories per $', 9), ('ndb', 'USDA NDB #', 8), ('udesc', 'USDA SR28 food', 46),
          ('note', 'Price / data note', 44)]
FC = {k: L(i + 1) for i, (k, _, _) in enumerate(FCOLS)}
FHR, F0 = 5, 6; F1 = F0 + NF - 1
def fref(key, absolute=True): return f"'Food Data'!${FC[key]}${F0}:${FC[key]}${F1}"

title(FD, 'Food Data — 71 common foods, sorted by group and type',
      'Prices: Walmart (Oct 2026, regular price) with BLS U.S. average (Sep 2026) for reference. Nutrients: USDA SR28, per 100 g edible.')
put(FD, 'A3', 'Blue = data you can edit (prices, servings, caps, exclusions).  Black = formulas.  Yellow = check this price.  '
    'Edible yield removes bone, peel, shells (USDA refuse %).', italic=True)
for i, (k, h, w) in enumerate(FCOLS):
    head(FD, f'{L(i+1)}{FHR}', h); FD.column_dimensions[L(i+1)].width = w
FD.row_dimensions[FHR].height = 66
price_rule = f'IF({P["psrc"]}="BLS U.S. average (Sep 2026)",1,0)'
for k, f in enumerate(FOODS):
    r = F0 + k; gf = fill(GROUP_FILL[f['group']])
    def v(key, val, color=BLUE, fmt=None, **kw): return put(FD, f'{FC[key]}{r}', val, color, fmt=fmt, box=True, **kw)
    v('num', k + 1, BLACK); v('group', f['group'], BLACK, fl=gf, bold=True); v('type', f['type'], BLACK, fl=gf)
    v('name', f['name'], BLACK, bold=True); v('product', f['product'], BLACK)
    flag_price = ('Older listing' in f['price_note']) or ('undated' in f['price_note'])
    v('price', f['price'], fmt='$0.00', fl=YELLOW if flag_price else None)
    v('pkg', f['package_g'], fmt='#,##0'); v('yield', f['edible_yield'], fmt='0%')
    v('cw', f"={FC['price']}{r}/({FC['pkg']}{r}*{FC['yield']}{r})*100", BLACK, fmt='$0.000')
    if f['bls']:
        v('bp', f['bls'][0], fmt='$0.000'); v('bg', round(f['bls'][1], 1), fmt='#,##0')
        v('cb', f"={FC['bp']}{r}/({FC['bg']}{r}*{FC['yield']}{r})*100", BLACK, fmt='$0.000')
    else:
        for key in ('bp', 'bg', 'cb'): v(key, None, BLACK)
    v('cu', f'=IF(AND({price_rule}=1,{FC["cb"]}{r}<>""),{FC["cb"]}{r},{FC["cw"]}{r})', BLACK, fmt='$0.000', bold=True)
    v('sg', f['serving_g'], fmt='0.0'); v('sd', f['serving_desc'], BLACK); v('mx', f['max_servings'], fmt='0')
    v('ex', None, al=CENTER); v('must', None, fmt='0.0')
    for a in ATTRS: v(f"f_{a['key']}", 1 if a['key'] in f['flags'] else 0, fmt='0', al=CENTER)
    fl_rng = f"{FC['f_'+ATTRS[0]['key']]}{r}:{FC['f_'+ATTRS[-1]['key']]}{r}"
    v('blocked', f"=SUMPRODUCT({fl_rng},INDEX(Diets!$I$5:$O${4+len(DIETS)},MATCH({P['diet']},Diets!$A$5:$A${4+len(DIETS)},0),0))", BLACK, fmt='0', al=CENTER)
    v('allowed', f'=IF(OR(UPPER({FC["ex"]}{r})="Y",{FC["blocked"]}{r}>0),0,1)', BLACK, fmt='0', al=CENTER, bold=True)
    for m, val in zip(MEALS, f['meal']): v(f"m_{m}", val, fmt='0%', al=CENTER)
    v('cup', f['cup_eq_g'], fmt='0'); v('capg', next((g['label'] for g in CAPS if g['key'] == f['cap_group']), None), BLACK)
    for n in NUTS: v(f"n_{n['key']}", f['per100g'][n['key']], fmt='0.00')
    v('ppd', f"={FC['n_protein']}{r}/{FC['cu']}{r}", BLACK, fmt='0.0'); v('kpd', f"={FC['n_kcal']}{r}/{FC['cu']}{r}", BLACK, fmt='#,##0')
    v('ndb', f['ndb'], BLACK); v('udesc', f['usda_desc'], BLACK)
    note = f['price_note']
    if f['usda_refuse_pct'] and abs((1 - f['edible_yield']) * 100 - f['usda_refuse_pct']) > 0.5:
        note = (note + '; ' if note else '') + f"USDA refuse {f['usda_refuse_pct']:.0f}% ({f['usda_refuse_desc']}) not applied: bought trimmed"
    v('note', note or None, BLACK)
FD.freeze_panes = f"{FC['product']}{F0}"
FD.auto_filter.ref = f"A{FHR}:{FC['note']}{F1}"
FD.conditional_formatting.add(f"A{F0}:{FC['name']}{F1}", FormulaRule(formula=[f"${FC['allowed']}{F0}=0"], font=Font(color='A6A6A6', strike=True)))
FD[f"{FC['mx']}{FHR}"].comment = Comment('Team assumption: realistic most-per-day. Becomes the upper bound u in the model.', 'Team 9')
FD[f"{FC['cup']}{FHR}"].comment = Comment('USDA MyPlate cup-equivalent: 1 cup raw/cooked veg or fruit, 2 cups leafy greens, 1/2 cup dried fruit, 1 cup 100% juice.', 'Team 9')
FD[f"{FC['blocked']}{FHR}"].comment = Comment('= (food attribute row) · (selected diet\'s forbidden-attribute row). A dot product: > 0 means the diet excludes the food.', 'Team 9')

# ================================================================ DIETS
title(DI, 'Diets — macro split and which food attributes each diet forbids',
      'Food j is allowed when (attribute row of food j) · (forbidden row of the diet) = 0. Edit or add diets here.')
hd = ['Diet', 'Description', 'Protein min', 'Protein max', 'Carbs min', 'Carbs max', 'Fat min', 'Fat max'] + [f"Forbid {a['label']}" for a in ATTRS]
for i, h in enumerate(hd): head(DI, f'{L(i+1)}4', h)
for k, d in enumerate(DIETS):
    r = 5 + k
    put(DI, f'A{r}', d['name'], bold=True, box=True); put(DI, f'B{r}', d['desc'], box=True, al=WRAP)
    for j, val in enumerate([*d['protein'], *d['carb'], *d['fat']]): put(DI, f'{L(3+j)}{r}', val, BLUE, fmt='0%', box=True)
    for j, a in enumerate(ATTRS): put(DI, f'{L(9+j)}{r}', 1 if a['key'] in d['forbid'] else 0, BLUE, fmt='0', box=True, al=CENTER)
DI.column_dimensions['A'].width = 16; DI.column_dimensions['B'].width = 60
for j in range(3, 16): DI.column_dimensions[L(j)].width = 10
DI.row_dimensions[4].height = 40
put(DI, f'A{6+len(DIETS)}', 'Low-Carb sets carbohydrate below the AMDR range (45–65%) on purpose; High-Protein sits at the top of the AMDR protein range.', italic=True)
put(DI, f'A{7+len(DIETS)}', 'Diets change two things in the model: the macro rows of b_min/b_max, and the upper bounds u (a forbidden food gets u = 0).', italic=True)

# ================================================================ MATRIX MODEL
C0 = 6                                  # first food column (F)
FCOL = [L(C0 + j) for j in range(NF)]; FA, FZ = FCOL[0], FCOL[-1]
title(MM, 'Matrix Model — minimize cᵀx subject to G·x (≥ or ≤) b,  0 ≤ x ≤ u',
      'x = food amounts in 100 g units (column C below). A = nutrient matrix, M = meal matrix, G = every constraint row stacked. '
      'Solve with Data → Solver (see Planner).')
# --- macro split of the selected diet (rows 8-10) and derived targets
put(MM, 'B4', 'Selected diet', bold=True); put(MM, 'C4', f"={P['diet']}", GREEN, bold=True)
head(MM, 'B7', 'Macro (% of kcal)'); head(MM, 'C7', 'min'); head(MM, 'D7', 'max')
dsel = f"MATCH({P['diet']},Diets!$A$5:$A${4+len(DIETS)},0)"
for i, (lab, c1, c2) in enumerate([('Protein', 'C', 'D'), ('Carbohydrate', 'E', 'F'), ('Fat', 'G', 'H')]):
    put(MM, f'B{8+i}', lab, box=True)
    put(MM, f'C{8+i}', f"=INDEX(Diets!${c1}$5:${c1}${4+len(DIETS)},{dsel})", GREEN, fmt='0%', box=True)
    put(MM, f'D{8+i}', f"=INDEX(Diets!${c2}$5:${c2}${4+len(DIETS)},{dsel})", GREEN, fmt='0%', box=True)

# --- parameter rows (foods across)
R_NAME, R_C, R_U, R_L, R_ALW = 13, 14, 15, 16, 17
R_A0 = 20; R_A1 = R_A0 + len(NUTS) - 1                  # A block
R_M0 = R_A1 + 3; R_M1 = R_M0 + len(MEALS) - 1           # M^T block (meals x foods)
put(MM, f'A{R_NAME-1}', 'FOOD PARAMETERS  (one column per food)', bold=True, size=11)
for j, f in enumerate(FOODS):
    col, fr = FCOL[j], F0 + j
    put(MM, f'{col}{R_NAME}', f"='Food Data'!{FC['name']}{fr}", GREEN, True, fl=fill(GROUP_FILL[f['group']]), al=CENTER, box=True)
    put(MM, f'{col}{R_C}', f"='Food Data'!{FC['cu']}{fr}", GREEN, fmt='0.000', box=True)
    put(MM, f'{col}{R_U}', f"='Food Data'!{FC['sg']}{fr}*'Food Data'!{FC['mx']}{fr}/100*'Food Data'!{FC['allowed']}{fr}", BLACK, fmt='0.000', box=True)
    put(MM, f'{col}{R_L}', f"=MIN({col}{R_U},N('Food Data'!{FC['must']}{fr})*'Food Data'!{FC['sg']}{fr}/100)", BLACK, fmt='0.000', box=True)
    put(MM, f'{col}{R_ALW}', f"='Food Data'!{FC['allowed']}{fr}", GREEN, fmt='0', box=True)
    MM.column_dimensions[col].width = 10
MM.row_dimensions[R_NAME].height = 58
for r, lab in ((R_NAME, 'Food'), (R_C, 'c — $ per 100 g edible'), (R_U, 'u — upper bound (100 g units)'), (R_L, 'l — lower bound (must-include)'), (R_ALW, 'allowed by diet')):
    put(MM, f'B{r}', lab, bold=True, fl=SUB, box=True)
put(MM, f'A{R_A0-1}', 'NUTRIENT MATRIX A  (rows = nutrients, columns = foods, per 100 g edible — USDA SR28)', bold=True, size=11)
for i, n in enumerate(NUTS):
    r = R_A0 + i
    put(MM, f'B{r}', f"{n['label']} ({n['unit']})", bold=True, box=True)
    for j in range(NF): put(MM, f'{FCOL[j]}{r}', f"='Food Data'!{FC['n_'+n['key']]}{F0+j}", GREEN, fmt='0.00', box=True)
put(MM, f'A{R_M0-1}', 'MEAL MATRIX Mᵀ  (share of each food eaten at each meal; columns sum to 1)', bold=True, size=11)
for m_i, meal in enumerate(MEALS):
    r = R_M0 + m_i
    put(MM, f'B{r}', meal, bold=True, box=True)
    for j in range(NF): put(MM, f'{FCOL[j]}{r}', f"='Food Data'!{FC['m_'+meal]}{F0+j}", GREEN, fmt='0%', box=True)
ARow = {n['key']: R_A0 + i for i, n in enumerate(NUTS)}
MRow = {m: R_M0 + i for i, m in enumerate(MEALS)}

# --- constraint matrix G: >= rows first, then <= rows
R_G0 = R_M1 + 4
put(MM, f'A{R_G0-2}', 'CONSTRAINT MATRIX G  (every rule is one row: coefficients across the food columns)', bold=True, size=11)
for ref, t in (('A', 'Rule'), ('B', 'Kind'), ('C', 'b (right side)'), ('D', 'G·x (plan)'), ('E', 'Status')):
    head(MM, f'{ref}{R_G0-1}', t)
for j in range(NF): put(MM, f'{FCOL[j]}{R_G0-1}', f'={FCOL[j]}{R_NAME}', GREEN, True, fl=SUB, al=CENTER, box=True)
MM.row_dimensions[R_G0-1].height = 58
kcal = P['kcal']
G = []   # (label, kind, sense, b_formula, coef_fn(j)->formula)
def nut_row(key): return lambda j: f'={FCOL[j]}${ARow[key]}'
def macro_row(key, factor, pct_cell):   # factor*macro_j - pct*kcal_j : macro share of the plan's ACTUAL calories
    return lambda j: f'={factor}*{FCOL[j]}${ARow[key]}-{pct_cell}*{FCOL[j]}${ARow["kcal"]}'
G.append(('Calories ≥ target − tolerance', 'nutrient', '>=', f'={kcal}*(1-{P["tol"]})', nut_row('kcal')))
G.append(('Protein ≥ floor (g, optional)', 'nutrient', '>=', f'=N({P["pfloor"]})', nut_row('protein')))
G.append(('Protein ≥ min % of calories  (4·P − s·kcal ≥ 0)', 'macro', '>=', 0, macro_row('protein', 4, '$C$8')))
G.append(('Carbs ≥ min % of calories  (4·C − s·kcal ≥ 0)', 'macro', '>=', 0, macro_row('carb', 4, '$C$9')))
G.append(('Fat ≥ min % of calories  (9·F − s·kcal ≥ 0)', 'macro', '>=', 0, macro_row('fat', 9, '$C$10')))
for key, pk in (('fiber', 'fiber'), ('calcium', 'calcium'), ('iron', 'iron'), ('potassium', 'potassium'), ('vitc', 'vitc')):
    G.append((f"{next(n['label'] for n in NUTS if n['key']==key)} ≥ minimum", 'nutrient', '>=', f'=N({P[pk]})', nut_row(key)))
for meal in MEALS:
    G.append((f'{meal} calories ≥ min share', 'meal', '>=', f'={kcal}*{P["mlo_"+meal]}',
              (lambda meal: lambda j: f'={FCOL[j]}${ARow["kcal"]}*{FCOL[j]}${MRow[meal]}')(meal)))
for meal in MEALS[:3]:
    G.append((f'{meal} protein ≥ min share of day', 'meal', '>=', 0,
              (lambda meal: lambda j: f'={FCOL[j]}${ARow["protein"]}*({FCOL[j]}${MRow[meal]}-{P["beta"]})')(meal)))
G.append(('Vegetables ≥ min cup-equivalents', 'group', '>=', f'={P["veg"]}',
          lambda j: f"=IF('Food Data'!${FC['type']}${F0+j}=\"Vegetables\",100/'Food Data'!${FC['cup']}${F0+j},0)"))
G.append(('Fruit ≥ min cup-equivalents', 'group', '>=', f'={P["fruit"]}',
          lambda j: f"=IF('Food Data'!${FC['type']}${F0+j}=\"Fruit\",100/'Food Data'!${FC['cup']}${F0+j},0)"))
NGE = len(G)
G.append(('Calories ≤ target + tolerance', 'nutrient', '<=', f'={kcal}*(1+{P["tol"]})', nut_row('kcal')))
G.append(('Protein ≤ max % of calories', 'macro', '<=', 0, macro_row('protein', 4, '$D$8')))
G.append(('Carbs ≤ max % of calories', 'macro', '<=', 0, macro_row('carb', 4, '$D$9')))
G.append(('Fat ≤ max % of calories', 'macro', '<=', 0, macro_row('fat', 9, '$D$10')))
G.append(('Sodium ≤ maximum', 'nutrient', '<=', f'=N({P["sodium"]})', nut_row('sodium')))
G.append(('Total sugars ≤ maximum (blank = none)', 'nutrient', '<=', f'=IF({P["sugar"]}="",1000000,{P["sugar"]})', nut_row('sugar')))
for meal in MEALS:
    G.append((f'{meal} calories ≤ max share', 'meal', '<=', f'={kcal}*{P["mhi_"+meal]}',
              (lambda meal: lambda j: f'={FCOL[j]}${ARow["kcal"]}*{FCOL[j]}${MRow[meal]}')(meal)))
for g in CAPS:
    def cap_fn(g):
        def fn(j):
            fr = F0 + j
            per = '100' if g['unit'] == 'grams' else f"100/'Food Data'!${FC['sg']}${fr}"
            return f"=IF('Food Data'!${FC['capg']}${fr}=\"{g['label']}\",{per},0)"
        return fn
    G.append((f"{g['label']} ≤ max {g['unit']}", 'group', '<=', f'={P["cap_"+g["key"]]}', cap_fn(g)))
SHARE_IDX = [j for j, f in enumerate(FOODS) if f['per100g']['protein'] >= S['share_rule_min_protein']]
for j0 in SHARE_IDX:
    G.append((f"{FOODS[j0]['name']} ≤ max share of protein", 'share', '<=', 0,
              (lambda j0: lambda j: f'={FCOL[j]}${ARow["protein"]}*({1 if j == j0 else 0}-{P["alpha"]})')(j0)))
R_G1 = R_G0 + len(G) - 1
R_X0 = R_G1 + 5; R_X1 = R_X0 + NF - 1
for i, (lab, kind, sense, b, fn) in enumerate(G):
    r = R_G0 + i
    put(MM, f'A{r}', lab, box=True); put(MM, f'B{r}', f"{kind} {'≥' if sense == '>=' else '≤'}", box=True, al=CENTER)
    put(MM, f'C{r}', b, GREEN if isinstance(b, str) else BLUE, fmt='#,##0.00', box=True)
    tol = f'1E-6*MAX(1,ABS(C{r}))'
    cond = f'D{r}>=C{r}-{tol}' if sense == '>=' else f'D{r}<=C{r}+{tol}'
    put(MM, f'E{r}', f'=IF({cond},IF(ABS(D{r}-C{r})<={tol},"tight","ok"),"VIOLATED")', box=True, al=CENTER)
    for j in range(NF): put(MM, f'{FCOL[j]}{r}', fn(j), fmt='0.00', box=True)
arr(MM, f'D{R_G0}:D{R_G1}', f'=MMULT({FA}{R_G0}:{FZ}{R_G1},C{R_X0}:C{R_X1})', fmt='#,##0.00', bold=True, fl=GREY)
MM.conditional_formatting.add(f'E{R_G0}:E{R_G1}', FormulaRule(formula=[f'E{R_G0}="VIOLATED"'], fill=BADF, font=Font(color='C00000', bold=True)))
MM.conditional_formatting.add(f'E{R_G0}:E{R_G1}', FormulaRule(formula=[f'E{R_G0}="tight"'], fill=OKF))

# --- diet vector x
put(MM, f'A{R_X0-3}', 'DIET VECTOR x  (Solver changes column C;  pre-filled with the Simplex answer for the Balanced example)', bold=True, size=11)
xh = ['#', 'Food', 'x (100 g units)', 'u', 'l', 'grams/day', 'servings', 'cost ($)', 'at cap?'] + [f'{m} (g)' for m in MEALS] + [f'{m} list #' for m in MEALS]
for i, h in enumerate(xh): head(MM, f'{L(i+1)}{R_X0-1}', h)
MM.row_dimensions[R_X0-1].height = 40
xb = {f['id']: v for f, v in zip([FOODS[IDS.index(i)] for i in SOL['Balanced']['foods']], SOL['Balanced']['x'])}
XM0 = 10  # first meal-grams column (J)
for j, f in enumerate(FOODS):
    r = R_X0 + j; col = FCOL[j]
    put(MM, f'A{r}', j + 1, box=True); put(MM, f'B{r}', f'={col}${R_NAME}', GREEN, box=True)
    put(MM, f'C{r}', round(xb.get(f['id'], 0.0), 9), BLUE, fmt='0.0000', box=True, fl=YELLOW)
    put(MM, f'D{r}', f'=INDEX(${FA}${R_U}:${FZ}${R_U},1,A{r})', fmt='0.000', box=True)
    put(MM, f'E{r}', f'=INDEX(${FA}${R_L}:${FZ}${R_L},1,A{r})', fmt='0.000', box=True)
    put(MM, f'F{r}', f'=C{r}*100', fmt='0', box=True)
    put(MM, f'G{r}', f"=F{r}/'Food Data'!{FC['sg']}{F0+j}", fmt='0.00', box=True)
    put(MM, f'H{r}', f'=C{r}*INDEX(${FA}${R_C}:${FZ}${R_C},1,A{r})', fmt='$0.00', box=True)
    put(MM, f'I{r}', f'=IF(AND(D{r}>0,C{r}>=D{r}-0.00001),"at cap","")', box=True, al=CENTER)
    for m_i, meal in enumerate(MEALS):
        gc = L(XM0 + m_i); kc = L(XM0 + 4 + m_i)
        put(MM, f'{gc}{r}', f'=F{r}*INDEX(${FA}${MRow[meal]}:${FZ}${MRow[meal]},1,A{r})', fmt='0', box=True)
        put(MM, f'{kc}{r}', f'=IF({gc}{r}>=0.5,COUNTIF({gc}${R_X0}:{gc}{r},">=0.5"),"")', fmt='0', box=True)
MT = R_X1 + 2
put(MM, f'B{MT}', 'cᵀx  — cost per day ($)', bold=True, fl=SUB, box=True)
arr(MM, f'C{MT}', f'=MMULT({FA}{R_C}:{FZ}{R_C},C{R_X0}:C{R_X1})', fmt='$0.00', bold=True, fl=SUB)
put(MM, f'B{MT+1}', 'Rules violated', bold=True, fl=SUB, box=True)
put(MM, f'C{MT+1}', f'=COUNTIF(E{R_G0}:E{R_G1},"VIOLATED")+SUMPRODUCT((C{R_X0}:C{R_X1}>D{R_X0}:D{R_X1}+0.00001)*1)+SUMPRODUCT((C{R_X0}:C{R_X1}<E{R_X0}:E{R_X1}-0.00001)*1)', bold=True, fl=SUB, box=True)
# --- nutrient totals A·x and meal nutrient matrix N = A·(x∘M)
NT = MT + 4
put(MM, f'A{NT-1}', 'NUTRIENTS:  A·x (whole day)  and  N = A·(x ∘ M) (per meal, one matrix product)', bold=True, size=11)
head(MM, f'B{NT}', 'Nutrient'); head(MM, f'C{NT}', 'A·x (day)')
for m_i, meal in enumerate(MEALS): head(MM, f'{L(4+m_i)}{NT}', meal)
for i, n in enumerate(NUTS): put(MM, f'B{NT+1+i}', f"{n['label']} ({n['unit']})", box=True)
arr(MM, f'C{NT+1}:C{NT+len(NUTS)}', f'=MMULT({FA}{R_A0}:{FZ}{R_A1},C{R_X0}:C{R_X1})', fmt='#,##0.0', bold=True, fl=GREY)
arr(MM, f'D{NT+1}:{L(3+len(MEALS))}{NT+len(NUTS)}', f'=MMULT({FA}{R_A0}:{FZ}{R_A1},{L(XM0)}{R_X0}:{L(XM0+3)}{R_X1})/100', fmt='#,##0.0', fl=GREY)
NTR = {n['key']: NT + 1 + i for i, n in enumerate(NUTS)}
MM.column_dimensions['A'].width = 34; MM.column_dimensions['B'].width = 30
for c in 'CDE': MM.column_dimensions[c].width = 13
MM.freeze_panes = f'{FA}{R_NAME+1}'

# ================================================================ PLANNER results (columns F..)
put(PL, 'F4', '4. RESULT', bold=True, size=11)
put(PL, 'F5', 'Cost per day', box=True); put(PL, 'G5', f"='Matrix Model'!C{MT}", GREEN, True, fmt='$0.00', box=True, size=12)
put(PL, 'F6', 'Cost per week', box=True); put(PL, 'G6', '=G5*7', bold=True, fmt='$0.00', box=True)
put(PL, 'F7', 'Rules violated', box=True); put(PL, 'G7', f"='Matrix Model'!C{MT+1}", GREEN, True, box=True)
put(PL, 'F8', 'Status', box=True)
put(PL, 'G8', '=IF(G7=0,"✓ Plan meets every rule","✗ Re-run Solver: the plan does not fit these inputs")', bold=True, box=True)
PL.merge_cells('G8:J8')
PL.conditional_formatting.add('G8', FormulaRule(formula=['$G$7=0'], fill=OKF)); PL.conditional_formatting.add('G8', FormulaRule(formula=['$G$7>0'], fill=BADF))
# daily totals vs targets
put(PL, 'F10', 'Daily totals vs targets', bold=True)
for c, h in zip('FGHI', ['Nutrient', 'Plan', 'Min', 'Max']): head(PL, f'{c}11', h)
pk_ = "$G$12"   # plan calories: macro limits are shares of the plan's actual calories
tmap = {'kcal': (f'={kcal}*(1-{P["tol"]})', f'={kcal}*(1+{P["tol"]})'),
        'protein': (f"=MAX(N({P['pfloor']}),'Matrix Model'!$C$8*{pk_}/4)", f"='Matrix Model'!$D$8*{pk_}/4"),
        'carb': (f"='Matrix Model'!$C$9*{pk_}/4", f"='Matrix Model'!$D$9*{pk_}/4"),
        'fat': (f"='Matrix Model'!$C$10*{pk_}/9", f"='Matrix Model'!$D$10*{pk_}/9"),
        'fiber': (f'={P["fiber"]}', None), 'sugar': (None, f'=IF({P["sugar"]}="","",{P["sugar"]})'), 'calcium': (f'={P["calcium"]}', None),
        'iron': (f'={P["iron"]}', None), 'potassium': (f'={P["potassium"]}', None), 'sodium': (None, f'={P["sodium"]}'), 'vitc': (f'={P["vitc"]}', None)}
for i, n in enumerate(NUTS):
    r = 12 + i
    put(PL, f'F{r}', f"{n['label']} ({n['unit']})", box=True)
    put(PL, f'G{r}', f"='Matrix Model'!C{NTR[n['key']]}", GREEN, True, fmt='#,##0', box=True)
    lo, hi = tmap[n['key']]
    put(PL, f'H{r}', lo, fmt='#,##0', box=True); put(PL, f'I{r}', hi, fmt='#,##0', box=True)
# your day, by meal
YD = 12 + len(NUTS) + 2
put(PL, f'F{YD}', 'Your day, by meal  (lunch and dinner share a batch-cooked base — cook once, eat twice)', bold=True)
NI = 9
r = YD + 1
for m_i, meal in enumerate(MEALS):
    gc = L(XM0 + m_i); kc = L(XM0 + 4 + m_i)
    head(PL, f'F{r}', meal, fl=SUB, color=BLACK)
    for c, h in zip('GHIJ', ['grams', 'servings', 'kcal', 'protein (g)']): head(PL, f'{c}{r}', h, fl=SUB, color=BLACK)
    for k in range(1, NI + 1):
        rr = r + k
        idx = f"MATCH({k},'Matrix Model'!${kc}${R_X0}:${kc}${R_X1},0)"
        put(PL, f'F{rr}', f"=IFERROR(INDEX('Matrix Model'!$B${R_X0}:$B${R_X1},{idx}),\"\")", box=True)
        put(PL, f'G{rr}', f"=IFERROR(INDEX('Matrix Model'!${gc}${R_X0}:${gc}${R_X1},{idx}),\"\")", fmt='0', box=True)
        put(PL, f'H{rr}', f"=IFERROR(G{rr}/INDEX({fref('sg')},{idx}),\"\")", fmt='0.0', box=True)
        put(PL, f'I{rr}', f"=IFERROR(G{rr}*INDEX({fref('n_kcal')},{idx})/100,\"\")", fmt='0', box=True)
        put(PL, f'J{rr}', f"=IFERROR(G{rr}*INDEX({fref('n_protein')},{idx})/100,\"\")", fmt='0', box=True)
    put(PL, f'F{r+NI+1}', f'{meal} total', bold=True, box=True)
    put(PL, f'I{r+NI+1}', f"='Matrix Model'!{L(4+m_i)}{NTR['kcal']}", GREEN, True, fmt='0', box=True)
    put(PL, f'J{r+NI+1}', f"='Matrix Model'!{L(4+m_i)}{NTR['protein']}", GREEN, True, fmt='0', box=True)
    r += NI + 3
# how to re-solve
HS = 4
put(PL, 'L4', 'HOW TO RE-SOLVE FOR A NEW PERSON OR DIET', bold=True, size=11)
steps = ['1. Change the blue inputs on this sheet (and Food Data if needed).',
         '2. Data → Solver (Excel: File → Options → Add-ins → enable Solver Add-in).',
         f"3. Set Objective: 'Matrix Model'!$C${MT}   To: Min",
         f"4. By Changing Variable Cells: 'Matrix Model'!$C${R_X0}:$C${R_X1}",
         '5. Subject to the Constraints (Add each):',
         f"     'Matrix Model'!$D${R_G0}:$D${R_G0+NGE-1} >= 'Matrix Model'!$C${R_G0}:$C${R_G0+NGE-1}",
         f"     'Matrix Model'!$D${R_G0+NGE}:$D${R_G1} <= 'Matrix Model'!$C${R_G0+NGE}:$C${R_G1}",
         f"     'Matrix Model'!$C${R_X0}:$C${R_X1} <= 'Matrix Model'!$D${R_X0}:$D${R_X1}",
         f"     'Matrix Model'!$C${R_X0}:$C${R_X1} >= 'Matrix Model'!$E${R_X0}:$E${R_X1}",
         '6. Tick "Make Unconstrained Variables Non-Negative", choose "Simplex LP", click Solve.',
         f'   ({len(G)} constraint cells — inside Excel Solver\'s 100-cell limit; bounds on x do not count.)',
         '7. Status above turns ✓. The website runs the same model instantly (src/lib/dietOptimizer.js).']
for i, s_ in enumerate(steps): put(PL, f'L{HS+1+i}', s_, italic=i >= 5 and i <= 8)
PL.column_dimensions['A'].width = 2; PL.column_dimensions['B'].width = 44; PL.column_dimensions['C'].width = 24; PL.column_dimensions['D'].width = 40
PL.column_dimensions['E'].width = 3; PL.column_dimensions['F'].width = 36
for c in 'GHIJ': PL.column_dimensions[c].width = 11
PL.column_dimensions['K'].width = 3; PL.column_dimensions['L'].width = 70

# ================================================================ DIET COMPARISON
title(DC, 'Diet Comparison — the example person under every diet (A·X computes all nutrients in one matrix product)',
      'Columns of X are optimal Simplex solutions (Walmart prices, default balance rules) plus a hand-built typical day. Values in 100 g units.')
cols = [d['name'] for d in DIETS] + ['Typical day (not optimized)']
head(DC, 'A5', '#'); head(DC, 'B5', 'Food')
for k, c in enumerate(cols): head(DC, f'{L(3+k)}5', c); DC.column_dimensions[L(3+k)].width = 13
DC.row_dimensions[5].height = 44
X0 = 6; X1 = X0 + NF - 1
for j, f in enumerate(FOODS):
    r = X0 + j
    put(DC, f'A{r}', j + 1, box=True); put(DC, f'B{r}', f"='Food Data'!{FC['name']}{F0+j}", GREEN, box=True)
    for k, d in enumerate(DIETS):
        sol = SOL[d['name']]; xs = dict(zip(sol['foods'], sol['x'] or []))
        put(DC, f'{L(3+k)}{r}', round(xs.get(f['id'], 0.0), 9), BLUE, fmt='0.000;-0.000;""', box=True)
    put(DC, f'{L(3+len(DIETS))}{r}', TYP.get(f['id'], 0) / 100, BLUE, fmt='0.000;-0.000;""', box=True)
LC = L(2 + len(cols))
CR = X1 + 2
put(DC, f'B{CR}', 'Cost per day  (cᵀX, Walmart $)', bold=True, fl=SUB, box=True)
for k in range(len(cols)):
    put(DC, f'{L(3+k)}{CR}', f"=SUMPRODUCT({fref('cw')},{L(3+k)}{X0}:{L(3+k)}{X1})", bold=True, fmt='$0.00', fl=SUB, box=True)
put(DC, f'B{CR+1}', 'Cost per week', bold=True, fl=SUB, box=True)
for k in range(len(cols)): put(DC, f'{L(3+k)}{CR+1}', f'={L(3+k)}{CR}*7', fmt='$0.00', fl=SUB, box=True)
NR = CR + 3
put(DC, f'A{NR}', 'A·X  (nutrients × diets)', bold=True, size=11)
for i, n in enumerate(NUTS): put(DC, f'B{NR+1+i}', f"{n['label']} ({n['unit']})", box=True)
arr(DC, f'C{NR+1}:{LC}{NR+len(NUTS)}', f"=MMULT('Matrix Model'!{FA}{R_A0}:{FZ}{R_A1},C{X0}:{LC}{X1})", fmt='#,##0', fl=GREY)
QR = NR + len(NUTS) + 2
put(DC, f'A{QR}', 'Targets the plan misses (example person, each diet\'s own macro split)', bold=True, size=11)
dnames = [d['name'] for d in DIETS] + ['Balanced']
checks = [('Calories in ±5%', lambda c: f'OR({c}{NR+1}<{EX["calories"]}*0.95-0.5,{c}{NR+1}>{EX["calories"]}*1.05+0.5)'),
          (f'Protein ≥ {EX["proteinMin"]} g', lambda c: f'{c}{NR+2}<{EX["proteinMin"]}-0.01'),
          (f'Fiber ≥ {EX["fiber"]} g', lambda c: f'{c}{NR+5}<{EX["fiber"]}-0.01'),
          (f'Calcium ≥ {EX["calcium"]:,} mg', lambda c: f'{c}{NR+7}<{EX["calcium"]}-0.01'),
          (f'Potassium ≥ {EX["potassium"]:,} mg', lambda c: f'{c}{NR+9}<{EX["potassium"]}-0.01'),
          (f'Vitamin C ≥ {EX["vitc"]} mg', lambda c: f'{c}{NR+11}<{EX["vitc"]}-0.01'),
          (f'Sodium ≤ {EX["sodium"]:,} mg', lambda c: f'{c}{NR+10}>{EX["sodium"]}+0.01'),
          ('Fat ≤ 35% of calories (AMDR; Low-Carb allows 50%)', lambda c: f'{c}{NR+4}*9>{c}{NR+1}*0.35+0.01')]
for i, (lab, fn) in enumerate(checks):
    r = QR + 1 + i
    put(DC, f'B{r}', lab, box=True)
    for k in range(len(cols)):
        c = L(3 + k)
        put(DC, f'{c}{r}', f'=IF({fn(c)},"MISSED","ok")', box=True, al=CENTER)
DC.conditional_formatting.add(f'C{QR+1}:{LC}{QR+len(checks)}', FormulaRule(formula=[f'C{QR+1}="MISSED"'], fill=BADF, font=Font(color='C00000', bold=True)))
IR = QR + len(checks) + 2
put(DC, f'A{IR}', 'What this shows', bold=True, size=11)
same = [d['name'] for d in DIETS if SOL[d['name']]['cost'] is not None and abs(SOL[d['name']]['cost'] - SOL['Balanced']['cost']) < 0.005]
insights = [
    f"• Example person (from the calculator): {EXP['sex']}, {EXP['age']}, {EXP['heightCm']} cm, {EXP['weightKg']} kg, {EXP['activity']}, {EXP['goal']} -> "
    f"{EX['calories']:,} kcal, protein ≥ {EX['proteinMin']} g, fiber ≥ {EX['fiber']} g.",
    f"• The optimized Balanced day costs ${SOL['Balanced']['cost']:.2f} and meets every target; the typical day costs more and misses several targets (red cells).",
    f"• {', '.join(same)} give the same cost: at these prices the cheapest balanced day already avoids meat, so excluding it costs nothing. "
    'Plant proteins (beans, peanut butter) and eggs cost far less per gram of protein than meat.',
    '• High-Protein and Low-Carb cost more because they force more protein (or fat) per calorie, which pulls in pricier foods.',
    '• Each column of X is a separate Simplex solve; A·X then evaluates every diet against every nutrient in one matrix multiplication.']
for i, t in enumerate(insights): put(DC, f'A{IR+1+i}', t)
DC.column_dimensions['A'].width = 5; DC.column_dimensions['B'].width = 34
DC.freeze_panes = 'C6'

# ================================================================ OPTIMALITY PROOF (Balanced example)
R = SOL['Balanced']; Mx = np.array(R['rows'], float); bx = np.array(R['rhs'], float); xx = np.array(R['x']); cx = np.array(R['c'])
kinds, labels, senses = R['kinds'], R['labels'], R['senses']
# Exact optimal basis from HiGHS (caps as variable bounds): tight rows = nonbasic rows, basic foods = basic columns.
import highspy
CAPK = [k for k, kd in enumerate(kinds) if kd == 'cap']; GK = [k for k, kd in enumerate(kinds) if kd != 'cap']
uvec = np.array([bx[k] for k in CAPK]); nX = len(cx)
hs = highspy.Highs(); hs.setOptionValue('output_flag', False); hs.setOptionValue('solver', 'simplex')
lp = highspy.HighsLp(); lp.num_col_ = nX; lp.num_row_ = len(GK)
lp.col_cost_ = cx; lp.col_lower_ = np.zeros(nX); lp.col_upper_ = uvec
INF = highspy.kHighsInf
lp.row_lower_ = np.array([bx[k] if senses[k] == '>=' else -INF for k in GK]); lp.row_upper_ = np.array([bx[k] if senses[k] == '<=' else INF for k in GK])
lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise
starts, idx, vals = [0], [], []
for k in GK:
    nz = np.nonzero(Mx[k])[0]; idx += nz.tolist(); vals += Mx[k][nz].tolist(); starts.append(len(idx))
lp.a_matrix_.start_, lp.a_matrix_.index_, lp.a_matrix_.value_ = starts, idx, vals
hs.passModel(lp); hs.run()
basis = hs.getBasis(); xh = np.array(hs.getSolution().col_value)
assert np.max(np.abs(xh - xx)) < 1e-6, ('HiGHS found a different optimal x than the JS Simplex', np.max(np.abs(xh - xx)))
BS = highspy.HighsBasisStatus
T = [GK[i] for i, st in enumerate(basis.row_status) if st != BS.kBasic]
BB = [R['foods'][j] for j, st in enumerate(basis.col_status) if st == BS.kBasic]
NB = [R['foods'][j] for j, st in enumerate(basis.col_status) if st == BS.kUpper]
assert len(BB) == len(T), (BB, [labels[k] for k in T])
title(PR, 'Optimality Proof — why the Balanced plan is the cheapest possible (example person)',
      'At a Simplex corner, the tight rules form a SQUARE linear system B·x_B = r. Solving it with B⁻¹ reproduces the answer; '
      'the same B⁻¹ gives shadow prices that certify no cheaper plan exists.')
put(PR, 'A3', f"Tight rules: {len(T)}.  Foods strictly inside their bounds (basic): {len(BB)}.  Foods held at their cap: {len(NB)}.  "
    "The rows and columns come from the exact basis the Simplex method finishes on. At a degenerate corner a basic food can sit exactly "
    "at its cap (it is still basic) — that is how the square system stays square.", italic=True)
put(PR, 'A4', 'Built for the example person and the Balanced diet with default rules; it reads prices and nutrients live from Food Data. '
    'If you edit prices so the plan is no longer optimal, the certificate below will say so.', italic=True)
# G_T block (tight rows x all foods), with b_T and sense
PG0 = 8
head(PR, f'A{PG0-1}', 'Tight rule'); head(PR, f'B{PG0-1}', 'sense'); head(PR, f'C{PG0-1}', 'b_T')
for j in range(NF): put(PR, f'{FCOL[j]}{PG0-1}', f"='Matrix Model'!{FCOL[j]}{R_NAME}", GREEN, True, fl=SUB, al=CENTER, box=True)
PR.row_dimensions[PG0-1].height = 58
put(PR, f'A{PG0-2}', 'G_T = the tight rows of the constraint matrix (example values fixed so the proof does not move when the Planner changes)', bold=True)
ex_kcal = EX['calories']
def proof_row(label):
    """coef(j) formula and b for a JS label, built from Food Data so the proof stays live."""
    fd = lambda key, j: f"'Food Data'!${FC[key]}${F0+j}"
    if label.startswith('kcal >='): return (lambda j: f"={fd('n_kcal', j)}"), ex_kcal * (1 - S['calorie_tolerance'])
    bal = next(d for d in DIETS if d['name'] == 'Balanced')
    for key, factor in (('protein', 4), ('carb', 4), ('fat', 9)):
        if label.startswith(f'{key}% '):
            pct = bal[key][0] if '>=' in label else bal[key][1]
            return (lambda key, factor, pct: lambda j: f"={factor}*{fd('n_'+key, j)}-{pct}*{fd('n_kcal', j)}")(key, factor, pct), 0
    for key in ('fiber', 'calcium', 'iron', 'potassium', 'vitc'):
        if label.startswith(f'{key} >='):
            return (lambda key: lambda j: f"={fd('n_'+key, j)}")(key), EX[key]
    if label.startswith('kcal <='): return (lambda j: f"={fd('n_kcal', j)}"), ex_kcal * (1 + S['calorie_tolerance'])
    if label.startswith('sodium <='): return (lambda j: f"={fd('n_sodium', j)}"), EX['sodium']
    if label.startswith('protein >='): return (lambda j: f"={fd('n_protein', j)}"), EX['proteinMin']
    if ' of protein' in label:
        j0 = IDS.index(label.split(' ')[0]); a_ = S['max_protein_share']
        return (lambda j: f"={fd('n_protein', j)}*({1 if j == j0 else 0}-{a_})"), 0
    for g in CAPS:
        if label.startswith(g['key'] + ' <='):
            per = (lambda j: '100') if g['unit'] == 'grams' else (lambda j: f"100/{fd('sg', j)}")
            return (lambda g, per: lambda j: f"=IF({fd('capg', j)}=\"{g['label']}\",{per(j)},0)")(g, per), g['max']
    for meal in MEALS:
        if label.startswith(f'{meal} kcal'):
            lo, hi = S['meal_kcal'][meal]
            return (lambda meal: lambda j: f"={fd('n_kcal', j)}*{fd('m_'+meal, j)}")(meal), ex_kcal * (lo if '>=' in label else hi)
        if label.startswith(f'{meal} protein'):
            return (lambda meal: lambda j: f"={fd('n_protein', j)}*({fd('m_'+meal, j)}-{S['min_meal_protein_share']})")(meal), 0
    if label.startswith('vegetables'): return (lambda j: f"=IF({fd('type', j)}=\"Vegetables\",100/{fd('cup', j)},0)"), S['min_veg_cups']
    if label.startswith('fruit'): return (lambda j: f"=IF({fd('type', j)}=\"Fruit\",100/{fd('cup', j)},0)"), S['min_fruit_cups']
    raise ValueError(f'proof row not supported: {label}')
for i, k in enumerate(T):
    r = PG0 + i; fn, b = proof_row(labels[k])
    put(PR, f'A{r}', labels[k], box=True); put(PR, f'B{r}', '≥' if senses[k] == '>=' else '≤', box=True, al=CENTER)
    put(PR, f'C{r}', b, BLUE, fmt='#,##0.00', box=True)
    for j in range(NF): put(PR, f'{FCOL[j]}{r}', fn(j), fmt='0.00', box=True)
PG1 = PG0 + len(T) - 1
# c row, x* row, u row
for rr, lab, f_ in ((PG1 + 2, 'c (Walmart $ / 100 g)', lambda j: f"='Food Data'!{FC['cw']}{F0+j}"),
                    (PG1 + 3, 'x* (Simplex, Balanced)', lambda j: f"='Diet Comparison'!C{X0+j}"),
                    (PG1 + 4, 'u (cap, 100 g units)', lambda j: f"='Food Data'!{FC['sg']}{F0+j}*'Food Data'!{FC['mx']}{F0+j}/100")):
    put(PR, f'A{rr}', lab, bold=True, fl=SUB, box=True)
    for j in range(NF): put(PR, f'{FCOL[j]}{rr}', f_(j), GREEN, fmt='0.0000', box=True)
RC_, RX_, RU_ = PG1 + 2, PG1 + 3, PG1 + 4
col_of = {fid: FCOL[IDS.index(fid)] for fid in IDS}
# B, N, u_N, r, B^-1, det, x_B
SB = RU_ + 3; k_ = len(T)
put(PR, f'A{SB-1}', f'STEP 1 — square system:  B ({k_}×{k_}) = G_T restricted to the basic foods;  N = G_T on foods held at cap', bold=True, size=11)
head(PR, f'A{SB}', 'Tight rule')
for q, fid in enumerate(BB): head(PR, f'{L(2+q)}{SB}', f"B: {FOODS[IDS.index(fid)]['name']}")
NBc0 = 2 + k_ + 1
for q, fid in enumerate(NB): head(PR, f'{L(NBc0+q)}{SB}', f"N: {FOODS[IDS.index(fid)]['name']}", fl=fill('7F7F7F'))
RCOL = L(NBc0 + len(NB) + 1); RCOL2 = L(NBc0 + len(NB) + 2)
head(PR, f'{RCOL}{SB}', 'b_T'); head(PR, f'{RCOL2}{SB}', 'r = b_T − N·u_N')
PR.row_dimensions[SB].height = 58
for i in range(k_):
    r = SB + 1 + i
    put(PR, f'A{r}', f'=A{PG0+i}', box=True)
    for q, fid in enumerate(BB): put(PR, f'{L(2+q)}{r}', f'={col_of[fid]}{PG0+i}', fmt='0.000', box=True)
    for q, fid in enumerate(NB): put(PR, f'{L(NBc0+q)}{r}', f'={col_of[fid]}{PG0+i}', fmt='0.000', box=True, fl=GREY)
    put(PR, f'{RCOL}{r}', f'=C{PG0+i}', fmt='#,##0.00', box=True)
UN = SB + k_ + 2
put(PR, f'A{UN}', 'u_N (caps of foods held at cap)', bold=True)
for q, fid in enumerate(NB):
    put(PR, f'{L(NBc0+q)}{UN}', f'={col_of[fid]}{RU_}', fmt='0.000', box=True, fl=GREY)
Bc0, Bc1 = 'B', L(1 + k_); Nc0, Nc1 = L(NBc0), L(NBc0 + len(NB) - 1)
arr(PR, f'{RCOL2}{SB+1}:{RCOL2}{SB+k_}', f'={RCOL}{SB+1}:{RCOL}{SB+k_}-MMULT({Nc0}{SB+1}:{Nc1}{SB+k_},TRANSPOSE({Nc0}{UN}:{Nc1}{UN}))', fmt='#,##0.000', fl=GREY)
IV = UN + 3
put(PR, f'A{IV-1}', 'STEP 2 — B⁻¹ (MINVERSE) and det(B) (MDETERM); then x_B = B⁻¹·r', bold=True, size=11)
for i in range(k_): put(PR, f'A{IV+i}', f'=A{SB+1+i}', box=True)
arr(PR, f'{Bc0}{IV}:{Bc1}{IV+k_-1}', f'=MINVERSE({Bc0}{SB+1}:{Bc1}{SB+k_})', fmt='0.000000', fl=GREY)
DR_ = IV + k_ + 1
put(PR, f'A{DR_}', 'det(B)', bold=True, box=True); put(PR, f'B{DR_}', f'=MDETERM({Bc0}{SB+1}:{Bc1}{SB+k_})', bold=True, fmt='0.000E+00', box=True, fl=GREY)
put(PR, f'C{DR_}', f'=IF(ABS(B{DR_})>1E-12,"det ≠ 0 → B is invertible → the corner is unique","det = 0 → singular")', italic=True)
XB = DR_ + 2
for c_, h in zip('ABCD', ['Basic food', 'x_B = B⁻¹·r', 'x* (Simplex)', 'difference']): head(PR, f'{c_}{XB}', h)
arr(PR, f'B{XB+1}:B{XB+k_}', f'=MMULT({Bc0}{IV}:{Bc1}{IV+k_-1},{RCOL2}{SB+1}:{RCOL2}{SB+k_})', fmt='0.000000', bold=True, fl=GREY)
for q, fid in enumerate(BB):
    r = XB + 1 + q
    put(PR, f'A{r}', FOODS[IDS.index(fid)]['name'], box=True)
    put(PR, f'C{r}', f'={col_of[fid]}{RX_}', fmt='0.000000', box=True); put(PR, f'D{r}', f'=B{r}-C{r}', fmt='0.0E+00', box=True)
put(PR, f'A{XB+k_+1}', 'Check', bold=True)
put(PR, f'B{XB+k_+1}', f'=IF(MAX(D{XB+1}:D{XB+k_})-MIN(D{XB+1}:D{XB+k_})<1E-6,"✓ B⁻¹r reproduces the Simplex answer","✗ mismatch")', bold=True)
# shadow prices
SP_ = XB + k_ + 4
put(PR, f'A{SP_-1}', 'STEP 3 — shadow prices  yᵀ = c_Bᵀ·B⁻¹  (extra $/day if a tight rule is tightened by one unit)', bold=True, size=11)
for c_, h in zip('ABCDE', ['Tight rule', 'sense', 'y', 'sign OK?', 'meaning']): head(PR, f'{c_}{SP_}', h)
put(PR, f'G{SP_}', 'c_B (row)', bold=True)
for q, fid in enumerate(BB): put(PR, f'{L(8+q)}{SP_}', f'={col_of[fid]}{RC_}', fmt='$0.0000', box=True)
arr(PR, f'H{SP_+1}:{L(7+k_)}{SP_+1}', f'=MMULT(H{SP_}:{L(7+k_)}{SP_},{Bc0}{IV}:{Bc1}{IV+k_-1})', fmt='0.000000', fl=GREY)
put(PR, f'G{SP_+1}', 'yᵀ (row)', bold=True)
units = {'kcal': ('per +100 kcal', 100), 'fiber': ('per +1 g fiber', 1), 'calcium': ('per +100 mg calcium', 100),
         'vegetables': ('per +1 cup of vegetables', 1), 'fruit': ('per +1 cup of fruit', 1), 'protein': ('per +1 g of protein', 1)}
for i in range(k_):
    r = SP_ + 1 + i; lab = labels[T[i]]
    put(PR, f'A{r}', f'=A{PG0+i}', box=True); put(PR, f'B{r}', f'=B{PG0+i}', box=True, al=CENTER)
    put(PR, f'C{r}', f'=INDEX($H${SP_+1}:${L(7+k_)}${SP_+1},1,{i+1})', fmt='0.000000', bold=True, box=True)
    put(PR, f'D{r}', f'=IF(B{r}="≥",IF(C{r}>=-1E-9,"✓","✗"),IF(C{r}<=1E-9,"✓","✗"))', box=True, al=CENTER)
    key = lab.split(' ')[0]
    if key in units: put(PR, f'E{r}', f'=TEXT(C{r}*{units[key][1]},"$0.000")&" {units[key][0]}"', box=True)
    elif key in [g['key'] for g in CAPS]:
        unit_ = next(g['unit'] for g in CAPS if g['key'] == key)
        put(PR, f'E{r}', f'=TEXT(ABS(C{r}),"$0.000")&" saved per extra {unit_[:-1]} the {key.replace("_", " ")} cap allows"', box=True)
    elif key.endswith('%'):
        put(PR, f'E{r}', f'=TEXT(ABS(C{r})*100,"$0.000")&" per 100 kcal the {key[:-1]} limit is loosened"', box=True)
    elif 'kcal' in lab:
        put(PR, f'E{r}', f'=TEXT(ABS(C{r})*100,"$0.000")&" per 100 kcal moved into/out of {lab.split(" ")[0].lower()}"', box=True)
# reduced costs
RD = SP_ + k_ + 3
put(PR, f'A{RD-1}', 'STEP 4 — optimality certificate:  reduced cost d = c − yᵀ·G_T  for every food', bold=True, size=11)
put(PR, f'A{RD}', 'd ($ per 100 g)', bold=True, fl=SUB, box=True)
arr(PR, f'{FA}{RD}:{FZ}{RD}', f'={FA}{RC_}:{FZ}{RC_}-MMULT(H{SP_+1}:{L(7+k_)}{SP_+1},{FA}{PG0}:{FZ}{PG1})', fmt='0.0000', bold=True, fl=GREY)
put(PR, f'A{RD+1}', 'role', bold=True, fl=SUB, box=True)
put(PR, f'A{RD+2}', 'condition met?', bold=True, fl=SUB, box=True)
for j, fid in enumerate(IDS):
    col = FCOL[j]
    role = 'basic' if fid in BB else 'at cap' if fid in NB else 'zero'
    put(PR, f'{col}{RD+1}', role, box=True, al=CENTER)
    cond = {'basic': f'ABS({col}{RD})<1E-7', 'at cap': f'{col}{RD}<=1E-9', 'zero': f'{col}{RD}>=-1E-9'}[role]
    put(PR, f'{col}{RD+2}', f'=IF({cond},"OK","FAIL")', box=True, al=CENTER)
put(PR, f'A{RD+4}', 'Rules: basic food → d = 0;  food at cap → d ≤ 0 (would add more if allowed);  food not eaten → d ≥ 0 (adding it raises cost).', italic=True)
put(PR, f'A{RD+5}', 'Verdict', bold=True, size=12)
put(PR, f'B{RD+5}', f'=IF(AND(COUNTIF({FA}{RD+2}:{FZ}{RD+2},"FAIL")=0,COUNTIF(D{SP_+1}:D{SP_+k_},"✗")=0),"✓ PROVEN OPTIMAL: no food can be added, removed or swapped to lower the cost","✗ Not optimal for the current data — re-solve")', bold=True, size=12)
PR.column_dimensions['A'].width = 36
for c_ in 'BCDE': PR.column_dimensions[c_].width = 14
PR.freeze_panes = f'{FA}{PG0}'

# ================================================================ NOTES & SOURCES
NS.column_dimensions['A'].width = 150
lines = [
 ('How the workbook maps to the project', True),
 ('Planner = inputs and the answer.  Food Data = the data (sorted by group/type).  Diets = presets.  Matrix Model = the linear algebra '
  '(A, M, G, c, u, x; G·x and cᵀx by MMULT).  Diet Comparison = A·X for every diet at once.  Optimality Proof = B⁻¹, det(B), shadow prices.', False),
 ('The website optimizer (src/lib/dietOptimizer.js) builds exactly the same G, b, c, u and solves them with a two-phase Simplex (Gauss-Jordan row operations).', False),
 ('', False),
 ('Rules that keep the plan realistic ("no absurd amounts")', True),
 ('1. Portion caps per food (max servings/day on Food Data) — upper bounds u.', False),
 ('2. Protein diversity: no single food supplies more than 35% of the day\'s protein:  p_j·x_j − α·(pᵀx) ≤ 0  (a linear row for each high-protein food).', False),
 ('3. Meal balance: breakfast, lunch and dinner each carry ≥ 20% of the protein; each meal stays inside its calorie share. '
  'Uses the meal matrix M:  meal calories = (A_kcal ∘ M_k)ᵀ·x.', False),
 ('4. Group caps: meat/poultry/fish ≤ 12 oz raw, beans & lentils ≤ 3 servings, cheese ≤ 3, grains ≤ 9, oils & butter ≤ 4 tbsp, snacks ≤ 2.', False),
 ('5. Food-group minimums in USDA cup-equivalents: vegetables ≥ 2.5 cups, fruit ≥ 2 cups (Dietary Guidelines, 2,000-kcal pattern).', False),
 ('', False),
 ('Assumptions and limits to state in the presentation', True),
 ('• Prices are one retailer (Walmart online, Oct 26 2026, regular non-sale prices) and vary by store. BLS U.S. averages (Sep 2026) are a sensitivity check (Planner → Price source).', False),
 ('• Yellow prices on Food Data are older or undated listings — verify them before final numbers.', False),
 ('• Nutrients are USDA SR28 per 100 g of the food as bought and edible (raw meat, dry grains/beans). Small cooking losses are ignored.', False),
 ('• Edible yield converts price to $ per 100 g EDIBLE: bone-in chicken, peels and shells would otherwise look cheaper than they are.', False),
 ('• Each food has a fixed meal pattern (matrix M), so lunch and dinner share the same batch-cooked base — realistic for meal prep, but not varied.', False),
 ('• A linear program cannot force "use at least a normal portion if you use a food at all" (that needs integer variables), so plans can include small amounts (e.g. 15 g of milk).', False),
 ('• Variety across days, taste and cooking time are not in the model. Vitamin B12, vitamin D and others are not tracked.', False),
 ('• Removed from v1: flour and sugar (ingredients, not foods eaten alone — the v1 optimizer chose raw flour).', False),
 ('', False),
 ('References (APA 7)', True),
 ('U.S. Department of Agriculture, Agricultural Research Service, Nutrient Data Laboratory. (2015). USDA National Nutrient Database for Standard Reference, Release 28 [Data set]. http://www.ars.usda.gov/nea/bhnrc/ndl', False),
 ('U.S. Department of Agriculture, Agricultural Research Service. (2019). FoodData Central: SR Legacy [Data set]. https://fdc.nal.usda.gov/', False),
 ('U.S. Bureau of Labor Statistics. (2026). Average retail food and energy prices, U.S. and Midwest region [Data table]. https://www.bls.gov/regions/mid-atlantic/data/averageretailfoodandenergyprices_usandmidwest_table.htm', False),
 ('Walmart Inc. (2026, October 26). Product listings for the foods in Food Data [Retail prices]. https://www.walmart.com/ and https://business.walmart.com/', False),
 ('U.S. Department of Agriculture & U.S. Department of Health and Human Services. (2020). Dietary guidelines for Americans, 2020–2025 (9th ed.). https://www.dietaryguidelines.gov/', False),
 ('Institute of Medicine. (2005). Dietary reference intakes for energy, carbohydrate, fiber, fat, fatty acids, cholesterol, protein, and amino acids. The National Academies Press. https://doi.org/10.17226/10490', False),
 ('National Academies of Sciences, Engineering, and Medicine. (2019). Dietary reference intakes for sodium and potassium. The National Academies Press. https://doi.org/10.17226/25353', False),
 ('Dantzig, G. B. (1990). The diet problem. Interfaces, 20(4), 43–47. https://doi.org/10.1287/inte.20.4.43', False),
 ('Stigler, G. J. (1945). The cost of subsistence. Journal of Farm Economics, 27(2), 303–314. https://doi.org/10.2307/1231810', False),
 ('', False),
 ('Color legend', True),
 ('Blue = inputs you can edit.  Black = formulas.  Green = links to another sheet.  Yellow = price to verify / Solver variable cells.  Grey = matrix-product results.', False),
]
for i, (t, b) in enumerate(lines, 1):
    c = NS.cell(row=i, column=1, value=t); c.font = font(bold=b, size=11 if b else 10); c.alignment = Alignment(wrap_text=True, vertical='top')

out = os.path.join(ROOT, 'spreadsheet', 'FeasaBULL_Diet_Optimizer.xlsx')
wb.save(out)
print('saved', out, '| G rows', len(G), f'(>= {NGE}, <= {len(G)-NGE})', '| proof size', k_, 'x', k_, '| basic', BB, '| at cap', NB)
json.dump(dict(R_G0=R_G0, R_G1=R_G1, NGE=NGE, R_X0=R_X0, R_X1=R_X1, MT=MT, NT=NT, X0=X0, CR=CR, RD=RD, XB=XB, k=k_, SP=SP_, IV=IV, DR=DR_, QR=QR),
          open(os.path.join(ROOT, 'tests', 'out', 'xlsx_layout.json'), 'w'))
