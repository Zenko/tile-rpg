#!/usr/bin/env python3
"""Builds assets/player-art.js, the walking character's art, from the drawings in assets/player/.

    python3 scripts/build_player_art.py        (needs Pillow + numpy; run from the repo root)

Drawings (transparent PNG, character only, any size - each is trimmed and fitted to the front view):
    assets/player/front.png   REQUIRED  facing the camera (the owner's art)
    assets/player/back.png    optional  facing away.   Missing -> a stand-in is built from front.png
    assets/player/left.png    optional  facing left.   Missing -> a stand-in is built from front.png
    assets/player/right.png   optional  facing right.  Missing -> left.png mirrored in the game (so it must face left)

Each view is cut into three layers so the game can animate a walk: the body (everything above the hem), the left foot and
the right foot. The cut is LEG_Y of the way down the picture, just under the skirt hem, so draw the feet below that line
(about the bottom 8%) and keep them apart around the centre line. Output: assets/player-art.js (PLAYER_ART), inlined as
data: URIs like assets/sprites.js so it works from file:// and the service worker precaches it with the other scripts.

The stand-ins are built with coordinates measured on THIS front.png. If front.png is redrawn, the stand-ins need re-tuning
(or just supply back.png and left.png).
"""
import base64, io, json, os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
SRC = os.path.join(HERE, 'player')
OUT = os.path.join(HERE, 'player-art.js')
OUT_W = 240                    # pixels wide; the character is drawn about 1.1 tiles wide, 3x for phone screens
LEG_Y = 1690 / 1838            # where the feet layers start, as a fraction of the picture height
UPPER_END = 1706 / 1838        # the body layer stops here (a little overlap so no seam shows)

def load(name):
    p = os.path.join(SRC, name)
    return Image.open(p).convert('RGBA') if os.path.exists(p) else None

base = load('front.png')
assert base, 'assets/player/front.png is required'
bb = base.split()[3].getbbox(); base = base.crop(bb)
W, H = base.size

def fit(img):
    """Trim a supplied view and fit it to the front view's size: same height, bottom-centred."""
    img = img.crop(img.split()[3].getbbox())
    k = H / img.height
    if img.width * k > W:
        k = W / img.width
    img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(img, ((W - img.width) // 2, H - img.height))
    return out

INK = (48, 20, 14, 255)
px = np.array(base)
HAIR = tuple(int(v) for v in px[300, 565][:3]) + (255,)
SKIN = tuple(int(v) for v in px[600, 565][:3]) + (255,)
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
    def __init__(self):
        self.im = Image.new('RGBA', (W*S, H*S), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def poly(self, pts, fill):
        self.d.polygon([(x*S, y*S) for x, y in pts], fill=fill)
    def stroke(self, pts, w=30):
        p = [(x*S, y*S) for x, y in cr(pts)]
        self.d.line(p, fill=INK, width=int(w*S), joint='curve')
        r = w*S/2
        for x, y in (p[0], p[-1]):
            self.d.ellipse([x-r, y-r, x+r, y+r], fill=INK)
    def apply(self, img):
        out = img.copy(); out.alpha_composite(self.im.resize((W, H), Image.LANCZOS)); return out

def standin_back():
    """Hair falls over the face and the front of the jacket; the strands are drawn in the front art's own line."""
    L = Layer()
    edge = [(246,985),(292,1000),(322,1030),(318,1200),(324,1370),(382,1418),(565,1440),(748,1418),(806,1370),(812,1200),(808,1030),(838,1000),(884,985)]
    L.poly([(246,330),(884,330),(884,985)] + cr(edge)[::-1] + [(246,985)], HAIR)
    L.poly([(246,330),(884,330),(884,985),(246,985)], HAIR)
    L.stroke(edge, 30)
    for s in ([(420,1030),(408,1200),(424,1380)], [(565,1030),(560,1200),(566,1400)], [(710,1030),(722,1200),(706,1380)],
              [(430,640),(405,790),(425,930)], [(700,640),(725,790),(705,930)]):
        L.stroke(s, 22)
    return L.apply(base)

def standin_left():
    """A three-quarter turn: the face features move to one side, a hair flap covers the far cheek, the figure narrows."""
    a = np.array(base).copy()
    skin = np.array(SKIN, dtype=np.uint8)
    feat = np.zeros_like(a)
    for x0, x1, y0, y1 in [(250,880,585,745), (515,615,735,795), (490,650,795,900)]:
        blk = a[y0:y1, x0:x1].copy()
        m = np.abs(blk[..., :3].astype(int) - skin[:3].astype(int)).sum(-1) > 60
        f = np.zeros_like(blk); f[m] = blk[m]
        feat[y0:y1, x0:x1] = np.maximum(feat[y0:y1, x0:x1], f)
        a[y0:y1, x0:x1] = skin
    img = Image.fromarray(a)
    sx, shift = 0.75, -90
    img.alpha_composite(Image.fromarray(feat).resize((int(W*sx), H), Image.LANCZOS), (int(565 - 565*sx + shift), 0))
    L = Layer()
    inner = [(698,556),(714,700),(746,830),(806,925)]
    L.poly([(698,556),(884,556),(884,950),(806,940)] + cr(inner)[::-1], HAIR)
    L.stroke(inner, 28)
    img = L.apply(img)
    k = 0.88
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.alpha_composite(img.resize((int(W*k), H), Image.LANCZOS), (int(565 - 565*k), 0))
    return out

def split(img):
    up = np.array(img); up[round(UPPER_END * H):] = 0
    legs = img.crop((0, round(LEG_Y * H), W, H))
    l = np.array(legs); l[:, W//2:] = 0
    r = np.array(legs); r[:, :W//2] = 0
    return Image.fromarray(up), Image.fromarray(l), Image.fromarray(r)

def uri(im):
    h = round(im.height * OUT_W / W)
    im = im.resize((OUT_W, h), Image.LANCZOS).quantize(colors=64, method=Image.FASTOCTREE, dither=Image.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

views = {'down': base}
back, left, right = load('back.png'), load('left.png'), load('right.png')
views['up'] = fit(back) if back else standin_back()
views['left'] = fit(left) if left else standin_left()
if right: views['right'] = fit(right)
art = {}
for k, im in views.items():
    u, l, r = split(im)
    art[k] = {'upper': uri(u), 'legL': uri(l), 'legR': uri(r)}
# a head-and-shoulders crop for the round avatar portraits (picker, HUD, battle intro), same look as the town sprite
fc = base.crop((64, 20, 1064, 1020)).resize((128, 128), Image.LANCZOS).quantize(colors=48, method=Image.FASTOCTREE, dither=Image.NONE)
fb = io.BytesIO(); fc.save(fb, 'PNG', optimize=True)
face = 'data:image/png;base64,' + base64.b64encode(fb.getvalue()).decode()
real = [k for k, v in (('up', back), ('left', left), ('right', right)) if v]
meta = {'legTop': round(LEG_Y * 100, 2), 'aspect': round(W / H, 4), 'real': ['down'] + real}
with open(OUT, 'w') as f:
    f.write('/* GENERATED by scripts/build_player_art.py from assets/player/*.png - do not edit by hand.\n'
            '   The walking character: per view three layers (body, left foot, right foot) as data: URIs.\n'
            '   Views not drawn yet: up and left are stand-ins built from front.png; right is left mirrored (js/player-sprite.js). */\n')
    f.write('const PLAYER_ART = ' + json.dumps({'meta': meta, 'face': face, 'views': art}, separators=(',', ':')) + ';\n')
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB; real drawings:', meta['real'])
