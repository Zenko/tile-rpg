#!/usr/bin/env python3
"""Pre-publish sanity checks for Tile RPG (no dependencies besides python3 and node).

Run from the repo root:  python3 scripts/check.py

1. every js/*.js file parses on its own (node --check)
2. no element id appears twice in index.html (all panels share one document, and
   document.getElementById would silently bind to the wrong one)
3. no top-level function / const / let / var name is declared in two script files
   (all files share one global scope, so the later file silently replaces the earlier)
4. every <script src> in index.html exists
6. every document.getElementById('literal') in js/ names an id that exists in index.html (or is built in JS), so a removed
   element can't leave a listener that throws at load
5. RELEASES (js/changelog.js) have unique ids and consecutive numbers, PENDING_CHANGES tags are valid
Exit code 1 if anything fails.
"""
import collections, glob, os, re, subprocess, sys

ok = True
def fail(msg):
    global ok; ok = False; print('FAIL  ' + msg)

files = sorted(glob.glob('js/*.js')) + sorted(glob.glob('content/*.js')) + ['assets/sprites.js', 'assets/player-art.js']
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

ids = set(re.findall(r'\bid="([^"]+)"', html))
allsrc = {f: open(f, encoding='utf-8').read() for f in files}
GUARDED = {'companionBox', 'pmLevelBadge', 'pmXpText', 'pmXpFill', 'deckSizeHud', 'deckFillBar', 'pillDeck', 'tabShop', 'radarGridMini'}   # looked up defensively, long-standing
for f, src in allsrc.items():
    for m in re.finditer(r"getElementById\('([^']+)'\)", src):
        k = m.group(1)
        if k in ids or k in GUARDED: continue
        if any(re.search(r'id=\\?["\']%s|\.id\s*=\s*["\']%s' % (re.escape(k), re.escape(k)), t) for t in allsrc.values()): continue
        fail(f'{f} looks up #{k}, which is not in index.html')

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

# art-manifest.json: every card picture / icon the scripts name, so sw.js can precache them without re-downloading and
# scanning every script at install time. Same pattern sw.js used; only files that exist are listed. Rewritten when it changes.
import json
art = sorted({m for src in list(allsrc.values()) + [html] for m in re.findall(r'assets/(?:icons|cards)/[\w.-]+\.png', src) if os.path.exists(m)})
new = json.dumps(art, indent=0) + '\n'
if not os.path.exists('art-manifest.json') or open('art-manifest.json').read() != new:
    open('art-manifest.json', 'w').write(new); print(f'wrote art-manifest.json ({len(art)} pictures)')

# 7. The names players see live in js/game-config.js (HANDOFF §5 "Reskinning"). A name typed straight into a string in js/
#    (or content/) would not change when the config does, so it fails here. Comments may say anything; a line that really means the plain
#    word (an 'Ember' cosmetic, a 'Fern' rug colour) ends with a `names-ok` comment. The changelogs are history, left alone.
def js_strings(src):
    """Yield (line, text) for the literal text of every '...', "..." and `...` in a JS source, skipping comments and regexes."""
    i, n, line, depth, prev = 0, len(src), 1, [], ''
    while i < n:
        c = src[i]
        if c == '\n': line += 1; i += 1; continue
        if c in ' \t\r': i += 1; continue
        if src.startswith('//', i): i = src.find('\n', i) if '\n' in src[i:] else n; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2); j = n if j < 0 else j + 2; line += src.count('\n', i, j); i = j; continue
        if c in '\'"':
            j, buf = i + 1, []
            while j < n and src[j] != c:
                if src[j] == '\\': buf.append(src[j:j + 2]); j += 2; continue
                buf.append(src[j]); j += 1
            yield line, ''.join(buf); line += src.count('\n', i, j); i = j + 1; prev = 'str'; continue
        if c == '`' or (c == '}' and depth and depth[-1] == 'tpl'):
            if c == '}': depth.pop()
            j, buf = i + 1, []
            while j < n and src[j] != '`':
                if src[j] == '\\': buf.append(src[j:j + 2]); j += 2; continue
                if src.startswith('${', j): depth.append('tpl'); j += 2; break
                buf.append(src[j]); j += 1
            else: j += 1
            yield line, ''.join(buf); line += src.count('\n', i, j); i = j; prev = 'str'; continue
        if c == '{': depth.append('{')
        elif c == '}' and depth: depth.pop()
        if c == '/' and (prev in ('', 'op') or prev in ('return', 'typeof', 'case')):   # a regex literal
            j, cls = i + 1, False
            while j < n and src[j] != '\n':
                if src[j] == '\\': j += 2; continue
                if src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                elif src[j] == '/' and not cls: break
                j += 1
            i = j + 1; prev = 'str'; continue
        m = re.match(r'[A-Za-z0-9_$.]+', src[i:i + 64])
        if m: prev = m.group(0) if m.group(0) in ('return', 'typeof', 'case') else 'word'; i += len(m.group(0)); continue
        prev = 'str' if c in ')]' else 'op'; i += 1

