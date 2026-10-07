#!/usr/bin/env python3
"""Builds assets/player-art.js, the walking characters' art, from the drawings in assets/player/<id>/.

    python3 scripts/build_player_art.py        (needs Pillow + numpy; run from the repo root)

One folder per character (the list is CHARS below). Drawings are transparent PNGs, character only, any size; each one
is trimmed and fitted to that character's front view:
    assets/player/<id>/front.png   REQUIRED  facing the camera
    assets/player/<id>/back.png    optional  facing away.   Missing -> a stand-in is built from front.png
    assets/player/<id>/left.png    optional  facing left.   Missing -> a stand-in is built from front.png
    assets/player/<id>/right.png   optional  facing right.  Missing -> left.png mirrored in the game (so it must face left)

Each view is cut into three layers so the game can animate a walk: the body (everything above the pants/skirt hem), the
left foot and the right foot. The cut is `leg_y` pixels down the front drawing (CHARS), so draw the legs and feet below
that line, apart, around the centre line. Output: assets/player-art.js (PLAYER_ART), inlined as data: URIs like
assets/sprites.js so it works from file:// and the service worker precaches it with the other scripts.

To ADD a character: make assets/player/<id>/front.png, add an entry to CHARS (its leg_y, face crop and stand-in builders;
use STANDIN_NONE to reuse the front drawing for every direction until real back/left drawings exist), run this script.
The stand-ins are built with coordinates measured on THAT character's front.png; if a front.png is redrawn they need
re-tuning (or just supply back.png and left.png).
"""
import base64, io, json, os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
SRC = os.path.join(HERE, 'player')
OUT = os.path.join(HERE, 'player-art.js')
OUT_W = 240                    # pixels wide; the character is drawn about 1 tile wide, 3x for phone screens
INK = (48, 20, 14, 255)
S = 2


