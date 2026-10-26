"""Rebuild everything: data -> optimizer JS -> solve all diets -> stress tests -> HiGHS check -> workbook.
Run from the repo root:  python scripts/build_all.py   (run scripts/fetch_usda.sh once first)
"""
import os, shutil, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def run(*cmd):
    print('>', ' '.join(cmd)); subprocess.run(cmd, cwd=ROOT, check=True)
py = sys.executable
run(py, 'scripts/build_data.py')
run(py, 'scripts/build_js.py')
run('node', 'tests/run_diets.mjs')
run('node', 'tests/stress.mjs')
run(py, 'tests/verify_highs.py', 'tests/out/diets.json', 'tests/out/stress.json', 'tests/out/infeasible.json')
run(py, 'scripts/build_xlsx.py')
if shutil.which('soffice'):
    print('LibreOffice found: recalculating the workbook so cached values are stored (optional; Excel recalculates on open).')
print('Done.')
