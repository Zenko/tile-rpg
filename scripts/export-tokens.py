#!/usr/bin/env python3
"""Exports css/theme.css as design tokens for Figma: writes design-tokens.json in the W3C design-tokens (DTCG) format.

Run from the repo root:  python3 scripts/export-tokens.py

What goes in:
- palette: every --c-<hue>-<lightness> colour from section 1 of css/theme.css, grouped by hue
- theme.dark / theme.light: the main theme tokens (--ink, --stone, --accent, the rarity colours, ...) from the bare :root
  rules and the :root[data-theme="light"] rules - two modes of one collection in Figma. A light token the light theme
  does not change keeps its dark value. Values that read another variable (`var(--x)`) become aliases.
Per-screen palettes (biomes, buildings, battle) are left out: they are scoped to one part of the game, not global modes.
The file is generated: edit css/theme.css, not the JSON.
"""
import json, re

src = re.sub(r'/\*.*?\*/', '', open('css/theme.css', encoding='utf-8').read(), flags=re.S)

def to_hex(v):
    v = v.strip()
    if re.fullmatch(r'#[0-9a-fA-F]{3,8}', v):
        h = v[1:].lower()
        return '#' + (''.join(c * 2 for c in h) if len(h) in (3, 4) else h)
    m = re.fullmatch(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)', v)
    if m:
        r, g, b = (int(m.group(i)) for i in (1, 2, 3)); a = float(m.group(4)) if m.group(4) else 1
        return '#%02x%02x%02x' % (r, g, b) + ('%02x' % round(a * 255) if a < 1 else '')
    return None

# rules outside @media only
rules = []
top = re.sub(r'@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', src)
for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', top):
    sels = [s.strip() for s in m.group(1).split(',')]
    decls = dict((k.strip(), v.strip()) for k, v in (d.split(':', 1) for d in m.group(2).split(';') if ':' in d))
    rules.append((sels, decls))

palette, dark, light = {}, {}, {}
for sels, decls in rules:
    for k, v in decls.items():
        if not k.startswith('--'): continue
        if k.startswith('--c-') and ':root' in sels: palette[k] = v
        elif ':root' in sels: dark[k] = v
        if ':root[data-theme="light"]' in sels: light[k] = v

def token(v, scope):
    ref = re.fullmatch(r'var\(\s*(--[\w-]+)\s*\)', v)
    if ref:
        n = ref.group(1)
        return {'$type': 'color', '$value': '{palette.%s}' % '.'.join(n[4:].split('-', 1)) if n.startswith('--c-') else '{theme.%s.%s}' % (scope, n[2:])}
    h = to_hex(v)
    return {'$type': 'color', '$value': h} if h else None

out = {'palette': {}, 'theme': {'dark': {}, 'light': {}}}
for k, v in palette.items():
    fam, rest = k[4:].split('-', 1)
    t = token(v, 'dark')
    if t: out['palette'].setdefault(fam, {})[rest] = t
skipped = []
for mode, vals in (('dark', dark), ('light', {**dark, **light})):
    for k, v in vals.items():
        t = token(v, mode)
        if t: out['theme'][mode][k[2:]] = t
        elif mode == 'dark': skipped.append(k)
json.dump(out, open('design-tokens.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
open('design-tokens.json', 'a').write('\n')
n = sum(len(v) for v in out['palette'].values())
print(f'wrote design-tokens.json: {n} palette colours, {len(out["theme"]["dark"])} theme tokens in 2 modes'
      + (f'; left out (not a plain colour): {", ".join(skipped)}' if skipped else ''))