def cr(pts, n=14):
    pts = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = [np.array(p, float) for p in pts[i-1:i+3]]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(tuple(0.5 * ((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t**3)))
    out.append(tuple(pts[-2]))
    return out


class Layer:
    """Draw filled shapes and ink strokes at 2x, then lay them over a picture."""
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.im = Image.new('RGBA', (W*S, H*S), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def poly(self, pts, fill):
        self.d.polygon([(x*S, y*S) for x, y in pts], fill=fill)
    def stroke(self, pts, w=30, color=INK):
        p = [(x*S, y*S) for x, y in cr(pts)]
        self.d.line(p, fill=color, width=int(w*S), joint='curve')
        r = w*S/2
        for x, y in (p[0], p[-1]):
            self.d.ellipse([x-r, y-r, x+r, y+r], fill=color)
    def apply(self, img):
        out = img.copy(); out.alpha_composite(self.im.resize((self.W, self.H), Image.LANCZOS)); return out


def px_at(base, x, y):
    return tuple(int(v) for v in np.array(base)[y, x][:3]) + (255,)


def narrow(img, k, cx):
    """Squeeze a picture sideways about the centre line (the three-quarter turn of the left stand-ins)."""
    W, H = img.size
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(img.resize((int(W*k), H), Image.LANCZOS), (int(cx - cx*k), 0))
    return out


def shift_features(base, rects, skin, sx, shift, cx):
    """Cut the face features out of rects, fill the hole with skin, put them back squeezed and moved sideways."""
    W, H = base.size
    a = np.array(base).copy()
    sk = np.array(skin, dtype=np.uint8)
    feat = np.zeros_like(a)
    for x0, x1, y0, y1, thr in rects:
        blk = a[y0:y1, x0:x1].copy()
        m = np.abs(blk[..., :3].astype(int) - sk[:3].astype(int)).sum(-1) > thr
        f = np.zeros_like(blk); f[m] = blk[m]
        feat[y0:y1, x0:x1] = np.maximum(feat[y0:y1, x0:x1], f)
        a[y0:y1, x0:x1] = sk
    img = Image.fromarray(a)
    img.alpha_composite(Image.fromarray(feat).resize((int(W*sx), H), Image.LANCZOS), (int(cx - cx*sx + shift), 0))
    return img


# ---------------- first character: stand-ins ----------------
def first_back(base):
    W, H = base.size
    HAIR, L = px_at(base, 565, 300), Layer(W, H)
    edge = [(246,985),(292,1000),(322,1030),(318,1200),(324,1370),(382,1418),(565,1440),(748,1418),(806,1370),(812,1200),(808,1030),(838,1000),(884,985)]
    L.poly([(246,330),(884,330),(884,985)] + cr(edge)[::-1] + [(246,985)], HAIR)
    L.poly([(246,330),(884,330),(884,985),(246,985)], HAIR)
    L.stroke(edge, 30)
    for s in ([(420,1030),(408,1200),(424,1380)], [(565,1030),(560,1200),(566,1400)], [(710,1030),(722,1200),(706,1380)],
              [(430,640),(405,790),(425,930)], [(700,640),(725,790),(705,930)]):
        L.stroke(s, 22)
    return L.apply(base)


def first_left(base):
    W, H = base.size
    HAIR, SKIN = px_at(base, 565, 300), px_at(base, 565, 600)
    img = shift_features(base, [(250,880,585,745,60), (515,615,735,795,60), (490,650,795,900,60)], SKIN, 0.75, -90, 565)
    L = Layer(W, H)
    inner = [(698,556),(714,700),(746,830),(806,925)]
    L.poly([(698,556),(884,556),(884,950),(806,940)] + cr(inner)[::-1], HAIR)
    L.stroke(inner, 28)
    return narrow(L.apply(img), 0.88, 565)


# ---------------- Don: stand-ins ----------------
def don_colors(base):
    a = np.array(base)
    reg = a[450:900, 100:280].reshape(-1, 4)
    g = reg[(reg[:, 3] > 250) & (reg[:, 1] > reg[:, 0] + 25)]
    green = tuple(int(v) for v in np.median(g[:, :3], axis=0)) + (255,)
    crown = a[100:250, 300:900].reshape(-1, 4)
    crown = crown[crown[:, 3] > 250]
    shirt = a[1360:1385, 430:760].reshape(-1, 4)
    shirt = shirt[shirt[:, 3] > 250]
    med = lambda r: tuple(int(v) for v in np.median(r[:, :3], axis=0)) + (255,)
    green = (150, 200, 178, 255)      # the median is greyer than the drawn highlights, so use a hand-picked green and brown
    return {'green': green, 'brown': (70, 27, 21, 255), 'skin': px_at(base, 600, 420), 'shirt': med(shirt)}


def don_back(base):
    W, H = base.size
    c, L = don_colors(base), Layer(W, H)
    L.poly([(412,1118),(776,1118),(776,1385),(412,1385)], c['shirt'])             # no logo on the back of the shirt
    top = [(322,400),(385,335),(520,292),(600,284),(700,292),(830,335),(886,400)]
    L.poly(top + [(886,1010),(322,1010)], c['green'])                             # hair over the face and neck
    cap = [(322,500),(450,585),(600,620),(750,585),(886,500)]
    L.poly(top + [(886,500)] + cr(cap)[::-1], c['brown'])
    L.stroke(cap, 16)
    curtain = [(325,1080),(334,1150),(380,1190),(600,1205),(820,1190),(872,1150),(880,1080)]
    L.poly([(322,1000),(886,1000),(880,1080)] + cr(curtain)[::-1], c['green'])
    L.stroke(curtain, 22)
    for s in ([(430,660),(418,860),(432,1080)], [(520,640),(516,860),(522,1120)], [(690,640),(696,860),(690,1120)], [(780,660),(790,860),(776,1080)]):
        L.stroke(s, 12)
    return L.apply(base)


def don_left(base):
    W, H = base.size
    c = don_colors(base)
    img = shift_features(base, [(325,880,470,850,45)], c['skin'], 0.72, -80, 605)
    L = Layer(W, H)
    inner = [(740,360),(716,560),(750,760),(826,885)]
    L.poly([(740,360),(830,345),(886,400),(886,900),(826,890)] + cr(inner)[::-1], c['green'])
    L.stroke(inner, 22)
    return narrow(L.apply(img), 0.88, 600)


STANDIN_NONE = (None, None)
CHARS = [
    # id, label in the game, where the feet layers start (px down the front drawing), where the body layer ends, the square face crop
    {'id': 'first', 'name': 'Original', 'leg_y': 1690, 'upper_end': 1706, 'face': (64, 20, 1064, 1020), 'standins': (first_back, first_left)},
    {'id': 'don',   'name': 'Don',      'leg_y': 1415, 'upper_end': 1440, 'face': (100, 0, 1100, 1000), 'standins': (don_back, don_left)},
]


def uri(im, w, colors=64):
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS).quantize(colors=colors, method=Image.FASTOCTREE, dither=Image.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def build(cfg):
    folder = os.path.join(SRC, cfg['id'])
    load = lambda n: Image.open(os.path.join(folder, n)).convert('RGBA') if os.path.exists(os.path.join(folder, n)) else None
    base = load('front.png')
    assert base, 'assets/player/%s/front.png is required' % cfg['id']
    base = base.crop(base.split()[3].getbbox())
    W, H = base.size

    def fit(img):
        """Trim a supplied view and fit it to the front view's size: same height, bottom-centred."""
        img = img.crop(img.split()[3].getbbox())
        k = min(H / img.height, W / img.width)
        img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        out.alpha_composite(img, ((W - img.width) // 2, H - img.height))
        return out

    def split(img):
        up = np.array(img); up[cfg['upper_end']:] = 0
        legs = img.crop((0, cfg['leg_y'], W, H))
        l = np.array(legs); l[:, W//2:] = 0
        r = np.array(legs); r[:, :W//2] = 0
        return Image.fromarray(up), Image.fromarray(l), Image.fromarray(r)

    back, left, right = load('back.png'), load('left.png'), load('right.png')
    st_back, st_left = cfg['standins']
    views = {'down': base}
    views['up'] = fit(back) if back else (st_back(base) if st_back else base)
    views['left'] = fit(left) if left else (st_left(base) if st_left else base)
    if right: views['right'] = fit(right)
    art = {}
    for k, im in views.items():
        u, l, r = split(im)
        art[k] = {'upper': uri(u, OUT_W), 'legL': uri(l, OUT_W), 'legR': uri(r, OUT_W)}
    fx0, fy0, fx1, fy1 = cfg['face']
    face = uri(base.crop((fx0, fy0, fx1, fy1)), 128, 48)   # head-and-shoulders crop for the round portraits
    real = ['down'] + [k for k, v in (('up', back), ('left', left), ('right', right)) if v]
    meta = {'legTop': round(cfg['leg_y'] / H * 100, 2), 'aspect': round(W / H, 4), 'real': real}
    return {'name': cfg['name'], 'meta': meta, 'face': face, 'views': art}


chars = {c['id']: build(c) for c in CHARS}
with open(OUT, 'w') as f:
    f.write('/* GENERATED by scripts/build_player_art.py from assets/player/<id>/*.png - do not edit by hand.\n'
            '   The walking characters: per character and view, three layers (body, left foot, right foot) as data: URIs, plus a face crop.\n'
            '   Views not drawn yet: up and left are stand-ins built from front.png; right is left mirrored (js/player-sprite.js). */\n')
    f.write('const PLAYER_ART = ' + json.dumps({'order': [c['id'] for c in CHARS], 'chars': chars}, separators=(',', ':')) + ';\n')
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB;', {k: v['meta']['real'] for k, v in chars.items()})
