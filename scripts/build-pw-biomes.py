#!/usr/bin/env python3
"""Writes the puddle-world colour palettes into css/latest.css, between the PW-BIOMES markers.

Run from the repo root:  python3 scripts/build-pw-biomes.py

Each puddle world (js/puddle-worlds.js) uses one of these biomes. A biome is just a set of CSS variables on
.town-view[data-biome=...], the same as meadow / bazaar / harbor / orchard in css/buildings.css, so the town renderer
(and the WebGL ground in js/town-gl.js, which reads these variables) needs no other change. The dark palette is written by hand
below; the light-theme one is derived from it. Edit the colours here, rerun, and commit the CSS.
"""
import colorsys, re, sys

# every variable a biome sets (copied from the meadow rule); only the ones in PALETTES differ between worlds
BASE_DARK = {
    'ground': '#2c3a2c', 'ground2': '#2a382a', 'ground3': '#2f3f2f', 'tuft': '#4b6a47', 'path': '#4a4331', 'path-edge': '#3b3527', 'path-dot': '#5d5540',
    'leaf1': '#2f6a48', 'leaf2': '#3c8058', 'leaf3': '#57a274', 'trunk': '#5b4632', 'pine1': '#20523d', 'pine2': '#2c6a50', 'water': '#2d5b70', 'water2': '#4a86a0',
    'shore': '#5a5238', 'wall': '#c9bda6', 'wall2': '#a89b83', 'roof': '#a5503d', 'roof2': '#8a4231', 'door': '#4f3624', 'window': '#e0c574', 'stone': '#76756f',
    'stone2': '#5c5b56', 'stone3': '#8d8c85', 'flower1': '#d97896', 'flower2': '#dcbd58', 'flower3': '#dedede', 'plank': '#8e7148', 'plank2': '#6f5836', 'lamp': '#ffcf66',
    'tshadow': 'rgba(0,0,0,.32)', 'bread': '#c08a4c', 'well-in': '#1d2b33', 'cellar-in': '#141218',
}
PALETTES = {
    'pw-glass':  dict(ground='#2a3b42', ground2='#26373e', ground3='#2f4249', tuft='#5a8c98', path='#44505f', **{'path-edge': '#36404d', 'path-dot': '#566272'},
                      leaf1='#3f7f9a', leaf2='#5aa0b8', leaf3='#8fd0e0', pine1='#2d5f78', pine2='#3f7f9c', water='#3a4f94', water2='#6d8ad6', shore='#6f86a3',
                      stone='#7a8594', stone2='#5e6876', stone3='#929dac', flower1='#9bd8ff', flower2='#f2f8ff', flower3='#d4e6ff', lamp='#bfe8ff'),
    'pw-ember':  dict(ground='#3b2a25', ground2='#372621', ground3='#40302a', tuft='#7a4a38', path='#52382c', **{'path-edge': '#432c22', 'path-dot': '#6a4a3a'},
                      leaf1='#8a3d22', leaf2='#b5532a', leaf3='#e0803a', pine1='#5a2a1f', pine2='#7a3a28', water='#7a2f2a', water2='#d4643a', shore='#6a4a30',
                      stone='#80726a', stone2='#62554e', stone3='#988a81', flower1='#ffb347', flower2='#ff7a45', flower3='#ffe2b0', lamp='#ff9a4a'),
    'pw-mirror': dict(ground='#2f2840', ground2='#2b243b', ground3='#352d47', tuft='#6f5f9e', path='#473f58', **{'path-edge': '#393247', 'path-dot': '#5c5272'},
                      leaf1='#6a4fa0', leaf2='#8667c4', leaf3='#b296e8', pine1='#4a3a7a', pine2='#5f4b96', water='#2d4a82', water2='#5f86cc', shore='#5a5278',
                      stone='#7c7890', stone2='#615d74', stone3='#9692aa', flower1='#f0a8e8', flower2='#ffe9a8', flower3='#ffffff', lamp='#e8c8ff'),
    'pw-bloom':  dict(ground='#3b2c37', ground2='#372834', ground3='#403140', tuft='#84607c', path='#54404a', **{'path-edge': '#44333c', 'path-dot': '#6c5360'},
                      leaf1='#b04a78', leaf2='#d0679a', leaf3='#f2a0c4', pine1='#7a3a5a', pine2='#96486c', water='#3a5a80', water2='#6c9fc8', shore='#7a6070',
                      stone='#84767e', stone2='#685b63', stone3='#9d8f97', flower1='#ffd166', flower2='#ff8fb8', flower3='#fff3f8', lamp='#ffd9a0'),
    'pw-static': dict(ground='#2b2f37', ground2='#272b33', ground3='#30353e', tuft='#5a6676', path='#3e4450', **{'path-edge': '#323842', 'path-dot': '#505968'},
                      leaf1='#55606f', leaf2='#6e7b8c', leaf3='#95a3b6', pine1='#404a58', pine2='#556272', water='#2a3f58', water2='#4f7098', shore='#566070',
                      stone='#7d838c', stone2='#626870', stone3='#969ca6', flower1='#c8d4e4', flower2='#e8eef6', flower3='#ffffff', lamp='#dce8ff'),
    'pw-tide':   dict(ground='#1f3239', ground2='#1b2e35', ground3='#24383f', tuft='#3f7070', path='#36483f', **{'path-edge': '#2b3a33', 'path-dot': '#48594f'},
                      leaf1='#1f6a6a', leaf2='#2a8a86', leaf3='#4fc0b4', pine1='#1a4a52', pine2='#226068', water='#12405e', water2='#2b7ca6', shore='#3f5a50',
                      stone='#6a8088', stone2='#52666d', stone3='#82989f', flower1='#ff9eb5', flower2='#ffe08a', flower3='#e6fffa', lamp='#9ff0e0'),
    'pw-dusk':   dict(ground='#3a3128', ground2='#362d24', ground3='#3f362c', tuft='#7a6038', path='#55442f', **{'path-edge': '#453626', 'path-dot': '#6c573c'},
                      leaf1='#8a6a2a', leaf2='#b08a3a', leaf3='#e0b85a', pine1='#5a4420', pine2='#7a5c2a', water='#3a4a6e', water2='#7e8fb8', shore='#6e5a3a',
                      stone='#82796c', stone2='#665e53', stone3='#9a9184', flower1='#ff9a5a', flower2='#ffd27a', flower3='#fff0cc', lamp='#ffb860'),
}
# how much lighter the light theme is, by variable group (the existing light palettes sit about +0.3 above their dark ones)
LIGHT_L = {'ground': .30, 'ground2': .30, 'ground3': .30, 'tuft': .26, 'path': .30, 'path-edge': .28, 'path-dot': .30, 'shore': .30,
           'leaf1': .12, 'leaf2': .12, 'leaf3': .10, 'pine1': .12, 'pine2': .12, 'water': .16, 'water2': .16, 'stone': .20, 'stone2': .20, 'stone3': .18}

