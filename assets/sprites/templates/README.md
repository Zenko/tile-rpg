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
