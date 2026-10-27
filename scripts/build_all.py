"""Rebuild everything: check diets -> data -> optimizer JS -> web page -> tests -> HiGHS check -> workbook -> recalc.
Run from the repo root:  python scripts/build_all.py   (run scripts/fetch_usda.sh once first)
"""
import os, shutil, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def run(*cmd):
    print('>', ' '.join(cmd)); subprocess.run(cmd, cwd=ROOT, check=True)
py = sys.executable
run(py, 'scripts/diets.py')
run(py, 'tests/test_diets_config.py')
run(py, 'scripts/build_data.py')
run(py, 'scripts/build_js.py')
run(py, 'scripts/build_web.py')
run('node', 'tests/person_targets.test.mjs')
run('node', 'tests/diets.test.mjs')
run('node', 'tests/run_diets.mjs')
run('node', 'tests/stress.mjs')
run(py, 'tests/verify_highs.py', 'tests/out/diets.json', 'tests/out/stress.json', 'tests/out/infeasible.json')
run(py, 'scripts/build_xlsx.py')
if shutil.which('soffice') or shutil.which('libreoffice'):
    run(py, 'scripts/recalc_xlsx.py')
else:
    print('LibreOffice not found: workbook not recalculated (Excel recalculates on open; GitHub preview will show blanks).')
print('Done.')
