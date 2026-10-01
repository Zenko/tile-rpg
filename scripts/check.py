#!/usr/bin/env python3
"""Pre-publish sanity checks for Tile RPG (no dependencies besides python3 and node).

Run from the repo root:  python3 scripts/check.py

1. every js/*.js file parses on its own (node --check)
2. no element id appears twice in index.html (all panels share one document, and
   document.getElementById would silently bind to the wrong one)
3. no top-level function / const / let / var name is declared in two script files
   (all files share one global scope, so the later file silently replaces the earlier)
4. every <script src> in index.html exists
5. RELEASES (js/changelog.js) have unique ids and consecutive numbers, PENDING_CHANGES tags are valid
Exit code 1 if anything fails.
"""
import collections, glob, os, re, subprocess, sys

ok = True
def fail(msg):
    global ok; ok = False; print('FAIL  ' + msg)

files = sorted(glob.glob('js/*.js')) + ['assets/sprites.js']
for f in files:
    r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
    if r.returncode: fail(f'syntax error in {f}\n{r.stderr.strip()}')

html = open('index.html', encoding='utf-8').read()
dup_ids = [k for k, v in collections.Counter(re.findall(r'\bid="([^"]+)"', html)).items() if v > 1]
if dup_ids: fail('duplicate element ids in index.html: ' + ', '.join(dup_ids))

defs = collections.defaultdict(list)
for f in files:
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', s, re.M): defs[m.group(1)].append(f)
    for m in re.finditer(r'^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=', s, re.M): defs[m.group(1)].append(f)
for name, where in defs.items():
    if len(set(where)) > 1: fail(f'global name "{name}" is declared in several files: {", ".join(sorted(set(where)))}')

for src in re.findall(r'<script src="([^"]+)"', html):
    if not src.startswith('http') and not os.path.exists(src): fail(f'index.html references a missing file: {src}')

js = "const BUILD=1;" + open('js/changelog.js', encoding='utf-8').read() + ";console.log(JSON.stringify({r:RELEASES.map(r=>[r.id,r.n]),p:PENDING_CHANGES.map(c=>c.t)}))"
r = subprocess.run(['node', '-e', js], capture_output=True, text=True)
if r.returncode: fail('could not evaluate js/changelog.js: ' + r.stderr.strip().splitlines()[-1])
else:
    import json
    d = json.loads(r.stdout.strip().splitlines()[-1])
    ns = [n for _, n in d['r']]
    if ns != list(range(len(ns), 0, -1)): fail('RELEASES numbers must run newest-first and consecutive, got ' + str(ns))
    if len({i for i, _ in d['r']}) != len(d['r']): fail('RELEASES ids are not unique')
    bad = [t for t in d['p'] if t not in ('new', 'better', 'fixed')]
    if bad: fail('PENDING_CHANGES has invalid tags: ' + ', '.join(map(str, bad)))

print('all checks passed' if ok else 'checks FAILED')
sys.exit(0 if ok else 1)
