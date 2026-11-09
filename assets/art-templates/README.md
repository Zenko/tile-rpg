# Map art templates (for Infinite Painter and other paint apps)

Layered **PSD** files to start painting map assets on. They open in Infinite Painter, and also in Procreate, Photoshop, Krita, Clip Studio and Affinity. The sizes come from the game's own sprites (`assets/sprites.js`), so a finished picture drops into the same frame the current sprite uses.

## Which template

One game tile is 64 units. The templates are drawn at **4 pixels per unit**, so a tile is 256 px.

| File | Canvas | Game frame | Use it for (sprite ids today) |
|---|---|---|---|
| `map-prop-1x1.psd` | 256 × 256 | 64 × 64 | trees, rocks, hedges, flowers, fountain, well, bench, lamp, sign, graves: `s-*` `p-*` `g-*` |
| `map-tall-1x1.5.psd` | 256 × 384 | 64 × 96 | tall room objects: windows, lamps, shelves, wardrobe, fireplace, tree: `r-*` (the 96-tall ones) |
| `map-building-2x2.psd` | 512 × 512 | 128 × 128 | `b-cottage` `b-nook` `b-cellar` and new 2 × 2 buildings |
| `map-building-3x2.psd` | 768 × 512 | 192 × 128 | `b-bakery` and new 3 × 2 buildings |

`reference-current-sprites.png` shows every sprite the game has now, with its id and frame size: use it for style and as the list of what exists. `town-square-palette.png` holds the Town Square colours (in Infinite Painter you can build a palette from an image).

## The layers (bottom to top)

1. **Ground preview**: the Town Square ground colour, so you see the art the way it will look. Hide it before export.
2. **Shadow**: the soft ground shadow every sprite has (black at 32%, like the game's `--tshadow`), already placed. Move it, resize it or delete it to suit the asset.
3. **Art 1 (paint here)** and **Art 2 (details)**: empty transparent layers. Add as many as you like.
4. **GUIDE grid**: tile edges (strong lines) and quarter tiles (faint). Hide before export.
5. **GUIDE feet + margin**: dashed blue centre line, the blue **feet line** (things stand on it, 6 units above the bottom edge), and a yellow safe margin (keep ink inside it). Hide before export.
6. **GUIDE labels**: the size and the file name to use. On the building templates it also marks each bottom-row tile as `door col 0 / 1 / 2`: the door goes in the column set by `door` in `BUILDINGS` (`js/maps.js`): cottage 0, nook 1, cellar 0, bakery 1.

The layers are plain on purpose (no groups, effects, blend modes or smart objects) so every app imports them the same way.

## Making a sprite

1. Open the PSD in your paint app and paint on the **Art** layers.
2. Hide the **Ground preview** and all **GUIDE** layers. Keep the **Shadow** layer if you want the shadow baked in.
3. Export as **PNG with a transparent background** (not JPG), at the canvas size, with no resizing.
4. Name it after the sprite it replaces, for example `s-oak.png` or `b-cottage.png`. A brand-new sprite needs a new id with the same prefix (`s-` scenery, `p-` prop, `b-` building, `r-` room, `g-` grave).
5. Try it in `labs/asset-lab.html` (the Asset Lab): drop the PNG in and it swaps onto the matching sprite in a small town scene, using the game's own district colours.

## Drawing conventions the current sprites follow

- Things stand on the **feet line**. Props leave about 5 to 6 units under it for the shadow, and the shadow is centred under the object.
- Fill the frame like the current art: a tree reaches near the top, a building uses most of its width.
- Keep everything inside the frame: anything outside is cropped.
- Soft, flat shapes with a lighter top and a darker underside, no outlines. Use the Town Square palette so new pieces sit with the old ones.
- Don't paint night or weather into the art: the game adds those on top.

## One thing to decide before painting a lot

The game's current sprites are **vector** and use theme colour variables, so the same cottage has a red roof in the Square and a blue one by the Harbor (four district palettes, each with a light and a dark version). A **PNG keeps the colours you paint** and will look the same everywhere. Raster sprites are not wired into the game yet (the Asset Lab only previews them). When you have a first one you like, ask Claude to add the hook, the same way card art was added.

## Regenerating these files

```
python3 scripts/make-art-templates.py        # the four PSDs and the palette (pip install psd-tools pillow numpy)
node scripts/render-sprite-reference.js      # the current-sprites sheet (needs Playwright)
node scripts/capture-map-reference.js        # whole-district map screenshots, 256 px per tile like the templates (needs Playwright)
```

The map screenshots are not kept in the repo because they follow the real calendar's season (the trees turn orange in autumn); run the last command whenever you want fresh ones.
