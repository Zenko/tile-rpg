#!/usr/bin/env python3
"""Turns a normal designed SVG (plain hex colours, as exported from Figma) into a game sprite: a <symbol> whose colours are the game's theme variables,
so the same drawing recolours itself for every district and for the dark and light themes.
Usage:  python3 scripts/svg-to-sprite.py design.svg s-my-tree            prints the <symbol> to paste into assets/sprites.js
        python3 scripts/svg-to-sprite.py design.svg s-my-tree --check    only reports how each colour maps
Draw using the Town Square palette (see the style guide, Colour -> Town palettes). Every colour is matched to the nearest palette variable; the report
shows each match so you can fix a colour that landed on the wrong one. A black fill with partial opacity becomes the ground shadow (--tshadow)."""
import re, sys, math, xml.etree.ElementTree as ET

css = open('css/buildings.css', encoding='utf-8').read()
m = re.search(r'\.town-view\[data-biome="meadow"\]\s*\{([^}]*)\}', css)
PAL = {k: v.strip() for k, v in re.findall(r'--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})', m.group(1))}
SKIP = {'ground', 'ground2', 'ground3', 'water', 'shore'}          # terrain colours are drawn by the tiles, not by sprites (water2 is used by wells/ripples)
def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def dist(a, b): return math.sqrt(sum((x - y) ** 2 for x, y in zip(rgb(a), rgb(b))))
def norm(c):
    c = c.strip().lower()
    if re.fullmatch(r'#[0-9a-f]{3}', c): c = '#' + ''.join(ch * 2 for ch in c[1:])
    names = {'black': '#000000', 'white': '#ffffff'}
    return names.get(c, c)
def nearest(c):
    best = min(((dist(c, v), k) for k, v in PAL.items() if k not in SKIP), key=lambda t: t[0])
    return best[1], best[0]

def main():
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    src, sid = sys.argv[1], sys.argv[2]; check = '--check' in sys.argv
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    root = ET.parse(src).getroot(); vb = root.get('viewBox') or '0 0 64 64'
    report, out = [], []
    def local(t): return t.split('}')[-1]
    def conv(el):
        tag = local(el.tag)
        if tag in ('title', 'desc', 'metadata', 'defs', 'style'): return None
        a = dict(el.attrib); style = []
        op = a.pop('opacity', None); fop = a.pop('fill-opacity', None)
        for prop in ('fill', 'stroke'):
            v = a.pop(prop, None)
            if v is None or v in ('none', 'currentColor') or v.startswith('url('): 
                if v == 'none': style.append(prop + ':none')
                continue
            c = norm(v)
            if c == '#000000' and fop and float(fop) < 1:
                style.append(prop + ':var(--tshadow)'); fop = None; report.append((v, 'tshadow', 0.0, 'ground shadow')); continue
            k, d = nearest(c); style.append('%s:var(--%s)' % (prop, k)); report.append((v, k, d, 'exact' if d < 1 else ('close' if d < 40 else 'FAR: check this colour')))
        if fop: style.append('fill-opacity:' + fop)
        if op: style.append('opacity:' + op)
        a.pop('style', None)
        attrs = ' '.join('%s="%s"' % (k, v) for k, v in a.items() if not k.startswith('{'))
        kids = ''.join(filter(None, (conv(c) for c in el)))
        body = '<%s%s%s' % (tag, (' ' + attrs) if attrs else '', (' style="%s;"' % ';'.join(style)) if style else '')
        return body + ('>' + kids + '</%s>' % tag if kids or tag == 'g' else '/>')
    for c in root: 
        r = conv(c)
        if r: out.append('  ' + r)
    print('Colour mapping (design colour -> game variable):', file=sys.stderr)
    seen = set()
    for v, k, d, note in report:
        if (v, k) in seen: continue
        seen.add((v, k)); print('  %-9s -> --%-10s %s' % (v, k, note), file=sys.stderr)
    if not check: print('<symbol id="%s" viewBox="%s">\n%s</symbol>' % (sid, vb, '\n'.join(out)))
main()
