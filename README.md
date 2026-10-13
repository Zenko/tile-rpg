# Tile RPG

A calm, mobile-first card-collecting town game. Walk a tile map, meet neighbours, duel with a 12-card deck, collect cards, fish, garden, cook and decorate. Plain HTML, CSS and JavaScript: no build step, no framework.

**Play:** open the GitHub Pages link for this repo, or open `index.html` in a browser (a phone-sized window, about 400 × 860, is the intended view). It installs as an app and works offline.

Progress is saved in the browser (localStorage), so each tester keeps their own save on their own device.

## Where things are

| Folder / file | What it holds |
| --- | --- |
| `index.html` | The page: every screen's markup and the script tags, in load order |
| `js/game-config.js` | **Every name players see**: the game's title, the money, what the player is called, places, bosses, card families, named characters |
| `content/` | **The game's words and data**: cards and packs, districts and buildings, items, dialogue, story, tips and quests |
| `css/theme.css` | **Every colour**: a palette plus the light and dark theme tokens |
| `css/*.css` | The rest of the styling, in cascade order (new rules go in `latest.css`) |
| `assets/` | Art: card pictures, icons, the player character, sprites (`assets/sprites.js`) |
| `js/` | The code, one file per system |
| `labs/` | Sandboxes for trying art and effects outside the game (not part of the game) |
| `style-guide.html` | A living reference of components, colours, icons and cards, read from the game's own files |
| `scripts/` | Tools: `check.py` (run before every publish), art building, balance simulations, token export |
| `tests/` | Browser tests: `node tests/run.js` (needs Playwright) |
| `HANDOFF.md` | The full guide to how everything works and the conventions to keep |

## Reskin checklist

The game is set up so a full redesign touches data and art, not code. In order:

1. **Names.** Edit the values in `js/game-config.js` (game title, money, player title, places, bosses, families, characters). Every sentence in the game reads them.
2. **Words.** Rewrite `content/*.js`: cards, packs, buildings and what their keepers say, dialogue, the story, the Town Guide, tips, quests and titles.
3. **Colours.** Edit `css/theme.css`. Section 1 is the palette, section 2 the theme tokens (dark is `:root`, light is `:root[data-theme="light"]`). `python3 scripts/export-tokens.py` writes `design-tokens.json` for Figma.
4. **Art.** Card pictures in `assets/cards/` (or the drawings in `scripts/art/` + `node scripts/build-art.js`), sprites in `assets/sprites.js` (keep the symbol ids), icons in `assets/icons/`, the player in `assets/player/`. Try new art first in `labs/asset-lab.html`.
5. **App identity.** `manifest.json` (its name must match `GAME.title`), the icons `assets/icon-*.png`, and the browser-bar colour per theme (`THEME_META` in `js/audio.js`, plus the `<meta name="theme-color">` fallback in `index.html`).
6. **Fonts.** `--f-display` and `--f-ui` at the top of `css/base.css`, plus the Google Fonts link in `index.html`.
7. **Fresh start at launch.** Change `STORAGE_KEY` in `js/data-and-engine.js` so every player begins a new save. Until launch, ids and card order may change freely (all saves are reset then).
8. **Check.** `python3 scripts/check.py` (fails on a name typed outside the config or a colour outside `theme.css`) and `node tests/run.js`.

Colours drawn by code (canvas weather, the WebGL town and effects) and a few swatch lists are not in `theme.css`; HANDOFF §5 "Reskinning" lists where they are.