r = subprocess.run(['node', '-e', open('js/game-config.js', encoding='utf-8').read() +
                    ';console.log(JSON.stringify({GAME,PLACES,BOSSES,FAMILY_NAMES,CAST}))'], capture_output=True, text=True)
if r.returncode: fail('could not evaluate js/game-config.js: ' + r.stderr.strip().splitlines()[-1])
else:
    cfg = json.loads(r.stdout.strip().splitlines()[-1])
    names = [cfg['GAME']['title'], cfg['GAME']['currency']['one'], cfg['GAME']['currency']['many']] + list(cfg['GAME']['player'].values())
    names += list(cfg['PLACES'].values()) + list(cfg['BOSSES'].values()) + list(cfg['FAMILY_NAMES'].values()) + [c['name'] for c in cfg['CAST'].values()]
    name_re = re.compile(r'(?<![A-Za-z])(' + '|'.join(sorted(map(re.escape, set(names)), key=len, reverse=True)) + r')(?![A-Za-zñ])')
    for f, src in allsrc.items():
        if f in ('js/game-config.js', 'js/changelog.js', 'js/changelog-archive.js') or not f.startswith(('js/', 'content/')): continue
        lines = src.split('\n')
        for ln, text in js_strings(src):
            for m in name_re.finditer(text):
                if 'names-ok' not in lines[ln - 1]: fail(f'{f}:{ln} types the name "{m.group(1)}" - use js/game-config.js instead')
    # index.html: names only inside a data-game element whose fallback text matches the config, and the manifest says the title
    def cfg_value(p):
        v = cfg
        for k in p.split('.'): v = v.get(k) if isinstance(v, dict) else None
        return v
    for p, text in re.findall(r'data-game="([\w.]+)"[^>]*>([^<]*)<', html):
        if cfg_value(p) is None: fail(f'index.html: data-game="{p}" is not a value in js/game-config.js')
        elif cfg_value(p) != text: fail(f'index.html: data-game="{p}" shows "{text}" but js/game-config.js says "{cfg_value(p)}"')
    body = re.sub(r'<script\b.*?</script>|<title>.*?</title>|data-game="[\w.]+"[^>]*>[^<]*<|\btitle="[^"]*"(?=[^>]*data-game-title)', ' ', html, flags=re.S)
    for t in re.findall(r'>([^<]+)<', body):
        for m in name_re.finditer(t): fail(f'index.html types the name "{m.group(1)}" - wrap it in <span data-game="...">')
    man = json.load(open('manifest.json', encoding='utf-8'))
    if man.get('name') != cfg['GAME']['title']: fail(f'manifest.json "name" is "{man.get("name")}" but GAME.title is "{cfg["GAME"]["title"]}"')

# 8. Every colour in the stylesheets lives in css/theme.css (HANDOFF §5 "Reskinning"): no hex colour, and no colour variable
#    declared, in any other css/ file. A new colour goes into theme.css's palette (or a token there) and the rule reads var().
css_hex = re.compile(r'/\*.*?\*/|url\((?:[^()"\']|"[^"]*"|\'[^\']*\')*\)|#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b', re.S)
css_colour_var = re.compile(r'(?<![\w-])(--[\w-]+)\s*:\s*[^;}]*?(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|color-mix\()')
for f in sorted(glob.glob('css/*.css')):
    if f == 'css/theme.css': continue
    s = open(f, encoding='utf-8').read()
    for m in css_hex.finditer(s):
        if m.group(0).startswith('#'): fail(f'{f}:{s.count(chr(10), 0, m.start()) + 1} has the colour {m.group(0)} - put it in css/theme.css and use var()')
    for m in css_colour_var.finditer(re.sub(r'/\*.*?\*/', lambda c: ' ' * len(c.group(0)), s, flags=re.S)):
        fail(f'{f}:{s.count(chr(10), 0, m.start()) + 1} declares the colour variable {m.group(1)} - colour variables live in css/theme.css')
theme_vars = set(re.findall(r'(--[\w-]+)\s*:', open('css/theme.css', encoding='utf-8').read()))
for f in sorted(glob.glob('css/*.css')):
    for v in sorted(set(re.findall(r'var\(\s*(--c-[\w-]+)', open(f, encoding='utf-8').read())) - theme_vars):
        fail(f'{f} reads {v}, which css/theme.css does not define')

BIG = 1500   # a nudge, not a failure: past this a file is usually doing several jobs and wants splitting (see HANDOFF)
for f in files + sorted(glob.glob('css/*.css')):
    n = sum(1 for _ in open(f, encoding='utf-8'))
    if n > BIG and f != 'js/changelog-archive.js': print(f'WARN  {f} has {n} lines; consider splitting it')

print('all checks passed' if ok else 'checks FAILED')
sys.exit(0 if ok else 1)