def hex_to_rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def rgb_to_hex(r, g, b): return '#%02x%02x%02x' % tuple(max(0, min(255, round(c * 255))) for c in (r, g, b))
def lighten(h, dl):
    hh, l, s = colorsys.rgb_to_hls(*hex_to_rgb(h))
    return rgb_to_hex(*colorsys.hls_to_rgb(hh, min(0.86, l + dl), min(1.0, s * 0.92)))

def decl(vars_): return ';'.join('--%s:%s' % kv for kv in vars_.items())

def rules():
    out = []
    for bid, pal in PALETTES.items():
        dark = dict(BASE_DARK); dark.update(pal)
        light = {k: lighten(dark[k], dl) for k, dl in LIGHT_L.items()}
        light['tshadow'] = 'rgba(30,30,40,.28)'
        # the [data-season] twin keeps the world's own colours when the season would recolour the leaves (js/puddle-worlds.js worlds are not seasonal)
        sel = '.town-view[data-biome="%s"], .town-view[data-biome="%s"][data-season]' % (bid, bid)
        out.append('%s { %s }' % (sel, decl(dark)))
        lsel = ', '.join(':root[data-theme="light"] ' + s.strip() for s in sel.split(','))
        out.append('%s { %s }' % (lsel, decl(light)))
    return '\n'.join(out)

START, END = '/* PW-BIOMES:START (generated by scripts/build-pw-biomes.py - edit that, not this) */', '/* PW-BIOMES:END */'
css = open('css/latest.css', encoding='utf-8').read()
block = START + '\n' + rules() + '\n' + END
if START in css:
    css = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: block, css, flags=re.S)
else:
    css = css.rstrip('\n') + '\n\n/* ===== Puddle worlds: one palette per world biome (js/puddle-worlds.js) ===== */\n' + block + '\n'
open('css/latest.css', 'w', encoding='utf-8').write(css)
print('wrote %d biome palettes' % len(PALETTES))
