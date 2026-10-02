#!/usr/bin/env python3
"""Builds assets/icons/manifest.js: every emoji / symbol icon used in the game's source, with a friendly file name, how often and where it is used.
The Asset Lab reads it to let you replace any icon; the game's icon-swap layer (js/icon-swap.js) uses the same ids.
Run from the repo root after adding or changing icons:  python3 scripts/icon-inventory.py
An icon's id is its code points in hex without the variation selector (U+FE0F), e.g. the wrapped present is 1f381; its file name is icon-<slug>.png."""
import re, glob, json, unicodedata, os, collections

SKIP = {'js/changelog.js', 'js/changelog-archive.js', 'js/build.js'}            # release notes are prose, not UI icons
AREAS = {
    'js/data-and-engine.js': 'Cards, keywords and districts', 'js/progression.js': 'Quests, tips and progress', 'js/quests.js': 'Quests and rewards',
    'js/titles.js': 'Titles, tabs and top bar', 'js/town-render-weather.js': 'Town map and weather', 'js/town-life.js': 'Town life and mood',
    'js/houses-and-cellar.js': 'Buildings, shops and mail', 'js/cellar-run.js': 'The cellar', 'js/cellar-crawl.js': 'The cellar', 'js/fishing.js': 'Fishing',
    'js/gardening.js': 'Gardening', 'js/puzzle-memory-minigames.js': 'Mini-games and puzzles', 'js/afterdark-companion-cards.js': 'Companion, sets and night market',
    'js/battle-ui.js': 'Battle', 'js/battle-toss.js': 'Battle', 'js/draft-run.js': 'Draft run', 'js/shop-economy.js': 'Shop', 'js/workshop-and-starter.js': 'Cards tab and workshop',
    'js/collection-tools.js': 'Cards tab and workshop', 'js/journal-history.js': 'Journal', 'js/journal-pages.js': 'Journal', 'js/character-tab.js': 'Character tab',
    'js/world-map.js': 'World map and cosmetics', 'js/events-story-foils-guide.js': 'Story, events and guide', 'js/calm.js': 'Calm corner', 'js/tarot.js': 'Tarot and fate',
    'js/trials.js': 'Tarot and fate', 'js/spread.js': 'Tarot and fate', 'js/skills-gear.js': 'Skills and gear', 'js/neighbors-bosses.js': 'Neighbours and bosses',
    'js/requests-friendship-rival.js': 'Neighbours and bosses', 'js/ladder-practice.js': 'Battle', 'js/weekly-rule.js': 'Battle', 'js/binder.js': 'Cards tab and workshop',
    'js/notes.js': 'Journal', 'js/audio.js': 'Settings and sound', 'js/cloud-save.js': 'Settings and sound', 'js/ui-polish.js': 'Settings and sound', 'js/maps.js': 'Town map and weather',
    'js/cellar-run.js': 'The cellar', 'js/seg-slide.js': 'Settings and sound', 'index.html': 'Menus and screens',
}
# one emoji = a pictographic base, optional skin tone / VS16, then any ZWJ-joined parts; keycaps and flags too. Plain text symbols (arrows, bullets, dingbats
# used as typography such as the heart in stats) are kept but flagged 'symbol' because they are drawn from the text font, not the colour emoji font.
PIC = r'(?:[\U0001F300-\U0001FAFF\U0001F000-\U0001F2FF]|[☀-➿]|[⬀-⯿]|[⌀-⏿]|[←-⇿]|〰|〽|㊗|㊙|[⤀-⥿]|[■-◿])'
SEQ = re.compile(r'(?:[0-9#*]️?⃣)|(?:[\U0001F1E6-\U0001F1FF]{2})|(?:' + PIC + r'[️\U0001F3FB-\U0001F3FF]*(?:‍' + PIC + r'[️\U0001F3FB-\U0001F3FF]*)*)')
TEXT_SYMBOLS = set('→←↑↓↔⇒▾▸▴▲▼●○■□▪▫◆◇★☆✓✔✕✖✗✘✦✧✨⚔♥♡•·–—…')  # ✨ and ⚔ are emoji-capable; handled below
def keyof(s): return ''.join('%x' % ord(c) for c in s if c != '️').replace('200d', '-')
def keyparts(s): return [ord(c) for c in s if c != '️']
def slug_of(s):
    names = []
    for c in s:
        if c in '️‍': continue
        try: names.append(unicodedata.name(c).lower().replace(' ', '-'))
        except ValueError: names.append('u%x' % ord(c))
    sl = '-'.join(names)
    for junk in ('emoji-modifier-fitzpatrick-type-', 'variation-selector'): sl = sl.replace(junk, '')
    return re.sub(r'-+', '-', sl).strip('-')
def nice(s): return slug_of(s).replace('-', ' ').capitalize()

use = collections.OrderedDict()
files = sorted(glob.glob('js/*.js') + ['index.html'])
for f in files:
    if f in SKIP or not os.path.exists(f): continue
    src = open(f, encoding='utf-8').read()
    for m in SEQ.finditer(src):
        g = m.group(0)
        k = keyof(g)
        if not k or k.lstrip('0') == '': continue
        base = g.replace('️', '')
        if len(base) == 1 and ord(base) < 0x2000: continue          # arrows, box drawing: typography only
        d = use.setdefault(k, {'g': g if '️' in g or ord(g[0]) > 0xFFFF else g, 'files': collections.Counter(), 'ctx': [], 'vs': '️' in g})
        if '️' in g: d['g'] = g
        d['files'][f] += 1
        if len(d['ctx']) < 3:
            a, b = max(0, m.start() - 26), min(len(src), m.end() + 30)
            c = re.sub(r'\s+', ' ', src[a:b]).strip()
            if c not in d['ctx']: d['ctx'].append(c)

icons = []
seen_slugs = set()
for k, d in use.items():
    g = d['g']; sl = slug_of(g)
    if sl in seen_slugs: sl = sl + '-' + k
    seen_slugs.add(sl)
    base = g.replace('️', '')
    symbol = len(base) == 1 and ord(base) < 0x2800 and ord(base) not in (0x2694, 0x2728, 0x2764) and not d['vs']
    areas = collections.Counter()
    for f, n in d['files'].items(): areas[AREAS.get(f, 'Other')] += n
    icons.append({'k': k, 'g': g, 'slug': sl, 'name': nice(g), 'n': sum(d['files'].values()), 'areas': dict(areas.most_common()), 'files': dict(d['files'].most_common(6)), 'ctx': d['ctx'], 'sym': symbol})
icons.sort(key=lambda i: -i['n'])
out = {'built': 'generated by scripts/icon-inventory.py', 'count': len(icons), 'icons': icons}
with open('assets/icons/manifest.js', 'w', encoding='utf-8') as fh:
    fh.write('/* Generated by scripts/icon-inventory.py. Do not edit by hand; run the script again after adding icons. */\nwindow.ICON_MANIFEST = ')
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    fh.write(';\n')
print(len(icons), 'distinct icons;', sum(i['n'] for i in icons), 'uses;', sum(1 for i in icons if i['sym']), 'text symbols')
for i in icons[:25]: print(i['n'], i['g'], i['slug'], list(i['areas'])[:2])
