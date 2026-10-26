"""Re-solve every model the JS optimizer built with SciPy's HiGHS and compare (status, cost, feasibility)."""
import json, sys, numpy as np
from scipy.optimize import linprog

def check(path):
    R = json.load(open(path)); R = R if isinstance(R, list) else list(R.values())
    worst_d = worst_v = 0; bad = 0
    for r in R:
        c = np.array(r['c']); M = np.array(r['rows'], float); b = np.array(r['rhs'], float)
        sgn = np.array([1 if s == '<=' else -1 for s in r['senses']])
        res = linprog(c, A_ub=M * sgn[:, None], b_ub=b * sgn, bounds=[(0, None)] * len(c), method='highs')
        hs = 'optimal' if res.status == 0 else 'infeasible' if res.status == 2 else 'other'
        if hs != r['status']: bad += 1; print('STATUS MISMATCH', hs, r['status']); continue
        if hs == 'optimal' and r['cost'] is not None:
            worst_d = max(worst_d, abs(res.fun - r['cost']) / max(1, res.fun))
            viol = ((M * sgn[:, None]) @ np.array(r['x']) - b * sgn) / np.maximum(1, np.abs(b)); worst_v = max(worst_v, max(0, viol.max()))
    print(f'{path}: {len(R)} models, status mismatches {bad}, max rel cost diff {worst_d:.1e}, max relative constraint violation {worst_v:.1e}')
    return bad == 0 and worst_d < 1e-8 and worst_v < 1e-7

ok = all(check(p) for p in sys.argv[1:])
sys.exit(0 if ok else 1)
