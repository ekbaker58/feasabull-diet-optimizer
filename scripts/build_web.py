"""Build the connected planner page: web/app.html + src/lib/personTargets.js + src/lib/dietOptimizer.js.

Outputs
  web/index.html          full standalone page (open it in a browser, or host it: GitHub Pages, Vercel, Netlify)
  web/artifact.html       same page without the document wrapper (for publishing as a Claude artifact)
"""
import os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def strip_module(src):
    src = re.sub(r'^\s*import .*?;\s*$', '', src, flags=re.M)
    return re.sub(r'^export\s+', '', src, flags=re.M)

mods = [open(os.path.join(ROOT, 'src', 'lib', f)).read() for f in ('dietOptimizer.js', 'personTargets.js')]
body = open(os.path.join(ROOT, 'web', 'app.html')).read().replace('/*__MODULES__*/', '\n'.join(strip_module(m) for m in mods))
open(os.path.join(ROOT, 'web', 'artifact.html'), 'w').write(body)
head, rest = body.split('<style>', 1)
full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head + '<style>' + rest.split('</style>', 1)[0] + '</style>\n</head>\n<body>\n' + rest.split('</style>', 1)[1] + '\n</body>\n</html>\n')
open(os.path.join(ROOT, 'web', 'index.html'), 'w').write(full)
print('web/index.html', len(full), 'bytes; web/artifact.html', len(body), 'bytes')
