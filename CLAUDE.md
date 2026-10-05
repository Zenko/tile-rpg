# Tile RPG

Read **HANDOFF.md** before changing anything. It covers the file layout, conventions, testing and gotchas. `HANDOFF-HISTORY.md` has the full postmortems behind HANDOFF's §9 rules - optional reading, only needed if you're debugging a recurrence of one of those bugs.

Short version:
- The game is `index.html` plus six stylesheets in `css/` (cascade order, new rules in `latest.css`), `assets/sprites.js` and the files under `js/` (no build step, no bundler - see HANDOFF §1 and §4 for the full file map and why plain `<script src>` tags are used instead of ES modules). `Tile RPG.html` just forwards to `index.html`, kept for old links.
- Load order in `index.html` matters for top-level cross-file references - see HANDOFF §9's load-order gotcha before moving code between files.
- Push as the owner's **personal** GitHub account (Zenko), never the machine's active work account. The local git config already does this.
- When a change is finished and tested: add bullets to `PENDING_CHANGES` in `js/changelog.js` (cut a new `RELEASES` Beta entry only when the owner agrees), bump `BUILD` in `js/build.js`, run `python3 scripts/check.py` and `node tests/run.js`, commit, push to `main`, and wait for GitHub Pages. The owner asked for every finished change to be published.
