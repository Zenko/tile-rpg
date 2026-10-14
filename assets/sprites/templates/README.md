# Town / world sprite templates

Starter frames for drawing town art in Figma (or any vector tool). One map tile = 64 px.

| File | Size | Use for |
|---|---|---|
| `prop-64x64.svg` | 64 x 64 | Props, trees, rocks, hedges, lamps, signs (`p-*`, `s-*`) |
| `ground-tile-64x64.svg` | 64 x 64 | Seamless overlay detail on terrain (like `s-cobble`, `s-pebbles`). No shadow. |
| `building-2x2-128x128.svg` | 128 x 128 | 2 x 2 buildings (cottage, nook, cellar) |
| `building-3x2-192x128.svg` | 192 x 128 | 3 x 2 buildings (bakery) |
| `town-palette.svg` | - | Swatches: the only colours to draw with |

Each template has two layers:
- **ART - draw here**: already holds the ground shadow (black, 32% opacity) in the right spot. Keep it.
- **GUIDES - hide before export**: frame edge, 64 px tile grid, 4 px safe margin, ground line, and the door column for buildings (the player enters from the tile just below it).

Workflow:
1. Drag the template into Figma (it imports as a frame). Drag in `town-palette.svg` too and make colour styles from it if useful.
2. Draw inside ART using only palette hex values. Flat fills, no gradients, filters, drop shadows or text.
3. Hide GUIDES, export the frame as SVG.
4. `python3 scripts/svg-to-sprite.py my-thing.svg p-my-thing --check` to see each colour's mapping, then without `--check` to print the `<symbol>` for `assets/sprites.js`.

Worked example: `../example-mailbox-design.svg` -> `../example-mailbox-game.txt`.

## Painting on a tablet (Infinite Painter, Procreate, etc.)

`painting/` has the same templates as transparent PNGs at 4x (256 px per tile), sized for raster painting apps:

| Canvas | Layers to import |
|---|---|
| 256 x 256 | `prop-256x256-guides.png`, `prop-256x256-shadow.png` |
| 256 x 256 | `ground-tile-256x256-guides.png` |
| 512 x 512 | `building-2x2-512x512-guides.png`, `building-2x2-512x512-shadow.png` |
| 768 x 512 | `building-3x2-768x512-guides.png`, `building-3x2-768x512-shadow.png` |

Make a canvas of that size, import the guides as the top layer (lock it, lower its opacity), keep the shadow layer at the bottom, and paint between them. Hide the guides before exporting a transparent PNG. Import `town-palette.png` as a reference image to eyedrop colours from. The game's town sprites are vector, so painted art needs a conversion step before it goes in.

## Icons

`icon-128x128.svg` (vector) and `painting/icon-512x512-guides.png` (4x, for painting apps) are the template for UI icons. The game's spec: **128 x 128 transparent PNG**, named `icon-<name>.png` after the icon it replaces (the style guide's Icons section lists every name; keyword icons are `kw-<keyword>.png`).
- Keep the subject inside the dashed 80% box. Keyword icons sit in a round badge, so keep those inside the inner 70% box and the circle.
- Bold, simple silhouettes with 2-3 tones plus a highlight. They are seen at 16-40 px: check them that small, on both dark and light.
- No baked-in drop shadow (the game adds one), no thin outlines, text, or pure black/white edges.
- Try a new icon in `labs/asset-lab.html#icons` before it goes into `assets/icons/`.
