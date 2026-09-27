# Tile RPG

Read **HANDOFF.md** before changing anything. It covers the one-file architecture, conventions, testing and gotchas.

Short version:
- The whole game is `Tile RPG.html` (no build step). `index.html` just forwards to it.
- Push as the owner's **personal** GitHub account (Zenko), never the machine's active work account. The local git config already does this.
- When a change is finished and tested: add a `CHANGELOG` entry (bump the minor version), commit, push to `main`, wait for GitHub Pages, and check https://zenko.github.io/tile-rpg/. The owner asked for every finished change to be published.
