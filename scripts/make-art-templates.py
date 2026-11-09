#!/usr/bin/env python3
"""Makes the paint-app templates for map art (assets/art-templates/): layered PSDs that open in Infinite Painter (or Procreate, Photoshop,
Krita, Clip Studio, Affinity), and a swatch sheet of the Town Square colours.
Usage:   python3 scripts/make-art-templates.py          (needs:  pip install psd-tools pillow numpy)
Sizes come from the sprites themselves (assets/sprites.js): a prop or tree is a 64 x 64 unit frame, a tall room object 64 x 96, a cottage
128 x 128 (2 x 2 tiles) and the bakery 192 x 128 (3 x 2). One unit is SCALE pixels here, so a 1 x 1 tile prop is a 256 x 256 canvas.
The layers are deliberately plain (no groups, effects, smart objects or blend modes) so every app imports them the same way."""
import os, re, sys
from PIL import Image, ImageDraw, ImageFont
from psd_tools import PSDImage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'art-templates')
SCALE = 4                        # pixels per sprite unit (a tile is 64 units, so 256 px)
SS = 4                           # supersampling for the smooth shadow ellipse

# the Town Square palette (dark meadow), straight from css/theme.css so the swatches never go stale
css = open(os.path.join(ROOT, 'css', 'theme.css'), encoding='utf-8').read()
m = re.search(r'(?<![\w\]] )\.town-view\[data-biome="meadow"\]\s*\{([^}]*)\}', css)
PAL = {k: v.strip() for k, v in re.findall(r'--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})', m.group(1))}
GROUND = PAL['ground']

TEMPLATES = [
    dict(slug='map-prop-1x1', w=64, h=64, kind='prop', title='PROP / SCENERY', ids='s-* p-* g-*', door=0,
         shadow=(57, 20, 5)),
    dict(slug='map-tall-1x1.5', w=64, h=96, kind='tall', title='TALL ROOM OBJECT', ids='r-* (96 tall)', door=0,
         shadow=(89, 20, 4)),
    dict(slug='map-building-2x2', w=128, h=128, kind='building', title='BUILDING 2x2', ids='b-cottage b-nook b-cellar', door=2,
         shadow=(122, 54, 6)),
    dict(slug='map-building-3x2', w=192, h=128, kind='building', title='BUILDING 3x2', ids='b-bakery', door=3,
         shadow=(122, 86, 6)),
]
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(px):
    try: return ImageFont.truetype(FONT, px)
    except OSError: return ImageFont.load_default()
def px(u): return int(round(u * SCALE))
def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def dashed(d, x0, y0, x1, y1, fill, width=1, dash=8, gap=6):
    """a dashed horizontal or vertical line"""
    if x0 == x1:
        y = y0
        while y < y1: d.line([(x0, y), (x0, min(y + dash, y1))], fill=fill, width=width); y += dash + gap
    else:
        x = x0
        while x < x1: d.line([(x, y0), (min(x + dash, x1), y0)], fill=fill, width=width); x += dash + gap

def shadow_layer(W, H, t):
    """the ground shadow every sprite has, as an editable layer: a soft black ellipse at 32% (the game's --tshadow)"""
    cy, rx, ry = t['shadow']; cx = t['w'] / 2
    big = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    ImageDraw.Draw(big).ellipse([px(cx - rx) * SS, px(cy - ry) * SS, px(cx + rx) * SS, px(cy + ry) * SS], fill=(0, 0, 0, round(255 * .32)))
    return big.resize((W, H), Image.LANCZOS)

def grid_layer(W, H, t):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    for u in range(0, t['w'] + 1, 16):                       # quarter tiles, faint
        d.line([(px(u) if u < t['w'] else W - 1, 0), (px(u) if u < t['w'] else W - 1, H)], fill=(255, 61, 168, 55), width=1)
    for u in range(0, t['h'] + 1, 16):
        d.line([(0, px(u) if u < t['h'] else H - 1), (W, px(u) if u < t['h'] else H - 1)], fill=(255, 61, 168, 55), width=1)
    for u in range(0, t['w'] + 1, 64):                       # tile edges, strong
        x = px(u) if u < t['w'] else W - 2
        d.line([(x, 0), (x, H)], fill=(255, 61, 168, 235), width=2)
    for u in range(0, t['h'] + 1, 64):
        y = px(u) if u < t['h'] else H - 2
        d.line([(0, y), (W, y)], fill=(255, 61, 168, 235), width=2)
    return img

