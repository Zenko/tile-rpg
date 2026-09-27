# Tile RPG

Read **HANDOFF.md** before changing anything. It covers the file layout, conventions, testing and gotchas.

Short version:
- The game is `index.html` plus `css/style.css`, `assets/sprites.js` and ~22 files under `js/` (no build step, no bundler - see HANDOFF §1 and §4 for the full file map and why plain `<script src>` tags are used instead of ES modules). `Tile RPG.html` just forwards to `index.html`, kept for old links.
- Load order in `index.html` matters for top-level cross-file references - see HANDOFF §9's load-order gotcha before moving code between files.
- Push as the owner's **personal** GitHub account (Zenko), never the machine's active work account. The local git config already does this.
- When a change is finished and tested: add a `CHANGELOG` entry (bump the minor version), commit, push to `main`, wait for GitHub Pages, and check https://zenko.github.io/tile-rpg/. The owner asked for every finished change to be published.