def guide_layer(W, H, t):
    """centre line, the feet line, and a safe margin: keep ink inside the dashed yellow box"""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cx = px(t['w'] / 2)
    dashed(d, cx, 0, cx, H, (60, 200, 255, 170), 1)                              # centre
    if t['kind'] == 'building':                                                  # a building's door tile is in its bottom row
        for c in range(1, t['w'] // 64): dashed(d, px(64 * c), 0, px(64 * c), H, (60, 200, 255, 90), 1)
    by = px(t['h'] - 6)
    dashed(d, 0, by, W, by, (60, 200, 255, 220), 2)                              # feet line: things stand on this
    m = px(2)
    for (x0, y0, x1, y1) in [(m, m, W - m, m), (m, H - m, W - m, H - m)]: dashed(d, x0, y0, x1, y1, (255, 220, 70, 210), 1, 6, 6)
    for (x0, y0, x1, y1) in [(m, m, m, H - m), (W - m, m, W - m, H - m)]: dashed(d, x0, y0, x1, y1, (255, 220, 70, 210), 1, 6, 6)
    return img

def label_layer(W, H, t):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    f = font(11 if W < 400 else 14); g = font(10 if W < 400 else 12)
    def text(x, y, s, fnt, fill):
        d.text((x, y), s, font=fnt, fill=fill, stroke_width=2, stroke_fill=(20, 24, 30, 255))
    pad = 8
    text(pad, pad, t['title'], f, (255, 255, 255, 255))
    text(pad, pad + (16 if W < 400 else 20), f"{t['w']}x{t['h']} units = {W}x{H} px", g, (230, 230, 230, 255))
    text(pad, pad + (30 if W < 400 else 38), 'name it: ' + t['ids'].split()[0].replace('*', 'name') + '.png', g, (230, 230, 230, 255))
    if t['kind'] == 'building':
        for c in range(t['w'] // 64):
            s = f'door col {c}'
            tw = d.textlength(s, font=g)
            text(px(64 * c) + (px(64) - tw) / 2, H - px(6) - (24 if W < 400 else 30), s, g, (255, 150, 210, 255))
    return img

def make_psd(t):
    W, H = px(t['w']), px(t['h'])
    psd = PSDImage.new('RGB', (W, H), color=0)
    psd.create_pixel_layer(Image.new('RGBA', (W, H), hexrgb(GROUND) + (255,)), name='Ground preview (hide before export)')
    psd.create_pixel_layer(shadow_layer(W, H, t), name='Shadow (move, resize or delete)')
    psd.create_pixel_layer(Image.new('RGBA', (W, H), (0, 0, 0, 0)), name='Art 1 (paint here)')
    psd.create_pixel_layer(Image.new('RGBA', (W, H), (0, 0, 0, 0)), name='Art 2 (details)')
    psd.create_pixel_layer(grid_layer(W, H, t), name='GUIDE grid (hide before export)')
    psd.create_pixel_layer(guide_layer(W, H, t), name='GUIDE feet + margin (hide before export)')
    psd.create_pixel_layer(label_layer(W, H, t), name='GUIDE labels (hide before export)')
    path = os.path.join(OUT, t['slug'] + '.psd'); psd.save(path)
    return path, (W, H)

def make_palette():
    names = list(PAL.items()); cols = 6; rows = -(-len(names) // cols); cw, ch = 168, 132
    img = Image.new('RGB', (cols * cw, rows * ch), (30, 33, 40)); d = ImageDraw.Draw(img); f, g = font(15), font(13)
    for i, (k, v) in enumerate(names):
        x, y = (i % cols) * cw, (i // cols) * ch
        d.rectangle([x + 8, y + 8, x + cw - 8, y + 88], fill=hexrgb(v), outline=(70, 75, 85))
        d.text((x + 10, y + 94), k, font=f, fill=(235, 235, 235)); d.text((x + 10, y + 112), v, font=g, fill=(170, 175, 185))
    path = os.path.join(OUT, 'town-square-palette.png'); img.save(path)
    return path

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for t in TEMPLATES:
        p, size = make_psd(t); print('wrote', os.path.relpath(p, ROOT), size)
    print('wrote', os.path.relpath(make_palette(), ROOT))
